import { env } from "cloudflare:workers";
import {
  createExecutionContext,
  createScheduledController,
  reset,
  waitOnExecutionContext,
} from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../src/index";
import {
  CALENDAR_BUNDLE_KEY,
  readCalendarBundle,
  readRuntimeConfig,
  refreshCalendar,
} from "../src/sync";
import type { CalendarEnv } from "../src/sync";
import { SkoolAccessError, SkoolSessionError } from "../src/skool";
import {
  ACCESS_REDIRECT,
  GROUP_SLUG,
  SESSION_REDIRECT,
  calendarHtml,
  calendarPage,
  redirectResponse,
  sessionToken,
  unrestrictedEvent,
} from "./fixtures/skool";

const now = new Date("2026-09-24T20:00:00Z");

function testEnv(overrides: Partial<CalendarEnv> = {}): CalendarEnv {
  return {
    CALENDAR_KV: env.CALENDAR_KV,
    GROUP_SLUG,
    CALENDAR_NAME: "Cágala, Aprende, Repite",
    FEED_PATH: "/calendario.ics",
    PAST_MONTHS: "0",
    FUTURE_MONTHS: "0",
    CACHE_CONTROL: "public, max-age=300, stale-while-revalidate=3600",
    ...overrides,
  };
}

function deployedEnv(): CalendarEnv {
  return {
    CALENDAR_KV: env.CALENDAR_KV,
    GROUP_SLUG: env.GROUP_SLUG,
    CALENDAR_NAME: env.CALENDAR_NAME,
    FEED_PATH: env.FEED_PATH,
    PAST_MONTHS: env.PAST_MONTHS,
    FUTURE_MONTHS: env.FUTURE_MONTHS,
    CACHE_CONTROL: env.CACHE_CONTROL,
  };
}

function successfulFetcher(
  events: readonly unknown[] = [unrestrictedEvent],
): ReturnType<typeof vi.fn> {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(input.toString());
    if (url.pathname === `/${GROUP_SLUG}/calendar`) {
      return new Response(calendarHtml("build-123", events));
    }
    return Response.json(calendarPage([]));
  });
}

function currentMonthEvent(): unknown {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const start = new Date(Date.UTC(year, month - 1, 15, 15));
  return {
    ...unrestrictedEvent,
    startTime: start.toISOString(),
    endTime: new Date(start.getTime() + 3_600_000).toISOString(),
  };
}

function capturedLogs(): () => string {
  const lines: string[] = [];
  for (const method of ["log", "warn", "error"] as const) {
    vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    });
  }
  return () => lines.join("\n");
}

function loggedEvents(logs: string): readonly Record<string, unknown>[] {
  return logs
    .split("\n")
    .filter((line) => line.startsWith("{"))
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

afterEach(async () => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await reset();
});

describe("calendar synchronization", () => {
  it("publishes one complete versioned bundle to KV", async () => {
    const result = await refreshCalendar(testEnv(), successfulFetcher(), now);
    const stored = await readCalendarBundle(env.CALENDAR_KV);

    expect(result.eventCount).toBe(1);
    expect(stored).toEqual(result);
    expect(stored?.version).toBe(1);
    expect(stored?.calendar).toContain("BEGIN:VCALENDAR");
    expect(stored?.generatedAt).toBe(now.toISOString());
    expect(stored?.modifiedAt).toBe(now.toISOString());
    expect(stored?.source).toEqual({
      groupSlug: GROUP_SLUG,
      calendarName: "Cágala, Aprende, Repite",
      authenticated: false,
    });
    expect(stored?.sourceWindow).toEqual({ pastMonths: 0, futureMonths: 0 });
    expect(stored?.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("preserves representation modification time when content is unchanged", async () => {
    const first = await refreshCalendar(testEnv(), successfulFetcher(), now);
    const later = new Date("2026-09-24T21:00:00Z");
    const second = await refreshCalendar(testEnv(), successfulFetcher(), later);

    expect(second.generatedAt).toBe(later.toISOString());
    expect(second.modifiedAt).toBe(first.modifiedAt);
    expect(second.hash).toBe(first.hash);
  });

  it("rejects windows that cannot fit the source request budget", () => {
    expect(() =>
      readRuntimeConfig(testEnv({ PAST_MONTHS: "10", FUTURE_MONTHS: "10" })),
    ).toThrow(/combined month window/i);
  });

  it("preserves the previous bundle after network or malformed failures", async () => {
    const initial = await refreshCalendar(testEnv(), successfulFetcher(), now);
    const networkFailure = vi.fn(async () => {
      throw new Error("source unavailable");
    });

    await expect(
      refreshCalendar(testEnv(), networkFailure, new Date("2026-09-24T21:00:00Z")),
    ).rejects.toThrow(/source unavailable/);
    expect(await readCalendarBundle(env.CALENDAR_KV)).toEqual(initial);

    const malformed = vi.fn(async () => new Response("not Next data"));
    await expect(
      refreshCalendar(testEnv(), malformed, new Date("2026-09-24T22:00:00Z")),
    ).rejects.toThrow(/NEXT_DATA/);
    expect(await readCalendarBundle(env.CALENDAR_KV)).toEqual(initial);
  });

  it("allows a complete valid zero-event snapshot to replace old data", async () => {
    await refreshCalendar(testEnv(), successfulFetcher(), now);

    const empty = await refreshCalendar(
      testEnv(),
      successfulFetcher([]),
      new Date("2026-09-24T21:00:00Z"),
    );

    expect(empty.eventCount).toBe(0);
    expect(empty.calendar).not.toContain("BEGIN:VEVENT");
    expect(await readCalendarBundle(env.CALENDAR_KV)).toEqual(empty);
  });

  it("runs synchronization from the scheduled handler", async () => {
    vi.stubGlobal("fetch", successfulFetcher());
    const controller = createScheduledController({
      scheduledTime: now.getTime(),
      cron: "0 * * * *",
    });
    const ctx = createExecutionContext();

    await worker.scheduled(controller, env, ctx);
    await waitOnExecutionContext(ctx);

    expect((await readCalendarBundle(env.CALENDAR_KV))?.eventCount).toBe(1);
  });
});

describe("public calendar endpoint", () => {
  it("initializes synchronously on the first anonymous GET", async () => {
    vi.stubGlobal("fetch", successfulFetcher([currentMonthEvent()]));
    const ctx = createExecutionContext();

    const response = await worker.fetch(
      new Request("https://aprenderepite.com/calendario.ics"),
      env,
      ctx,
    );
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/calendar; charset=utf-8",
    );
    expect(response.headers.get("content-disposition")).toBe(
      'inline; filename="calendario.ics"',
    );
    expect(response.headers.get("cache-control")).toBe(env.CACHE_CONTROL);
    expect(response.headers.get("etag")).toMatch(/^"[a-f0-9]{64}"$/);
    const stored = await readCalendarBundle(env.CALENDAR_KV);
    expect(response.headers.get("last-modified")).toBe(
      new Date(stored?.generatedAt ?? "invalid").toUTCString(),
    );
    expect(await response.text()).toContain("BEGIN:VEVENT");
  });

  it("returns 503 instead of an empty feed when initial sync fails", async () => {
    const failingFetch = vi.fn(async () => {
      throw new Error("Skool unavailable");
    });
    vi.stubGlobal("fetch", failingFetch);
    const response = await worker.fetch(
      new Request("https://aprenderepite.com/calendario.ics"),
      env,
      createExecutionContext(),
    );

    expect(response.status).toBe(503);
    expect(await response.text()).toContain("Calendar temporarily unavailable");
    expect(await env.CALENDAR_KV.get(CALENDAR_BUNDLE_KEY)).toBeNull();

    const retried = await worker.fetch(
      new Request("https://aprenderepite.com/calendario.ics"),
      env,
      createExecutionContext(),
    );
    expect(retried.status).toBe(503);
    expect(failingFetch).toHaveBeenCalledTimes(1);
  });

  it("refreshes a stored bundle when content configuration changes", async () => {
    await refreshCalendar(testEnv(), successfulFetcher(), now);
    const changedEnv = testEnv({ CALENDAR_NAME: "Otro calendario" });
    vi.stubGlobal("fetch", successfulFetcher());

    const response = await worker.fetch(
      new Request("https://aprenderepite.com/calendario.ics"),
      changedEnv as Env,
      createExecutionContext(),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("X-WR-CALNAME:Otro calendario");
    expect((await readCalendarBundle(env.CALENDAR_KV))?.source.calendarName).toBe(
      "Otro calendario",
    );
  });

  it("serves last-known-good data without contacting Skool", async () => {
    const initial = await refreshCalendar(deployedEnv(), successfulFetcher(), now);
    const failingFetch = vi.fn(async () => {
      throw new Error("must not be called");
    });
    vi.stubGlobal("fetch", failingFetch);

    const response = await worker.fetch(
      new Request("https://aprenderepite.com/calendario.ics"),
      env,
      createExecutionContext(),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(initial.calendar);
    expect(failingFetch).not.toHaveBeenCalled();
  });

  it("supports ETag and Last-Modified conditional requests", async () => {
    const bundle = await refreshCalendar(deployedEnv(), successfulFetcher(), now);
    const etagResponse = await worker.fetch(
      new Request("https://aprenderepite.com/calendario.ics", {
        headers: { "if-none-match": `"${bundle.hash}"` },
      }),
      env,
      createExecutionContext(),
    );
    const modifiedResponse = await worker.fetch(
      new Request("https://aprenderepite.com/calendario.ics", {
        headers: { "if-modified-since": now.toUTCString() },
      }),
      env,
      createExecutionContext(),
    );

    expect(etagResponse.status).toBe(304);
    expect(modifiedResponse.status).toBe(304);
  });

  it("supports weak, wildcard, and comma-separated ETags", async () => {
    const bundle = await refreshCalendar(deployedEnv(), successfulFetcher(), now);
    const values = [
      `W/"${bundle.hash}"`,
      "*",
      `"other", W/"${bundle.hash}"`,
    ];

    for (const value of values) {
      const response = await worker.fetch(
        new Request("https://aprenderepite.com/calendario.ics", {
          headers: { "if-none-match": value },
        }),
        env,
        createExecutionContext(),
      );
      expect(response.status).toBe(304);
    }
  });

  it("ignores If-Modified-Since when a nonmatching ETag is present", async () => {
    await refreshCalendar(deployedEnv(), successfulFetcher(), now);
    const response = await worker.fetch(
      new Request("https://aprenderepite.com/calendario.ics", {
        headers: {
          "if-none-match": '"different"',
          "if-modified-since": now.toUTCString(),
        },
      }),
      env,
      createExecutionContext(),
    );

    expect(response.status).toBe(200);
  });

  it("returns 404 for unrelated paths", async () => {
    const response = await worker.fetch(
      new Request("https://aprenderepite.com/otra-ruta"),
      env,
      createExecutionContext(),
    );

    expect(response.status).toBe(404);
  });
});

describe("member session synchronization", () => {
  const futureToken = sessionToken(new Date("2027-09-24T20:00:00Z"));

  it("logs a classified cause and keeps the last valid calendar", async () => {
    const initial = await refreshCalendar(testEnv(), successfulFetcher(), now);
    const logs = capturedLogs();
    const cases = [
      [redirectResponse(SESSION_REDIRECT), SkoolSessionError, "session"],
      [redirectResponse(ACCESS_REDIRECT), SkoolAccessError, "access"],
    ] as const;

    for (const [response, errorClass] of cases) {
      await expect(
        refreshCalendar(
          testEnv({ SKOOL_AUTH_TOKEN: futureToken }),
          vi.fn(async () => response.clone()),
          now,
        ),
      ).rejects.toBeInstanceOf(errorClass);
    }
    await expect(
      refreshCalendar(
        testEnv(),
        vi.fn(async () => {
          throw new Error("source unavailable");
        }),
        now,
      ),
    ).rejects.toThrow(/source unavailable/);

    const failures = loggedEvents(logs()).filter(
      (entry) => entry.event === "calendar.refresh.failed",
    );
    expect(failures.map((entry) => entry.cause)).toEqual([
      "session",
      "access",
      "source",
    ]);
    expect(await readCalendarBundle(env.CALENDAR_KV)).toEqual(initial);
  });

  it("never exposes the session token in logs, KV, or responses", async () => {
    const logs = capturedLogs();
    const memberEnv = testEnv({ SKOOL_AUTH_TOKEN: futureToken });

    await refreshCalendar(memberEnv, successfulFetcher(), now);
    await expect(
      refreshCalendar(
        memberEnv,
        vi.fn(async () => redirectResponse(SESSION_REDIRECT)),
        now,
      ),
    ).rejects.toBeInstanceOf(SkoolSessionError);
    const response = await worker.fetch(
      new Request("https://aprenderepite.com/calendario.ics"),
      memberEnv as Env,
      createExecutionContext(),
    );

    const exposed = [
      logs(),
      (await env.CALENDAR_KV.get(CALENDAR_BUNDLE_KEY)) ?? "",
      await response.text(),
      JSON.stringify([...response.headers]),
    ].join("\n");
    expect(exposed).not.toContain(futureToken);
    expect(exposed).not.toContain(futureToken.split(".")[1]);
  });

  it("records the source mode and regenerates when it changes", async () => {
    const anonymous = await refreshCalendar(testEnv(), successfulFetcher(), now);
    expect(anonymous.source.authenticated).toBe(false);

    const memberEnv = testEnv({ SKOOL_AUTH_TOKEN: futureToken });
    const fetcher = successfulFetcher();
    vi.stubGlobal("fetch", fetcher);
    const response = await worker.fetch(
      new Request("https://aprenderepite.com/calendario.ics"),
      memberEnv as Env,
      createExecutionContext(),
    );

    expect(response.status).toBe(200);
    expect(fetcher).toHaveBeenCalled();
    expect((await readCalendarBundle(env.CALENDAR_KV))?.source.authenticated).toBe(
      true,
    );
  });

  it("rejects a token that cannot be sent as a cookie without echoing it", () => {
    const unsafe = "abc;def secret";
    expect(() =>
      readRuntimeConfig(testEnv({ SKOOL_AUTH_TOKEN: unsafe })),
    ).toThrow(/SKOOL_AUTH_TOKEN/);
    try {
      readRuntimeConfig(testEnv({ SKOOL_AUTH_TOKEN: unsafe }));
    } catch (error) {
      expect(String(error)).not.toContain("secret");
    }
  });

  it("treats an empty token as anonymous mode", async () => {
    const bundle = await refreshCalendar(
      testEnv({ SKOOL_AUTH_TOKEN: "  " }),
      successfulFetcher(),
      now,
    );
    expect(bundle.source.authenticated).toBe(false);
  });

  it("warns when the token expires within 30 days", async () => {
    const logs = capturedLogs();
    const expiresAt = new Date("2026-10-04T20:00:00Z");

    await refreshCalendar(
      testEnv({ SKOOL_AUTH_TOKEN: sessionToken(expiresAt) }),
      successfulFetcher(),
      now,
    );

    const warning = loggedEvents(logs()).find(
      (entry) => entry.event === "calendar.auth.expiring",
    );
    expect(warning).toMatchObject({
      level: "warn",
      expiresAt: expiresAt.toISOString(),
      daysLeft: 10,
    });
  });

  it("warns when the token expiry cannot be read", async () => {
    const logs = capturedLogs();

    await refreshCalendar(
      testEnv({ SKOOL_AUTH_TOKEN: "not.a-jwt.value" }),
      successfulFetcher(),
      now,
    );

    expect(
      loggedEvents(logs()).some((entry) => entry.event === "calendar.auth.unreadable"),
    ).toBe(true);
  });

  it("does not warn when the token has more than 30 days left", async () => {
    const logs = capturedLogs();

    await refreshCalendar(
      testEnv({ SKOOL_AUTH_TOKEN: futureToken }),
      successfulFetcher(),
      now,
    );

    expect(
      loggedEvents(logs()).some((entry) =>
        String(entry.event).startsWith("calendar.auth."),
      ),
    ).toBe(false);
  });

  it("publishes a redacted calendar in member mode", async () => {
    const bundle = await refreshCalendar(
      testEnv({ SKOOL_AUTH_TOKEN: futureToken }),
      successfulFetcher(),
      now,
    );

    expect(bundle.calendar).toContain("SUMMARY:Induccion CAR");
    expect(bundle.calendar).not.toContain("LOCATION:");
  });
});

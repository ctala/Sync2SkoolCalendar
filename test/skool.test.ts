import { describe, expect, it, vi } from "vitest";
import {
  buildCalendarDataUrl,
  collectSkoolEvents,
  createMonthRange,
  deduplicateEvents,
  discoverBuildId,
  normalizeEvent,
  parseCalendarPage,
} from "../src/skool";
import {
  GROUP_SLUG,
  calendarHtml,
  calendarPage,
  malformedCalendarPage,
  restrictedRecurringEvent,
  snakeCaseEvent,
  unrestrictedEvent,
} from "./fixtures/skool";

describe("Skool build discovery and request construction", () => {
  it("extracts the build ID from __NEXT_DATA__", () => {
    expect(discoverBuildId(calendarHtml())).toBe("build-123");
  });

  it("rejects missing or malformed Next data", () => {
    expect(() => discoverBuildId("<html></html>")).toThrow(/NEXT_DATA/);
    expect(() =>
      discoverBuildId('<script id="__NEXT_DATA__">{"buildId":1}</script>'),
    ).toThrow(/build ID/);
  });

  it("builds a deterministic list URL using noon UTC epoch seconds", () => {
    const url = buildCalendarDataUrl({
      buildId: "build-123",
      groupSlug: GROUP_SLUG,
      month: new Date("2026-10-01T00:00:00Z"),
      view: "list",
      page: 2,
    });

    expect(url.toString()).toBe(
      "https://www.skool.com/_next/data/build-123/cagala-aprende-repite/calendar.json?group=cagala-aprende-repite&calDate=1790856000&cv=list&p=2",
    );
  });

  it("builds a current-grid URL without list pagination", () => {
    const url = buildCalendarDataUrl({
      buildId: "build-123",
      groupSlug: GROUP_SLUG,
      month: new Date("2026-09-01T00:00:00Z"),
      view: "grid",
    });

    expect(url.searchParams.has("cv")).toBe(false);
    expect(url.searchParams.has("p")).toBe(false);
    expect(url.searchParams.get("calDate")).toBe("1788264000");
  });
});

describe("Skool calendar page parsing", () => {
  it("parses valid page props", () => {
    const page = parseCalendarPage(calendarPage([unrestrictedEvent]));

    expect(page.events).toHaveLength(1);
    expect(page.numCalendarEvents).toBe(1);
    expect(page.timezone).toBe("America/Santiago");
  });

  it("accepts a valid empty calendar", () => {
    const page = parseCalendarPage(calendarPage([]));

    expect(page.events).toEqual([]);
    expect(page.numCalendarEvents).toBe(0);
  });

  it("rejects malformed page props", () => {
    expect(() => parseCalendarPage(malformedCalendarPage)).toThrow(
      /calendar page/i,
    );
  });
});

describe("rolling month range", () => {
  it("includes past, current, and future calendar months", () => {
    const months = createMonthRange(
      new Date("2026-09-24T20:00:00Z"),
      1,
      2,
    );

    expect(months.map((date) => date.toISOString())).toEqual([
      "2026-08-01T12:00:00.000Z",
      "2026-09-01T12:00:00.000Z",
      "2026-10-01T12:00:00.000Z",
      "2026-11-01T12:00:00.000Z",
    ]);
  });

  it("centers the range on the calendar timezone at UTC month boundaries", () => {
    const months = createMonthRange(
      new Date("2026-10-01T00:30:00Z"),
      0,
      0,
      "America/Los_Angeles",
    );

    expect(months.map((date) => date.toISOString())).toEqual([
      "2026-09-01T12:00:00.000Z",
    ]);
  });
});

describe("event normalization", () => {
  it("normalizes public camelCase data and preserves public links", () => {
    const event = normalizeEvent(unrestrictedEvent, GROUP_SLUG);

    expect(event).toMatchObject({
      id: "event-public",
      title: "Induccion CAR",
      description: "Bienvenida publica: https://example.com/guia",
      sourceTimezone: "America/Santiago",
      location: "https://meet.example.com/public",
      url: `https://www.skool.com/${GROUP_SLUG}/calendar?eid=event-public`,
    });
    expect(event.start.toISOString()).toBe("2026-09-03T18:30:00.000Z");
  });

  it("normalizes snake_case detail data and offset timestamps", () => {
    const event = normalizeEvent(snakeCaseEvent, GROUP_SLUG);

    expect(event.occurrenceId).toBe("1793196000");
    expect(event.start.toISOString()).toBe("2026-10-28T18:00:00.000Z");
    expect(event.updatedAt?.toISOString()).toBe("2026-09-02T10:00:00.000Z");
  });

  it("keeps restricted events but does not invent a location", () => {
    const event = normalizeEvent(restrictedRecurringEvent, GROUP_SLUG);

    expect(event.title).toContain("VIP");
    expect(event.location).toBeNull();
    expect(event.privacy).toEqual({ privacy_type: 3, min_tier: 3 });
  });

  it("rejects invalid required fields", () => {
    expect(() => normalizeEvent({ id: "missing-fields" }, GROUP_SLUG)).toThrow(
      /event/i,
    );
  });

  it("rejects zero-duration events", () => {
    expect(() =>
      normalizeEvent(
        { ...unrestrictedEvent, endTime: unrestrictedEvent.startTime },
        GROUP_SLUG,
      ),
    ).toThrow(/time range/i);
  });

  it("deduplicates recurring spillover by occurrence identity", () => {
    const recurring = normalizeEvent(restrictedRecurringEvent, GROUP_SLUG);
    const publicEvent = normalizeEvent(unrestrictedEvent, GROUP_SLUG);

    expect(
      deduplicateEvents([recurring, publicEvent, { ...recurring }]),
    ).toEqual([recurring, publicEvent]);
  });
});

describe("complete public collection", () => {
  it("rejects an incomplete current-month grid", async () => {
    const fetcher = vi.fn(async () =>
      new Response(calendarHtml("build-123", [unrestrictedEvent], 2)),
    );

    await expect(
      collectSkoolEvents(
        { groupSlug: GROUP_SLUG, pastMonths: 0, futureMonths: 0 },
        fetcher,
        new Date("2026-09-24T20:00:00Z"),
      ),
    ).rejects.toThrow(/incomplete snapshot/i);
  });

  it("uses the HTML grid for current month and paginates other months", async () => {
    const pageOneEvents = Array.from({ length: 30 }, (_, index) => ({
      ...restrictedRecurringEvent,
      occurrenceId: `occ-${index}`,
      startTime: `2026-10-${String((index % 28) + 1).padStart(2, "0")}T10:00:00-03:00`,
      endTime: `2026-10-${String((index % 28) + 1).padStart(2, "0")}T11:00:00-03:00`,
    }));
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(input.toString());
      if (url.pathname === `/${GROUP_SLUG}/calendar`) {
        return new Response(calendarHtml("build-123", [
          unrestrictedEvent,
          {
            ...restrictedRecurringEvent,
            startTime: "2026-10-01T10:00:00-03:00",
            endTime: "2026-10-01T11:00:00-03:00",
          },
        ]));
      }
      if (url.searchParams.get("p") === "2") {
        return Response.json(calendarPage([restrictedRecurringEvent], 31));
      }
      return Response.json(calendarPage(pageOneEvents, 31));
    });

    const events = await collectSkoolEvents(
      {
        groupSlug: GROUP_SLUG,
        pastMonths: 0,
        futureMonths: 1,
      },
      fetcher,
      new Date("2026-09-24T20:00:00Z"),
    );

    expect(events).toHaveLength(32);
    expect(events.some((event) => event.title.includes("VIP"))).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(3);
    for (const [, init] of fetcher.mock.calls) {
      expect(init?.credentials).toBeUndefined();
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      expect(new Headers(init?.headers).has("authorization")).toBe(false);
      expect(new Headers(init?.headers).has("cookie")).toBe(false);
      expect(new Headers(init?.headers).get("user-agent")).toContain(
        "CARCalendar",
      );
    }
  });

  it("rediscovers a stale build once", async () => {
    let htmlRequests = 0;
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(input.toString());
      if (url.pathname === `/${GROUP_SLUG}/calendar`) {
        htmlRequests += 1;
        return new Response(
          calendarHtml(htmlRequests === 1 ? "stale-build" : "fresh-build"),
        );
      }
      if (url.pathname.includes("stale-build")) {
        return new Response("missing", { status: 404 });
      }
      return Response.json(calendarPage([restrictedRecurringEvent]));
    });

    const events = await collectSkoolEvents(
      { groupSlug: GROUP_SLUG, pastMonths: 0, futureMonths: 1 },
      fetcher,
      new Date("2026-09-24T20:00:00Z"),
    );

    expect(events).toHaveLength(2);
    expect(htmlRequests).toBe(2);
  });

  it("rejects duplicate records that hide a pagination gap", async () => {
    const pageOneEvents = Array.from({ length: 30 }, (_, index) => ({
      ...restrictedRecurringEvent,
      occurrenceId: `occ-${index}`,
    }));
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(input.toString());
      if (url.pathname === `/${GROUP_SLUG}/calendar`) {
        return new Response(calendarHtml());
      }
      if (url.searchParams.get("p") === "2") {
        return Response.json(calendarPage([pageOneEvents[0]], 31));
      }
      return Response.json(calendarPage(pageOneEvents, 31));
    });

    await expect(
      collectSkoolEvents(
        { groupSlug: GROUP_SLUG, pastMonths: 0, futureMonths: 1 },
        fetcher,
        new Date("2026-09-24T20:00:00Z"),
      ),
    ).rejects.toThrow(/duplicate|incomplete/i);
  });

  it("fails a complete refresh on network or schema errors", async () => {
    const networkFailure = vi.fn(async () => {
      throw new Error("network unavailable");
    });
    await expect(
      collectSkoolEvents(
        { groupSlug: GROUP_SLUG, pastMonths: 0, futureMonths: 0 },
        networkFailure,
      ),
    ).rejects.toThrow(/network unavailable/);

    const malformed = vi.fn(async () =>
      Response.json(malformedCalendarPage),
    );
    await expect(
      collectSkoolEvents(
        { groupSlug: GROUP_SLUG, pastMonths: 0, futureMonths: 0 },
        malformed,
      ),
    ).rejects.toThrow(/NEXT_DATA|calendar page/i);
  });
});

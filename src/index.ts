import {
  bundleMatchesConfig,
  readCalendarBundle,
  readRuntimeConfig,
  refreshCalendar,
  CALENDAR_FAILURE_KEY,
} from "./sync";
import type { CalendarBundle, RuntimeConfig } from "./sync";

function responseHeaders(bundle: CalendarBundle, env: Env): Headers {
  return new Headers({
    "cache-control": env.CACHE_CONTROL,
    "content-disposition": 'inline; filename="calendario.ics"',
    "content-type": "text/calendar; charset=utf-8",
    etag: `"${bundle.hash}"`,
    "last-modified": new Date(bundle.modifiedAt).toUTCString(),
    "x-calendar-events": String(bundle.eventCount),
  });
}

function isNotModified(request: Request, bundle: CalendarBundle): boolean {
  const requestedEtag = request.headers.get("if-none-match");
  if (requestedEtag !== null) {
    if (requestedEtag.trim() === "*") return true;
    const current = `"${bundle.hash}"`;
    return requestedEtag.split(",").some((candidate) => {
      const trimmed = candidate.trim();
      return (trimmed.startsWith("W/") ? trimmed.slice(2).trim() : trimmed) === current;
    });
  }
  const requestedDate = request.headers.get("if-modified-since");
  if (requestedDate === null) return false;
  const timestamp = Date.parse(requestedDate);
  if (Number.isNaN(timestamp)) return false;
  const modifiedAtSeconds = Math.floor(Date.parse(bundle.modifiedAt) / 1000);
  return Math.floor(timestamp / 1000) >= modifiedAtSeconds;
}

async function getOrCreateBundle(
  env: Env,
  config: RuntimeConfig,
): Promise<CalendarBundle> {
  try {
    const stored = await readCalendarBundle(env.CALENDAR_KV);
    if (stored !== null && bundleMatchesConfig(stored, config)) return stored;
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "calendar.bundle.invalid",
        message: error instanceof Error ? error.message : String(error),
      }),
    );
  }
  if ((await env.CALENDAR_KV.get(CALENDAR_FAILURE_KEY)) !== null) {
    throw new Error("Calendar refresh is in cooldown");
  }
  try {
    return await refreshCalendar(env);
  } catch (error) {
    try {
      await env.CALENDAR_KV.put(CALENDAR_FAILURE_KEY, new Date().toISOString(), {
        expirationTtl: 300,
      });
    } catch (markerError) {
      console.error(
        JSON.stringify({
          level: "error",
          event: "calendar.refresh.cooldown-write-failed",
          message:
            markerError instanceof Error ? markerError.message : String(markerError),
        }),
      );
    }
    throw error;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const config = readRuntimeConfig(env);
    const url = new URL(request.url);
    if (url.pathname !== config.feedPath) {
      return new Response("Not found", { status: 404 });
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { allow: "GET, HEAD" },
      });
    }

    let bundle: CalendarBundle;
    try {
      bundle = await getOrCreateBundle(env, config);
    } catch {
      return new Response("Calendar temporarily unavailable", {
        status: 503,
        headers: {
          "cache-control": "no-store",
          "retry-after": "300",
        },
      });
    }

    const headers = responseHeaders(bundle, env);
    if (isNotModified(request, bundle)) {
      return new Response(null, { status: 304, headers });
    }
    return new Response(request.method === "HEAD" ? null : bundle.calendar, {
      status: 200,
      headers,
    });
  },

  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(refreshCalendar(env, fetch, new Date(controller.scheduledTime)));
  },
} satisfies ExportedHandler<Env>;

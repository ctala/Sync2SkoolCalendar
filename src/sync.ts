import { contentHash, generateCalendar } from "./ical";
import { collectSkoolEvents } from "./skool";
import type { CollectionConfig, Fetcher } from "./skool";

export const CALENDAR_BUNDLE_KEY = "calendar:bundle:v1";
export const CALENDAR_FAILURE_KEY = "calendar:refresh-failure:v1";
const MAX_WINDOW_MONTHS = 15;

export interface CalendarEnv {
  CALENDAR_KV: KVNamespace;
  GROUP_SLUG: string;
  CALENDAR_NAME: string;
  FEED_PATH: string;
  PAST_MONTHS: string;
  FUTURE_MONTHS: string;
  CACHE_CONTROL: string;
}

export interface CalendarBundle {
  version: 1;
  calendar: string;
  generatedAt: string;
  modifiedAt: string;
  eventCount: number;
  hash: string;
  source: {
    groupSlug: string;
    calendarName: string;
  };
  sourceWindow: {
    pastMonths: number;
    futureMonths: number;
  };
}

export interface RuntimeConfig extends CollectionConfig {
  calendarName: string;
  feedPath: string;
  cacheControl: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseMonthCount(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 120) {
    throw new Error(`${name} must be an integer between 0 and 120`);
  }
  return parsed;
}

export function readRuntimeConfig(env: CalendarEnv): RuntimeConfig {
  if (!/^[a-z0-9-]+$/.test(env.GROUP_SLUG)) {
    throw new Error("GROUP_SLUG must be a public Skool slug");
  }
  if (env.CALENDAR_NAME.length === 0) {
    throw new Error("CALENDAR_NAME is required");
  }
  if (!env.FEED_PATH.startsWith("/")) {
    throw new Error("FEED_PATH must start with /");
  }
  const pastMonths = parseMonthCount(env.PAST_MONTHS, "PAST_MONTHS");
  const futureMonths = parseMonthCount(env.FUTURE_MONTHS, "FUTURE_MONTHS");
  if (pastMonths + futureMonths + 1 > MAX_WINDOW_MONTHS) {
    throw new Error(
      `The combined month window cannot exceed ${MAX_WINDOW_MONTHS} months`,
    );
  }
  return {
    groupSlug: env.GROUP_SLUG,
    calendarName: env.CALENDAR_NAME,
    feedPath: env.FEED_PATH,
    pastMonths,
    futureMonths,
    cacheControl: env.CACHE_CONTROL,
  };
}

function parseBundle(value: unknown): CalendarBundle {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    typeof value.calendar !== "string" ||
    typeof value.generatedAt !== "string" ||
    Number.isNaN(Date.parse(value.generatedAt)) ||
    typeof value.modifiedAt !== "string" ||
    Number.isNaN(Date.parse(value.modifiedAt)) ||
    typeof value.eventCount !== "number" ||
    !Number.isInteger(value.eventCount) ||
    value.eventCount < 0 ||
    typeof value.hash !== "string" ||
    !/^[a-f0-9]{64}$/.test(value.hash) ||
    !isRecord(value.source) ||
    typeof value.source.groupSlug !== "string" ||
    typeof value.source.calendarName !== "string" ||
    !isRecord(value.sourceWindow) ||
    typeof value.sourceWindow.pastMonths !== "number" ||
    typeof value.sourceWindow.futureMonths !== "number"
  ) {
    throw new Error("Stored calendar bundle is invalid");
  }
  return {
    version: 1,
    calendar: value.calendar,
    generatedAt: value.generatedAt,
    modifiedAt: value.modifiedAt,
    eventCount: value.eventCount,
    hash: value.hash,
    source: {
      groupSlug: value.source.groupSlug,
      calendarName: value.source.calendarName,
    },
    sourceWindow: {
      pastMonths: value.sourceWindow.pastMonths,
      futureMonths: value.sourceWindow.futureMonths,
    },
  };
}

export function bundleMatchesConfig(
  bundle: CalendarBundle,
  config: RuntimeConfig,
): boolean {
  return (
    bundle.source.groupSlug === config.groupSlug &&
    bundle.source.calendarName === config.calendarName &&
    bundle.sourceWindow.pastMonths === config.pastMonths &&
    bundle.sourceWindow.futureMonths === config.futureMonths
  );
}

export async function readCalendarBundle(
  kv: KVNamespace,
): Promise<CalendarBundle | null> {
  const stored = await kv.get(CALENDAR_BUNDLE_KEY);
  if (stored === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    throw new Error("Stored calendar bundle is not valid JSON");
  }
  return parseBundle(parsed);
}

function log(
  level: "info" | "error",
  event: string,
  details: Readonly<Record<string, unknown>>,
): void {
  const payload = JSON.stringify({ level, event, ...details });
  if (level === "error") console.error(payload);
  else console.log(payload);
}

export async function refreshCalendar(
  env: CalendarEnv,
  fetcher: Fetcher = fetch,
  now: Date = new Date(),
): Promise<CalendarBundle> {
  const config = readRuntimeConfig(env);
  try {
    const events = await collectSkoolEvents(config, fetcher, now);
    const calendar = generateCalendar(events, {
      calendarName: config.calendarName,
      groupSlug: config.groupSlug,
      generatedAt: now,
    });
    const hash = await contentHash(calendar);
    let previous: CalendarBundle | null = null;
    try {
      previous = await readCalendarBundle(env.CALENDAR_KV);
    } catch {
      // A valid refresh replaces an unreadable previous bundle.
    }
    const generatedAt = now.toISOString();
    const bundle: CalendarBundle = {
      version: 1,
      calendar,
      generatedAt,
      modifiedAt:
        previous !== null &&
        previous.hash === hash &&
        bundleMatchesConfig(previous, config)
          ? previous.modifiedAt
          : generatedAt,
      eventCount: events.length,
      hash,
      source: {
        groupSlug: config.groupSlug,
        calendarName: config.calendarName,
      },
      sourceWindow: {
        pastMonths: config.pastMonths,
        futureMonths: config.futureMonths,
      },
    };
    await env.CALENDAR_KV.put(CALENDAR_BUNDLE_KEY, JSON.stringify(bundle));
    log("info", "calendar.refresh.succeeded", {
      eventCount: bundle.eventCount,
      generatedAt: bundle.generatedAt,
      hash: bundle.hash,
    });
    return bundle;
  } catch (error) {
    log("error", "calendar.refresh.failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

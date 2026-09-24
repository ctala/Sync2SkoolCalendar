export interface NormalizedEvent {
  id: string;
  occurrenceId?: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  createdAt?: Date;
  updatedAt?: Date;
  sourceTimezone: string;
  location: string | null;
  privacy: Readonly<Record<string, unknown>> | null;
  url: string;
}

export interface CalendarPage {
  events: readonly unknown[];
  numCalendarEvents: number;
  groupHasEvents: boolean;
  timezone: string;
}

export interface CollectionConfig {
  groupSlug: string;
  pastMonths: number;
  futureMonths: number;
}

export interface CalendarDataUrlOptions {
  buildId: string;
  groupSlug: string;
  month: Date;
  view: "grid" | "list";
  page?: number;
}

export type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

const SKOOL_ORIGIN = "https://www.skool.com";
const PAGE_SIZE = 30;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_SOURCE_REQUESTS = 45;
const USER_AGENT =
  "Mozilla/5.0 (compatible; CARCalendar/1.0; +https://aprenderepite.com)";

class StaleBuildError extends Error {}

async function withRequestTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(
  record: Readonly<Record<string, unknown>>,
  ...keys: readonly string[]
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function readDate(
  record: Readonly<Record<string, unknown>>,
  required: boolean,
  ...keys: readonly string[]
): Date | undefined {
  const value = readString(record, ...keys);
  if (value === undefined) {
    if (required) throw new Error(`Invalid event: missing ${keys[0]}`);
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid event: invalid ${keys[0]}`);
  }
  return date;
}

function parseJsonRecord(value: unknown): Readonly<Record<string, unknown>> | null {
  if (isRecord(value)) return value;
  if (typeof value !== "string" || value.length === 0) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parseLocation(value: unknown): string | null {
  const parsed = parseJsonRecord(value);
  if (parsed !== null) {
    const locationInfo = parsed.location_info;
    return typeof locationInfo === "string" && locationInfo.length > 0
      ? locationInfo
      : null;
  }
  return typeof value === "string" && value.length > 0 ? value : null;
}

function extractNextData(html: string): Readonly<Record<string, unknown>> {
  const match = html.match(
    /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (match?.[1] === undefined) {
    throw new Error("Missing __NEXT_DATA__ script");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[1]);
  } catch {
    throw new Error("Invalid __NEXT_DATA__ JSON");
  }
  if (!isRecord(parsed)) throw new Error("Invalid __NEXT_DATA__ document");
  return parsed;
}

export function discoverBuildId(html: string): string {
  const nextData = extractNextData(html);
  const buildId = nextData.buildId;
  if (typeof buildId !== "string" || buildId.length === 0) {
    throw new Error("Missing or invalid build ID");
  }
  return buildId;
}

function parseCurrentPageFromHtml(html: string): CalendarPage {
  const nextData = extractNextData(html);
  const props = nextData.props;
  if (!isRecord(props) || !isRecord(props.pageProps)) {
    throw new Error("Invalid calendar page in __NEXT_DATA__");
  }
  return parseCalendarPage({ pageProps: props.pageProps });
}

export function parseCalendarPage(value: unknown): CalendarPage {
  if (!isRecord(value) || !isRecord(value.pageProps)) {
    throw new Error("Invalid calendar page: missing pageProps");
  }
  const pageProps = value.pageProps;
  const events = pageProps.events;
  const count = pageProps.numCalendarEvents;
  const timezone = pageProps.timezone;
  const groupHasEvents = pageProps.groupHasEvents;
  if (
    !Array.isArray(events) ||
    typeof count !== "number" ||
    !Number.isInteger(count) ||
    count < 0 ||
    typeof timezone !== "string" ||
    timezone.length === 0 ||
    typeof groupHasEvents !== "boolean"
  ) {
    throw new Error("Invalid calendar page fields");
  }
  return { events, numCalendarEvents: count, timezone, groupHasEvents };
}

function noonUtc(month: Date): Date {
  return new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1, 12, 0, 0),
  );
}

export function buildCalendarDataUrl(options: CalendarDataUrlOptions): URL {
  const { buildId, groupSlug, month, view, page } = options;
  const url = new URL(
    `/_next/data/${encodeURIComponent(buildId)}/${encodeURIComponent(groupSlug)}/calendar.json`,
    SKOOL_ORIGIN,
  );
  url.searchParams.set("group", groupSlug);
  url.searchParams.set(
    "calDate",
    String(Math.floor(noonUtc(month).getTime() / 1000)),
  );
  if (view === "list") {
    url.searchParams.set("cv", "list");
    url.searchParams.set("p", String(page ?? 1));
  }
  return url;
}

export function createMonthRange(
  now: Date,
  pastMonths: number,
  futureMonths: number,
  timezone = "UTC",
): readonly Date[] {
  if (
    !Number.isInteger(pastMonths) ||
    !Number.isInteger(futureMonths) ||
    pastMonths < 0 ||
    futureMonths < 0
  ) {
    throw new Error("Month ranges must be non-negative integers");
  }
  const currentMonth = timestampMonthIdentity(now.toISOString(), timezone);
  const [yearText, monthText] = currentMonth.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const months: Date[] = [];
  for (let offset = -pastMonths; offset <= futureMonths; offset += 1) {
    months.push(new Date(Date.UTC(year, month + offset, 1, 12)));
  }
  return months;
}

function monthIdentity(date: Date): string {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
}

function timestampMonthIdentity(timestamp: string, timezone: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid event timestamp");
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "numeric",
    }).formatToParts(date);
  } catch {
    throw new Error(`Invalid calendar timezone: ${timezone}`);
  }
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  if (year === undefined || month === undefined) {
    throw new Error("Unable to resolve event month");
  }
  return `${Number(year)}-${Number(month) - 1}`;
}

function eventStartTime(value: unknown): string {
  if (!isRecord(value)) throw new Error("Invalid event in calendar page");
  const start = readString(value, "startTime", "start_time");
  if (start === undefined) throw new Error("Invalid event: missing start time");
  return start;
}

function isEventInMonth(
  value: unknown,
  month: Date,
  timezone: string,
): boolean {
  return timestampMonthIdentity(eventStartTime(value), timezone) === monthIdentity(month);
}

export function normalizeEvent(
  value: unknown,
  groupSlug: string,
): NormalizedEvent {
  if (!isRecord(value) || !isRecord(value.metadata)) {
    throw new Error("Invalid event: missing metadata");
  }
  const metadata = value.metadata;
  const id = readString(value, "id");
  const title = readString(metadata, "title");
  const sourceTimezone = readString(metadata, "timezone");
  if (id === undefined || title === undefined || sourceTimezone === undefined) {
    throw new Error("Invalid event: missing required fields");
  }
  const start = readDate(value, true, "startTime", "start_time");
  const end = readDate(value, true, "endTime", "end_time");
  if (start === undefined || end === undefined || end <= start) {
    throw new Error("Invalid event: invalid time range");
  }
  const occurrenceId = readString(value, "occurrenceId", "occurrence_id");
  const createdAt = readDate(value, false, "createdAt", "created_at");
  const updatedAt = readDate(value, false, "updatedAt", "updated_at");
  const descriptionValue = metadata.description;
  const description =
    typeof descriptionValue === "string" ? descriptionValue : "";
  const privacy = parseJsonRecord(metadata.privacy);
  const event: NormalizedEvent = {
    id,
    title,
    description,
    start,
    end,
    sourceTimezone,
    location: parseLocation(metadata.location),
    privacy,
    url: `${SKOOL_ORIGIN}/${encodeURIComponent(groupSlug)}/calendar?eid=${encodeURIComponent(id)}`,
  };
  if (occurrenceId !== undefined) event.occurrenceId = occurrenceId;
  if (createdAt !== undefined) event.createdAt = createdAt;
  if (updatedAt !== undefined) event.updatedAt = updatedAt;
  return event;
}

export function eventIdentity(event: NormalizedEvent): string {
  return event.occurrenceId === undefined
    ? `${event.id}-${event.start.toISOString()}`
    : `${event.id}-${event.occurrenceId}`;
}

export function deduplicateEvents(
  events: readonly NormalizedEvent[],
): readonly NormalizedEvent[] {
  const unique = new Map<string, NormalizedEvent>();
  for (const event of events) {
    const key = eventIdentity(event);
    if (!unique.has(key)) unique.set(key, event);
  }
  return [...unique.values()];
}

async function fetchText(fetcher: Fetcher, url: URL): Promise<string> {
  return withRequestTimeout(async (signal) => {
    const response = await fetcher(url, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": USER_AGENT,
      },
      signal,
    });
    if (!response.ok) throw new Error(`Skool request failed: ${response.status}`);
    return response.text();
  });
}

async function fetchCalendarPage(
  fetcher: Fetcher,
  url: URL,
): Promise<CalendarPage> {
  return withRequestTimeout(async (signal) => {
    const response = await fetcher(url, {
      headers: { accept: "application/json", "user-agent": USER_AGENT },
      signal,
    });
    if (response.status === 404 || response.status === 410) {
      throw new StaleBuildError("Stale Skool build ID");
    }
    if (!response.ok) throw new Error(`Skool request failed: ${response.status}`);
    if (response.headers.get("content-type")?.includes("text/html")) {
      throw new StaleBuildError("Stale Skool data route");
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new StaleBuildError("Invalid Skool data route response");
    }
    return parseCalendarPage(body);
  });
}

async function collectWithFreshBuild(
  config: CollectionConfig,
  fetcher: Fetcher,
  now: Date,
): Promise<readonly NormalizedEvent[]> {
  const calendarUrl = new URL(`/${encodeURIComponent(config.groupSlug)}/calendar`, SKOOL_ORIGIN);
  const html = await fetchText(fetcher, calendarUrl);
  const buildId = discoverBuildId(html);
  const currentPage = parseCurrentPageFromHtml(html);
  if (currentPage.events.length !== currentPage.numCalendarEvents) {
    throw new Error("Current calendar grid returned an incomplete snapshot");
  }
  const months = createMonthRange(
    now,
    config.pastMonths,
    config.futureMonths,
    currentPage.timezone,
  );
  const currentMonth = months[config.pastMonths];
  if (currentMonth === undefined) throw new Error("Current calendar month is missing");
  const normalizedEvents: NormalizedEvent[] = [];

  for (const month of months) {
    if (monthIdentity(month) === monthIdentity(currentMonth)) {
      normalizedEvents.push(
        ...currentPage.events
          .filter((event) => isEventInMonth(event, month, currentPage.timezone))
          .map((event) => normalizeEvent(event, config.groupSlug)),
      );
      continue;
    }

    const firstPage = await fetchCalendarPage(
      fetcher,
      buildCalendarDataUrl({
        buildId,
        groupSlug: config.groupSlug,
        month,
        view: "list",
        page: 1,
      }),
    );
    const monthEvents = [...firstPage.events];
    const pageCount = Math.ceil(firstPage.numCalendarEvents / PAGE_SIZE);
    for (let page = 2; page <= pageCount; page += 1) {
      const nextPage = await fetchCalendarPage(
        fetcher,
        buildCalendarDataUrl({
          buildId,
          groupSlug: config.groupSlug,
          month,
          view: "list",
          page,
        }),
      );
      if (nextPage.numCalendarEvents !== firstPage.numCalendarEvents) {
        throw new Error("Calendar pagination count changed during collection");
      }
      monthEvents.push(...nextPage.events);
    }
    if (monthEvents.length !== firstPage.numCalendarEvents) {
      throw new Error("Calendar pagination returned an incomplete snapshot");
    }
    const normalizedMonthEvents = monthEvents.map((event) =>
      normalizeEvent(event, config.groupSlug),
    );
    if (deduplicateEvents(normalizedMonthEvents).length !== monthEvents.length) {
      throw new Error("Calendar pagination returned duplicate records");
    }
    normalizedEvents.push(...normalizedMonthEvents);
  }

  return deduplicateEvents(normalizedEvents);
}

export async function collectSkoolEvents(
  config: CollectionConfig,
  fetcher: Fetcher = fetch,
  now: Date = new Date(),
): Promise<readonly NormalizedEvent[]> {
  let requestCount = 0;
  const budgetedFetcher: Fetcher = (input, init) => {
    requestCount += 1;
    if (requestCount > MAX_SOURCE_REQUESTS) {
      throw new Error("Skool collection exceeded the source request budget");
    }
    return fetcher(input, init);
  };
  try {
    return await collectWithFreshBuild(config, budgetedFetcher, now);
  } catch (error) {
    if (!(error instanceof StaleBuildError)) throw error;
    return collectWithFreshBuild(config, budgetedFetcher, now);
  }
}

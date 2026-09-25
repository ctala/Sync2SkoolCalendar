import ICAL from "ical.js";

const target = process.argv[2] ?? process.env.CALENDAR_URL;

if (!target) {
  throw new Error("Usage: npm run smoke -- https://example.com/calendario.ics");
}

const response = await fetch(target, {
  headers: { accept: "text/calendar" },
});

if (!response.ok) {
  throw new Error(`Calendar returned HTTP ${response.status}`);
}

const contentType = response.headers.get("content-type") ?? "";
if (!contentType.startsWith("text/calendar")) {
  throw new Error(`Unexpected content type: ${contentType}`);
}

const source = await response.text();
const calendar = new ICAL.Component(ICAL.parse(source));
if (calendar.name !== "vcalendar") {
  throw new Error("Response is not a VCALENDAR document");
}

const events = calendar.getAllSubcomponents("vevent");
if (events.length === 0) {
  throw new Error("Calendar contains no events");
}
const uids = events.map((event) => event.getFirstPropertyValue("uid"));
if (uids.some((uid) => typeof uid !== "string" || uid.length === 0)) {
  throw new Error("Calendar contains an event without a UID");
}
if (new Set(uids).size !== uids.length) {
  throw new Error("Calendar contains duplicate event UIDs");
}
for (const event of events) {
  const eventUrl = event.getFirstPropertyValue("url");
  const description = event.getFirstPropertyValue("description");
  if (
    typeof eventUrl !== "string" ||
    !eventUrl.startsWith("https://www.skool.com/") ||
    typeof description !== "string" ||
    !description.includes(eventUrl)
  ) {
    throw new Error("Calendar contains an event without a visible Skool link");
  }
}

const etag = response.headers.get("etag");
const lastModified = response.headers.get("last-modified");
const reportedCount = Number(response.headers.get("x-calendar-events"));
if (etag === null || lastModified === null || reportedCount !== events.length) {
  throw new Error("Calendar response is missing valid cache or event-count headers");
}

const conditionalResponse = await fetch(target, {
  headers: { accept: "text/calendar", "if-none-match": etag },
});
if (conditionalResponse.status !== 304) {
  throw new Error(
    `Conditional calendar request returned HTTP ${conditionalResponse.status}`,
  );
}

console.log(
  JSON.stringify({
    url: target,
    status: response.status,
    eventCount: events.length,
    etag,
    lastModified,
  }),
);

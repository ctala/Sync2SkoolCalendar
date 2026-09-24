import { eventIdentity } from "./skool";
import type { NormalizedEvent } from "./skool";

export interface CalendarOptions {
  calendarName: string;
  groupSlug: string;
  generatedAt: Date;
}

const encoder = new TextEncoder();

function formatUtc(date: Date): string {
  if (Number.isNaN(date.getTime())) throw new Error("Invalid calendar date");
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function escapeText(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function safeUri(value: string): string {
  return value.replace(/[\r\n]/g, "");
}

function foldLine(line: string): readonly string[] {
  if (encoder.encode(line).byteLength <= 75) return [line];
  const segments: string[] = [];
  let current = "";
  for (const character of line) {
    if (encoder.encode(current + character).byteLength > 75) {
      if (current.length === 0) throw new Error("Unable to fold calendar line");
      segments.push(current);
      current = ` ${character}`;
    } else {
      current += character;
    }
  }
  if (current.length > 0) segments.push(current);
  return segments;
}

function serializeLines(lines: readonly string[]): string {
  return `${lines.flatMap(foldLine).join("\r\n")}\r\n`;
}

function eventUid(event: NormalizedEvent, groupSlug: string): string {
  return `${eventIdentity(event)}@${groupSlug}.skool`;
}

function eventLines(
  event: NormalizedEvent,
  options: CalendarOptions,
): readonly string[] {
  const timestamp = event.updatedAt ?? event.createdAt ?? options.generatedAt;
  const lines = [
    "BEGIN:VEVENT",
    `UID:${escapeText(eventUid(event, options.groupSlug))}`,
    `DTSTAMP:${formatUtc(timestamp)}`,
    `DTSTART:${formatUtc(event.start)}`,
    `DTEND:${formatUtc(event.end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    `URL:${safeUri(event.url)}`,
    `X-SKOOL-TIMEZONE:${escapeText(event.sourceTimezone)}`,
    "STATUS:CONFIRMED",
  ];
  if (event.createdAt !== undefined) {
    lines.push(`CREATED:${formatUtc(event.createdAt)}`);
  }
  if (event.updatedAt !== undefined) {
    lines.push(`LAST-MODIFIED:${formatUtc(event.updatedAt)}`);
  }
  if (event.location !== null) {
    lines.push(`LOCATION:${escapeText(event.location)}`);
  }
  lines.push("END:VEVENT");
  return lines;
}

export function generateCalendar(
  events: readonly NormalizedEvent[],
  options: CalendarOptions,
): string {
  const sortedEvents = [...events].sort(
    (left, right) =>
      left.start.getTime() - right.start.getTime() ||
      eventUid(left, options.groupSlug).localeCompare(
        eventUid(right, options.groupSlug),
      ),
  );
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "PRODID:-//skool-public-calendar//EN",
    `X-WR-CALNAME:${escapeText(options.calendarName)}`,
    ...sortedEvents.flatMap((event) => eventLines(event, options)),
    "END:VCALENDAR",
  ];
  return serializeLines(lines);
}

export async function contentHash(content: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(content));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

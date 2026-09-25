import ICAL from "ical.js";
import { describe, expect, it } from "vitest";
import { contentHash, generateCalendar } from "../src/ical";
import { normalizeEvent } from "../src/skool";
import {
  GROUP_SLUG,
  restrictedRecurringEvent,
  unrestrictedEvent,
} from "./fixtures/skool";

const generatedAt = new Date("2026-09-24T20:00:00Z");

function parseCalendar(source: string): ICAL.Component {
  return new ICAL.Component(ICAL.parse(source));
}

describe("iCalendar generation", () => {
  it("creates a valid subscribable VCALENDAR", () => {
    const source = generateCalendar(
      [normalizeEvent(unrestrictedEvent, GROUP_SLUG)],
      {
        calendarName: "Cágala, Aprende, Repite",
        groupSlug: GROUP_SLUG,
        generatedAt,
      },
    );
    const calendar = parseCalendar(source);

    expect(calendar.name).toBe("vcalendar");
    expect(calendar.getFirstPropertyValue("version")).toBe("2.0");
    expect(calendar.getFirstPropertyValue("prodid")).toContain(
      "skool-public-calendar",
    );
    expect(calendar.getFirstPropertyValue("x-wr-calname")).toBe(
      "Cágala\\, Aprende\\, Repite",
    );
  });

  it("publishes one VEVENT per occurrence with deterministic UIDs", () => {
    const events = [
      normalizeEvent(unrestrictedEvent, GROUP_SLUG),
      normalizeEvent(restrictedRecurringEvent, GROUP_SLUG),
    ];
    const calendar = parseCalendar(
      generateCalendar(events, {
        calendarName: "CAR",
        groupSlug: GROUP_SLUG,
        generatedAt,
      }),
    );
    const vevents = calendar.getAllSubcomponents("vevent");

    expect(vevents).toHaveLength(2);
    expect(vevents.map((event) => event.getFirstPropertyValue("uid"))).toEqual([
      `event-public-2026-09-03T18:30:00.000Z@${GROUP_SLUG}.skool`,
      `event-vip-1791982800@${GROUP_SLUG}.skool`,
    ]);
  });

  it("uses distinct fallback UIDs when occurrence IDs are absent", () => {
    const first = normalizeEvent(unrestrictedEvent, GROUP_SLUG);
    const second = normalizeEvent(
      {
        ...unrestrictedEvent,
        startTime: "2026-09-10T18:30:00Z",
        endTime: "2026-09-10T19:30:00Z",
      },
      GROUP_SLUG,
    );
    const calendar = parseCalendar(
      generateCalendar([first, second], {
        calendarName: "CAR",
        groupSlug: GROUP_SLUG,
        generatedAt,
      }),
    );
    const uids = calendar
      .getAllSubcomponents("vevent")
      .map((event) => event.getFirstPropertyValue("uid"));

    expect(new Set(uids).size).toBe(2);
  });

  it("emits UTC instants, source timezone metadata, and Skool URLs", () => {
    const source = generateCalendar(
      [normalizeEvent(restrictedRecurringEvent, GROUP_SLUG)],
      { calendarName: "CAR", groupSlug: GROUP_SLUG, generatedAt },
    );

    expect(source).toContain("DTSTART:20261014T130000Z");
    expect(source).toContain("DTEND:20261014T143000Z");
    expect(source).toContain("X-SKOOL-TIMEZONE:America/Santiago");
    expect(source).toContain(
      `URL:https://www.skool.com/${GROUP_SLUG}/calendar?eid=event-vip`,
    );
    const event = parseCalendar(source).getFirstSubcomponent("vevent");
    expect(event?.getFirstPropertyValue("description")).toContain(
      `Evento en Skool: https://www.skool.com/${GROUP_SLUG}/calendar?eid=event-vip`,
    );
  });

  it("does not duplicate a Skool URL already present in the description", () => {
    const url = `https://www.skool.com/${GROUP_SLUG}/calendar?eid=event-public`;
    const event = normalizeEvent(
      {
        ...unrestrictedEvent,
        metadata: {
          ...unrestrictedEvent.metadata,
          description: `Abre el evento: ${url}`,
        },
      },
      GROUP_SLUG,
    );
    const source = generateCalendar([event], {
      calendarName: "CAR",
      groupSlug: GROUP_SLUG,
      generatedAt,
    });
    const description = String(
      parseCalendar(source)
        .getFirstSubcomponent("vevent")
        ?.getFirstPropertyValue("description"),
    );

    expect(description.split(url)).toHaveLength(2);
  });

  it("escapes text, preserves links, uses CRLF, and folds UTF-8 lines", () => {
    const longTitle =
      "Invitación, práctica; \"especial\" con ñ y á repetida ".repeat(4);
    const event = normalizeEvent(
      {
        ...unrestrictedEvent,
        metadata: {
          ...unrestrictedEvent.metadata,
          title: longTitle,
          description:
            "Primera linea\nSegunda; con, signos \\ y https://example.com/info",
        },
      },
      GROUP_SLUG,
    );
    const source = generateCalendar([event], {
      calendarName: "CAR",
      groupSlug: GROUP_SLUG,
      generatedAt,
    });

    expect(source).not.toMatch(/(?<!\r)\n/);
    expect(source).toContain(
      "DESCRIPTION:Primera linea\\nSegunda\\; con\\, signos \\\\ y https://example",
    );
    expect(source.split("\r\n").some((line) => line.startsWith(" "))).toBe(
      true,
    );
    for (const line of source.split("\r\n")) {
      expect(new TextEncoder().encode(line).byteLength).toBeLessThanOrEqual(75);
    }
    expect(() => parseCalendar(source)).not.toThrow();
  });

  it("removes control characters that are invalid in iCalendar text", () => {
    const event = normalizeEvent(
      {
        ...unrestrictedEvent,
        metadata: {
          ...unrestrictedEvent.metadata,
          title: "Titulo\u0000 con\u001f controles",
        },
      },
      GROUP_SLUG,
    );
    const source = generateCalendar([event], {
      calendarName: "CAR",
      groupSlug: GROUP_SLUG,
      generatedAt,
    });

    expect(source).not.toMatch(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/);
    expect(() => parseCalendar(source)).not.toThrow();
  });

  it("creates a valid empty calendar", () => {
    const source = generateCalendar([], {
      calendarName: "CAR",
      groupSlug: GROUP_SLUG,
      generatedAt,
    });

    expect(parseCalendar(source).getAllSubcomponents("vevent")).toEqual([]);
    expect(source.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("keeps a moved occurrence UID stable across time changes", () => {
    const before = normalizeEvent(restrictedRecurringEvent, GROUP_SLUG);
    const after = {
      ...before,
      start: new Date("2026-10-14T15:00:00Z"),
      end: new Date("2026-10-14T16:30:00Z"),
    };
    const options = { calendarName: "CAR", groupSlug: GROUP_SLUG, generatedAt };
    const beforeUid = parseCalendar(generateCalendar([before], options))
      .getFirstSubcomponent("vevent")
      ?.getFirstPropertyValue("uid");
    const afterUid = parseCalendar(generateCalendar([after], options))
      .getFirstSubcomponent("vevent")
      ?.getFirstPropertyValue("uid");

    expect(afterUid).toBe(beforeUid);
  });

  it("is deterministic and changes its hash only when content changes", async () => {
    const event = normalizeEvent(unrestrictedEvent, GROUP_SLUG);
    const options = { calendarName: "CAR", groupSlug: GROUP_SLUG, generatedAt };
    const first = generateCalendar([event], options);
    const second = generateCalendar([event], options);
    const changed = generateCalendar(
      [{ ...event, title: `${event.title} actualizada` }],
      options,
    );

    expect(second).toBe(first);
    expect(await contentHash(second)).toBe(await contentHash(first));
    expect(await contentHash(changed)).not.toBe(await contentHash(first));
  });

  it("represents daylight-saving offsets as their exact UTC instants", () => {
    const winter = normalizeEvent(
      {
        ...restrictedRecurringEvent,
        occurrenceId: "winter",
        startTime: "2026-08-12T10:00:00-04:00",
        endTime: "2026-08-12T11:00:00-04:00",
      },
      GROUP_SLUG,
    );
    const summer = normalizeEvent(
      {
        ...restrictedRecurringEvent,
        occurrenceId: "summer",
        startTime: "2026-10-14T10:00:00-03:00",
        endTime: "2026-10-14T11:00:00-03:00",
      },
      GROUP_SLUG,
    );
    const source = generateCalendar([winter, summer], {
      calendarName: "CAR",
      groupSlug: GROUP_SLUG,
      generatedAt,
    });

    expect(source).toContain("DTSTART:20260812T140000Z");
    expect(source).toContain("DTSTART:20261014T130000Z");
  });

  it("omits removed occurrences from a rebuilt snapshot", () => {
    const publicEvent = normalizeEvent(unrestrictedEvent, GROUP_SLUG);
    const recurring = normalizeEvent(restrictedRecurringEvent, GROUP_SLUG);
    const options = { calendarName: "CAR", groupSlug: GROUP_SLUG, generatedAt };

    const before = generateCalendar([publicEvent, recurring], options);
    const after = generateCalendar([publicEvent], options);

    expect(before).toContain("event-vip-1791982800");
    expect(after).not.toContain("event-vip-1791982800");
  });
});

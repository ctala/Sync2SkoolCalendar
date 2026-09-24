export const GROUP_SLUG = "cagala-aprende-repite";

export const unrestrictedEvent = {
  id: "event-public",
  metadata: {
    title: "Induccion CAR",
    description: "Bienvenida publica: https://example.com/guia",
    timezone: "America/Santiago",
    location: JSON.stringify({
      location_type: 2,
      location_info: "https://meet.example.com/public",
    }),
    privacy: JSON.stringify({ privacy_type: 1 }),
    hasAccess: 1,
    reminderDisabled: 0,
  },
  createdAt: "2026-08-20T10:00:00Z",
  updatedAt: "2026-09-01T11:00:00Z",
  startTime: "2026-09-03T18:30:00Z",
  endTime: "2026-09-03T19:30:00Z",
  groupId: "group-1",
};

export const restrictedRecurringEvent = {
  id: "event-vip",
  metadata: {
    title: "LinkedIn Posting Party VIP",
    description: "Sesion mensual para miembros VIP",
    timezone: "America/Santiago",
    location: JSON.stringify({ location_type: 5 }),
    privacy: JSON.stringify({ privacy_type: 3, min_tier: 3 }),
    reminderDisabled: 0,
  },
  createdAt: "2026-04-01T10:00:00Z",
  updatedAt: "2026-09-02T10:00:00Z",
  occurrenceId: "1791982800",
  startTime: "2026-10-14T10:00:00-03:00",
  endTime: "2026-10-14T11:30:00-03:00",
  groupId: "group-1",
};

export const snakeCaseEvent = {
  id: "event-snake",
  metadata: {
    title: "Cafecito Startup",
    description: "Conversacion entre founders",
    timezone: "America/Santiago",
    location: JSON.stringify({ location_type: 5 }),
    privacy: JSON.stringify({ privacy_type: 3, min_tier: 3 }),
  },
  created_at: "2026-09-01T10:00:00Z",
  updated_at: "2026-09-02T10:00:00Z",
  occurrence_id: "1793196000",
  start_time: "2026-10-28T18:00:00Z",
  end_time: "2026-10-28T19:30:00Z",
  group_id: "group-1",
};

export function calendarPage(
  events: readonly unknown[],
  numCalendarEvents = events.length,
  timezone = "America/Santiago",
): unknown {
  return {
    pageProps: {
      events,
      numCalendarEvents,
      groupHasEvents: numCalendarEvents > 0,
      timezone,
      currentPage: { query: { group: GROUP_SLUG } },
    },
    __N_SSP: true,
  };
}

export function calendarHtml(
  buildId = "build-123",
  events: readonly unknown[] = [unrestrictedEvent],
  numCalendarEvents = events.length,
  timezone = "America/Santiago",
): string {
  return `<!doctype html><html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(
    {
      buildId,
      props: {
        pageProps: {
          events,
          numCalendarEvents,
          groupHasEvents: numCalendarEvents > 0,
          timezone,
        },
      },
    },
  )}</script></body></html>`;
}

export const malformedCalendarPage = {
  pageProps: {
    events: "not-an-array",
    numCalendarEvents: "unknown",
  },
};

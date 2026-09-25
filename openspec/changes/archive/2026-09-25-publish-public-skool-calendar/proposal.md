## Why

Skool only lets members export events one at a time, so community members cannot subscribe once and keep every community event synchronized in their personal calendar. A stable public iCalendar feed would reduce missed events while keeping Skool as the source of truth.

## What Changes

- Publish a stable, unauthenticated calendar feed at `https://aprenderepite.com/calendario.ics`.
- Read all visible event occurrences from the public Skool calendar without requiring the existing authenticated Skool API, browser automation, or user credentials.
- Preserve recurring occurrences, updates, removals, event time zones, and stable event identities in the generated feed.
- Link calendar entries back to their event pages in Skool.
- Retain the last successfully generated calendar when Skool cannot be reached or returns invalid data.
- Package the service as an independently deployable Cloudflare Worker with automated synchronization and a one-click deployment path for future open-source distribution.
- Develop the service test-first, with unit, integration, contract, and deployed smoke tests.
- Defer the visual calendar page and blog integration to later changes.

## Capabilities

### New Capabilities

- `public-calendar-subscription`: Provides and maintains a public, subscribable iCalendar representation of a Skool community calendar.

### Modified Capabilities

None.

## Impact

- Introduces a TypeScript Cloudflare Worker, a scheduled synchronization trigger, and Cloudflare KV storage.
- Adds a public `text/calendar` HTTP endpoint under `aprenderepite.com`.
- Adds read-only integration with Skool's public calendar and event-detail endpoints.
- Adds test and deployment tooling suitable for CI and Cloudflare one-click deployment.
- Does not change the existing Astro website or require the authenticated Skool API.

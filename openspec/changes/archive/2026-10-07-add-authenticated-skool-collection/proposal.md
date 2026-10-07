## Why

The `cagala-aprende-repite` community became private and paid-only, so Skool now redirects anonymous calendar requests to the community's `/about` page. Every refresh fails, and `https://aprenderepite.com/calendario.ics` keeps serving a frozen last-known-good calendar. Read-only probes confirmed that adding a member's `auth_token` cookie to the existing requests returns the same calendar payload the collector already parses, including tier-restricted occurrences.

## What Changes

- Add an optional Worker secret `SKOOL_AUTH_TOKEN` (a Skool member session JWT, valid ~1 year). When it is set, every Skool request carries it as a cookie. Without it, the service keeps its current anonymous behavior for public communities.
- Classify Skool's access redirects into distinct, logged failure causes: a missing or invalid session (`/login`) and a missing membership (`/about`). Both keep the last-known-good calendar.
- Log a warning when the configured token expires in fewer than 30 days, based on its unverified `exp` claim.
- In authenticated mode, publish a redacted representation: title, description, start, end, source timezone, and the direct Skool event link. `LOCATION` and meeting-join links are omitted, so the public feed does not bypass the paywall.
- Reduce the scheduled refresh from every 30 minutes to hourly to limit automated traffic on the member account.
- **BREAKING** (spec-level): the "Credential-free public source integration" requirement becomes "anonymous by default, optional member session".
- Update README and SECURITY guidance: how to obtain the token, how to rotate it, and why to use a dedicated account.
- Out of scope: logging in from the Worker, storing email/password, using the Apify actor in the refresh path, private or per-tier feeds, and automated token rotation. Rotation can later be automated outside this repository with an external login tool and the Cloudflare API.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `public-calendar-subscription`: the credential-free source requirement becomes optional session-based collection; the complete-collection and event-representation requirements gain authenticated-mode behavior (redaction); synchronization gains classified access failures, token-expiry warnings, and an hourly cadence.

## Impact

- `src/skool.ts`: request headers, access-redirect detection, and error classes.
- `src/sync.ts` / `src/index.ts`: optional secret in `CalendarEnv`, expiry warning, and redaction flag passed to generation.
- `src/ical.ts`: omit `LOCATION` and meeting links in redacted mode.
- `wrangler.jsonc`: cron becomes `0 * * * *`; secret documented, never committed.
- Tests: new fixtures for the `/login` and `/about` redirects, authenticated requests, and redaction.
- Operations: the member session token is kept in the operator's secrets manager and pushed with `wrangler secret put SKOOL_AUTH_TOKEN --env production`.

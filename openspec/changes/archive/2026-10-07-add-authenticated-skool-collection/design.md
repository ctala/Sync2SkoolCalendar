## Context

See proposal.md for the motivation. Findings from read-only probes on 2026-10-07 against `cagala-aprende-repite`:

| Request cookie | Skool response |
|---|---|
| none | `307 -> /cagala-aprende-repite/about`; `_next/data` returns `pageProps.__N_REDIRECT` |
| `auth_token=<valid JWT>` only | `200`, same `__NEXT_DATA__` / `_next/data` shape the collector parses today, including `min_tier` events |
| `auth_token` with tampered signature | `307 -> /login?redirect=...&lo=true` |

- Skool validates the JWT server-side and does not rotate `auth_token` in responses. It only sets `client_id` and AWS ALB stickiness cookies, and neither is needed.
- The JWT carries `iat`/`exp` about one year apart.
- No `aws-waf-token` or browser user agent was needed from a residential IP. Anonymous collection previously ran from Workers egress for weeks without WAF blocks.
- Skool login itself sits behind a WAF and is done today through the Apify actor `cristiantala~skool-all-in-one-api` (`auth:login`).
- That actor's `events:list` reads only the current month, with no `calDate` and no pagination.

## Goals / Non-Goals

**Goals:**
- Reuse the existing collector unchanged except for request headers and redirect classification.
- Keep the anonymous mode and one-click deploy working with zero secrets.
- Make token problems obvious in logs before subscribers notice a stale feed.

**Non-Goals:**
- Login, refresh, or rotation of the token from the Worker.
- Calling the Apify actor in the refresh path.
- Private or per-tier feeds, or subscriber authentication.
- Configurable redaction levels.

## Decisions

### Session token as an optional Worker secret
`SKOOL_AUTH_TOKEN` is read from `env`. It is declared as optional in the `CalendarEnv` type and is never placed in `vars`. When present, Skool requests send `cookie: auth_token=<token>`, and the token is passed through `CollectionConfig`. The token is never included in logs, error messages, the bundle, or `bundleMatchesConfig`. The bundle does record an `authenticated: boolean` source flag, so switching modes forces regeneration instead of reusing a bundle built under the other mode.
- *Alternative: email/password in secrets with a login from the Worker.* Rejected: login requires passing the WAF, and it would store a long-lived account credential.
- *Alternative: the Apify actor as the collector.* Rejected: it reads only the current month, adds per-run cost, about 24 Apify runs a day, more secrets (Apify token plus account credentials), and another component that can fail.

### Redirect classification instead of generic parse errors
The fetchers stop following redirects (`redirect: "manual"`). The HTML request and the `_next/data` route both map responses to typed errors:
- A `Location` or `__N_REDIRECT` that starts with `/login` raises `SkoolSessionError`.
- One that ends in `/about` raises `SkoolAccessError`.
- Other redirects keep the current stale-build handling.

These errors are not `StaleBuildError`, so they skip the rebuild retry. `refreshCalendar` logs `calendar.refresh.failed` with a `cause` field (`session`, `access`, `source`). The existing last-known-good and cooldown paths stay as they are.

### Expiry warning from the unverified `exp` claim
On every scheduled refresh with a token, the Worker base64url-decodes the payload, reads `exp`, and logs `calendar.auth.expiring` (with `expiresAt` and `daysLeft`) when fewer than 30 days remain. If the claim cannot be read, it logs `calendar.auth.unreadable`. There is no signature verification, because the Worker does not have Skool's key and only needs a hint. Collection still proceeds, and Skool's own response is authoritative.

### Redaction is tied to authenticated mode
`generateCalendar` receives `redact: boolean`, which is true when a token is configured. In redacted mode:
- `LOCATION` is omitted.
- Description URLs whose host matches a small denylist of meeting providers (`zoom.us`, `meet.google.com`, `teams.microsoft.com`, `teams.live.com`, `webex.com`, and their subdomains) are removed.
- The Skool event URL (`https://www.skool.com/{slug}/calendar?eid={id}`) and the remaining text are kept.

Tying redaction to the mode, instead of a separate flag, means a private calendar cannot be published with access links by mistake. Skool-native calls (location type 5) are already only reachable through the event page, and the event link remains the way in.
- *Alternative: drop descriptions entirely.* Rejected: descriptions carry useful context, and the user approved keeping them.

### Hourly cron
`*/30 * * * *` becomes `0 * * * *`. That is about 360 Skool requests a day for a 14-month window, within the existing "at least once per hour" requirement, and it halves the automated traffic on the member account.

### Account choice and operations
Production uses the Nyx admin account's token. The token is generated with the existing `auth_login.py --out /tmp/skool_cookies_nyx.txt`, stored in Infisical as `/skool/nyx/SKOOL_NYX_AUTH_TOKEN`, and pushed with `wrangler secret put SKOOL_AUTH_TOKEN --env production`. Documentation recommends a dedicated, least-privileged member account for other operators.

## Risks / Trade-offs

- [A new login for the same account revokes older sessions, for example when the `copilot` service refreshes Nyx cookies] → Resolved by the 2026-10-07 spike: two consecutive Nyx logins both returned JWTs (`exp` 2027-10-07), and the first token still loaded the calendar (HTTP 200, 10 events) after the second login. The Worker can share the Nyx account with `copilot`. The actor's reported "ttl ~3.5 days" refers to the short-lived WAF cookie, not the `auth_token` JWT.
- [The Nyx token is an admin session stored in Cloudflare for about a year] → The token is only sent to `www.skool.com`, never logged, and lives only in Worker secrets and Infisical. Moving to a dedicated member account is documented as the hardening path.
- [Skool's WAF challenges authenticated requests from Workers egress] → Validate on `workers.dev` before switching the production route. Last-known-good covers the gap.
- [Automated traffic flags the account] → Hourly cadence and the existing 45-request budget. Classified errors surface a ban quickly.
- [The meeting-provider denylist misses a provider] → `LOCATION`, the primary carrier, is always dropped. The denylist is easy to extend and covered by tests.
- [Unverified `exp` is wrong] → It only drives a warning, and Skool's `/login` redirect is the real signal.

## Migration Plan

1. Run the revocation spike and confirm that the Nyx email in Infisical (`SKOOL_NYX_EMAIL`) is current.
2. Ship the code. Without the secret, production behavior is unchanged: it keeps failing with the new `access` cause and serves the last-known-good calendar.
3. Set the secret on the default `workers.dev` environment, trigger a refresh, and verify the event count and redaction in the generated `.ics`.
4. Set the secret on `production`, trigger a refresh, and run the smoke test against `https://aprenderepite.com/calendario.ics`.
5. Rollback: `wrangler secret delete SKOOL_AUTH_TOKEN --env production`, or revert the deploy. The last valid bundle keeps serving.

## Open Questions

- Should token rotation later be automated through n8n, the Apify `auth:login` action, Infisical, and the Cloudflare secrets API? That would live outside this repository and does not affect this change.

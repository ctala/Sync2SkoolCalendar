## 1. Worker Foundation

- [x] 1.1 Initialize the npm TypeScript Worker project with strict compiler settings, `wrangler.jsonc`, generated Worker binding types, a KV binding without a fixed ID, public configuration defaults, and an hourly-or-faster Cron Trigger; verify `npm install`, `wrangler types`, and `tsc --noEmit` succeed.
- [x] 1.2 Configure Vitest with Cloudflare's current `@cloudflare/vitest-plugin`, isolated local KV, outbound fetch mocking, coverage scripts, and an independent iCalendar parser for tests; verify an intentionally minimal Worker-runtime test executes successfully.
- [x] 1.3 Add CI for type checking, unit tests, contract tests, Worker integration tests, and Wrangler deployment validation; verify the workflow syntax and all local equivalents pass.

## 2. Public Skool Collection

- [x] 2.1 RED: Add sanitized public Skool HTML, current-grid, paginated-list, recurring-event, empty-calendar, stale-build, and malformed-response fixtures plus failing tests for build discovery, URL construction, current-month filtering, and schema rejection; verify the new tests fail for the expected missing behavior.
- [x] 2.2 GREEN: Implement build-ID parsing and deterministic calendar request construction using noon-UTC Unix-second month values; verify the tests from 2.1 pass without weakening their assertions.
- [x] 2.3 RED: Add failing tests for the rolling month range, list pagination, duplicate spillover occurrences, tier-restricted occurrences, network failure, and one-time stale-build rediscovery; verify each failure identifies the unimplemented collector behavior.
- [x] 2.4 GREEN: Implement complete anonymous month collection, current-month grid handling, list pagination, source validation, and one-time build-ID retry; verify the tests from 2.3 pass and no request contains credentials or authentication headers.
- [x] 2.5 RED: Add failing normalization tests for camelCase and snake_case fields, JSON-encoded metadata, UTC and offset timestamps, restricted location data, stable occurrence identity, and invalid required fields; verify the tests fail before normalization code is added.
- [x] 2.6 GREEN: Implement the normalized event model and deterministic deduplication; verify all normalization tests pass and TypeScript contains no `any` or unsafe double casts.

## 3. iCalendar Generation

- [x] 3.1 RED: Add failing tests for `VCALENDAR` metadata, one `VEVENT` per occurrence, deterministic UIDs, UTC start/end values, Skool event URLs, public descriptions and links, escaping, CRLF endings, UTF-8 line folding, legitimate empty calendars, and semantic parsing by the independent test parser; verify failures are specific to missing serializer behavior.
- [x] 3.2 GREEN: Implement the pure iCalendar serializer and content hash generation; verify all tests from 3.1 pass and generated fixtures parse without warnings or duplicate UIDs.
- [x] 3.3 Add regression tests for moved recurring occurrences, daylight-saving offset changes, removed occurrences, non-ASCII titles, commas, semicolons, backslashes, and embedded newlines; verify the serializer remains deterministic across repeated runs.

## 4. Synchronization and Availability

- [x] 4.1 RED: Add failing Worker-runtime tests for scheduled synchronization, complete snapshot validation, atomic KV publication, metadata storage, and preservation of the previous bundle after partial, blocked, malformed, or network-failed refreshes; verify the previous bundle remains observable in each failure case.
- [x] 4.2 GREEN: Implement the synchronization service, versioned KV bundle, structured success/failure logging, and scheduled handler; verify all tests from 4.1 pass and a valid zero-event snapshot can replace an older feed.
- [x] 4.3 RED: Add failing endpoint tests for anonymous GET, first-request synchronous initialization, 503 before any successful snapshot, last-known-good serving, content type, content disposition, cache headers, `ETag`, `Last-Modified`, conditional requests, and unrelated-path 404 responses; verify each expected response contract is initially unmet.
- [x] 4.4 GREEN: Implement the fetch handler for `/calendario.ics` and the configured deployment path; verify the endpoint tests pass in the Workers runtime and source outages never replace a successful response with an empty feed.

## 5. Reusable Deployment

- [x] 5.1 Finalize `wrangler.jsonc` for automatic KV provisioning, public configuration descriptions, `workers.dev` deployment, Cron scheduling, current compatibility settings, and observability; verify `wrangler deploy --dry-run` succeeds without secrets or pre-created resource IDs.
- [x] 5.2 Document local development, configuration, tests, manual synchronization, calendar subscription, source limitations, custom-domain routing, and rollback in the README; verify every documented command works from a clean checkout.
- [ ] 5.3 Add the official Deploy to Cloudflare button targeting the final public GitHub or GitLab repository; verify a clean one-click deployment provisions KV and produces a working `workers.dev` calendar URL without editing source files.

## 6. Production Release

- [ ] 6.1 Deploy a preview Worker, trigger synchronization, and verify its response headers, event count, deterministic UIDs, parseability, recurrence coverage, restricted-event visibility, and last-known-good behavior against the live public Skool calendar.
- [ ] 6.2 Subscribe to the preview feed with representative Google, Apple, and Outlook clients and verify event creation, updates, removals, links, and timezone display; record any client-specific limitations in the README.
- [x] 6.3 Configure the exact `aprenderepite.com/calendario.ics` Worker route, run the deployed smoke test, and verify the existing Astro site remains unchanged on all other paths.
- [ ] 6.4 Verify CI, test coverage, type checking, Wrangler validation, scheduled refresh logs, production URL availability, and rollback instructions, then record the final release evidence before marking the change complete.

## Release Evidence (2026-09-24)

- Clean `npm ci`, generated-type check, strict TypeScript check, coverage suite, and root/production Wrangler dry-runs passed.
- 46 automated tests passed with 87.9% statement, 76.15% branch, 98.3% function, and 91.53% line coverage.
- Preview deployment `95fc1a8c-a13a-46d6-905b-b63bb8a739c4` served 96 parseable events from `https://skool-public-calendar.ctala.workers.dev/calendario.ics`.
- Production deployment `52941d01-68d2-4234-99ed-e4937f59028d` served 96 parseable events with unique UIDs, cache validators, and working conditional GET at `https://aprenderepite.com/calendario.ics`.
- Live content covered `2026-08-12T14:00:00.000Z` through `2027-09-30T18:00:00.000Z`, included 28 titles matching public VIP/Premium metadata, and linked every event back to the CAR Skool calendar.
- The `aprenderepite.com` home-page SHA-256 remained `c573f4cd7e2f2801e3e1de50d170fe75361908ee7ffc3e74f33104b3082fe5d6` before and after attaching the exact Worker route.
- Pending release evidence: public repository/one-click deployment, hosted CI execution, scheduled-refresh log capture, live failure retention exercise, and Google/Apple/Outlook subscription checks.

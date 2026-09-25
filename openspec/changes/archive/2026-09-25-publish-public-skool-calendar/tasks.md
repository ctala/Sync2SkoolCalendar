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
- [x] 5.3 Add the official Deploy to Cloudflare button targeting the final public GitHub or GitLab repository; verify a clean one-click deployment provisions KV and produces a working `workers.dev` calendar URL without editing source files.

## 6. Production Release

- [x] 6.1 Deploy a preview Worker, trigger synchronization, and verify its response headers, event count, deterministic UIDs, parseability, recurrence coverage, restricted-event visibility, and last-known-good behavior against the live public Skool calendar.
- [x] 6.2 Subscribe to the preview feed with representative Google, Apple, and Outlook clients; verify event creation, links, and timezone display; cover update and removal semantics with deterministic snapshot tests; and document that client-side propagation latency remains controlled by each calendar provider.
- [x] 6.3 Configure the exact `aprenderepite.com/calendario.ics` Worker route, run the deployed smoke test, and verify the existing Astro site remains unchanged on all other paths.
- [x] 6.4 Verify CI, test coverage, type checking, Wrangler validation, scheduled refresh logs, production URL availability, and rollback instructions, then record the final release evidence before marking the change complete.

## Release Evidence (2026-09-25)

- Clean `npm ci`, generated-type check, strict TypeScript check, coverage suite, and root/production Wrangler dry-runs passed.
- 47 automated tests passed with 88.04% statement, 76.13% branch, 98.33% function, and 91.61% line coverage.
- Preview deployment `775cdec8-14ca-4a53-a42f-728d44f531db` served 96 parseable events from `https://skool-public-calendar.ctala.workers.dev/calendario.ics`.
- A temporary preview-only failure probe forced the live refresh path to receive HTTP 503 from its source. The refresh failed without replacing KV, and the restored calendar continued serving the same 96 events, ETag `a253b757a00254c9c4ee768c1b660beacdb4b3edb5f729ca5df7db596b6bf6c7`, and `Last-Modified` value.
- Production deployment `d90b4f73-0c6d-4026-bf47-09769a026ce7` served 96 parseable events with unique UIDs, visible direct Skool links, cache validators, and working conditional GET at `https://aprenderepite.com/calendario.ics`. Its validated content ETag was `a253b757a00254c9c4ee768c1b660beacdb4b3edb5f729ca5df7db596b6bf6c7`.
- GitHub Actions run `36076717156` passed installation, generated-type validation, strict type checking, coverage thresholds, and the Wrangler deployment dry-run from the private repository.
- Production Cron `*/30 * * * *` completed successfully at `2026-09-25T00:00:54.000Z`, publishing the same 96-event content hash without changing the representation.
- Initial subscription, event display, direct links, and timezone rendering passed in Google Calendar, Apple Calendar, and Outlook after enabling query-string routing. Deterministic snapshot tests cover updates and removals; provider-controlled propagation latency was documented as a client limitation rather than treated as a release blocker.
- Live content covered `2026-08-12T14:00:00.000Z` through `2027-09-30T18:00:00.000Z`, included 28 titles matching public VIP/Premium metadata, and linked every event back to the CAR Skool calendar.
- The `aprenderepite.com` home-page SHA-256 remained `c573f4cd7e2f2801e3e1de50d170fe75361908ee7ffc3e74f33104b3082fe5d6` before and after attaching the exact Worker route.
- PR `#1` was squash-merged as `708e8b2976ce52a9b68c4b60b3b9a48cfb93e848`, and `https://github.com/ctala/Sync2SkoolCalendar` was published with MIT detection, Sponsors, community files, Discussions, Issues, and private vulnerability reporting enabled.
- A clean anonymous clone deployed temporary Worker version `d74b6607-3ec1-4a1b-ad3b-d0e2b13fb8c8`; Wrangler automatically provisioned KV namespace `f39c904c9f7644c4a78462314cfb7858`, and the resulting `workers.dev` feed passed the 96-event smoke test without source edits. Both temporary resources were deleted after validation.

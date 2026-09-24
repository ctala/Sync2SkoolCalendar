## Context

The repository currently contains OpenSpec scaffolding but no application code. The existing community website is a static Astro site served behind Cloudflare, and its source is not part of this repository. This change therefore needs to provide the calendar endpoint as an independent service without modifying the website.

The public Skool calendar is readable anonymously. Its HTML exposes the active Next.js build identifier and current page data. Additional months are available through build-specific `/_next/data/` routes using Unix-second `calDate` values and 30-item list pagination. Those responses include expanded recurring occurrences, including occurrences with tier restrictions, but redact privileged join details. Individual event details are also publicly readable when enrichment is needed. These endpoints are undocumented and may change.

Cloudflare Workers can serve the endpoint on the existing domain through a route, run scheduled synchronization, and store the last valid output in KV. Cloudflare's Deploy to Cloudflare flow supports public repositories and automatic KV provisioning from a Wrangler binding without a fixed resource ID.

## Goals / Non-Goals

**Goals:**

- Keep the public request path fast and independent of Skool availability.
- Isolate Skool parsing, normalization, and iCalendar serialization into testable pure modules.
- Make source changes and failures observable without publishing partial data.
- Keep the project deployable as a single-community Worker with no required secrets.
- Make a future open-source release usable through Cloudflare's one-click deployment flow.

**Non-Goals:**

- Build the visual `/calendario/` page or modify the Astro website.
- Authenticate subscribers or produce different calendars per membership tier.
- Recover join URLs or other values that Skool omits from anonymous responses.
- Create, edit, or delete events in Skool.
- Provide a general multi-tenant hosted calendar service.
- Promise compatibility with private Skool communities.

## Decisions

### Use a standalone TypeScript Cloudflare Worker

The project will use an ES module Worker written in strict TypeScript, configured with `wrangler.jsonc`. It will use native Request, Response, and fetch APIs without an HTTP framework.

This keeps the service independent from the Astro deployment, minimizes dependencies, and matches the target runtime in local and integration tests. Integrating an Astro server adapter was rejected because the current site is static, its source is outside this repository, and the calendar does not need a page renderer.

### Synchronize on a schedule and serve from KV

The Worker will have separate `scheduled` and `fetch` handlers. Scheduled execution will collect Skool data, validate the complete snapshot, generate the iCalendar document, and atomically replace a versioned bundle in KV. The HTTP handler will read and return the stored bundle.

If no bundle exists, the first GET may perform one synchronous refresh to make a new one-click deployment usable before its first Cron invocation. If that refresh fails, it will return 503. Later refresh failures never replace the stored bundle.

Serving directly from Skool on every request was rejected because a transient source failure could make subscribers see an empty or unavailable calendar. A database was rejected because the service needs only a current immutable snapshot and small metadata bundle.

### Treat monthly occurrence collections as authoritative

The collector will:

1. Fetch `/{groupSlug}/calendar` and parse `__NEXT_DATA__` to discover the active build ID.
2. Query non-current months through list views with Unix-second `calDate` values and follow 30-item pagination using the source event count.
3. Use the current-month grid response and filter its adjacent-month spillover locally because Skool's current-month list view omits occurrences that already happened.
4. Collect a configurable rolling window, defaulting to one past month and twelve future months.
5. Retry collection once with a newly discovered build ID when a build-specific route becomes stale.

The collector will center the rolling range on the timezone returned by Skool, reject current-grid and paginated count mismatches, and reject duplicate page records that could hide a pagination gap. Browser-compatible anonymous requests will have a ten-second timeout and share a conservative source-request budget so the default configuration stays within Workers subrequest limits.

The service will use Skool's expanded occurrences rather than locally expanding recurrence rules. Skool supports editing and deleting individual instances, so local `RRULE` expansion could recreate excluded instances or miss moved ones. Full monthly snapshots also make deletion behavior deterministic: an occurrence absent from a complete new snapshot is absent from the next feed.

### Normalize source data before serialization

Source-specific camelCase and snake_case fields, JSON-encoded metadata, timestamps, privacy metadata, and optional occurrence IDs will be converted into one internal event shape. Overlapping month results will be deduplicated by event ID plus occurrence ID, falling back to the event ID and source start time only when no occurrence ID exists.

The serializer will not consume raw Skool payloads. This boundary limits the impact of source schema changes and allows contract fixtures to test the adapter independently.

### Publish one VEVENT per occurrence

Each concrete occurrence will become a separate `VEVENT`. Recurring UIDs will derive from the Skool event ID and occurrence ID. When Skool omits the occurrence ID, the UID will fall back to the event ID plus source start time, matching the normalization identity and preventing distinct returned occurrences from sharing a UID. Start and end values will be emitted as UTC instants so clients can render them in the subscriber's timezone without bundling timezone definitions.

Entries will include summary, description, source event URL, timestamps, stable UID, and source update metadata when valid. Text will follow iCalendar escaping, CRLF, and line-folding rules. The event URL will point to `https://www.skool.com/{groupSlug}/calendar?eid={eventId}`. Public links already present in descriptions or locations may be preserved, but the service will not attempt authenticated enrichment.

Using one series-level `RRULE` was rejected because the public occurrence collection is more reliable for exceptions, moved instances, deletions, and daylight-saving transitions.

### Validate complete snapshots before publication

A synchronization is successful only when every requested month and page returns the expected page-props structure and all returned events normalize successfully. A valid complete snapshot may contain zero events. Network errors, malformed pages, unexplained pagination gaps, or invalid required fields fail the refresh and preserve KV unchanged.

The stored bundle will include the iCalendar text, generation timestamp, representation-modification timestamp, source window, source configuration fingerprint, event count, and a content hash. The HTTP response will derive `ETag`, `Last-Modified`, `Cache-Control`, content type, and filename headers from this bundle. A bundle whose source configuration does not match the active deployment will be refreshed rather than served as if it belonged to the new configuration.

### Make TDD part of the architecture

Domain modules will be implemented through red-green-refactor cycles. Unit tests will cover URL building, Next data parsing, normalization, deduplication, identities, time conversion, escaping, and serialization. Sanitized Skool response fixtures will provide contract tests. Vitest with Cloudflare's current `@cloudflare/vitest-plugin` and outbound fetch mocks will exercise the actual Workers runtime, scheduled refreshes, KV behavior, build-ID retry, cold-start behavior, and last-known-good retention.

An independent iCalendar parser used only in tests will validate the produced calendar semantically rather than relying solely on snapshots. Type checking and tests will run in CI. A deployed smoke test will verify status, headers, parseability, and at least one expected event without making the suite depend on mutable event copy.

### Design the repository for Deploy to Cloudflare

The application will live at the repository root with standard `package.json`, `wrangler.jsonc`, and `src/` paths. The KV binding will omit a fixed namespace ID so Wrangler and Deploy to Cloudflare can provision it automatically. Public configuration such as group slug, calendar name, synchronization window, and refresh schedule will have documented defaults; no Skool secret will be declared.

The README will include the official Deploy to Cloudflare button and explain required public variables. A one-click deployment will target a generated `workers.dev` URL. Custom domain routing remains a documented post-deploy account action because a reusable public template cannot own a deployer's DNS zone. The CAR route will live in a separate Wrangler production environment so the reusable root deployment does not require ownership of `aprenderepite.com`; the production instance will attach the exact `aprenderepite.com/calendario.ics` route after the Worker succeeds on `workers.dev`.

## Risks / Trade-offs

- [Skool changes undocumented HTML or Next-data contracts] -> Isolate adapters, validate schemas, retain the last valid feed, log structured failures, and cover known payloads with contract fixtures.
- [Skool rotates its build ID] -> Discover it from calendar HTML and retry stale build-specific requests once.
- [Skool blocks Worker-originated anonymous traffic] -> Send ordinary browser-compatible requests, retain the last valid snapshot, and keep the authenticated API as a future fallback rather than an initial dependency.
- [Calendar clients refresh subscriptions on their own schedule] -> Refresh the source at least hourly and document that client-visible latency is controlled partly by Google, Apple, or Outlook.
- [Removing an event from a full feed is interpreted differently by clients] -> Keep stable UIDs, regenerate complete snapshots, and test major clients during release validation.
- [KV is eventually consistent] -> Store immutable complete bundles and accept short regional propagation delays; no request depends on read-modify-write coordination.
- [One-click deploy cannot attach arbitrary custom domains] -> Guarantee a working `workers.dev` deployment and document custom-domain attachment separately.
- [A rolling window is not an infinite recurrence feed] -> Make past and future month ranges configurable and default to a practical one-past/twelve-future-month window.

## Migration Plan

1. Build and test the Worker against fixtures and mocked outbound responses.
2. Deploy to a temporary `workers.dev` URL and trigger an initial synchronization.
3. Validate the generated feed with an independent parser and subscriptions in representative calendar clients.
4. Configure the exact `aprenderepite.com/calendario.ics` Worker route without modifying the Astro site content.
5. Verify the production URL, caching headers, and scheduled refresh behavior.
6. Add the subscription URL to the website in a later change.

Rollback consists of removing the custom route or restoring its previous target. The Astro website remains unaffected, and the KV snapshot can be retained for diagnosis or deleted with the Worker.

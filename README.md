# Skool Calendar Sync for Google Calendar, Apple Calendar, and Outlook

[![CI](https://github.com/ctala/Sync2SkoolCalendar/actions/workflows/ci.yml/badge.svg)](https://github.com/ctala/Sync2SkoolCalendar/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/ctala?logo=githubsponsors&label=Sponsor)](https://github.com/sponsors/ctala)

Turn any **public Skool community calendar** into a stable **iCalendar/ICS subscription feed** with a self-hosted Cloudflare Worker. Members can subscribe from Google Calendar, Apple Calendar, Outlook, and other RFC 5545-compatible clients without sharing Skool credentials.

- No Skool API key, cookies, browser automation, or login
- Automatic sync every 30 minutes
- Stable event identities for updates and removals
- Direct links back to every Skool event
- Last-known-good calendar retained when Skool is temporarily unavailable
- Production-tested by [Cágala, Aprende, Repite](https://www.skool.com/cagala-aprende-repite)

**Live ICS feed:** [`https://aprenderepite.com/calendario.ics`](https://aprenderepite.com/calendario.ics)

## Choose Your Path

| Self-host the calendar | Automate more of Skool |
| --- | --- |
| Deploy this open-source Worker to your Cloudflare account. It reads a public Skool calendar and publishes your own subscribable ICS URL. | Use the managed Skool All-in-One API Actor for authenticated administration and automation across posts, members, comments, and classroom content. It is a separate product, not a hosted version of this calendar Worker. |
| [![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ctala/Sync2SkoolCalendar) | **[Open the Skool All-in-One API Actor on Apify](https://apify.com/cristiantala/skool-all-in-one-api?fpr=cristian)** |

> **Affiliate disclosure:** The Apify Actor URL is an affiliate link. I may receive a benefit if you sign up, at no extra cost to you.

## What It Does

- Reads Skool's anonymous public calendar responses.
- Includes publicly visible events even when their metadata references Premium or VIP tiers.
- Uses Skool's server-expanded occurrences to preserve recurring-event exceptions and moved dates.
- Generates one `VEVENT` per occurrence with a deterministic UID.
- Writes the Skool event URL both as an iCalendar `URL` property and visible description text.
- Rebuilds a complete rolling snapshot covering one past month and twelve future months by default.
- Publishes a new snapshot only after every requested month and page validates successfully.
- Stores the last valid snapshot in Cloudflare KV and continues serving it through source failures.
- Exposes `/calendario.ics` by default with `ETag`, `Last-Modified`, and conditional request support.

Skool does not expose call links in its anonymous responses. Each calendar entry always links to the corresponding Skool event page instead.

## How It Works

```text
Public Skool calendar
          |
          v
Cloudflare Worker -- every 30 min --> Calendar KV
          |                                |
          +-------- GET /calendario.ics <--+
```

The Worker treats every refresh as an atomic snapshot. A partial, malformed, blocked, or timed-out source response never replaces the previous valid calendar.

## Quick Start

### Deploy to Cloudflare

Use the [Deploy to Cloudflare](https://deploy.workers.cloudflare.com/?url=https://github.com/ctala/Sync2SkoolCalendar) flow. The project contains no secrets, and Cloudflare provisions the `CALENDAR_KV` namespace because the reusable binding has no fixed namespace ID.

The initial deployment receives a `workers.dev` URL. Configure the public values for your community, trigger the first synchronization, and validate the endpoint:

```bash
npm run smoke -- https://your-worker.workers.dev/calendario.ics
```

### Run locally

Requirements:

- Node.js 22.22.2 or newer
- npm 12.1.0

```bash
npm ci
npm run types
npm test
npm run typecheck
npm run dev
```

Trigger the scheduled handler locally:

```text
http://localhost:8787/__scheduled
```

After the first successful sync, open:

```text
http://localhost:8787/calendario.ics
```

## Configuration

All configuration is public and lives in `wrangler.jsonc`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `GROUP_SLUG` | `cagala-aprende-repite` | Public Skool community slug |
| `CALENDAR_NAME` | `Cágala, Aprende, Repite` | Name displayed by calendar clients |
| `FEED_PATH` | `/calendario.ics` | Public Worker pathname |
| `PAST_MONTHS` | `1` | Past calendar months in each snapshot |
| `FUTURE_MONTHS` | `12` | Future calendar months in each snapshot |
| `CACHE_CONTROL` | `public, max-age=300, stale-while-revalidate=3600` | Successful response caching policy |

The combined past, current, and future window cannot exceed 15 months. No Skool secret or API key is required.

## Subscribe from a Calendar App

Add the HTTPS URL as a subscribed or internet calendar. Some applications also accept `webcal://`:

```text
https://aprenderepite.com/calendario.ics
webcal://aprenderepite.com/calendario.ics
```

Initial subscription, event links, and timezone rendering have been validated in Google Calendar, Apple Calendar, and Outlook. The Worker refreshes every 30 minutes, but each calendar provider decides when to fetch subscription updates. Client-visible changes can therefore arrive later.

If a client caches a failed first attempt, remove the subscription and add it again with a new query parameter, for example:

```text
https://aprenderepite.com/calendario.ics?v=2
```

The Worker route accepts query strings while still requiring the exact `/calendario.ics` pathname.

## Testing

```bash
npm run types:check
npm run typecheck
npm run test:coverage
npm run deploy:dry
npm run deploy:production:dry
```

Tests run inside the Cloudflare Workers runtime with isolated local KV and mocked outbound requests. Sanitized Skool fixtures cover source parsing, pagination, recurrence, malformed responses, and last-known-good retention. `ical.js` independently parses generated calendars.

Validate any deployed endpoint with:

```bash
npm run smoke -- https://example.workers.dev/calendario.ics
```

The smoke test checks HTTP caching behavior, unique event identities, parseability, and visible Skool links.

## Custom Domain Deployment

The Cloudflare zone must exist in the same account as the Worker.

1. Open the Worker in the Cloudflare dashboard.
2. Go to **Settings > Domains & Routes**.
3. Add a route ending in `*`, such as `example.com/calendario.ics*`, so calendar-client query strings reach the Worker.
4. Run the smoke test against the final URL.

The Worker itself only serves the configured exact pathname. The reusable one-click deployment cannot attach a DNS route in another person's account.

This repository keeps the CAR route in a separate Wrangler environment:

```bash
npm run deploy:production:dry
npm run deploy:production
npm run smoke -- https://aprenderepite.com/calendario.ics
```

The production route is `https://aprenderepite.com/calendario.ics*`; all other `aprenderepite.com` paths continue to use the existing Astro site.

## Limitations

- The integration depends on undocumented public Skool endpoints, which can change without notice.
- Only public communities are supported.
- The default rolling window is one past month plus the current month and twelve future months.
- The complete window cannot exceed 15 months because of the Cloudflare Workers subrequest budget.
- Each Skool request has a 10-second timeout and each refresh has a bounded request budget.
- After a failed cold start, public requests observe a five-minute retry cooldown.
- Skool does not publish cancellation tombstones; removed occurrences disappear from the next complete snapshot.
- Before the first successful sync, a source failure returns HTTP 503. Later failures preserve the last valid feed.
- Calendar clients control their own subscription refresh schedules.

## FAQ

### Does Skool provide an official calendar API?

No public, documented calendar API is required. This Worker reads the same anonymous public calendar data that Skool exposes to visitors. That makes the integration lightweight, but also means an upstream Skool change can require a parser update.

### Can this sync a private Skool community?

No. The project intentionally avoids credentials, cookies, and authenticated scraping. Only events exposed by a public community are eligible.

### Does the Apify Actor host this calendar sync?

No. The [Skool All-in-One API Actor](https://apify.com/cristiantala/skool-all-in-one-api?fpr=cristian) is a separate managed product for broader authenticated Skool administration and automation. This repository is the self-hosted public-calendar integration.

### Why use a complete snapshot instead of patching events?

Complete snapshots make updates and removals deterministic. Stable UIDs let clients reconcile changed occurrences, while an occurrence missing from the next valid snapshot is removed naturally.

### Why is a Skool event missing its meeting link?

Skool omits some call details from anonymous responses. The Worker does not perform authenticated enrichment; it links users to the event page in Skool.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Use [GitHub Discussions](https://github.com/ctala/Sync2SkoolCalendar/discussions) for setup questions and structured [GitHub Issues](https://github.com/ctala/Sync2SkoolCalendar/issues) for reproducible defects or focused feature proposals.

Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). Community support boundaries are documented in [SUPPORT.md](SUPPORT.md).

## Security

Do not publish credentials, cookies, private community data, or vulnerability details in Issues or Discussions. Follow [SECURITY.md](SECURITY.md) and report vulnerabilities privately through [GitHub Security Advisories](https://github.com/ctala/Sync2SkoolCalendar/security/advisories/new).

## Sponsor

If this project saves you time, you can support its maintenance through [GitHub Sponsors](https://github.com/sponsors/ctala). Sponsorship is optional and never required to use or contribute to the project.

## License

Released under the [MIT License](LICENSE).

## Rollback

Remove the custom Worker route or point it back to its previous target. The production Astro site is not modified by this Worker, and the KV snapshot can be retained for diagnosis or deleted with the Worker.

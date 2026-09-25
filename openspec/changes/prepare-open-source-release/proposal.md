## Why

The project works in production, but the repository is not ready to convert public visitors into users or contributors: it has no license, repository metadata, community-health files, native sponsorship configuration, or search-oriented positioning. Before making it public, the repository should present a trustworthy open-source project and offer clear, equally prominent paths for self-hosting the calendar Worker and discovering the managed Skool automation Actor.

## What Changes

- Rework the README into an English-first, search-oriented project landing page while preserving accurate setup, operating, and limitation details.
- Present two equally prominent but truthfully differentiated calls to action: deploy the public-calendar Worker on Cloudflare, or explore the broader Skool All-in-One API Actor on Apify.
- Link the Actor through `https://apify.com/cristiantala/skool-all-in-one-api?fpr=cristian` and disclose next to the link that it is a referral/affiliate URL.
- Add useful status and trust badges without turning the README header into a decorative badge wall.
- Add MIT licensing and standard open-source contribution, conduct, security, support, issue, and pull-request guidance.
- Enable GitHub's native Sponsor surface for `ctala` and include a contextual sponsorship call to action in the README.
- Complete package and GitHub repository metadata for discoverability while keeping npm publication disabled.
- Define a release-readiness review that checks links, public-facing claims, community files, one-click deployment, and repository settings before visibility changes.

## Capabilities

### New Capabilities
- `open-source-repository-experience`: Public repository discovery, conversion paths, affiliate transparency, sponsorship, community health, licensing, and release-readiness requirements.

### Modified Capabilities

None.

## Impact

- Rewrites `README.md` and adds root-level open-source policy documents.
- Adds GitHub community files under `.github/`, including funding and contribution templates.
- Adds package metadata while retaining `"private": true` to prevent accidental npm publication.
- Updates GitHub repository description, homepage, topics, and applicable public-repository settings.
- Completes and verifies the existing Deploy to Cloudflare path once the repository becomes public.
- Does not change Worker runtime behavior, calendar output, deployed routes, or the external Actor.

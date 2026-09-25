## Context

See `proposal.md` for motivation and `specs/open-source-repository-experience/spec.md` for the public contract. The repository is currently private, has a production-tested Worker and CI workflow, and already contains a Deploy to Cloudflare button. It has no license, package/repository discovery metadata, funding configuration, or community-health files. GitHub currently reports an empty description, homepage, topics, and license.

The existing README is Spanish-first and operator-oriented. The public release must add a conversion layer without losing the exact behavior, limitations, and recovery guidance that make the project safe to operate. The Apify Actor is a broader managed Skool administration product, but its current public roadmap still lists Events as pending; it must not be represented as a hosted version of this calendar Worker.

## Goals / Non-Goals

**Goals:**

- Make the repository understandable and useful within the first screen while preserving detailed technical documentation.
- Give the Cloudflare Worker and Apify Actor equal visual prominence but distinct, accurate jobs.
- Make affiliation, maintenance expectations, security reporting, sponsorship, and contribution rules explicit.
- Configure the repository and package metadata needed for GitHub and search-engine discovery.
- Keep publication reversible until the final visibility change and make that change conditional on a full release gate.

**Non-Goals:**

- Change Worker behavior, calendar semantics, Cloudflare resources, or production routes.
- Add calendar support to the external Apify Actor or describe unshipped Actor capabilities.
- Publish the package to npm; `private: true` remains the publication guard.
- Translate every technical section into Spanish or maintain two duplicated READMEs.
- Promise response times, free support, roadmap commitments, or sponsor benefits not already defined by the maintainer.

## Decisions

### Use an English-first README with a landing layer above the operator guide

The README will use this information order:

1. Search-oriented title and one-sentence value proposition.
2. A restrained trust row for CI, MIT license, Cloudflare Workers, and GitHub Sponsors.
3. A short proof-oriented feature list and supported clients.
4. A two-column "Choose your path" comparison with equal emphasis:
   - **Self-host the calendar:** deploy this repository to Cloudflare.
   - **Automate more of Skool:** open the managed Skool All-in-One API Actor.
5. A visible affiliate disclosure immediately below the first Actor link: "Disclosure: this is an affiliate link. I may receive a benefit if you sign up, at no extra cost to you."
6. Live example, architecture, quick start, configuration, development, tests, deployment, subscription behavior, limitations, FAQ, contributing, security, sponsorship, license, and rollback.

Primary phrases such as "Skool calendar sync", "Skool to Google Calendar", "iCalendar/ICS feed", and "Cloudflare Worker" will appear naturally in the title, summary, headings, and FAQ. The README will not repeat keyword lists or make claims beyond the implementation. A brief reference to the Spanish-speaking CAR production deployment may remain as social proof, but the operator documentation will not be duplicated in two languages.

Alternative considered: preserve Spanish as the primary language. Rejected because the selected release goal is global search discovery and open-source adoption. A complete bilingual README was rejected because duplicated operational instructions drift quickly.

### Separate visual parity from functional equivalence

The two calls to action will occupy the same README section and have equivalent visual weight. Their copy will make the boundary explicit:

- The Worker converts a public Skool calendar into a subscribable ICS feed without credentials.
- The Actor provides managed, authenticated Skool administration and automation for posts, members, comments, and classroom workflows.

All conversion-oriented Actor links will use the supplied referral URL verbatim. General factual references may link to the same URL for consistency. No copy will imply that the Actor currently hosts or replaces the calendar feed.

Alternative considered: position the Actor as a hosted calendar tier. Rejected because the Actor's public capability list does not currently support that claim.

### Use a small set of authoritative badges

The header will include at most four trust badges:

- GitHub Actions CI, linked to `.github/workflows/ci.yml` runs.
- MIT license, linked to `LICENSE`.
- Cloudflare Workers, linked to the deployment section or Cloudflare Workers product page.
- GitHub Sponsors, linked to `https://github.com/sponsors/ctala`.

The official Deploy to Cloudflare graphic remains a conversion button in the path-selection section rather than another status badge. The Actor receives a clear text/button CTA rather than a fabricated quality or usage badge. Coverage, downloads, stars, and version badges are omitted because the repository has no authoritative public source for those signals yet.

### Add a conventional, maintainer-sized community surface

The public files will be:

- `LICENSE`: MIT, copyright 2026 Cristian Tala S.
- `CONTRIBUTING.md`: setup, branch/commit expectations, required checks, pull-request scope, and fixture/privacy rules.
- `CODE_OF_CONDUCT.md`: Contributor Covenant 2.1 with enforcement directed to private GitHub reporting rather than a public issue.
- `SECURITY.md`: supported-version policy and GitHub private vulnerability reporting instructions.
- `SUPPORT.md`: bugs and feature requests in Issues; usage questions in GitHub Discussions; no guaranteed response time.
- `.github/FUNDING.yml`: `github: [ctala]`.
- `.github/CODEOWNERS`: default ownership by `@ctala`.
- `.github/ISSUE_TEMPLATE/bug.yml`, `feature.yml`, and `config.yml`: structured reports, preflight checks, and links to Discussions and private security reporting.
- `.github/pull_request_template.md`: behavior summary, validation evidence, and checklist for tests/docs/no secrets.
- `.github/dependabot.yml`: monthly npm updates with a small open-PR limit to avoid overwhelming a solo maintainer.

GitHub Discussions will be enabled before publication. GitHub only permits private vulnerability reporting on public repositories, so its policy and destination will be prepared while private and the feature will be enabled immediately after the visibility change. Issues remain enabled for actionable defects and feature proposals. Branch protection is not introduced in this change because mandatory reviews would block a solo maintainer; CI remains the documented merge gate.

Alternative considered: add every available GitHub template and automation. Rejected in favor of a smaller surface that the maintainer can actually service.

### Complete metadata without turning the project into an npm package

`package.json` will retain `private: true` and add:

- `license: "MIT"`
- `author: "Cristian Tala S."`
- repository and bugs URLs for `ctala/Sync2SkoolCalendar`
- `homepage: "https://github.com/ctala/Sync2SkoolCalendar#readme"`
- focused keywords covering Skool, calendar, iCalendar, ICS, Cloudflare Workers, Google Calendar, Apple Calendar, Outlook, and TypeScript

The GitHub repository description will be "Sync any public Skool community calendar to Google Calendar, Apple Calendar, and Outlook with a self-hosted Cloudflare Worker and ICS feed." Its homepage will be the live demonstration at `https://aprenderepite.com/calendario.ics`, and its topic set will be `skool`, `icalendar`, `ics`, `cloudflare-workers`, `typescript`, `google-calendar`, `apple-calendar`, `outlook-calendar`, and `calendar-sync`.

Alternative considered: remove `private: true` because the repository becomes public. Rejected because repository visibility and npm publication are unrelated, and accidental publication provides no value here.

### Treat visibility as the last, explicitly confirmed operation

Implementation will prepare and validate all files while the repository remains private. Before visibility changes, the release gate will verify:

- no tracked secrets or private fixtures;
- all local quality commands and CI pass;
- Markdown structure, internal links, and external destinations are valid;
- affiliate disclosure is adjacent to the first referral CTA;
- Sponsors, Discussions, and Issues are configured, and the post-public private vulnerability reporting operation is prepared;
- repository and package metadata are populated;
- the README's claims match current Worker and Actor behavior;
- a clean Deploy to Cloudflare flow can be started from the public repository and provisions KV successfully.

The final visibility change requires explicit maintainer confirmation during implementation. After publication, the one-click deployment is validated from a clean context; only then can task 5.3 in `publish-public-skool-calendar` be completed.

## Risks / Trade-offs

- [The funnel makes technical documentation feel promotional] -> Keep proof, limitations, architecture, and setup adjacent to CTAs; avoid hype or unsupported superlatives.
- [The Actor referral could undermine trust] -> Use the exact referral URL consistently and place plain-language disclosure before the first click opportunity.
- [Equal CTA weight suggests equal functionality] -> Label paths by outcome and explicitly state that the Actor is broader automation, not a hosted calendar replacement.
- [External badge or CTA URLs rot] -> Validate every destination at release and omit signals that lack an authoritative source.
- [Opening Issues creates an unsustainable support queue] -> Route questions to Discussions, use structured forms, document response expectations, and avoid service-level promises.
- [Public history contains sensitive data] -> Scan tracked files and history before changing visibility; stop publication if remediation is needed.
- [One-click deployment cannot be tested while private] -> Perform all static checks first, publish only after explicit confirmation, then immediately execute the clean deployment validation; revert visibility if it exposes a blocker that cannot be fixed promptly.
- [README and Actor capabilities drift] -> Make only coarse Actor claims and validate them against the public Actor page during future README changes.

## Migration Plan

1. Add license, policy, community, funding, template, and dependency-update files while the repository remains private.
2. Rewrite the README and enrich package metadata without changing Worker runtime files.
3. Configure GitHub description, homepage, topics, Issues, Discussions, and Sponsors; prepare the private vulnerability reporting operation that GitHub gates on public visibility.
4. Run local quality checks, CI, Markdown/link review, secret/history scan, and claim verification.
5. Present the completed release gate and request explicit confirmation to make the repository public.
6. Change visibility, immediately enable private vulnerability reporting, validate the public README and community surfaces, and perform a clean Deploy to Cloudflare test.
7. Record evidence, complete the deferred one-click task in `publish-public-skool-calendar`, and then consider both changes for sync/archive.

Rollback before publication is a normal file/configuration revert while the repository stays private. Rollback after publication changes visibility back to private, disables newly exposed community surfaces if necessary, and reverts the release commit; already-created forks or external caches cannot be recalled and must be considered before approval.

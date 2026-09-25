## 1. License and Maintainer Policies

- [x] 1.1 Add the 2026 MIT `LICENSE` for Cristian Tala S. and verify GitHub-compatible license detection recognizes it as MIT.
- [x] 1.2 Add `CONTRIBUTING.md` with local setup, required quality commands, focused-PR guidance, conventional commit expectations, and fixture/privacy rules; verify every documented command exists in `package.json` and works from a clean install.
- [x] 1.3 Add Contributor Covenant 2.1 in `CODE_OF_CONDUCT.md`, private vulnerability instructions in `SECURITY.md`, and maintenance boundaries in `SUPPORT.md`; verify security reports are never directed to public Issues and support is routed separately from defects.

## 2. GitHub Community Surface

- [x] 2.1 Add `.github/FUNDING.yml` with `github: [ctala]` and `.github/CODEOWNERS` with `@ctala` as default owner; verify GitHub parses both files and the native Sponsor destination resolves to `https://github.com/sponsors/ctala`.
- [x] 2.2 Add structured bug and feature issue forms plus issue-template configuration that routes questions to Discussions and vulnerabilities to private reporting; validate each YAML file and preview the forms without publishing a test issue.
- [x] 2.3 Add a pull-request template requiring scope, behavioral impact, validation evidence, documentation updates, and confirmation that no secrets or private data were added; verify a draft pull request pre-populates the template.
- [x] 2.4 Add monthly npm Dependabot configuration with a conservative open-PR limit; validate the configuration and verify it targets the repository root and `main` branch.

## 3. Public README Funnel

- [x] 3.1 Rewrite the README header and opening sections in English with a search-oriented value proposition, supported clients, production proof, and no unsupported claims; verify the first screen explains Skool calendar sync, iCalendar/ICS, and Cloudflare Workers.
- [x] 3.2 Add no more than four authoritative badges for CI, MIT, Cloudflare Workers, and GitHub Sponsors; verify every image and target URL resolves and remove any badge that cannot be independently validated.
- [x] 3.3 Add an equally weighted "Choose your path" section for the self-hosted calendar Worker and broader managed Skool automation Actor; verify all Actor CTAs use `https://apify.com/cristiantala/skool-all-in-one-api?fpr=cristian`, the first CTA has adjacent affiliate disclosure, and no copy claims the Actor replaces the calendar Worker.
- [x] 3.4 Preserve and translate the accurate architecture, configuration, development, testing, deployment, subscription, limitations, and rollback content; add focused FAQ, contribution, security, sponsorship, and license sections; verify commands and production examples still match the deployed Worker.

## 4. Package and Repository Metadata

- [x] 4.1 Add author, MIT license, repository, bugs, README homepage, and focused search keywords to `package.json` while retaining `private: true`; regenerate lockfile metadata if needed and verify `npm ci` succeeds without changing runtime dependencies.
- [x] 4.2 Configure the exact GitHub description, live-feed homepage, and topics from `design.md`; enable Issues and Discussions while keeping repository visibility private; verify settings through GitHub's API; and confirm from GitHub's official documentation that private vulnerability reporting must wait for public visibility.

## 5. Private Release Gate

- [x] 5.1 Run generated-type validation, strict TypeScript checking, coverage, root and production Wrangler dry-runs, and the deployed smoke test; verify all checks and the current GitHub Actions run pass without changing Worker behavior.
- [x] 5.2 Validate Markdown structure, internal anchors, badges, all external links, the referral parameter, and the affiliate disclosure; verify the README renders correctly on desktop and mobile widths, no unexpected broken destination remains, and visibility-gated GitHub URLs are recorded for immediate post-publication retesting.
- [x] 5.3 Scan tracked files and Git history with a secret scanner, inspect sanitized Skool fixtures, and review the public diff for personal or operational data; verify no secret or unintended private artifact would become public.
- [x] 5.4 Review the README's Actor claims against the current public Actor page and the Worker's claims against tests and production; verify both conversion paths remain accurate and functionally distinct.
- [x] 5.5 Present the complete private release-gate evidence and obtain explicit maintainer approval for the irreversible visibility step; verify the repository remains private until that approval is recorded.

## 6. Public Release and Cross-Change Closure

- [x] 6.1 After explicit approval only, change `ctala/Sync2SkoolCalendar` visibility to public, immediately enable private vulnerability reporting, and verify anonymous users can access the README, license, Issues, Discussions, security policy, Sponsor button, badges, metadata, and community templates.
- [x] 6.2 From a clean independent context, run Deploy to Cloudflare through the public repository, verify automatic KV provisioning and a working `workers.dev` calendar with the smoke test, and return the repository to private if this provisional-release validation fails.
- [x] 6.3 Record public-release and one-click deployment evidence, mark task 5.3 in `publish-public-skool-calendar` complete only after the clean deployment passes, and verify both OpenSpec changes validate without unresolved implementation tasks other than any explicitly deferred archive step.

## Private Release Gate Evidence (2026-09-25)

- Canonical MIT text matched GitHub's MIT license template after substituting the project copyright.
- Clean npm installation, generated Worker types, strict TypeScript checking, 47 tests, coverage thresholds, root/production Wrangler dry-runs, and the production smoke test passed.
- Draft PR `#1` (`https://github.com/ctala/Sync2SkoolCalendar/pull/1`) used the repository template and CI run `36118553103` passed on commit `ef12198b9e32c178875aa1997667e44210c46077`.
- GitHub metadata, homepage, nine repository topics, Issues, Discussions, the `dependencies` label, FUNDING, and CODEOWNERS were configured or validated while the repository remained private.
- GitHub's official documentation confirmed private vulnerability reporting is available only after public visibility; task 6.1 enables it immediately after publication.
- The README rendered successfully at desktop and iPhone widths. All external destinations passed validation; the five anonymous 404 results were expected private-repository URLs for Actions, its badge, Issues, Discussions, and Security Advisories and are reserved for task 6.1 retesting.
- Every Actor CTA retained `fpr=cristian`, the disclosure appeared adjacent to the first CTA, and the Actor was described as broader automation rather than a hosted calendar replacement.
- `gitleaks` scanned five historical commits and the current directory with zero findings. Sanitized fixtures contained synthetic identifiers and no credentials, cookies, personal email addresses, or private-community payloads.
- GitHub still reported `isPrivate: true`; no visibility change was attempted.
- The maintainer explicitly approved merging PR `#1`, changing visibility to public, enabling private vulnerability reporting, and running the provisional public-release validation.
- Squash commit `708e8b2976ce52a9b68c4b60b3b9a48cfb93e848` merged PR `#1`; GitHub then reported `visibility: PUBLIC`, MIT license detection, enabled private vulnerability reporting, and HTTP 200 for the repository, Issues, Discussions, security policy, and all four badges.

## Public Release Evidence (2026-09-25)

- An anonymous HTTPS clone resolved public `main` at commit `708e8b2976ce52a9b68c4b60b3b9a48cfb93e848`; clean npm installation, generated-type validation, type checking, and all 47 tests passed from that clone.
- Wrangler provisioned temporary KV namespace `f39c904c9f7644c4a78462314cfb7858` automatically and deployed temporary Worker version `d74b6607-3ec1-4a1b-ad3b-d0e2b13fb8c8` without source edits.
- `https://skool-calendar-release-check-20260925.ctala.workers.dev/calendario.ics` passed the deployed smoke test with 96 events and ETag `a253b757a00254c9c4ee768c1b660beacdb4b3edb5f729ca5df7db596b6bf6c7`.
- The temporary Worker and KV namespace were deleted after validation; only the original preview and production namespaces remain, and the production smoke test still serves the same 96-event hash.

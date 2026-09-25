# Contributing

Thanks for helping improve Skool Public Calendar. Keep changes focused, testable, and safe for people who deploy the Worker in their own Cloudflare account.

## Before opening an issue

- Use GitHub Discussions for setup questions and general support.
- Use Issues for reproducible defects and concrete feature proposals.
- Report vulnerabilities privately through [GitHub Security Advisories](https://github.com/ctala/Sync2SkoolCalendar/security/advisories/new). Do not disclose sensitive details in a public issue.

## Local setup

Requirements:

- Node.js 22.22.2 or newer
- npm 12.1.0

```bash
npm ci
npm run types:check
npm run typecheck
npm run test:coverage
npm run deploy:dry
```

Use `npm run dev` for local Worker development. Wrangler exposes `http://localhost:8787/__scheduled` to trigger the scheduled handler and `http://localhost:8787/calendario.ics` to inspect the generated feed.

## Pull requests

- Keep each pull request limited to one behavior or documentation concern.
- Explain user-visible behavior changes and operational impact.
- Add or update tests before changing implementation behavior.
- Update documentation when commands, configuration, limitations, or deployment behavior change.
- Use conventional commit subjects such as `feat:`, `fix:`, `docs:`, or `test:`.
- Confirm all required checks pass before requesting review.

## Public-source and fixture safety

This project only supports public Skool communities. Tests must use sanitized fixtures and mocked network responses.

- Never commit Skool credentials, cookies, tokens, private community data, personal email addresses, or raw authenticated responses.
- Reduce fixtures to the smallest fields needed by the test.
- Replace real user identifiers and personal content with synthetic values.
- Do not add authenticated scraping as a shortcut around a public-source limitation.

## Required checks

Run the same checks as CI:

```bash
npm run types:check
npm run typecheck
npm run test:coverage
npm run deploy:dry
```

For deployment changes, also run:

```bash
npm run deploy:production:dry
```

By contributing, you agree that your contribution is licensed under the MIT License.

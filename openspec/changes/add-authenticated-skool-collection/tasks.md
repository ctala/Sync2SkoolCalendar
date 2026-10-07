## 1. Pre-implementation Spike

- [x] 1.1 Confirm `SKOOL_NYX_EMAIL` in Infisical matches the current Nyx login, generate a Nyx token with `auth_login.py --out /tmp/skool_cookies_nyx.txt`, and verify its JWT `user_id` matches the Nyx account and that it loads `/cagala-aprende-repite/calendar` with HTTP 200.
- [x] 1.2 Generate a second Nyx token, then re-request the calendar with the first; record in design.md whether new logins revoke older sessions and, if they do, choose a dedicated account or a coordinated rotation before continuing.

## 2. Authenticated Skool Collection

- [x] 2.1 RED: Add sanitized fixtures for the anonymous `/about` redirect, the `/login?...&lo=true` redirect, and `_next/data` `__N_REDIRECT` bodies, plus failing tests asserting that requests carry `cookie: auth_token=<token>` only when a token is configured and never carry one otherwise; verify the tests fail for the missing behavior.
- [x] 2.2 GREEN: Thread the optional token through `CollectionConfig` and the HTML/JSON fetchers with `redirect: "manual"`; verify the 2.1 header tests pass and existing anonymous tests remain green.
- [x] 2.3 RED: Add failing tests that `/login` redirects raise a session error, `/about` redirects raise an access error, neither triggers the stale-build retry, and other redirects keep the current retry behavior; verify failures name the missing classification.
- [x] 2.4 GREEN: Implement `SkoolSessionError` and `SkoolAccessError` classification for both request types; verify the 2.3 tests pass and the request budget assertions still hold.

## 3. Refresh Diagnostics and Configuration

- [x] 3.1 RED: Add Worker tests asserting that `calendar.refresh.failed` logs include `cause` (`session`, `access`, `source`), that the last valid bundle keeps serving, and that no log line, response, or KV value contains the token string; verify they fail.
- [x] 3.2 GREEN: Add optional `SKOOL_AUTH_TOKEN` to the environment type, pass it from `readRuntimeConfig`, log the classified cause, and add the `authenticated` flag to the bundle source and `bundleMatchesConfig`; verify the 3.1 tests and existing bundle tests pass.
- [x] 3.3 RED/GREEN: Add tests for the expiry warning (fewer than 30 days logs `calendar.auth.expiring` with `expiresAt`, a malformed token logs `calendar.auth.unreadable`, and more than 30 days logs nothing), then implement the unverified `exp` decoding; verify the tests pass.
- [x] 3.4 Change the cron in `wrangler.jsonc` to `0 * * * *` and confirm no secret appears in `vars`; verify `wrangler deploy --dry-run` and the scheduled-handler test pass.

## 4. Redacted Calendar Representation

- [x] 4.1 RED: Add iCalendar tests asserting that in redacted mode there is no `LOCATION`, that Zoom/Meet/Teams/Webex URLs (including subdomains) are removed from `DESCRIPTION`, that other text and the Skool `?eid=` URL remain, and that non-redacted output is unchanged; verify the tests fail.
- [x] 4.2 GREEN: Implement the `redact` option in `generateCalendar`, enabled whenever a token is configured; verify the 4.1 tests pass and the generated fixture parses with the independent parser.

## 5. Documentation

- [x] 5.1 Update README (private-community mode, how to obtain the `auth_token`, `wrangler secret put SKOOL_AUTH_TOKEN`, rotation and expiry warnings, dedicated-account recommendation, redaction behavior) and SECURITY guidance; verify no statement still claims that cookies are never supported, and that the no-secret Deploy to Cloudflare path is still described as the default.

## 6. Rollout Verification

- [ ] 6.1 Run `npm run typecheck`, the full test suite, and coverage; verify everything passes in CI.
- [ ] 6.2 Store the token in Infisical as `/skool/nyx/SKOOL_NYX_AUTH_TOKEN`, set `SKOOL_AUTH_TOKEN` on the `workers.dev` deployment, trigger a refresh, and verify the logs show success, the event count matches the authenticated probe, and the `.ics` contains no `LOCATION` and no Zoom URLs.
- [ ] 6.3 Set the secret with `--env production`, deploy, and run `npm run smoke -- https://aprenderepite.com/calendario.ics`; verify that `last-modified` advances, upcoming October events appear, and the rollback command (`wrangler secret delete SKOOL_AUTH_TOKEN --env production`) is documented in the PR.

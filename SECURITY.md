# Security Policy

## Supported versions

Security fixes are applied to the latest code on the `main` branch. This project does not maintain security branches for older versions.

## Reporting a vulnerability

Report suspected vulnerabilities privately through [GitHub Security Advisories](https://github.com/ctala/Sync2SkoolCalendar/security/advisories/new).

Do not open a public issue, discussion, or pull request containing exploit details, credentials, tokens, cookies, personal data, or information about a private Skool community.

Include:

- the affected component and deployment context;
- reproduction steps or a minimal proof of concept;
- potential impact;
- any suggested mitigation;
- whether the issue is already public elsewhere.

This is a solo-maintained project and does not promise a response or remediation SLA. Reports will be reviewed as capacity allows. Please allow time for a fix before public disclosure.

## Operating with a Skool session token

The optional `SKOOL_AUTH_TOKEN` grants the configured account's Skool access for as long as the session lives (about one year). Store it only as a Cloudflare Worker secret or in a secrets manager, prefer a dedicated non-admin member account, and rotate it immediately if it may have been exposed: change the account password in Skool, sign in again, and update the Worker secret.

## Scope

In scope:

- this repository's Worker, calendar generation, deployment configuration, and documented workflows;
- accidental exposure of secrets or private data caused by this project, including the optional `SKOOL_AUTH_TOKEN` session token or meeting links that private-community redaction should remove;
- vulnerabilities in project-owned code.

Out of scope:

- vulnerabilities in Skool, Cloudflare, GitHub, Apify, or calendar clients;
- attacks against the public production demonstration;
- social engineering, denial-of-service testing, or accessing data you do not own.

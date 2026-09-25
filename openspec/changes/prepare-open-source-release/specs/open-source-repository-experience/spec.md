## Purpose

Define a trustworthy, discoverable, and conversion-oriented public repository experience that supports self-hosting, managed Skool automation discovery, contributions, sponsorship, and safe open-source publication.

## ADDED Requirements

### Requirement: Search-oriented project positioning
The public repository SHALL use an English-first title, summary, and README structure that clearly identifies the project as a Skool public calendar, iCalendar/ICS subscription feed, and Cloudflare Worker without obscuring operational documentation or limitations.

#### Scenario: Visitor discovers the repository through search
- **WHEN** a visitor lands on the repository from GitHub or a search engine
- **THEN** the opening content explains the problem solved, supported calendar clients, deployment model, and public-Skool limitation without requiring the visitor to read setup instructions first

#### Scenario: Operator needs implementation details
- **WHEN** an operator continues beyond the landing content
- **THEN** the README retains accurate architecture, configuration, local development, testing, deployment, subscription, limitation, and rollback guidance

### Requirement: Truthful dual conversion paths
The README SHALL present the self-hosted Cloudflare calendar Worker and the managed Skool All-in-One API Actor as equally prominent calls to action while clearly distinguishing their capabilities.

#### Scenario: Visitor chooses self-hosting
- **WHEN** a visitor wants a public Skool calendar subscription feed under their control
- **THEN** the repository directs them to deploy this Worker on Cloudflare and explains that this path provides the calendar functionality documented by the repository

#### Scenario: Visitor chooses managed Skool automation
- **WHEN** a visitor wants broader managed Skool administration or automation capabilities
- **THEN** the repository directs them to the Skool All-in-One API Actor without claiming that the Actor currently replaces this calendar Worker

### Requirement: Transparent Actor referral
Every conversion-oriented link to the Actor SHALL use `https://apify.com/cristiantala/skool-all-in-one-api?fpr=cristian`, and the README SHALL visibly disclose near the first such link that it is a referral or affiliate URL.

#### Scenario: Visitor follows the Actor call to action
- **WHEN** a visitor views or activates the Actor call to action
- **THEN** the destination preserves the `fpr=cristian` referral parameter and the visitor can see the affiliate disclosure before following it

### Requirement: Verifiable trust signals
The README SHALL show a concise set of linked badges whose displayed status is backed by the repository or an authoritative external service.

#### Scenario: Visitor reviews project status
- **WHEN** a visitor views the README header
- **THEN** they can verify CI status, MIT licensing, deployment availability, sponsorship, and the Actor destination without encountering decorative or unverifiable claims

#### Scenario: Badge target changes or becomes unavailable
- **WHEN** a badge or its target cannot be validated before release
- **THEN** the badge is corrected or omitted rather than publishing a broken or misleading trust signal

### Requirement: Open-source license and community health
The public repository SHALL publish an MIT license and clear contribution, conduct, support, security-reporting, issue-submission, and pull-request guidance appropriate to the project's actual maintenance model.

#### Scenario: Contributor wants to propose a change
- **WHEN** a contributor opens the repository or starts an issue or pull request
- **THEN** they can find prerequisites, quality checks, contribution expectations, and structured templates without relying on private project knowledge

#### Scenario: Researcher finds a vulnerability
- **WHEN** someone needs to report a security issue
- **THEN** the repository directs them to a private reporting channel and explicitly asks them not to publish sensitive details in a public issue

#### Scenario: User requests support
- **WHEN** a user needs help rather than reporting a reproducible defect
- **THEN** the repository distinguishes support requests from bug reports and states the scope and response expectations for community support

### Requirement: Native and contextual sponsorship
The repository SHALL enable GitHub's native Sponsor surface for `ctala` and include a contextual README link to `https://github.com/sponsors/ctala` without presenting sponsorship as a requirement for use or contribution.

#### Scenario: Visitor wants to support maintenance
- **WHEN** a visitor chooses to sponsor the project
- **THEN** both GitHub's Sponsor button and the README sponsorship call to action lead to the verified `ctala` Sponsors profile

### Requirement: Complete repository metadata
The public repository SHALL provide accurate project description, homepage, topics, package metadata, and licensing metadata while preventing accidental npm publication.

#### Scenario: GitHub indexes the public repository
- **WHEN** repository visibility becomes public
- **THEN** its description, homepage, and topics describe the Skool calendar, iCalendar, TypeScript, and Cloudflare Workers use case rather than remaining blank

#### Scenario: Package tooling reads project metadata
- **WHEN** package tooling inspects `package.json`
- **THEN** it finds repository, homepage, bugs, keywords, author, and MIT license metadata while the package remains marked private

### Requirement: Public-release gate
The repository SHALL remain private until all checks that do not require public visibility pass, and the release SHALL remain provisional until a clean one-click deployment is validated immediately after publication.

#### Scenario: Maintainer prepares to change visibility
- **WHEN** all planned repository changes are ready
- **THEN** the maintainer validates URLs, badges, templates, sponsor configuration, repository settings, CI, absence of committed secrets, and the Deploy to Cloudflare configuration before making the repository public

#### Scenario: Maintainer validates the provisional public release
- **WHEN** repository visibility has changed to public
- **THEN** the maintainer immediately enables private vulnerability reporting, validates the public surfaces, and validates a clean Deploy to Cloudflare flow that provisions KV and serves a working calendar URL

#### Scenario: Release check fails
- **WHEN** a pre-public check fails or the immediate post-public deployment validation fails
- **THEN** repository visibility remains or returns private until the failure is corrected and the complete gate passes again

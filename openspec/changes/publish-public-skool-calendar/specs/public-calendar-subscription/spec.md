## Purpose

Provide a stable public iCalendar feed that keeps a Skool community's scheduled events synchronized with subscribers' calendar applications.

## ADDED Requirements

### Requirement: Public calendar subscription endpoint
The system SHALL expose the community calendar without authentication at `https://aprenderepite.com/calendario.ics` and SHALL return UTF-8 iCalendar content with the `text/calendar` media type.

#### Scenario: Anonymous calendar request
- **WHEN** any client sends a GET request to `/calendario.ics`
- **THEN** the system returns the latest valid calendar without requiring credentials, cookies, or an API key

#### Scenario: Calendar client receives compatible content
- **WHEN** Google Calendar, Apple Calendar, Outlook, or another RFC 5545-compatible client retrieves the endpoint
- **THEN** the response contains a valid `VCALENDAR` document that the client can subscribe to

### Requirement: Complete public event collection
The system SHALL include every event occurrence exposed by the public Skool community calendar within the configured rolling synchronization window, regardless of the event's Skool membership tier metadata.

#### Scenario: Unrestricted event is published
- **WHEN** Skool exposes an unrestricted occurrence within the synchronization window
- **THEN** the generated calendar contains a corresponding `VEVENT`

#### Scenario: Tier-restricted event is publicly listed by Skool
- **WHEN** Skool's anonymous calendar response includes an occurrence restricted to a membership tier
- **THEN** the generated calendar contains that occurrence using the information available in the anonymous response

#### Scenario: Event lies outside the synchronization window
- **WHEN** an occurrence is outside the configured past and future month range
- **THEN** the generated calendar is not required to contain that occurrence

### Requirement: Useful event representation
Each published occurrence SHALL preserve its title, description, start time, end time, and source timezone and SHALL include a URL to the corresponding event in the Skool calendar.

#### Scenario: Subscriber opens an event
- **WHEN** a subscriber follows the URL attached to a calendar entry
- **THEN** the subscriber is taken to that event in the `cagala-aprende-repite` Skool calendar

#### Scenario: Event contains public links
- **WHEN** the public Skool title, description, or location data contains links
- **THEN** the calendar preserves those public values without requiring privileged enrichment

#### Scenario: Calendar client uses another timezone
- **WHEN** a subscriber views an event in a timezone different from the event's source timezone
- **THEN** the client can display the same instant at the correct local time

### Requirement: Recurring occurrences and stable identity
The system SHALL publish server-expanded recurring occurrences individually and SHALL assign deterministic UIDs so clients can update an occurrence without creating a duplicate.

#### Scenario: Recurring series has multiple occurrences
- **WHEN** Skool returns multiple occurrences for one recurring event
- **THEN** the calendar contains one `VEVENT` per occurrence with a distinct stable UID

#### Scenario: Existing occurrence changes
- **WHEN** Skool changes the title, description, start time, or end time of an occurrence while retaining its occurrence identity
- **THEN** the next successful calendar generation updates the existing `VEVENT` under the same UID

#### Scenario: Duplicate occurrence appears in overlapping source windows
- **WHEN** the same occurrence is returned more than once while collecting calendar months
- **THEN** the generated calendar contains it exactly once

### Requirement: Synchronization with Skool
The system SHALL refresh from Skool at least once per hour, rebuild the calendar from the current source snapshot, and make successful changes visible from the public endpoint.

#### Scenario: Event is added
- **WHEN** Skool adds an occurrence inside the synchronization window
- **THEN** the occurrence appears after the next successful refresh

#### Scenario: Event is removed
- **WHEN** an occurrence previously present in the synchronization window is no longer returned by Skool
- **THEN** the occurrence is absent after the next successful refresh

#### Scenario: Skool deploys a new frontend build
- **WHEN** a stored Next.js build identifier no longer serves calendar data
- **THEN** the system rediscovers the current build identifier and retries the collection once

### Requirement: Last-known-good availability
The system SHALL replace the published calendar only after a complete source collection has been validated and SHALL retain the last valid calendar when synchronization fails.

#### Scenario: Refresh fails after a successful publication
- **WHEN** Skool is unavailable, blocks a request, or returns malformed calendar data
- **THEN** the endpoint continues serving the previous valid calendar

#### Scenario: Initial refresh has never succeeded
- **WHEN** no valid calendar has been stored and Skool cannot be collected
- **THEN** the endpoint returns a service-unavailable response rather than a successful empty calendar

#### Scenario: Community legitimately has no events
- **WHEN** all source pages are valid and contain no occurrences in the synchronization window
- **THEN** the system publishes a valid empty `VCALENDAR`

### Requirement: Credential-free public source integration
The system SHALL collect calendar data only from anonymously accessible Skool pages and endpoints and MUST NOT require the authenticated Skool API, Skool user credentials, or browser automation.

#### Scenario: Service is deployed with default integration settings
- **WHEN** an operator deploys the service for a public Skool community
- **THEN** synchronization can run without configuring a Skool secret

### Requirement: Reusable Cloudflare deployment
The project SHALL be independently deployable as a Cloudflare Worker from a public GitHub or GitLab repository using a Deploy to Cloudflare button, with required Cloudflare resources provisioned during deployment.

#### Scenario: New operator uses one-click deployment
- **WHEN** an operator launches the Deploy to Cloudflare flow and supplies the documented public configuration values
- **THEN** Cloudflare creates and binds the required storage and deploys a working `workers.dev` endpoint without requiring source changes

#### Scenario: Operator uses a custom domain
- **WHEN** an operator completes the documented post-deploy custom-domain configuration
- **THEN** the same feed can be served from the operator's chosen public calendar URL

### Requirement: Test-first delivery
The implementation SHALL be developed with automated tests covering domain behavior, Skool response contracts, Worker runtime integration, failure retention, and iCalendar compatibility.

#### Scenario: Behavior is introduced or changed
- **WHEN** implementation work adds or changes observable behavior
- **THEN** a failing automated test for that behavior is created before the production change and passes after the change

#### Scenario: Change is proposed for release
- **WHEN** the implementation is ready to deploy
- **THEN** unit, contract, Worker integration, type-checking, and deployed smoke-test checks all pass

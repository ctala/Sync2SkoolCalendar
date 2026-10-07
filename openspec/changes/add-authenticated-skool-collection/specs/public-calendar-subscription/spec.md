## MODIFIED Requirements

### Requirement: Complete public event collection
The system SHALL include every event occurrence that Skool exposes to the configured source identity (anonymous visitor, or the member session when one is configured) within the configured rolling synchronization window, regardless of the event's Skool membership tier metadata.

#### Scenario: Unrestricted event is published
- **WHEN** Skool exposes an unrestricted occurrence within the synchronization window
- **THEN** the generated calendar contains a corresponding `VEVENT`

#### Scenario: Tier-restricted event is publicly listed by Skool
- **WHEN** Skool's anonymous calendar response includes an occurrence restricted to a membership tier
- **THEN** the generated calendar contains that occurrence using the information available in the anonymous response

#### Scenario: Tier-restricted event is visible to the member session
- **WHEN** a member session is configured and Skool returns an occurrence restricted to a membership tier for that session
- **THEN** the generated calendar contains that occurrence

#### Scenario: Event lies outside the synchronization window
- **WHEN** an occurrence is outside the configured past and future month range
- **THEN** the generated calendar is not required to contain that occurrence

### Requirement: Useful event representation
Each published occurrence SHALL preserve its title, description, start time, end time, and source timezone and SHALL include a URL to the corresponding event in the Skool calendar. When a member session is configured, the system SHALL publish a redacted representation that omits the event location and any link that grants direct access to an online meeting, so that the public feed does not expose member-only access.

#### Scenario: Subscriber opens an event
- **WHEN** a subscriber follows the URL attached to a calendar entry
- **THEN** the subscriber is taken to that event in the `cagala-aprende-repite` Skool calendar

#### Scenario: Event contains public links
- **WHEN** no member session is configured and the public Skool title, description, or location data contains links
- **THEN** the calendar preserves those public values without requiring privileged enrichment

#### Scenario: Member-only event location is redacted
- **WHEN** a member session is configured and an occurrence has a location, such as a Zoom URL or a Skool call
- **THEN** the corresponding `VEVENT` has no `LOCATION` property

#### Scenario: Meeting-join link appears in a description
- **WHEN** a member session is configured and an occurrence description contains a link to an online meeting provider (for example Zoom, Google Meet, Microsoft Teams, or Webex)
- **THEN** the published description omits that link while keeping the remaining text and the Skool event URL

#### Scenario: Calendar client uses another timezone
- **WHEN** a subscriber views an event in a timezone different from the event's source timezone
- **THEN** the client can display the same instant at the correct local time

## ADDED Requirements

### Requirement: Optional member session source access
The system SHALL collect calendar data anonymously by default and SHALL support an optional operator-supplied Skool member session token, provided as a deployment secret, for communities whose calendar is not publicly visible. The system MUST NOT require or store Skool account email or password, MUST NOT perform a Skool login, MUST NOT use browser automation, and MUST NOT expose the session token in responses, logs, or the stored calendar bundle.

#### Scenario: Service is deployed for a public community
- **WHEN** an operator deploys the service without a session token
- **THEN** synchronization runs anonymously without configuring any Skool secret

#### Scenario: Service is deployed for a private community
- **WHEN** an operator configures a valid session token for an account that is a member of the community
- **THEN** synchronization collects the member-visible calendar and publishes it through the public endpoint

#### Scenario: Token does not leak
- **WHEN** a refresh succeeds or fails with a session token configured
- **THEN** neither the HTTP responses, the structured logs, nor the stored bundle contain the token value

### Requirement: Diagnosable source access failures
The system SHALL distinguish Skool access denials from other refresh failures, SHALL log each with a distinct cause, and SHALL retain the last valid calendar in every case. When a session token is configured, the system SHALL log a warning when the token's declared expiry is less than 30 days away or cannot be read.

#### Scenario: Session is missing, expired, or revoked
- **WHEN** Skool redirects a calendar request to its login page
- **THEN** the refresh fails with a logged cause identifying an invalid or missing session, and the endpoint keeps serving the previous valid calendar

#### Scenario: Calendar is not visible to the source identity
- **WHEN** Skool redirects a calendar request to the community's about page
- **THEN** the refresh fails with a logged cause identifying missing community access, and the endpoint keeps serving the previous valid calendar

#### Scenario: Token approaches expiry
- **WHEN** a refresh runs with a session token whose declared expiry is less than 30 days away
- **THEN** the system logs an expiry warning that includes the expiry date but not the token

## REMOVED Requirements

### Requirement: Credential-free public source integration
**Reason**: The source community became private, and anonymous access no longer returns its calendar.
**Migration**: Replaced by "Optional member session source access". Anonymous collection remains the default, and deployments without a token behave as before.

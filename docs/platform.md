# Product and engineering specification

## Product requirements

| Module | Pilot acceptance | Local implementation |
| --- | --- | --- |
| Account and profile | Adults attest eligibility, verify their contact channel and control discoverability. Enter city, neighbourhood, budget range, move-in window, sleep, cleaning, smoking and pets. | Password and session, adult attestation, single budget, four habits, city and neighbourhood |
| Matching | Apply eligibility and mutual dealbreakers before ranking. Explain contributing factors. Use no caste, religion or nationality signals. | Same-city match, equal weighting across four exact habit matches and one budget-proximity check. Block exclusions. |
| Room inventory | Show price, fees, availability, room type, approximate location and verification scope. Draft, submit, approve or remove, expire, renew. Keep exact addresses private. | Submission, moderation, 30-day expiry, owner withdrawal and moderator removal. Private review reference excluded from discovery. |
| Inbox and viewings | Mutual consent for chat, safe handoff to a viewing, report a message and block at any point. | Mutual interest, bounded text history, profile and room reports and bilateral block effects. Viewing arranged in chat. |
| Moderation | Separate reviewers, scoped access, evidence and checklists, incident queue, appeals, emergency delisting, review history. | Admin-only review queue, separate room reviewer, two approval checks, audit writes and report resolution |
| Mobile | Android and iOS flows with push controls, platform secure storage, accessible forms and deep links. | Responsive mobile web shares all main flows. Native apps deferred. |
| Monetization | Clear billing, cancellations, refunds and auditable entitlements independent of trust decisions. | Deferred |

## Trust and safety operations

Use three independent evidence classes: contact ownership, person identity, and authority to publish a specific room. Label each with what was checked, who issued the result and when it expires. A badge should never imply personal safety or title insurance. Store provider reference and result, not document images, where the evidence process permits. Restrict room discovery to approved, current inventory. Require evidence of landlord or operator authority and permitted occupancy, and review public copy for prohibited discrimination and scam signals. Avoid exposing identity, exact address and contact information by default. The prototype uses free text, so moderators must inspect room copy and local users must use synthetic information.

Create report categories for harassment, fraud, discrimination, unsafe occupancy and immediate danger. Provide a local emergency escalation path, preserve necessary evidence under access control, quarantine high-risk listings, and support appeals with a second reviewer. Block must immediately hide the pair from discovery and disable chat. Monitor repeated reports, relisted inventory and deposit solicitation. For the pilot, run tabletop drills for a scam ring, compromised reviewer and urgent takedown. A staffed on-call rotation and legally approved retention/deletion schedules are release dependencies.

## Design system

Warm off-white canvas, deep green actions, dark ink, sage surfaces and clay focus rings. Use editorial serif display and Inter-style sans-serif body copy. Keep marketplace cards compact with price, neighbourhood, fit or review scope and one primary action. Use 20px card radii and a fluid page grid with natural wrapping. Status uses text as well as colour. The prototype uses semantic buttons, labels, visible focus and an announced status region. Before release, verify contrast, keyboard and screen-reader journeys, 200% zoom, 320px width, reduced motion and localization. Plan Arabic RTL and localized Indian languages after the English pilot. Do not use country flags as language selectors.

## Architecture and data model

The prototype is a same-origin Node HTTP service with a browser ES module and a single SQLite database in WAL mode. It uses parameterized SQL, salted scrypt credentials, hashed session tokens, HttpOnly cookies, strict origin checks on writes and server-side authorization. Listing review plus audit and block plus interest removal are transactional. In-memory write limits and synchronous hashing are bounded prototype choices.

For a hosted pilot, keep a modular monolith with PostgreSQL migrations and indexed eligibility queries. Add shared rate limits, managed secrets, async password hashing or managed authentication, reviewer MFA, encrypted evidence storage with time-bound grants, and a worker with transactional outbox for notifications and expiry. Scope staff access by market and queue. Add retention jobs, redacted logging, health checks, traces, restore drills, and staged releases. Consider regional deployment after legal data-flow mapping. Scale discovery, messaging and review independently only once measured traffic justifies it.

| Prototype entities | Relations and access |
| --- | --- |
| users, sessions, profiles | Account owns many expiring sessions and one discoverable profile |
| listings | Owner submits room, review reference and authority. Only approved unexpired public fields are returned to eligible readers. |
| interests, blocks | Directional unique user pairs. Mutual interest enables messaging unless either side blocks. |
| messages | Sender and recipient pair with ordered history. Restricted to connected participants. |
| reports, audit | Member reports a typed target. Moderator transitions are recorded with actor, reason and time. |

Extend with organisations and memberships, market policy versions, listing evidence records, identity verification outcomes, structured conversations/viewings, consent versions, appeals, moderation actions and entitlement ledgers. Store monetary amounts with currency and minor units in the hosted schema. The prototype stores whole AED or INR units. Add uniqueness and idempotency constraints to provider event ingestion and payment mutations.

## API reference

All paths are under `/api/`. Responses are JSON. Errors contain `error`. POST requires the configured Origin and JSON. Authenticated routes use the session cookie. Report and review identifiers are integers.

| Route | Inputs and result |
| --- | --- |
| GET config | Supported cities and currencies, habit options and Dubai flag |
| POST register, login | email and password, plus adult=true for register. Sets session cookie. |
| GET me / POST logout | Returns role and own profile / revokes current session |
| POST profile | name, city, area, integer budget, habits object keyed by sleep, cleaning, smoking and pets |
| GET matches | Ranked same-city profiles with score, shared factors and connection flags |
| GET rooms?city=… / GET my-rooms | Current approved discovery / owner submissions |
| POST rooms | title, city, area, rent, description, authority and evidence reference |
| POST withdraw/:id / POST room-interest/:id | Withdraw owned room / request introduction to publisher |
| POST interest/:id / POST block/:id | Request connection / block target |
| GET connections | Incoming and outgoing interests and mutual connections |
| GET messages/:id / POST messages/:id | Latest 100 messages / append text to mutual conversation |
| POST reports | kind=room or profile, target, reason |
| GET admin/queue | Pending and approved rooms, open reports |
| POST admin/review | kind, target, decision, reason. Room approval also requires authorityChecked and occupancyChecked. |

Before public API use, add explicit versioning, cursor pagination, typed schemas, consistent authorization for report evidence, typed verification states and account-deletion endpoints. For public inventory, add policy-version checks and city-specific feature flags across every route. Current Dubai flag applies to room submission, approval, browsing and interest. Public signup, data rights and admin controls require further hardening.

## Delivery roadmap

1. Local evaluation. Run matching, room review, mutual messaging, reports and block flows with synthetic users. Verify browser usability and responsive behaviour. Current artifact covers the request-handler journeys.
2. Pilot foundation. Complete counsel review, operator contracts and operating procedures. Implement PostgreSQL migrations, contact verification, MFA, account visibility/deletion, evidence policy, audit access, throttling, accessibility and mobile browser coverage. Require an independent security review and restoration test.
3. Bengaluru pilot. Seed two micro-markets. Staff the queue and review incidents daily. Measure qualified introductions, inventory freshness, viewings and verified move-ins. Release Dubai supply only after a separate sign-off and document checks.
4. Expansion. Add Arabic, native clients, messaging notifications, provider-backed identity, operator dashboards and renewals. Use separate approvals for each Indian city before onboarding real inventory.
5. Revenue. Test concierge and operator subscriptions, then implement billing, entitlements and refunds. Introduce any transaction-handling capability through its own legal and operational review.

Release evidence includes browser and device end-to-end results, accessibility checks, load and abuse tests, security/privacy sign-off, operator evidence samples, complaint response drills and verified backup recovery. This artifact has no production deployment or verified launch authorization.

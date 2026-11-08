# Sukinnect security and privacy — design notes

**Status:** proposal only, 2026-11-07. This is not a legal opinion, privacy impact
assessment, security audit or claim of Data Privacy Act compliance. Counsel and a
qualified security reviewer must validate production decisions.

## Current prototype boundary

The current application is a single HTML/JavaScript prototype. It has no production
server, real authentication, shared database, real payment processing, live AI or real
identity verification. Its role selector is a demo convenience, not an access-control
boundary. Local records may be held in browser `localStorage` or memory and are not
protected as a production account store. `MockGateway` simulates money operations and
does not hold or transfer funds.

Do not enter real names beyond approved test data, phone numbers, street addresses,
government IDs, face images, bank/payment details, access tokens or production secrets
into seed data, screenshots, the HTML, localStorage or public issue artifacts. Use
fictional records and opaque test IDs.

## Data classes and treatment

| Data class | Prototype today | Production design requirement |
|---|---|---|
| Public provider profile | Fictional/demo profile fields | Publish only fields with a clear marketplace purpose and provider consent; expose approximate service area, not exact home coordinates. |
| Account/contact | Demo profile fields; no real authentication | Store only necessary fields; use a session/auth provider, access checks, recovery and account lifecycle; never return secrets. |
| Booking/request | Demo booking/request text and service details | Limit visibility to booking participants and authorized support; redact from analytics; define retention and deletion limits with counsel. |
| Location/address | Demo locations and barangays | Delay precise address disclosure until appropriate booking state; encrypt at rest/in transit; restrict audit-log payloads. |
| Messages/disputes | Local prototype records and UI | Booking-scoped access, abuse reporting, evidence preservation policy, retention and deletion policy; attachments need a separate threat/privacy review. |
| Payment/ledger | Simulated ledger/payment rows | Licensed partner owns regulated processing; store references and centavo records, never card credentials or wallet balances. Reconcile signed partner events. |
| Verification/credentials | Demo credential and review records; no real document capture | Manual, tiered verification first. If documents are later collected, use a lawful access-controlled vendor/storage flow, narrow reviewer access, explicit retention and deletion, audit all reads. |
| Analytics | Demo/sample records; no production telemetry | Collect a minimal allow-listed event set; avoid free text and direct identifiers; separate demo and live populations; set retention. |
| AI/recommendations | Rule-based demo Smart Match score from provider records and simulated keyword concierge | Treat the score as prototype-only, not AI or live availability. For external models, server-side proxy, data minimisation, source/version labels, user override, and no autonomous consequential decisions. |
| Registration consent | Read-to-end gate for three draft legal documents; local records include role, document, version and time | Store consent evidence server-side with the document version and applicable purpose; define withdrawal, retention and access controls with counsel before production. |

The registration gate and its versioned records are prototype behavior only. The
documents are drafts, not counsel-reviewed terms, and the local records are not a
production consent audit trail.

## Production controls to design before launch

- **Identity and authorization:** real session lifecycle; server derives role; deny by
  default; resource ownership checks; separate moderator/admin capabilities; MFA for
  privileged accounts; revoke sessions on role change or account suspension.
- **Secrets:** server-side secret manager only; no keys in HTML, browser bundles, Git,
  logs, screenshots or issue descriptions. Rotate after suspected exposure.
- **Transport/storage:** TLS; managed database encryption and backups; narrow service
  accounts; least-privilege storage for any verification material. Confirm the provider's
  actual controls rather than claiming them from configuration alone.
- **Payments:** signed webhook verification; idempotency; replay protection; reconciliation;
  balanced append-only ledger; separate booking/payment states; separate, disclosed
  gateway fee only under an owner-approved payer policy and signed merchant quote. No
  stored-value wallet, direct lending or fund holding without legal and licensed-partner
  review.
- **Application security:** schema validation, parameterized SQL, output escaping, CSRF
  protection where cookie sessions are used, secure cookie flags, CORS allow-list,
  request-size limits, dependency review, rate limiting, account lockout/cooldown and
  bot protection at server boundaries.
- **Operations:** encrypted backups and restore drills, monitored audit events, least-
  privilege production access, incident contacts, containment steps and a tested
  notification process.
- **Admin actions:** log actor, action code, target, time and result; restrict the log;
  detect tampering. Hash chaining can expose edits within a chain but is not encryption,
  access control, a blockchain or proof against an administrator who can rewrite the
  entire store.
- **AI:** do not send identity documents, payment data, exact addresses, private messages
  or unnecessary personal data to a model. Keep keys on a server. Treat model output as
  untrusted; cite sources and dates for external information and require human review
  for verification, disputes, safety and account enforcement.

## Retention and deletion

No retention periods are established in the supplied materials. Before any real
personal-data collection, the owner and counsel must define purposes, lawful basis,
retention per data class, user access/correction/deletion handling, legal holds,
vendor/subprocessor terms, backups expiry and breach response. Do not invent a number
or imply that a hash anonymizes data. A hash can remain linkable and should not include
raw ID, biometric, address or message content.

`schema/migrations/001_startup_records.mysql.sql` is a design-only MySQL reference.
It has not been run, and its opaque document reference is not permission to collect or
store real identity documents.

## Incident response (proposed)

1. Preserve relevant audit records and identify the affected systems/data classes.
2. Contain access or integration credentials; revoke/rotate compromised secrets.
3. Assess impact with the privacy lead and counsel; do not make unsupported public
   statements or delete evidence.
4. Follow counsel-approved notification and reporting obligations and timelines.
5. Record root cause, corrective work, owner and verification evidence; test the fix.

The sequence is a planning checklist, not a substitute for the applicable legal process.

## Open gates

- Appoint a privacy lead and complete a privacy impact assessment.
- Obtain counsel review of the Terms, Privacy Policy, provider agreement, payment
  flow, retention, verification and incident-response obligations.
- Select the production stack and vendors; review data residency, subprocessors,
  security reports, breach terms and deletion guarantees.
- Complete an independent pre-launch security review and remediate critical findings.
- Confirm actual payment fees and fee payer in a signed merchant agreement.
- Prove role and record-level access with negative authorization tests before pilot data
  is loaded.

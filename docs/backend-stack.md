# Backend stack options — recommendation, not a decision

**Status:** proposal only, 2026-11-07. No service is selected, provisioned or deployed.
The prototype remains `Sukinnect-next.html`; changing it to call a remote service would
be a separate, explicitly approved implementation step.

## Requirements from the product model

- Preserve the domain kernel's booking state machine, integer-centavo amounts,
  double-entry ledger, separate booking and payment status, append-only events and
  no-wallet rule.
- Enforce identity, role, ownership and state transitions on the server. A browser role
  selector is not authentication.
- Keep repository, payment, notification, verification and language-model providers
  behind narrow interfaces with labelled mocks in the prototype.
- Support local barangay/service-area data, transactional booking updates, idempotent
  payment operations, audit records and backups.
- Do not place API keys or secrets in the public HTML, APK assets or browser storage.
- Do not collect real ID, biometric or payment data until a counsel-reviewed privacy
  design and licensed-vendor flow exist.

## Options and trade-offs

| Option | Benefits | Costs / risks | Status |
|---|---|---|---|
| Managed PostgreSQL (Supabase or comparable) | Fits a relational booking/ledger model; managed backups/auth primitives; PostgreSQL and row-level access can support a small team | Requires careful server-side policies, SQL migration from current MySQL reference schema, access-rule tests, and vendor review | Candidate, not selected |
| Existing MySQL reference schema | Closest to current 19-table SQL artifact; avoids an immediate rewrite of that reference | Conflicts with the PostgreSQL/Supabase direction in the Master Plan; does not by itself provide auth, API or safe access | Current reference only |
| Functions/API layer (e.g. managed edge/serverless runtime) | Keeps payment secrets and domain transitions server-side; can preserve a thin client | Vendor/runtime choice and deployment operations remain undecided; do not put domain invariants only in a provider-specific function | Candidate, not selected |
| Direct browser-to-database access | Fast to prototype | Expands exposure and makes authorization/policy errors easier; not recommended for money, identity or admin operations | Not recommended for production |

## Recommendation for a decision

**Preferred direction to evaluate:** managed PostgreSQL with a small server API/service
layer that owns authorization, booking transitions and ledger transactions; use the
selected managed platform's auth only after an access-control review. Keep gateway,
notifications, ID verification and external-model calls behind server-only adapters.
Do not expose database credentials or privileged keys to the browser.

This is not a purchase or architecture decision. The current schema is MySQL, while the
Master Plan references PostgreSQL/Supabase and other hosting choices. Owner approval is
required before porting schema or changing deployment. Compare service limits, region,
backup/restore, audit access, data export, subprocessors, security documentation and
total recurring cost against the locally retained approved budget; confidential budget
amounts are intentionally not reproduced here.

`schema/migrations/001_startup_records.mysql.sql` adds reference records to the current
MySQL design only. It is not a production migration, and it must be ported and reviewed
if PostgreSQL or another dialect is selected.

## Build sequence

1. Decide PostgreSQL/Supabase vs MySQL and document why; map current tables and
   constraints before producing a one-time migration.
2. Implement account/session identity, server-derived roles, resource authorization and
   audit logs before loading pilot personal data.
3. Port the domain kernel's state machine and ledger rules into transactional service
   functions; test double-submit, stale versions, over-refunds and balanced entries.
4. Add repository and gateway interfaces; keep a deterministic mock for tests and a
   labelled simulation in local prototype mode. Add real payment integration only after
   legal review and a signed quote.
5. Add notifications and verification vendors only after data minimisation, consent,
   retention and incident controls are approved.
6. Add monitoring, backup/restore drills, rate limits, deployment secrets and the
   independent pre-launch security review before a controlled pilot.

No vendor account, credential, service deployment or production migration is part of
this document.

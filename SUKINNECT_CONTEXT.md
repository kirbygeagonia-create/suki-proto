# Sukinnect — read-first context

Updated: 2026-11-07. Read this before editing code.

Sukinnect is a hyperlocal services marketplace for households, small businesses and
local providers. Its core loop is **FIND → REVIEW → BOOK → RECORD**. The project is
pre-revenue: it has a working browser prototype, but no production backend, real
authentication, real payments, real users or completed real bookings.

## Pilot and claims

The planned beachhead is Tupi, South Cotabato: Poblacion, Polonuling, Cebuano, Kablon
and Bunao. The deck's 150-provider, 3,000-user and 6,000-booking figures are targets.
The November plan instead proposes 60–100 verified active providers and cites a
3,270-booking Year-1 base and 15,200-booking stretch scenario. These are not results;
the figures differ by source and the underlying workbook was not supplied.

The prototype has three roles: Resident/Customer, Service Provider and Administrator.
The startup plan discusses service businesses/teams and moderator operations; those
roles are not implemented as production identities or permissions. A real auth system
and server-side role enforcement do not exist.

The supplied November Master Plan lists a 1.2% working commission with a 1.3% ceiling,
while it reports that a separate market-research plan recommends 8–12%; the current
prototype defaults to 10%.
The owner has not selected a pilot rate or fee payer. At 1.2%, an ₱800 job produces
₱9.60 before costs, but that is only a scenario. Do not silently change or claim the
current setting is approved policy. Gateway fees must not be hidden or absorbed; actual
processor prices are unconfirmed until a signed merchant quote. Sukinnect must
not operate or claim a stored-value wallet; use licensed partners for regulated payment
or financial services. AI flags and consequential decisions require human oversight.
Sensitive identity or biometric data must never be placed on a public or immutable chain.

## What must not be claimed

- Demo data, provider names, ratings, transactions and dashboard figures are not real
  users, activity, traction or validated demand.
- Targets, forecasts, market-size estimates and proposed prices are assumptions, not
  achievements or commitments.
- There is no production backend, account security, payment settlement, ID verification,
  live AI, confirmed partnership or production notification delivery.
- A simulated gateway, verification result or recommendation is not a real service or
  verified fact.
- Do not describe the product as a wallet, lender, insurer, blockchain system or
  "AI marketplace." No legal, safety or provider-competence guarantee is established.

## Sources and their authority

| Question | Source |
|---|---|
| Startup strategy, pilot and business assumptions | Local `SUKINNECT_STARTUP_MASTER_PLAN.md`; non-public financial/investor content is excluded from Git |
| Proposed partnerships and feature intent | Supplied owner implementation brief and companion source documents if provided; the collaboration/features `.docx` was not supplied for this work |
| Engineering constraints and prototype-vs-production discipline | `AGENTS.md` |
| What is implemented | `Sukinnect-next.html` and the checks that exercise it |
| Why behavior changed | `CHANGES.md`; device evidence, if relevant, in `DEVICE-PASS.md` |

The Master Plan itself records conflicts. Read the roadmap's conflict ledger and do not
turn a recommendation into an owner decision. The confidential local source is ignored;
it must not be committed or copied into `dist/`.

## Engineering orientation

`Sukinnect-next.html` is the current rebuild; `Sukinnect.html` is the earlier shipped
prototype and must not be modified for rebuild work. Keep the single-file, `file://`-
compatible architecture: no ES modules, and the domain kernel must not call into a
screen. Money is integer centavos; records store codes rather than display sentences;
booking status and payment status remain separate. The Android WebView wrapper and its
asset copy are local-only; changing the web file does not automatically sync the shell.
Never edit `Sukinnect-Android/`, `.git/`, `dist/` or `Python/` without explicit direction.
Preserve CRLF when editing app files. `AGENTS.md` is very large: read its headings and
only relevant sections.

## Verification

- `node tools/verify.cjs` — behavioral and structural gate for the current rebuild.
- `node tools/measure.cjs` and `node tools/shot.cjs --measure` — source and painted-page checks.
- `node tools/audit-open-items.cjs` — a list to read, not a pass/fail verdict.
- `node tools/falsify-all.cjs` — mutates `Sukinnect-next.html`; run only with
  `git status --porcelain -- Sukinnect-next.html` clean before and after, one pass at a
  time. The app file is the mutex.
- `node tools/audit-build-bytes.cjs` and `node tools/build-web-dist.cjs` — build-copy
  consistency and explicit deployment allow-list.

House rule: **a check that cannot fail is not a check**. Never weaken a gate to make a
change pass. Do not push. Keep private data, secrets, real identity documents, contact
details and payment details out of source, seed data and localStorage.

## Status snapshot

| Area | State | Evidence |
|---|---|---|
| Single-file web prototype, booking lifecycle, centavo ledger | Built, prototype-only | `Sukinnect-next.html`; `node tools/verify.cjs` |
| Payment gateway and payout | Simulated | `MockGateway`; README money model |
| Authentication and production backend | Not started | Demo role selection; no server |
| Smart Match / concierge | Prototype-only / simulated | Smart Match is a rule-based demo score from provider records; concierge is local keyword logic |
| Provider review and disputes | Prototype-only | Demo records and local UI |
| Pilot geography and real field evidence | In plan / not validated | Master Plan and roadmap |
| Consent UX | Versioned read-to-end gate and local versioned records for draft legal documents | Prototype only; no server-side consent enforcement or audit trail |
| Assisted onboarding and local quote guidance | In plan | Roadmap F-7, F-8 |
| Moderator, subscriptions, promotions, pilot KPI console | Not implemented / in plan | Roadmap feature register |
| Wallet, direct lending, biometric capture, public blockchain | Not built; not approved | Scope guard and conflict ledger |

For the full feature register, dependencies, needs, conflicts and traceability, read
[`SUKINNECT_STARTUP_ROADMAP.md`](SUKINNECT_STARTUP_ROADMAP.md).
Stage B design-only artifacts are [`docs/api-contract.md`](docs/api-contract.md),
[`docs/security-and-privacy.md`](docs/security-and-privacy.md),
[`docs/backend-stack.md`](docs/backend-stack.md), and the additive MySQL reference
migration [`schema/migrations/001_startup_records.mysql.sql`](schema/migrations/001_startup_records.mysql.sql).
None is deployed or run against a production system.

## Reading order

1. This file.
2. [`README.md`](README.md).
3. [`SUKINNECT_STARTUP_ROADMAP.md`](SUKINNECT_STARTUP_ROADMAP.md).
4. The relevant `AGENTS.md` sections.
5. The local Master Plan and other supplied source documents, when available and
   authorized. The collaboration/features Word document was not supplied for this pass.

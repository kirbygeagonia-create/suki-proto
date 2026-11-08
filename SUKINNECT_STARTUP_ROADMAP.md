# Sukinnect startup roadmap and feature register

Updated: 2026-11-07. This is a non-confidential working roadmap, not a launch
commitment. Targets, financial scenarios, partner names and feature proposals below are
not actual results. Business conflicts stay open until the owner decides.

## 1. Goals and pilot evidence gates

Sukinnect's purpose is to make local services easier to find, understand, trust, book
and complete. The startup plan describes a hyperlocal marketplace for households and
small businesses to find, review, book and record local services, and for independent
providers to be discovered and build a reputation. The product loop remains
**FIND → REVIEW → BOOK → RECORD**.

The planned beachhead is Tupi, South Cotabato: Poblacion, Polonuling, Cebuano, Kablon
and Bunao. The pilot start date is not set. These are conditions and proposed targets,
not observed results:

| Phase / gate | Evidence condition before proceeding |
|---|---|
| Before M1: reconcile | Owner decisions on conflicts are made or explicitly deferred; pilot date and scope are confirmed; evidence and privacy handling are defined. |
| M1–M2: discovery and prototype refinement | Conduct at least 30 provider interviews, 30 household interviews and 10 small-business interviews; collect at least 3 independent dated price references per priority category; test with at least 10 residents and 10 providers; keep anonymised notes and an evidence register. |
| M2–M3: MVP readiness | Production architecture and role/access rules are decided; legal and privacy review plus a pre-launch security review are complete; critical defects are resolved; at least 20 providers are ready for a controlled launch. |
| Before launch | At least 20 active verified providers, critical defects resolved, and privacy/security review complete. No customer funds are held without legal and licensed-partner review. |
| M4–M6: controlled pilot | Record real completed bookings and report monthly unit economics; the plan proposes approximately 150 bookings by M6. Use a cash-first path if a licensed gateway is not approved. |
| M7–M9: monetisation test | Test subscriptions only with a small cohort after paid-plan validation; measure paid conversion, churn, contribution per booking and the actual cost of servicing transactions. |
| M10–M12: evaluate | Produce a go / adjust / stop report from field evidence. Scale only after two consecutive months of positive contribution margin and stable fulfilment, with thresholds defined before measuring. |

The plan's M12 proposal is 60–100 verified providers. The pitch deck's 150 verified
providers, 3,000 registered users and 6,000 bookings are separate targets; the Market
Research plan's 3,270 base and 15,200 stretch booking scenarios are also targets or
forecasts. The underlying financial workbook was not supplied, so its scenarios are not
recomputed or independently validated here. Nothing in this table represents traction.

Success measures to establish from real records include: verified active providers by
category and barangay; profile completion and 30/60-day retention; supply coverage;
qualified requests; search-to-request and request-to-booking conversion; completion,
cancellation and no-show rates; response and time-to-match; disputes and complaints;
repeat bookings; commission collected and cash-fee receivable ageing; contribution per
completed booking and monthly contribution; customer acquisition cost; declared
off-app leakage; and, only once a feature exists, recommendation acceptance, price
guidance error, portfolio edit rate and fraud-flag precision/false positives. No KPI has
production evidence today.

## 2. Needs register

The owner field is deliberately blank. A proposed partner is not a partner until a
written agreement or permission exists. All interview counts and gates are planning
requirements, not completed work.

| Need / evidence | Owner | Blocks | Status |
|---|---|---|---|
| 30+ provider interviews across priority categories and five barangays; anonymised notes and consent |  | M1–M2 discovery | Not evidenced |
| 30+ household and 10+ small-business interviews |  | M1–M2 discovery | Not evidenced |
| 3+ independent, dated local price references per priority category |  | Local price guidance; M1–M2 | Not evidenced |
| At least 10 resident and 10 provider usability sessions with task outcomes |  | M1–M2; MVP flows | Not evidenced |
| Signed payment merchant agreement and dated fee quote |  | Any online payment pilot | No agreement/quote supplied |
| Privacy impact assessment, designated privacy lead, data inventory and retention schedule |  | Real account/identity data; launch gate | Not evidenced; counsel review required |
| Pre-launch independent security review and incident/backup plan |  | Production launch | Not evidenced |
| Counsel review: entity, terms, privacy notice/consent, payment/funds handling, provider agreement, equity/investor and dispute terms |  | Production and external submissions | Not evidenced; no legal conclusion made |
| Insurance coverage quotes and eligibility |  | Pilot risk decision | No quote supplied |
| At least three interested/committed investors, as a plan requirement |  | Funding gate | Not evidenced; investor details excluded from this public roadmap |
| Municipal Government of Tupi and five barangay offices |  | Provider mapping/community validation | Proposed only; no formal partnership evidenced |
| DTI / Negosyo Center South Cotabato |  | Provider support | Proposed only; no formal partnership evidenced |
| TESDA South Cotabato |  | Credential validation | Proposed only; no formal partnership evidenced |
| PESO Tupi |  | Provider mapping/employment support | Proposed only; no formal partnership evidenced |
| DSWD / Sustainable Livelihood Program |  | Later referral / livelihood work | Proposed only; not a pilot commitment |
| ICEBOX TBI at MSU General Santos |  | Mentoring/incubation | Proposed only; no formal partnership evidenced |
| Eulap and other technology partners |  | Future technical support | Proposed only; no formal partnership evidenced |
| Local academic institutions |  | Research and evaluation | Proposed only; no formal partnership evidenced |
| Licensed payment, identity and notification vendors |  | Production integrations | Not selected or contracted |
| Decide backend stack and port reference schema once |  | Production backend | Open; MySQL schema vs PostgreSQL/Supabase proposal |

## 3. Refined features and current truth

| Area | Current code behavior | Startup gap / rule |
|---|---|---|
| Fee model | `CONFIG_DEFAULTS.commissionRateDefault` is 10%; category overrides exist; no 1.3% cap | Pilot fee and payer unresolved. Do not silently set 1.2%, 1.0% or 8–12%. |
| Gateway fees | `MockGateway`; no separate processor-fee amount in the booking money model | Do not absorb fees. Any real fee must be separately disclosed and assigned to the payer after a signed quote. |
| Smart Match | `providerMatches()` filters and sorts by `scoreProvider()` using service fit, declared area coverage, approximate distance, listed availability, smoothed rating, recorded completion/cancellation and recency when those records exist | Implemented as a prototype-only demo heuristic; an expandable explanation shows available factors, and the UI disclaims AI/live availability. Verification status is displayed separately and is not a ranking factor. This is not a validated production ranking or real-time signal. |
| Repeat services | A resident can create a locally stored schedule from an eligible completed booking; the prototype creates at most four ordinary booking requests at a time, each requiring the provider's separate response | Prototype-only and feature-flagged; pause/resume/end, skip, consented provider replacement and a separate price proposal record exist. No server scheduler, reminder delivery, or production recurrence guarantee exists. |
| AI showcase | The existing Concierge uses local keyword rules against demo services/providers | It is not a real AI integration. The named Repeat Services & AI Showcase prompt was not available in this checkout, so no additional AI behavior or external model was inferred. |
| Geography | Demo providers use barangays beyond the pilot; one pilot barangay overlaps | Pilot geography is the five locations in §1; keep demo records clearly labelled and do not claim they represent supply. |
| Roles | Resident, provider and admin are prototype roles selected in a demo flow | Moderator and business/team roles are planned; no real authentication or server-side enforcement exists. |
| Labels | Local demo, simulated gateway, demo verification and keyword concierge exist | State what is computed, simulated or absent; do not call partner payments or AI live. |
| Privacy / consent | Registration has a read-to-end gate for three versioned draft documents and records the document version, role and time locally; there is no production account or server-side consent record | Draft terms are not legal advice; the local record is not a production audit trail. No real identity documents, biometric data or secrets in the prototype. |

### Backend prompt audit B1–B15

The findings in the supplied backend prompt were checked against the current app/schema
and the latest strategy snapshot. “Confirmed” means the gap is supported by code
inspection, not that it has been resolved.

| ID | Finding | Local status |
|---|---|---|
| B1 | Smart Match numbers were typed, not computed | Stage A prototype fix uses `scoreProvider()` and `providerMatches()`; verification status is shown separately. Named gate: `demo match scores, reasons and verification labels reflect provider records`; falsifier: `node tools/falsify-smart-match.cjs`. No live or production ranking exists. |
| B2 | Prototype fee is 10%, no cap | Confirmed in code; whether it is wrong for the pilot is an open owner decision, because the latest plan itself records conflicting recommendations |
| B3 | No separately modelled gateway-fee line | Confirmed in money configuration / ledger |
| B4 | Three demo roles, no moderator/business team or real session boundary | Confirmed; authentication is absent |
| B5 | No production consent record or server-side enforcement | The registration UI requires reading each current draft version and acceptance where required, then records versions locally; the reference migration includes a proposed consent table, but there is no production store or enforcement |
| B6 | No resumable account-onboarding / pricing wizard | Confirmed; booking stepper is not signup onboarding |
| B7 | Review queue exists, but no real document capture/OCR/liveness | Confirmed; keep sensitive capture out of the prototype |
| B8 | No production CAPTCHA, server rate limit or lockout | Confirmed; requires server-side controls |
| B9 | No subscription, promoted-listing or partner-revenue behavior in the app | Confirmed; disabled reference feature flags exist in the migration, but no feature reads them |
| B10 | Audit/status/ledger records exist; no hash-chain tamper-evidence in the app | Confirmed; a reference-only chain table exists in the migration but is not implemented or deployed |
| B11 | No application records for consent, verification cases, subscriptions, promotions, price references, events, moderation or suggestions | Additive MySQL reference migration `schema/migrations/001_startup_records.mysql.sql` defines these records; it has not been applied to a database. Production dialect and deployment remain undecided. |
| B12 | Demo geography differs from the five-barangay pilot | Confirmed; only Poblacion overlaps |
| B13 | Concierge uses local English keyword matching | Confirmed; simulated/prototype-only |
| B14 | No production event instrumentation for the proposed pilot metrics | Confirmed; current analytics are not a production telemetry system |
| B15 | Licensed-partner fund-holding language describes a mock flow, not a real arrangement | Confirmed; `MockGateway` is simulated |

## 4. Feature register

Priority and phase reflect the Master Plan's proposed roadmap; they are not approvals
to launch. Every planned feature has **no test proving completion yet** unless a test
name is listed in the evidence column. Current prototype components are called out
separately so partial UI is not mistaken for a production capability.

| ID | Feature / expected behavior | Source and value | Current code status | Priority / tier | Dependencies / phase | Evidence |
|---|---|---|---|---|---|---|
| F-1 | Authentication and server-enforced roles | Master Plan §15.2; secure access | Demo role picker only; no sessions or authorization | P0 / backend | F-2; MVP core | None yet |
| F-2 | Backend and persistent database; port reference schema | Master Plan §15.2, §14; reliable shared records | No server; localStorage/memory and a MySQL reference schema | P0 / Stage B | Decide stack C14; MVP core | None yet |
| F-3 | Licensed payment gateway, payout and reconciliation | Master Plan §15.2; real settlement | `MockGateway` only | P0 / Stage B | F-1, F-2, signed merchant agreement | None yet |
| F-4 | Legal, consent and privacy foundation | Master Plan §15.2, §13.4; informed data use | Prototype registration has a versioned read-to-end gate and local versioned action records for draft terms/policy/privacy notice; production consent storage, enforcement, retention and counsel review remain unimplemented | P0 / Stage A then production | Counsel, privacy impact assessment, F-1/F-2 | Login checks: `registration requires reaching each current document version and accepting the terms`; `the registration record stores the version read or accepted for each document` |
| F-5 | Manual, tiered provider verification | Master Plan §13.2, §15.2; meaningful trust labels | Demo application/review UI; no production verification evidence | P0 / Stage A state model, Stage B records | F-1, F-2, F-4; human decision | None yet |
| F-6 | Production disputes and admin audit, evidence storage and SLAs | Master Plan §15.2; fair resolution | Local dispute records and audit concepts; no production evidence store/SLA | P0 / Stage B | F-1, F-2 | None yet |
| F-7 | Assisted onboarding stepper (typed, human-assisted mode) | Master Plan §15.2; reduce provider setup friction | No signup stepper; booking tracker is unrelated | P1 / Stage A | F-1; M1–M3 | None yet |
| F-8 | Local price guidance from a dated evidence register | Master Plan §15.2; clearer pricing | No local quote-band register | P1 / Stage A local records | 3+ independent quotes/category; field research | None yet |
| F-9 | Pilot barangay data model and five-barangay demo | Master Plan §15.2; locality and credible pilot demo | Existing barangay fields; seed does not represent all five pilot barangays | P1 / Stage A | None; pre-pilot | None yet |
| F-10 | Real notification and message delivery (SMS/push) | Master Plan §15.2; coordination | Message threads and notification UI are prototype-only; no delivery service | P1 / Stage B | F-1, F-2, notifier vendor | None yet |
| F-11 | Availability and scheduling improvements | Master Plan §15.2; prevent unavailable requests | Basic provider availability exists; no production calendar/conflict handling | P1 / Stage A/B | F-2; controlled pilot | None yet |
| F-12 | Leakage-resistant retention: rebooking, eligible reviews, declared-cash fee, saved providers | Master Plan §15.2; repeat use and collection | Some prototype history/receivable behavior exists; not validated on real usage | P1 / Stage A/B | F-3 for online; real pilot data | None yet |
| F-13 | Review integrity and abuse controls | Master Plan §15.2; trust and safety | Prototype reviews; no production bot protection or rate limiting | P1 / Stage B | F-1, server, moderation policy | None yet |
| F-14 | Pilot KPI dashboard from real records | Master Plan §15.2, §19; evidence-led decisions | Existing admin analytics are prototype/demo records, not production KPIs | P1 / Stage A local events; Stage B production | F-2; defined metrics and live/demo split | None yet |
| F-15 | Provider-reviewed portfolio/service-description generator | Master Plan §15.2; provider visibility | Not implemented | P2 / Stage B | F-1, F-2, grounded model proxy if used | None yet |
| F-16 | Transparent Smart Match v1 and “popular in your barangay” | Master Plan §15.2, §14.5; useful local discovery | Stage A portion implemented: sorted rule-based demo score from provider records; available factors are explained, verification status is separate, and the UI disclaims AI/live availability. No popularity aggregation, validated ranking or production data. | P2 / Stage A rules | Real supply/booking records; cold-start explanation | Named check `demo match scores, reasons and verification labels reflect provider records`; `node tools/falsify-smart-match.cjs` |
| F-17 | Concierge grounded in real provider/service records | Master Plan §15.2; discovery assistance | Simulated local keyword rules; no live AI | P2 / Stage B if model needed | F-2, F-16; user override and source labels | None yet |
| F-18 | Explainable fraud/spam flags routed to a human | Master Plan §15.2; protect users | Not implemented as a usage-driven queue | P2 / Stage A rules only after evidence | Real usage data; F-1/F-2; human appeal | None yet |
| F-19 | Provider subscriptions and promoted listings | Master Plan §15.2, §11.4; test monetization | No subscription/promotion feature | P2→P3 / flagged-off model at most | Paid-plan validation; M7+; owner decision on model | None yet |
| F-20 | Reputation levels earned from completed work, not spend | Master Plan §15.2; transparent provider growth | Rating/jobs derive from records; no levels/privileges | P2 / Stage A only if justified | F-2; reliability rules | None yet |
| F-21 | Filipino/Bisaya localization | Master Plan §15.2; usable local service | Not implemented as a tested localization system | P2 / research-led | Interviews and translation review | None yet |
| F-22 | ID OCR assistance with human decision | Master Plan §15.2; reduce review labor | No OCR or ID capture | P2 / Stage B only | F-5 working; lawful vendor; privacy review | None yet |
| F-23 | Voice-command signup | Master Plan §15.2; optional accessibility | Not implemented | P3 / optional progressive enhancement | F-7; device/browser and language tests | None yet |
| F-24 | Live-web price intelligence with citations | Master Plan §15.2, §14.5; external context | Not implemented; no proxy | P3 / Stage B | F-8; server-side proxy, dated sources, user override | None yet |
| F-25 | Facial match/liveness | Master Plan §15.2; stronger identity check | Not implemented; no biometrics stored | P3 / defer | Counsel, privacy impact assessment, lawful vendor, alternative path | None yet |
| F-26 | Referral to licensed lenders/insurers | Master Plan §15.2; possible later access | Not implemented; no lending/insurance service | P3 / out of pilot | Licensed partner, legal approval, explicit opt-in | None yet |
| F-27 | Business accounts, recurring bookings and invoices | Master Plan §15.2; small-business use | Not implemented as production organization accounts | P3 / later | Evidence of small-business demand; F-1/F-2 | None yet |
| F-28 | NGO/family-in-need programme | Master Plan §15.2, §15.3; future scalability note | Not in app | P3 / parked, not a pilot feature | Pilot success and owner scope decision | None yet |
| F-29 | Repeat-service schedules with individually actionable booking requests | Repeat Services & AI Showcase prompt; reduce repeat coordination while keeping each visit explicit | Prototype foundation implemented in `Sukinnect-next.html`: hidden candidate categories, local series records, four-request horizon, series controls, consented provider replacement, and provider price proposals that require resident acceptance. Feature flag defaults off; no server scheduler, reminders or production persistence. | P2 / prototype validation | Category/provider supply, schedule usability, F-2 for shared records | `repeat services` checks in `node tools/verify.cjs`; camera flow coverage still required |
| F-30 | AI showcase grounded in local-service records and honest about model limits | Repeat Services & AI Showcase prompt; explain discovery assistance without replacing FIND → REVIEW → BOOK → RECORD | No new behavior implemented: Concierge remains a local keyword prototype, not an AI model. The source prompt was not present in this checkout, so scope and acceptance criteria remain unverified. | P2 / not started | Recover the source prompt; preserve user override, record-backed explanations and explicit simulation labels | None yet |

**Backend prompt tiers:** Stage A is browser-kernel hardening and honest prototype
behavior; Stage B is interface/schema/API design with labelled mocks, no deployment.
The backend prompt's T1.1–T1.9 are not approvals to override conflicts C1/C3/C7 below.
In particular, changing the commission default or hard cap is blocked until the owner
settles C1.

## 5. Scope guard

The pilot is a focused, supply-first municipal marketplace, not a bundle of every
proposed startup idea. Keep the core flow on local discovery, provider trust, structured
requests, completion and records. No broad social network, app-owned wallet, direct
lending, insurance product, public blockchain, facial recognition in the pilot or
unvalidated automated decision-making. NGO/families-in-need is a later scalability
note, not a pilot feature. Subscriptions and promotions are not active until a measured
M7+ test and owner approval. Do not claim a production AI or vendor connection.

When AI is used, distinguish: procedural/rule-based output computed from records on
this device; simulated behavior; or an external-model suggestion with source and date.
Never present generated or ranked content as a verified fact. The user can override a
recommendation, and any such choice must be recorded before claiming an audit trail.

## 6. Conflict ledger and open decisions

These are source disagreements, not code defects that an engineer may settle silently.
The Master Plan's Appendix A calls several of them open. Confidential funding, valuation,
investor split, liquidation terms, budget line items and named individual contacts are
intentionally excluded from this public file.

| ID | Conflict / evidence | Default proposal, not an owner decision | Status |
|---|---|---|---|
| C1 | Commission: the Master Plan lists 1.2% working, 1.0% alternative, 1.3% ceiling; the Market Research plan reports 8–12% and 5% Pro; prototype is 10%, with no cap. Fee payer is not settled in the Master Plan. | Do not change the app's 10% demo configuration until owner chooses rate, payer and cap. Any production price requires provider/customer terms and a signed merchant quote. | **Open — owner decision** |
| C2 | Funding ask, budget, valuation and investor terms vary among sources; the underlying workbook and some November documents were not supplied. | Keep detailed terms in the ignored local Master Plan; do not put amounts in the public roadmap. | **Open — confidential** |
| C3 | Commission-first deck vs freemium + commission Master Plan vs Market Research revenue scenarios; plan also says subscriptions only after validation. | Pilot revenue should not include unsigned partner income; defer paid features until measured pilot evidence and owner approval. | **Open** |
| C4 | Feature notes propose an app-owned wallet/cash-in/out and lending; Master Plan, `AGENTS.md` §23 and schema prohibit stored value and unlicensed financial activity. | Keep the no-wallet rule. Use licensed partners for payment/payout; no lending/insurance product. | **Recommended out of pilot; owner retains decision** |
| C5 | “Blockchain for encryption” vs Master Plan's limited exploration of tamper-evident records and restriction on sensitive data on public/immutable chains. | Encryption is not blockchain. A local hash chain may be evaluated separately; public-chain anchoring is deferred. | **Open; recommended not to build now** |
| C6 | Feature notes propose OCR/facial recognition; Master Plan recommends manual verification for the initial cohort and calls for legal/privacy safeguards. | Manual human review first; no sensitive capture in this prototype; defer biometric checks. | **Open; recommended deferred** |
| C7 | AI is described as central in some November sources, while prior product rules say it cannot replace FIND→REVIEW→BOOK→RECORD; current concierge/matching are simulated/typed. | Start with explainable rules; do not claim live AI or let AI decide disputes, verification or access. | **Open on pilot scope** |
| C8 | Prototype includes Delivery and Fruit Harvest & Buy; the plan's initial category shortlist does not include them. | Keep existing code; do not represent either as an approved pilot category until interviews and owner scope decision. | **Open** |
| C9 | Deck target is 150 providers; the plan recommends 60–100 verified active providers for the five-barangay pilot. | Report the source and label each as target, never achievement. | **Open target choice** |
| C10 | Competitor names and claims differ across sources and have not been independently checked in this pass. | Verify dated evidence before external comparison claims. | **Open** |
| C11 | “Hatian” in the feature notes is unclear; Master Plan has a separate draft treatment of liquidation/exit, but the missing companion notes cannot be checked. | Ask the owner what “hatian” refers to; do not infer. | **Open question** |
| C12 | Team label “Konekta” in Master Plan vs “Konekista” in `AGENTS.md`; registered entity status also unknown. | Keep brand name Sukinnect; confirm team label/entity before external materials. | **Open** |
| C13 | Demo barangays do not mirror the five-barangay pilot. | Align a clearly labelled pilot demo only after scope is confirmed. | **Fix candidate; not changed here** |
| C14 | Master Plan names Supabase/PostgreSQL as a proposal while reference SQL is MySQL; architecture is undecided. | Decide stack before porting or building migrations. | **Open** |
| C15 | The Master Plan cites an internal profitability workbook and companion sources not supplied here. | Do not recompute or rely on unprovided financial inputs; obtain sources before external use. | **Open / missing sources** |
| C16 | Proposed partner lists differ; none of the named organisations is confirmed by supplied signed agreements. | Use “proposed” / “prospective”; no logos or endorsement claims without written permission. | **Noted; no formal partnership evidenced** |
| C17 | Revenue and booking scenarios differ by source and model assumptions. | Cite source/scenario and call it a forecast/assumption. | **Open / not independently validated** |
| C18 | Previous source clone reported one line-ending-only verification failure; current Windows workspace baseline passed before documentation edits. | Record the actual local run, not the other environment's result. | **Resolved for current workspace baseline** |

### Source limitations

- The supplied `SUKINNECT_STARTUP_MASTER_PLAN.md` is the latest strategy source and is
  retained locally but ignored by Git because it contains non-public financial and
  investor detail.
- `SUKINNECT_BACKEND_AND_FEATURES_FIX_PROMPT.md` and
  `SUKINNECT_STARTUP_DOCS_AND_AI_CONTEXT_PROMPT.md` were supplied as implementation
  briefs. Their proposed features are not proof those features exist.
- The separate `Potential_Collaborations_and_New_and_Refine_Features.docx`, the
  market-research document and the underlying workbook were not supplied in this task.
  Their claims are attributed only where the supplied Master Plan itself reports them.
- The project README/AGENTS also refer to the pitch deck; this work did not independently
  validate its source assets.

### Decisions requested from the owner

1. Choose pilot commission rate, cap, and who pays the commission; confirm if the
   current 10% demo setting should change.
2. Decide pilot revenue structure and whether subscriptions/promotions are only an M7+
   experiment.
3. Confirm whether Fruit Harvest & Buy and Delivery are pilot categories or remain demo
   concepts.
4. Confirm whether the moderator and service-business/team roles are in the first
   production scope.
5. Confirm the AI scope and whether any external-model feature is needed for pilot.
6. Confirm the team name, and clarify “hatian”.
7. Decide production stack (PostgreSQL/Supabase vs existing MySQL reference schema).
8. Confirm what verification levels and any lawful vendor evaluations are acceptable.
9. Confirm which prospective partners, if any, have written agreements.

## 7. Proposed edits to the Master Plan

The source document is not edited by this work. Before external distribution, the owner
may want to:

- Reconcile C1/C3 and state the selected fee payer, final rate, cap and pilot revenue
  streams; distinguish the analytical recommendation from the owner decision.
- Align the pilot provider and booking targets across the deck, Master Plan and market
  research, and mark all as planning assumptions.
- Resolve C8: explicitly include or exclude Delivery and Fruit Harvest & Buy from the
  initial categories.
- Decide whether moderator and business/team roles are pilot requirements.
- Reconcile the AI language with the product's core marketplace flow and staged model
  described in §14.5.
- Clarify proposed partner status and avoid endorsement implications without signed
  permission.
- Resolve the team-name spelling and the “hatian” wording.
- Identify the missing workbook and source documents needed to reproduce forecasts before
  using them externally.

## 8. Traceability

| Implemented item | Code / record | Test proving it |
|---|---|---|
| Current browser prototype, centavos and booking/money kernel | `Sukinnect-next.html` | `node tools/verify.cjs` (read the current run output; the full suite is not green) |
| Demo/live distinction and target labelling | `Sukinnect-next.html`, `README.md` | Existing gate suite; no production data validation |
| Payment adapter seam | `Sukinnect-next.html` `MockGateway` | Existing payment checks in `node tools/verify.cjs`; gateway remains simulated |
| Record-derived demo Smart Match | `Sukinnect-next.html` `scoreProvider()` / `providerMatches()` | Named `node tools/verify.cjs` check; `node tools/falsify-smart-match.cjs` |
| Additive Stage B reference records | `schema/migrations/001_startup_records.mysql.sql` | Static review only; MySQL not selected or run against a database |
| Current source and business decision summary | This roadmap and `SUKINNECT_CONTEXT.md` | Fresh-AI read test; manual traceability |
| Production consent store/enforcement, onboarding flow, local price references, moderator authorization, hash-chain implementation, event/KPI screen, subscriptions/promotions, and executable API/mock adapters | None yet | None yet |

Planned features remain “none yet” until code exists and a targeted check can fail on a
deliberate break. A reference migration is a design artifact, not proof of a backend
feature. This roadmap is updated as implementation lands.

## 9. Stage B: backend-ready design outputs

These are design artifacts only. They do not deploy a service, create vendor accounts,
or make the prototype secure:

- Additive MySQL reference migration for consent, verification, price evidence, gateway
  fee pass-through, flags, subscriptions/promotions and audit/analytics records. Its DDL
  and seed inserts permit retry against the same baseline after partial DDL, but it is not
  a general migration manager and has not been executed. Review it after the owner chooses
  a production database. It does not choose a commission rate, cap or payer.
- API contract with roles, validation, ownership checks, status codes, idempotency,
  pagination and rate limits.
- Security/privacy design covering data location, access, retention, incident response
  and matters requiring counsel.
- Backend-stack recommendation in `docs/backend-stack.md`; PostgreSQL/Supabase vs MySQL remains an architecture
  decision, not an adopted dependency.
- Interface-compatible mock adapters and seam tests. No production service credentials.

No external integrations or production capabilities should be claimed until deployed
and independently verified.

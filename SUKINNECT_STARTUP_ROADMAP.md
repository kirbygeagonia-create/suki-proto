# SUKINNECT — STARTUP ROADMAP

| | |
|---|---|
| **Written** | 6 November 2026 |
| **Purpose** | The current project document *as a startup*: goals, needs, refined features, new features, conflicts, and what is traceable to code |
| **Authority for business facts** | `Sukinnect_Master_Plan_Revised_27Oct2026.docx` (readable copy: `docs/readable/`). The `.docx` wins over the copy. |
| **Authority for what is implemented** | `Sukinnect-next.html` and `node tools/verify.cjs` |
| **Confidentiality** | No funding ask, valuation, investor split, liquidation terms, budget lines, salaries or named individuals appear in this committed file. They are in the Master Plan `.docx`, kept local (see `.gitignore`). |
| **Claims discipline** | Official statistics are facts. Every Sukinnect forecast, target, price, conversion rate and financial scenario is an **assumption** until field data, a signed agreement or a dated quotation supports it. Partners are **proposed**. Features are **in plan**. Nothing here is traction. |

---

## 1. Goals

**Mission.** Connect households and small businesses with nearby service providers in one workflow —
local discovery, verified provider information, booking and transaction records, with AI tools that
reduce the work of finding, trusting and recording a job — and help providers build visibility,
trust, skills and a sustainable business (Master Plan §1, §2).

**12-month pilot objective.** Run a gated validation pilot in Tupi, South Cotabato that produces
*evidence* about supply density, demand, completion quality, repeat use and unit economics — not
growth for its own sake. The plan's own position is that the base case neither breaks even nor pays
back inside 12 months, and that the investment funds a gated validation pilot rather than an ROI
(Master Plan §1, "Profitability position"). Stating it that way is the goal, not a caveat.

### Evidence gates, as conditions

Each row is a **condition that must be true to release the next tranche of work**, from Master Plan
§7.5. A missed gate means freeze discretionary spend, diagnose and revise; never scale automatically.

| Period | Condition to be met (not a result) | If missed |
|---|---|---|
| M1–M2 | 30+ provider interviews done; 20+ providers have consented to onboard; customer interviews and request tests run | Pause non-essential build; refine the offer |
| M3 | MVP accepted against demo and acceptance criteria; 20+ providers ready with categories and prices; payment, privacy and security flows tested in **sandbox**; no production GMV claimed | Hold the build milestone; do not call it launched |
| M4–M5 | 20+ **active verified** providers; the forecast booking counts met; completion, cancellation, complaint, refund and contribution tracked | Keep the pilot narrow; fix conversion before spend |
| M6 | Fulfilment acceptable; no unsafe categories shipped on an unsupported promise; processor fees reviewed against the actual signed quote | Do not expand acquisition |
| M7–M9 | Paid subscriptions and promoted listings started **only** with measured unit economics; paying-provider conversion tracked | Revise the monetisation assumption; do not call it operating profit unless revenue materialises |
| M10–M11 | Partner-funded spend only under a **written** agreement; retention and support capacity meet target | Defer expansion; secure renewals first |
| M12 | Two consecutive months of positive contribution margin before any scale-up budget | Extend or narrow the pilot; do not relabel a pilot as a launch |

### Success metrics the plan names (§11)

Verified **active** providers by category and barangay (not registrations) · qualified requests ·
request→booking conversion · completed bookings · cancellations and no-shows · time to match · GMV ·
commission · **payment cost paid by Sukinnect, which should read zero in the pilot** · refunds ·
contribution per completed booking · customer acquisition cost · cost per verified active provider ·
referral conversion · repeat-booking rate · paying subscribers and churn · promoted-listing sales ·
signed partner revenue · AI recommendation acceptance · price-guidance error against local quotes ·
portfolio edit rate · onboarding completion · fraud-flag precision and false-positive rate ·
complaints · dispute resolution time · safety and privacy incidents · appeal outcomes.

**None of these is measured by anything today.** The prototype records booking, payment, dispute and
status events on the device; it records no funnel, no acceptance, no drop-off and no edit-rate event.
That is gate row B14 in the backend brief and feature F19 below.

---

## 2. Needs register

What the startup needs and does not yet have. **Owner** is left blank for the team to fill; a need
with no name against it is a need nobody is carrying.

| Need | Owner | Blocks which gate | Status |
|---|---|---|---|
| 30+ provider interviews, 20+ consent-to-onboard | | M1–M2 | not started |
| 3+ independent price quotations per priority category (the band cannot be honest without them) | | M3, F5 | not started |
| Signed payment-partner agreement and a **dated merchant quote** (the plan's rates are published-page rates checked 27 Oct 2026, ex-VAT, and must be confirmed by quote) | | M3, C1, C2 | not started |
| Privacy impact assessment and a designated privacy lead | | M3 | not started |
| Pre-launch security audit (a launch gate in the plan) | | M4 | not started |
| Legal review: terms, privacy notice, payment handling, and the investor/liquidation terms | | M3, M4 | not started |
| Insurance quotes with insured parties, covered events, limits, exclusions, premiums and claims defined | | M7 | unconfirmed — no quote on file |
| At least three investors (the plan's floor) | | funding | not started |
| Tupi Municipal Government and the five barangay offices — **proposed**, no formal partnership | | M1–M2 | not started |
| DTI South Cotabato — **proposed** | | M1–M6 | not started |
| TESDA South Cotabato — **proposed** | | M3, F7 | not started |
| PESO Tupi — **proposed** | | M1–M6 | not started |
| DSWD (livelihood / social inclusion) — **proposed** | | later | not started |
| ICEBOX TBI, MSU General Santos City — **proposed** | | mentorship | not started |
| Eulap and other technology partners — **proposed** | | Stage B | not started |
| Local academic institutions (prototype evaluation, research) — **proposed** | | M3 | not started |
| The financial workbook the Master Plan cites as the basis for §4.3 and §6–§8 (`Sukinnect_2_08M_Profitability_ROI_Monthly_Model.xlsx`) | | every financial claim | **missing from this laptop** — recorded as a missing source; no figure was recomputed |
| A decision on each open conflict C1–C12 | | see §6 | awaiting owner |

---

## 3. Refined features — things that exist and must change to match the plan

| Item | Today | What it must become |
|---|---|---|
| Transaction fee | **built 7 Nov 2026:** `CONFIG_DEFAULTS.commissionRateDefault = 0.012` with `commissionRateCap = 0.013`; the cap is enforced at every read (`assertWithinFeeCap`), inside `setConfig`, and in the admin form; the receipt and the change log print the decimal through `ratePercent()` | 1.2% working, 1.0% alternative one `setConfig` call away (C1); per-category rates validated in the field. Proved by `₱800 at the pilot fee takes ₱9.60`, `the default rate is the 1.2 percent of the Master Plan under a 1.3 percent cap`, `no seed froze a rate above the cap`, `a rate above the cap is refused at the form`, `and refused inside setConfig, not only by the form`, and `node tools/falsify-business-rules.cjs` |
| Gateway fee | **built 7 Nov 2026:** `CONFIG.gatewayFees` prices gcash / maya / qrph / card with a dated source string and keeps cash and direct `null`; the fee sits inside the payer's total, outside `platformRevenueCentavos`, settles through `gateway_fee_payable` and its own `gateway.fee_paid` event, and is excluded from both the refund cap and the refund lines. `assertGatewayNotAbsorbed` throws at the seam on either half of absorption, and `settlementLines` refuses an absorbing posting through the ledger | a separate disclosed line paid by the payer, never platform revenue, never absorbed; cash/direct has none (C2). **The rates still need the plan's signed merchant quote** — the source string and the admin console both say none is on file |
| Smart Match | typed per provider in seed (`score: 96 … 78`), painted as `N% Match`, and the results header says "Sorted by: Smart Job Match" while `providerMatches()` only filters | computed from records, sorted by the computation, with reasons that were actually computed, and labelled *rule-based, computed from records on this device* |
| Launch geography in the evidence screens | demo seed uses San Isidro, Sta. Cruz, San Jose, Barangay 2, Buayan | the plan's five barangays stated as the launch set; demo data kept visibly demo (C4) |
| Roles | three: resident, provider, admin | five as planned (customer, individual provider, service business/team, moderator, super admin), reached in phases, with `can(actor, action)` in the kernel (C5) |
| Honest labels | present and gated (demo/live, "sample figures", "declared, not verified", simulated-AI note) | extended to every AI-flavoured result: `rule-based, computed from records on this device` / `simulated` / `suggestion from an external model, with source and date`, each overridable, with the override recorded |
| Money-held wording | README says accepting a job holds the customer's money with a licensed partner; the gateway is `MockGateway` | say plainly that this is a simulation and state what the real arrangement must be (C8, B15) |

---

## 4. New features register

Code status was **re-verified against `Sukinnect-next.html`** on 6 November 2026; the brief's seed
column said "not found" for nine rows that exist in this build. Corrections are marked. One of them
(F3) was mis-corrected by this file's first pass, which grepped for the word "onboarding" and never
opened the gate suite actually named `signup-guide` — the register's own evidence is the suite, so the
row now cites it.

| ID | Feature | Source | Code status as measured | Tier | Depends on | Phase |
|---|---|---|---|---|---|---|
| F1 | Data-driven recommendations: frequent / popular actions per user and barangay | Notes; MP §3 | **corrected:** not built as recommendations; the signals exist (bookings, searches, repeat providers) and `CONCIERGE_SORTS` ranks by category match. No per-user frequency model. | 1 | F2, event recorder | M3–M4 |
| F2 | Provider matching engine (skill, distance, availability, area, history) | MP §3 | **not built** — `providerMatches()` filters only; no score, no sort | 1 | records already present | M3 |
| F3 | Sign-up wizard, typed; voice as enhancement | Notes | **corrected twice: BUILT.** `openSignupGuide` + `SIGNUP_GUIDE_STEPS` ask one question at a time, write each answer into the field the register form itself reads, and create no account of their own; `speechSeam()` reports the engine it found or says none is exposed, and with no engine the dictate control says so and leaves the field alone. Proved by the `signup-guide` suite (8 checks). The first correction here claimed no account wizard existed — it was written from a grep for "onboarding" and never opened the suite named `signup-guide`. **Updated 7 Nov 2026:** dictation is now gated before the browser is consulted — `speechSeam()` answers `featureFlags.voiceInput` first, so the step names the flag that is off rather than the engine it did not find, and with the flag on it names the engine or says none is exposed (`dictation is off by default and the seam names the flag, not the browser`). | 1 built | none | built |
| F4 | Onboarding / verification stepper | Notes; MP §3 | **not built** — the steppers in the file are the *booking* path (`stepBar`, `stepPath`) and the two-step sign-up guide; nothing walks a provider through verification stages | 1 | F7 | M4 |
| F5 | Pricing guidance for a provider who does not know what to charge | Notes; MP §3 | **corrected:** built as `rateBandFor(trade)` — a band computed from this device's records, which **refuses** (`available:false`) when there is no band, plus the wizard that stores the provider's own choice. Web/LLM context: not built. | 1 built, 2 deferred | 3+ local quotes per category | now / later |
| F6 | Web-informed labour rates and exchange-rate updates via an LLM | Notes | **corrected:** present as **named seams** that return `available:false` with a reason — `exchangeRateSeam()` ("this build makes no network call at all"), and a usual-rate lookup from outside the app. Nothing is fetched, nothing is estimated. | 2 | server, proxy | not scheduled |
| F7 | Verification: certificates, government ID, OCR, face recognition | Notes; MP §3, §9 | **partly corrected:** statuses, a human review queue, credential records with expiry, and a **labelled OCR seam** (`seam(ocr.reason)`) exist. No ID capture, no OCR, no liveness, and nothing sensitive is stored — which is the plan's rule, not a gap. | 1 now, 2 vendor | licensed vendor, legal review | M3 / post-pilot |
| F8 | Terms and Privacy at sign-up, acceptance blocked until both are read | Notes; MP §3 | **corrected: built.** Separate customer and provider documents, a scroll gate that treats a pane too short to scroll as read (`scrollHeight <= clientHeight + 4`), and a **versioned acceptance record** (`state.termsAcceptances`) persisted before identity. Text is marked **DRAFT — not reviewed by Philippine counsel**. | 1 | lawyer for final text | built |
| F9 | CAPTCHA | Notes | **corrected:** present as a named seam — `spamCheckSeam()` says "No bot check runs when an account is created here… it does not claim to have told a person from a script." No fake CAPTCHA. | 2 | server, provider | not scheduled |
| F10 | Tamper-evident records ("blockchain") | Notes; MP §3 | **corrected: built as a hash chain, not a blockchain.** `chainHash(prevHash, event)` over a canonical form, `verifyLedgerChain()`, and the admin screen prints the result. The UI says plainly it is not a blockchain, not a network, not encryption. | 1 | none | built |
| F11 | Cashless payments through a licensed gateway | Notes; MP §9 | **mock only** — `MockGateway` behind a seam (`authorize · capture · refund · void`), plus `gatewayCashSeam()` refusing cash-in/out because no partner is wired. | 2 | signed partner | M3 sandbox |
| F12 | The app's own digital wallet with cash in/out | Notes | **corrected and contested:** wallet screens exist (`openWallet`, `walletSheet`) as a **view over the ledger** — a balance is derived, never typed, cash-in/out are refused by a named seam, and every screen says no value is stored. Owner ruling 2026-10-27 built the UX and kept real money out. **C7 is unresolved.** | 3 | owner + regulatory review | built as a view |
| F13 | Levels / XP / privileges | Notes | **corrected:** a standing tier exists and is **computed from records** (`jobs >= 5 → Established`, `>= 2 → Active`, else `New`) with **no privilege attached**, deliberately, because privileges tied to money would reward the established and punish new providers. | 1 | reliability data | built, privileges deferred |
| F14 | Lending readiness and referral to a licensed lender | Notes; MP §3 | **corrected:** present as a named seam that **declines to answer** (funding eligibility returns `available:false`). No referral, no approval language. | 3 | licensed lender | not scheduled |
| F15 | Provider subscriptions and promoted listings | MP §6 | **half built 7 Nov 2026:** the flags exist and are off — `CONFIG.featureFlags.subscriptions` and `.promotedListings` (with `partnerRevenue`, `lendingReferral`, `voiceInput`), read by the kernel through `featureEnabled(flag)` rather than by each screen, and asserted by `paid and regulated features are off, and nothing in the books is waiting for them`. What is **still not built** is the model: no `subscription` or `promotion` record, no plan price, no ledger account for either, so the ₱699 and ₱299 assumptions cannot be tested yet. Promoted placement must be a labelled separate slot that never changes the organic score. | 1 flags built / 1 model, off | owner pricing | M7 |
| F16 | Moderator role and risk dashboard | MP §2, §3 | **not built** — `moderator` occurs zero times. Admin holds the review queue today. | 1 | F7, flags | M4 |
| F17 | Fraud / spam flags for human review | MP §3 | **not built** as detection; the admin trust surface already renders a *flagged* state ("No provider is flagged"), so the record shape exists and nothing writes to it. Simple explainable rules first. | 1 rules, 2 model | data | M4+ |
| F18 | Portfolio generator, growth and learning recommendations | MP §3 | **partly:** providers hold a portfolio as ordinary records they type themselves; nothing generates, and no growth or learning recommendation exists. | 2 | verified data | later |
| F19 | Pilot gates and KPI console | MP §7.5, §11 | **not built** — no event recorder (`STATUS_EVENTS` is the booking timeline, not funnel instrumentation), so none of §11's metrics can be computed. The admin Insights screen today derives supply/completion figures from records and refuses what no record asserts. | 1 | event recorder | M3 |
| F20 | Customer and provider connections (followers, repeat providers) | Notes; MP §5.1 | **corrected:** `connectionsSheet()` exists and is **computed from this device's jobs**, grouped by provider, with money deliberately kept out of a list that is about *who*, and no way to add or follow anyone. | 1 | records | built, as a view |
| F21 | NGO / families-in-need scalability | Notes | **out of scope by the owner's own note.** Present only as a named seam that lists no organisation (`available:false, organizations: 0`). | parked | — | not scheduled |

Tier 1 = buildable in the in-file kernel now. Tier 2 = needs a server, a vendor or a key.
Tier 3 = an owner or regulatory decision before any build.

---

## 5. Scope guard

The notes' own instruction is to **keep the primary focus and not go broad**. Concretely, for the
pilot this means:

- No NGO / families-in-need programme. It is a later scalability note (F21), not a pilot feature.
- No lending, no insurance underwriting, no e-wallet value storage — referral and licensed partners
  only, and only after the owner and a regulator's view exist (C7, F12, F14).
- No investor mechanics in the product: the pool, the valuation and the exit are documents, not
  screens.
- No public-chain anchoring, no biometrics on any chain, no ID images in the prototype (C9).
- No web-scraping "AI" in a file that makes no network call: where a feature needs the outside world,
  it is a **named seam that says so** (F6, F9) rather than a simulated success.
- Exchange-rate work belongs to **budget tooling**, not the booking flow.
- The Flutter port and the visual redesign are separate briefs; this roadmap does not schedule them.

---

## 6. Conflict ledger

Default resolution = what the documents and the code imply. **The decision is the owner's.** Nothing
here was settled silently.

| # | Sources disagree | Repo / code today | Default proposed | Owner decision |
|---|---|---|---|---|
| C1 | Fee **1.2%** (1.0% alt, hard cap 1.3%) vs the deck's 10% and the Market Research plan's 8–12% | **code now carries the plan's figure** (7 Nov 2026): `commissionRateDefault = 0.012`, cap `0.013` enforced at every read, in `setConfig` and in the form; the deck's 10% is legacy in the docs | Master Plan wins: 1.2% with the cap enforced, per-category override capped, 10% marked legacy | **implemented; 1.0% vs 1.2% still the owner's to choose** (one `setConfig` call) |
| C2 | Gateway fees **not absorbed**, or shown as a separate disclosed line paid by the payer | **built 7 Nov 2026** as a pass-through the payer funds: `CONFIG.gatewayFees` with a dated source, `gateway_fee_payable` in the ledger, `assertGatewayNotAbsorbed` refusing at the seam, refunds excluding the fee | required rule; implement as a pass-through that throws if the platform would absorb it | **built; the rates await a signed merchant quote** |
| C3 | Pilot targets **3,270** base / 15,200 stretch | README's honest-labelling line says 150 providers, 3,000 users, **6,000** bookings | replace 6,000 with the plan's figures, labelled targets/forecasts, never traction | **open** (README corrected in this pass) |
| C4 | Launch = Poblacion, Polonuling, Cebuano, Kablon, Bunao | demo seed uses other barangays; only Poblacion overlaps | state the real launch geography; keep demo data visibly demo; seed alignment is a backend-prompt item | **open** |
| C5 | Five user groups | three roles | record as a gap with a phase; `can()` in the kernel so it survives the move to a server | **open** |
| C6 | Revenue streams: commission + subscriptions (₱699 blended) + promoted listings (₱299) + partner revenue (zero until signed) | commission only. **Since 7 Nov 2026** the flags exist and are all off (`CONFIG.featureFlags`), so a paid stream cannot be reached by accident — but no subscription, promotion or partner record is modelled and neither stream has a ledger account, so the plan's figures still cannot be tested | model the rest as **data, flagged off, labelled unvalidated**; nothing live before M7 | **open** |
| C7 | "Do not claim a proprietary e-wallet or direct lending" vs the notes' **app-owned wallet with GCash cash in/out** | wallet screens exist as a **derived view**; cash-in/out refused by a named seam; no value stored; owner ruling 2026-10-27 chose to build the UX and keep real money out | keep the no-stored-value rule; earnings summary + payout to a partner; **regulatory review before any real wallet** | **open — the owner's own documents contradict each other** |
| C8 | "No fund-holding without regulatory review" | README says accepting a job **holds** the customer's money with a licensed partner; the gateway is a mock | docs must say plainly it is a simulation and what the real arrangement must be | **open** |
| C9 | Notes: "blockchain for encryption"; plan §3/§9: *explore* signed audit logs or chain anchoring, never sensitive data on an immutable chain | a hash-chained ledger exists and is labelled "not a blockchain, not a network, not encryption" | keep the three apart: encryption (server), tamper-evidence (built), public anchoring (deferred) | **anchoring: open** |
| C10 | Fruit Harvest & Buy is a full pilot vertical in code and docs; the plan's category list and the notes never mention it (0 hits) | built, with its own money rules, produce fee deliberately unset | keep as a pilot vertical **or** park it — do not delete anything | **open** |
| C11 | Notes: "Investors must not be lower than 3"; "how will the **hatian** will be?" | plan §8 covers the pool and a discussion-draft waterfall | the word is unclear; **do not guess**. Likely the exit/liquidation split, which §8 covers. | **open question** |
| C12 | Deck names the team "Konekista" | the owner's team name is **Konekta** | recorded, never silently changed | **open** |

### Open questions for the owner

1. C1 — is the pilot fee 1.2% or 1.0%, and is the 1.3% cap a hard refusal or a warning?
2. C7 — does the wallet stay a view, or is a real stored-value product being pursued with a regulator?
3. C10 — keep Fruit Harvest & Buy as a pilot vertical, or park it?
4. C11 — what is "hatian" meant to decide: the exit split, the equity pool, or something else?
5. Which of the notes' features are **staged** and which are **excluded** from the pilot?
6. May the readable copies and the conflict ledger be committed, given the repository is public? (The
   `.docx` themselves are ignored as of this pass.)
7. Who owns each row of the needs register in §2? Every owner cell is blank.

---

## 7. Proposed edits to the Master Plan

The `.docx` is the team's authored source and **was not edited**. Proposed changes, for the owner to
apply in Word:

1. Reconcile **Fruit Harvest & Buy**: either add it to the §2/§3 category list as a pilot vertical, or
   state that it is a prototype experiment outside the pilot scope (C10).
2. Decide whether the **moderator** and **service business / team** roles are in the pilot at all; if
   they are, name the phase and the gate they block (C5).
3. State the **gateway-fee arrangement as a rule, not a scenario table** — the plan shows both
   absorbed and pass-through rows, and a reader can take the absorbed rows as an option (C2).
4. Add the **event instrumentation** the §11 metrics require; today no metric in §11 can be produced
   by the software (F19, B14).
5. Say which of the notes' features are **staged** and which are **excluded**, so the collaboration
   document stops being read as a backlog (F12–F14, F21).
6. Replace the internal workbook citation with a **dated, attached source** or mark the figures that
   depend on it as unverified — the workbook is not on this machine (§2 above).
7. Fix the team name in the deck-derived sections: **Konekta**, not Konekista (C12).
8. Define or remove **"hatian"** so the investor discussion has one vocabulary (C11).

---

## 8. Traceability

Implemented items name the code and the test that proves it. Planned items say **none yet** — a
feature with no test is not implemented, however it is described.

| Item | Code | Test |
|---|---|---|
| Booking lifecycle and status words | `BOOKING_STATES`, `attemptTransition`, `STEP_STAMPS` | `journeys`, `machine`, `falsify-step-stamps` |
| Money in centavos, ledger, payments behind a gateway seam | `recordPayment`, `MockGateway`, ledger accounts | `falsify-pay-records`, `falsify-money-bounds` |
| Tamper-evident ledger chain (F10) | `chainHash`, `buildLedgerChain`, `verifyLedgerChain` | a gate check that edits a record and requires the chain head to move |
| Terms and Privacy consent with a scroll gate and a versioned record (F8) | the legal-document sheet, `state.termsAcceptances`, `docScrolled` | `login` suite checks + `falsify-legal-truth` |
| Pricing band and the rate wizard (F5) | `rateBandFor`, `openRateWizard`, `rateWizardChoose` | the `fruit` suite, which counts the trades that actually have a band |
| Sign-up guide with dictation behind a named seam (F3) | `openSignupGuide`, `SIGNUP_GUIDE_STEPS`, `speechSeam` | the `signup-guide` suite, 8 checks |
| Standing tier, computed, no privilege (F13) | the tier ternary over completed jobs | `falsify-wallet`-family coverage |
| Connections as a derived view (F20) | `connectionsSheet` | the `connections` suite |
| Wallet as a derived view with refused cash movement (F12, contested) | `walletSheet`, `gatewayCashSeam`, `cashMovementSeam` | the `wallet` suite |
| Named refusal seams for OCR, exchange rate, bot check, funding eligibility, organisations | `seam(…)`, `exchangeRateSeam`, `spamCheckSeam`, `fundingEligibility` | the seam wording checks in `verify.cjs` |
| Honest labelling (demo/live, sample figures, simulated AI) | spread across screens | the `honesty` suite, `audit-open-items` |
| Computed matching and sorting (F1, F2) | **none yet** | none yet |
| Event instrumentation and the KPI console (F19) | **none yet** | none yet |
| Moderator role (F16), subscriptions and promoted listings (F15), levels and privileges (F13 privileges) | **none yet** | none yet |
| Real payments, real ID verification, real AI model, legal-final terms | **none yet, and not buildable in a single offline file** | none yet |

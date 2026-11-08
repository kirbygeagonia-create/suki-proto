# SUKINNECT — STARTUP MASTER PLAN

| | |
|---|---|
| **Document** | `SUKINNECT_STARTUP_MASTER_PLAN.md` — the principal startup and product strategy document |
| **Version** | 1.0, 6 November 2026 |
| **Status** | Working strategy. Nothing here is traction. Every forecast is an assumption until pilot data replaces it. |
| **Read first** | [`AI_CONTEXT_INDEX.md`](AI_CONTEXT_INDEX.md) (entry point for AI assistants), then [`AGENTS.md`](AGENTS.md) |
| **Companion sources** | The three November 2026 `.docx` files in the repository root (see Appendix C) and the pitch deck |

## How to read this document

Every substantive statement carries one of these tags so that a fact cannot quietly turn into a hope.

| Tag | Meaning |
|---|---|
| **[DECK]** | Stated by the pitch deck, *as summarised in `AGENTS.md` §3–§62*. The deck binaries could not be opened when this plan was written (see Appendix B), so deck claims are second-hand. |
| **[NOV26]** | Stated in one of the three supplied November 2026 documents. |
| **[IMPL]** | Present in the repository code and confirmed by reading it, the README/CHANGES, or by `node tools/verify.cjs`. Prototype-level only: it runs in a browser with demo data, not a server. |
| **[SIM]** | Looks functional in the prototype but is simulated (hard-coded or local demo state, `MockGateway`, no backend). |
| **[PROP]** | Proposed in a document, not built. |
| **[ASSUME]** | A planning assumption that needs evidence. |
| **[REC]** | A recommendation made in this plan. It is an opinion for the owner to accept, change or reject. |

When two sources disagree this plan does **not** pick a winner silently. It lists the conflict in **Appendix A** and says which decision the owner has to make.

---

## 1. Executive Summary

**What Sukinnect is.** A hyperlocal marketplace that lets households and small businesses in a Philippine municipality find, review, book and keep a record of local services, and lets independent providers be found, run bookings and build a reputation. Core loop: **FIND → REVIEW → BOOK → RECORD**. **[DECK][NOV26]**

**Where it stands.** A prototype, not a product. There is a working browser prototype with a deep, internally consistent money and booking model **[IMPL]**, but no server, no real authentication, no real payments, no real AI, no real users and no completed real bookings. Pilot figures (150 verified providers, 3,000 users, 6,000 bookings in the deck) are *targets*. **[DECK]**

**Pilot geography.** Tupi, South Cotabato, starting in five barangays: Poblacion, Polonuling, Cebuano, Kablon and Bunao. **[NOV26]**

**The honest financial picture.** Both November financial documents agree that **Year 1 does not break even under any scenario they model** **[NOV26]**. I re-checked their arithmetic and it reconciles. The first year is a funded validation period, not a profit year. The question is not *whether* to lose money in Year 1, it is whether the pilot buys evidence that a path to break-even exists. The Market Research plan puts operating break-even at roughly 1,200–1,500 completed bookings a month at a 10–12% commission **[NOV26]**, about 6–7% of Tupi's households booking every month **[ASSUME]**.

**Strengths**

- A clear, concrete core loop and a defined pilot geography.
- A rigorously built domain model: integer-centavo money, double-entry ledger, a 10-state booking machine, offers, disputes, payouts, an admin configuration with an audit trail, and a reference SQL schema. **[IMPL]**
- Strong discipline about not over-claiming (demo vs live data labels, "targets are not traction"). **[IMPL]**
- A supply-first, barangay-by-barangay launch plan that fits a small town. **[NOV26]**
- Candid financial analysis that already rejects first-year-profit claims. **[NOV26]**

**Weaknesses**

- **Zero field evidence.** No interviews, no price data collected locally, no provider count for Tupi. The Market Research plan says so itself. **[NOV26]**
- **The business model is not settled.** Commission is 1.2% in one document, 8–12% in another, 10% in the prototype, and "validate per category" in the deck. See Appendix A, conflict C1.
- **Scope has drifted.** The newest feature notes add facial recognition, blockchain, an in-app wallet, loans and an NGO programme, several of which contradict the Master Plan and the prototype's deliberate design. See C4–C6.
- **The prototype's demo data does not match the pilot.** Only Poblacion of the five pilot barangays appears in demo data. **[IMPL]**
- **Documentation conflicts** (funding ask, tier structure, competitor list, team name). See Appendix A.

**The five decisions the project owner must make before the next document revision**

1. **Commission rate and who it is charged to** (C1).
2. **The funding ask** and the investor terms (C2).
3. **The revenue model**: commission-first (deck), or freemium + commission (Master Plan), and the tier structure (C3).
4. **AI scope for the pilot**: core pillar (November documents) or post-pilot (the earlier concept-note direction) (C7).
5. **Whether wallet, lending, blockchain and facial recognition are in or out** (C4–C6). My recommendation is *out of the pilot*; see §15.

---

## 2. Company and Product Identity

| Item | Position | Status |
|---|---|---|
| Product name | **Sukinnect** | Confirmed |
| Team name | **Konekta** per the project owner; `AGENTS.md` line 50 says "Konekista" | **Conflict C12** — confirm and correct |
| Category | Hyperlocal services marketplace (a *municipal* one: the unit of design is the barangay, not the city) | **[DECK]** |
| Entity | Business registration status is **unknown**; the Master Plan lists it as something to confirm before external submission | **[NOV26]** |
| Product today | One-file web prototype (`Sukinnect-next.html`, with the earlier shipped `Sukinnect.html` beside it). An Android WebView shell exists locally and is not in the repository. | **[IMPL]** |
| Logo | `Sukinnect_Logo.png` — the official mark, never redrawn, recoloured or stretched (`AGENTS.md` §10, §35) | Confirmed rule |
| Positioning | Organised local density + verification + structured booking + transaction records inside one municipality. Not "AI marketplace" and not "Uber for services". | **[REC]** consistent with `AGENTS.md` §7 |

---

## 3. Vision and Mission

These are **[REC]** drafts assembled from the deck's product definition (`AGENTS.md` §1, §3) and the Master Plan's long-term vision. They are for the owner to edit, not to treat as approved text.

**Purpose (already in `AGENTS.md`).** Make local services easier to find, understand, trust, book and complete.

**Vision.** A trusted local service marketplace in every community where good local work is hard to find: proven first in Tupi, then South Cotabato, then the SOCCSKSARGEN region. **[NOV26]** long-term vision, tightened.

**Mission.** Give residents a clear, safe way to hire nearby providers, and give independent providers and small service businesses a professional presence, structured requests and a reputation built on completed work.

**Core principles**

1. *Supply first.* A marketplace with nobody to book is useless. **[DECK][NOV26]**
2. *Say what was checked.* A badge describes a check; it never guarantees competence, safety or quality. **[NOV26]**
3. *Records, not claims.* Every status, amount and review points to a record that exists.
4. *No regulated finance of our own.* Payments move through licensed partners; Sukinnect is not an e-wallet, lender or insurer. **[NOV26][DECK]**
5. *Humans decide consequential cases.* AI may recommend and flag; disputes and account actions get human review and appeal. **[NOV26]**
6. *Targets are not traction.* Never present a planning figure as a result. **[IMPL]** (enforced in the prototype's labelling)

---

## 4. Problem Statement

**The problem.** Local supply and demand already exist. The *connection* between them is fragmented: Facebook groups, referrals, old contacts and direct messages. **[DECK][NOV26]**

### 4.1 How well the product addresses each problem

| Problem | Does the prototype address it? | Verdict |
|---|---|---|
| Fragmented service discovery | Category and barangay browse, search, provider cards **[IMPL]**; a simulated concierge and "Smart Match" **[SIM]** | Addressed in design; unproven in the market |
| Lack of provider visibility | Provider profiles, service areas, applications **[IMPL]** | Addressed in design |
| Hard to judge credibility | Verification labels, application review, ratings, review records **[IMPL]**; declared-not-verified capability wording **[IMPL]** | Addressed; verification *depth* is the open question (§13) |
| Unstructured booking | A 10-state lifecycle, request inbox, offers, one shared booking record **[IMPL]** | **Strongest area** |
| Unclear pricing | Configurable catalogue, frozen terms on acceptance, "Price by offer" labelling **[IMPL]** | Strong for fixed-rate trades; local price *guidance* is not built |
| No transaction documentation | Ledger, receipts, statements, status timeline **[IMPL]** | Strong |
| Limited customer protection | Hold-and-release money model, disputes, refunds that reverse the booking's own posted lines **[IMPL]**; money is simulated **[SIM]** | Designed well; not real until a licensed gateway is live |
| Difficulty managing availability | Provider availability and service areas **[IMPL]** | Basic |
| No professional tools for providers | Request inbox, earnings, payouts, history **[IMPL]** | Basic; "growth" tools are **[PROP]** |

### 4.2 Problems the current direction overlooks **[REC]**

1. **Disintermediation (leakage).** Jobs are small; once a customer and provider have met, both can move payment off the app. The Market Research plan names this as the biggest risk **[NOV26]**. The prototype already models cash-on-arrival as a fee *receivable* with ageing **[IMPL]**, which is the right instrument, but there is no strategy for *keeping* the relationship on-platform (§15, F-12).
2. **The verification barrier for informal workers.** The people the platform most wants to include may have no TESDA certificate, no business permit and sometimes thin ID. A single strict verification gate would exclude them; no gate at all would break trust. A *tiered* ladder is needed (§13).
3. **Assisted onboarding.** Digital readiness is mobile-first, not computer-first (98.8% of internet users use phones, per the Market Research plan **[NOV26]**). Many first sign-ups will be done *with* a person beside the provider. The product needs an assisted mode, not only a self-serve one.
4. **Language.** The prototype contains essentially no localisation (one keyword match for any local language). Whether Tupi users want Cebuano/Bisaya or Filipino copy is an *open research question*; it is not addressed anywhere in the documents.
5. **Safety and liability by category.** Electrical work and anything involving heights (the fruit-harvest pilot) carry risk. The prototype has declared-capability and decline-safely rules for fruit harvesting **[IMPL]**; the November documents call for limiting higher-risk categories until controls exist **[NOV26]**.
6. **Proof of work and warranty.** Customers want a record of past work; the receipt and record exist, a *work-done evidence* and warranty concept does not.
7. **The provider's price problem.** New providers often do not know what to charge. The notes identify this **[NOV26]**; the product answer is price *guidance*, built carefully (§15, F-8).

---

## 5. Market Opportunity

All figures below are quoted from the supplied documents **[NOV26]** and were **not independently re-verified** against PSA publications for this plan.

| Area | Population / households (PSA 2024, as quoted) | Role |
|---|---|---|
| Philippines | 112,729,484 people; ~29.67 M households | Context only |
| SOCCSKSARGEN | 4,462,776 people; 1,174,715 households | Expansion universe |
| South Cotabato | 1,010,009 people; 277,245 households | Next step |
| **Tupi** | **78,599 people; 20,604 households** | **Pilot town** |

**How to read market size.** The earlier plan sized the market as households × an assumed ₱6,000 a year of service spend, giving about ₱123.6 M for Tupi (₱3,000 low case, ₱12,000 high case). PSA publishes no official total for this basket, so these are *scenario calculations* **[ASSUME]**. The "initial obtainable" 10% of Tupi households (~2,060 households, ~₱12.4 M) is a **target**, not a finding. The arithmetic checks; the premises are unvalidated.

**Digital readiness (national rates, PSA 2024 as quoted):** 48.8% of households have home internet; 67.3% of people aged 10+ used the internet; mobile phones used by 98.8% of internet users. This supports a mobile-first, low-data design with in-person sign-up help. **[NOV26]**

**Pilot geography.** The five launch barangays hold about 55.5% of Tupi's 2020 population (40,791 of 73,459) — **this is a population share, not a household share**, and the Master Plan material that called it a household share is wrong or needs relabelling **[NOV26]**. The Market Research plan estimates ~11,400 households there **[ASSUME]**.

**Provider supply is the real market-size question.** No count of providers in Tupi exists. The Market Research plan tests three assumed densities:

| Assumed density | Providers in Tupi | In the five barangays | 150 providers as share of that supply |
|---|---|---|---|
| 1 per 75 households | 275 | 153 | 98% |
| 1 per 100 | 206 | 114 | 131% |
| 1 per 150 | 137 | 76 | 197% |

**[REC]** Treat **60–100 verified providers** as the realistic pilot target for the five barangays and reach 150 only after adding barangays, exactly as the Market Research plan concludes. The deck's 150 should remain labelled a *proposed* target.

**Assessment of the Tupi beachhead.** Keep it. It is small enough to build density and measure behaviour, and the documents give a defensible reason for the five barangays. I see no evidence supporting a change. What needs correcting is not the geography but the *demo data*, which uses Poblacion, San Isidro, Sta. Cruz, Buayan and "Barangay 2/4" and so does not mirror the pilot. **[IMPL]**

---

## 6. Target Market and Personas

These are **persona hypotheses**, not research findings. The first 30 provider and 40 customer interviews (§17) exist to confirm or kill each one. **[ASSUME]**

| Segment | Motivation | Main barrier | What must be true for adoption |
|---|---|---|---|
| **Household / resident** | Find an available, trustworthy provider quickly; know the price before the visit | Habit (ask a friend, post in a group); distrust of strangers | Enough *available* providers in their category; a visible price or range; a way to complain if it goes wrong |
| **Small business** (store, clinic, eatery, farm) | Recurring repair, cleaning, IT/design help; a record or receipt | Procurement habits; need for invoices | Repeat booking with the same provider; receipts |
| **Independent skilled provider** (plumber, electrician, appliance tech) | Steady requests beyond their personal circle; a record of completed jobs | Fear of fees; low digital comfort; cash habit | Value shown before any fee; assisted onboarding; fast payout |
| **Side-income / informal worker** | Extra income; a first professional profile | May lack IDs/credentials | A verification path that does not exclude them |
| **Livelihood-programme graduate** | A bridge from training to paying work | Awareness; eligibility rules of the source programme | Referral from PESO/TESDA/DSWD, *if* those partnerships are confirmed |
| **Small service business** (team, shop) | Leads, a branded profile, request management | Ability to pay for tools | Proof of leads delivered |
| **Administrator / operator** | Verify, moderate, settle, resolve disputes | Workload | Tools that surface what needs attention (the prototype's admin surface does this **[IMPL]**) |

Willingness to use the platform is **unknown** for every segment today.

---

## 7. Value Proposition

| For | Value | Evidence status |
|---|---|---|
| Residents | One organised place to find nearby providers, see profile and verification, understand what a job costs, book, and keep a record | Designed **[IMPL]**; unvalidated |
| Providers | Visibility beyond personal networks, a professional profile, structured requests, history and reputation from completed work | Designed **[IMPL]**; unvalidated |
| Small businesses | A channel for recurring local needs, with records | Weakly built; mostly **[PROP]** |
| Community partners | A channel linking eligible workers and microenterprises to customers and training | **[PROP]**, no confirmed partner |

**Unique selling proposition.** **[REC]** Lead with what is hard to copy: *dense, verified local supply plus structured booking records at barangay level.* The Market Research plan reaches the same conclusion: verification, AI or blockchain alone are not unique **[NOV26]**. What Sukinnect must *prove* is dense local supply, price guidance people trust, tools that help providers grow, and bookings that actually get completed.

---

## 8. Product Overview

### 8.1 Roles and loop

Three principal roles: **Resident/Customer, Service Provider, Administrator** (`AGENTS.md` §12). Loop: **FIND → REVIEW → BOOK → RECORD**. The Master Plan's longer chain (*Find → Verify → Request → Match → Book → Complete → Review*) refines the same loop; it is not a different product.

### 8.2 The two prototype files

| File | Role |
|---|---|
| `Sukinnect-next.html` | The working rebuild ("domain kernel"): money in centavos, one shared booking record, ledger, state machine, payments behind a gateway seam, payouts, an admin money console. Served by Netlify at `/`. |
| `Sukinnect.html` | The earlier shipped prototype, kept for side-by-side comparison. Needs `reicon.js` (Git LFS). |

### 8.3 What is real, simulated and absent

*(Checked against the code and tests on 6 Nov 2026; see Appendix B for the method and its limits.)*

| Area | Status |
|---|---|
| Money in integer centavos; double-entry ledger that refuses to post unbalanced entries | **[IMPL]** |
| Booking state machine (`requested → upcoming → en_route → arrived → ongoing → completed`, plus `cancelled`, `expired`, `no_show`, `disputed`) with actor rules and recorded consequences | **[IMPL]** |
| Offers/negotiation as child records that never move a booking state | **[IMPL]** |
| Payments: authorize / capture / refund / void behind `MockGateway` | **[IMPL]** seam, **[SIM]** money |
| Payouts, statements, receipts, cash-on-arrival fee receivable with ageing | **[IMPL]** |
| Disputes raised from both sides, evidence timeline, help desk | **[IMPL]** |
| Admin configuration (rates, fees, VAT, payout threshold, windows) with audit trail | **[IMPL]** |
| Provider applications and document requests | **[IMPL]** (review workflow is demo data) |
| Local persistence | **[IMPL]** localStorage/memory only. No server. |
| Authentication | **Absent.** Role is chosen on a demo sign-in; nothing enforces a boundary between roles. |
| AI Service Concierge and Smart Match | **[SIM]** |
| Subscriptions, tiers, promoted listings, referrals | **Absent** (no matching code) |
| Voice sign-up, OCR of IDs, facial recognition, blockchain, reCAPTCHA, terms-and-privacy acceptance gate | **Absent** (no matching code; `OCR` string matches in the file are false positives inside `adminDocRequests`) |
| In-app stored-value wallet | **Deleted on purpose** (`CHANGES.md` §8, `AGENTS.md` §23) |
| Localisation | Effectively absent |
| Notifications | Present as prototype UI (55 references); delivery is simulated since there is no server |

### 8.4 A category the plans do not mention

The prototype carries seven categories: Plumbing, Electrical, Cleaning, Tutoring, Appliance, **Delivery**, and a seventh marked *pilot*, **Fruit Harvest & Buy**, with its own modes, offers, weighing step and "two kinds of money" rule (`README.md`). **[IMPL]** None of the three November documents mentions fruit harvesting or Delivery. Their launch shortlist is plumbing/electrical, cleaning, tutoring and appliance/aircon repair **[NOV26]**. This is an unresolved mismatch (C8). The fruit category is an unusually well-modelled idea (it keeps produce money out of platform revenue), but it is a *produce purchase plus labour*, which is a different transaction shape and adds legal and safety surface. **[REC]** Keep it as a clearly labelled pilot/demo category and do not put it in the first launch scope unless interviews show strong demand.

---

## 9. Core Functionalities

For every area: who needs it, current status, and the verdict. "Prototype" means browser-only demo behaviour.

| # | Area | Needed by | Status today | Gap to production | Verdict |
|---|---|---|---|---|---|
| 1 | Registration & authentication | All | Absent (demo role picker) | Real accounts, sessions, role enforcement, password/OTP, account recovery | **P0** |
| 2 | Resident profiles | Residents | Prototype, includes barangay | Persistent storage; privacy controls | Keep |
| 3 | Provider registration & applications | Providers, Admin | Prototype application flow and doc requests | Real document storage, review queue, decisions with reasons | **P0** |
| 4 | Identity & qualification verification | Residents (trust), Admin | Labels and review UI; verification results are demo data **[SIM]** | A defined verification ladder and a manual review process (§13) | **P0** (manual first) |
| 5 | Service discovery & categories | Residents | Prototype | Real supply to discover | Keep; supply-limited |
| 6 | Barangay-based discovery | Residents | Prototype; demo barangays differ from pilot | Seed the five pilot barangays | **P1** (cheap, high credibility) |
| 7 | Provider profiles | Both | Prototype | Portfolio, work history from real jobs | Keep |
| 8 | Smart Match | Residents | **[SIM]**; no specified production algorithm (`AGENTS.md` §87) | Start with transparent rules (category, barangay, availability, rating), not an invented score | **P2** |
| 9 | AI Service Concierge | Residents | **[SIM]** | Must never replace the core flow (`AGENTS.md` §87) | **P2** |
| 10 | Availability management | Providers | Basic | Calendar conflicts, working hours, time off | **P1** |
| 11 | Booking requests & lifecycle | Both | **Strong** | Server-side enforcement; real timers for lapse/auto-confirm (today due transitions are evaluated when the app is opened) | **P0** |
| 12 | Offers & negotiation | Both (esp. produce, custom jobs) | **Strong** | Server-side | Keep |
| 13 | Messaging | Both | Message threads in the kernel | Real-time delivery, abuse reporting, retention | **P1** |
| 14 | Notifications | Both | Prototype UI | SMS/push/email delivery | **P1** |
| 15 | Location & service areas | Both | Leaflet + OpenStreetMap tiles (online only) | Production map provider, address privacy | **P1** |
| 16 | Transaction & payment records | Both, Admin | **Strong** (ledger, receipts) | Real gateway reconciliation | **P0** |
| 17 | Provider earnings & payouts | Providers | Strong model; payout rail is simulated | Licensed payout partner | **P0** |
| 18 | Ratings & reviews | Residents | Prototype | Reviews only from completed in-app bookings; manipulation checks | **P1** |
| 19 | Disputes | Both, Admin | Strong model | Evidence storage, SLAs, human reviewers | **P0** |
| 20 | Trust & safety | All | Rules in docs; partial UI | Moderation tools, abuse reporting, block/ban | **P1** |
| 21 | Administration | Admin | Strong money console | Role-based admin, audit of admin actions | **P0** |
| 22 | Analytics & reporting | Admin, Owner | Admin intelligence screen; sums over the ledger | Pilot KPI dashboard on *real* data (§19) | **P1** |
| 23 | Subscriptions / tiers | Providers | Absent | Only after paid-plan validation | **P3** (see §11) |

**On "do not recommend features because other marketplaces have them."** Items 8, 9 and 23 are the ones most at risk of being built for fashion; each is held to P2/P3 until the pilot shows a measured need.

---

## 10. Complete User Workflows

### 10.1 Resident

1. **Find** — search or browse by category and barangay; optional concierge/Smart Match assist. **[IMPL][SIM]**
2. **Review** — open a provider: services, area, availability, verification labels, ratings, price or "price by offer". **[IMPL]**
3. **Book** — request a visit (date, scope, address, notes, and for fruit: mode and request fields). Terms and price freeze when the provider accepts. **[IMPL]**
4. **Track** — accepted → on the way → arrived → in progress, on one timeline. **[IMPL]**
5. **Record** — confirm completion; payment released from hold; receipt and history; review. **[IMPL]**
6. **If something goes wrong** — cancel, report no-show, or open a case; the job moves to *Under review* and the books show what was frozen. **[IMPL]**

### 10.2 Provider

1. **Apply** — profile, services, area, documents; waiting for review. **[IMPL]** (demo review)
2. **Set up** — categories, rates, availability, service areas. **[IMPL]**
3. **Receive** — structured request inbox; accept, decline, counter with an offer. **[IMPL]**
4. **Do the job** — set off, arrive, start, complete (with the weighing step for fruit). **[IMPL]**
5. **Get paid** — earnings after the platform fee; payout over the threshold; statements. **[IMPL]** (simulated rail)
6. **Build reputation** — history and ratings from completed jobs. **[IMPL]**

### 10.3 Administrator

1. **Review applications** and request documents. **[IMPL]**
2. **Monitor** bookings, the money console, receivables from cash jobs, and the intelligence screen. **[IMPL]**
3. **Resolve disputes** from the help desk using the status timeline as evidence. **[IMPL]**
4. **Configure** rates, fees, VAT, windows — with an audit trail; changes apply only to later bookings. **[IMPL]**
5. **Moderate** accounts and content. Partial; abuse-handling tools are thin.

### 10.4 Booking lifecycle (from the code)

`requested` → `upcoming` (shown to users as *Accepted*) → `en_route` → `arrived` → `ongoing` → `completed`, with exits to `cancelled`, `expired` (no answer), `no_show` and `disputed`. Finished states are `completed`, `cancelled`, `expired`, `no_show`; only a dispute raised in time leaves a finished state. **[IMPL]** Booking status and payment status are separate fields and are always displayed separately (`AGENTS.md` §22).

---

## 11. Business Model

### 11.1 What each source says

| | Pitch deck **[DECK]** | Revised Master Plan **[NOV26]** | Market Research plan **[NOV26]** | Prototype **[IMPL]** |
|---|---|---|---|---|
| Primary revenue | Commission on completed bookings; rates *not assumed*, validated per category | **Two core streams:** freemium subscriptions + commission | Commission is ~91% of Year-1 revenue; subscriptions minor | Commission only |
| Commission rate | Not fixed | **1.2%** working (1.0% alt, 1.3% ceiling) | **8–12%** free tier, 5% Pro | **10%** default, per-category override, produce rate **undecided (`null`)** |
| Tiers | Subscriptions and promoted listings are *future* | Free ₱0 / Pro ₱299 / Growth ₱699 (test prices) | Free ₱0 (10%) / Pro ₱299 (5%) / Promoted ₱149–₱299 | No tier code |
| Who pays commission | — | "Must be stated in provider agreement" | Taken from the provider's share | Deducted from the **provider's** share, so the card price is the customer's price |
| Gateway fees | — | Not absorbed; shown separately or use cash | Not absorbed; ~₱12–₱20 on an ₱800 job at published PayMongo rates | Mock gateway; no fee model |
| Funding | ₱2.3 M 12-month pilot budget | ₱1,867,769 budget; ₱2,080,000 ask | Same as Master Plan | — |

### 11.2 What the numbers say (re-checked)

At the Master Plan's 1.2%, an ₱800 booking earns **₱9.60**; the plan's own model shows common gateway fees could exceed that, making a booking *negative before other costs* **[NOV26]**. The Market Research plan shows that to cover the M7–M12 cost run rate of ₱97,707 a month:

| Commission (80% of bookings in-app, ₱800 job) | Revenue per booking | Bookings per month to break even | As % of Tupi households |
|---|---|---|---|
| 1.2% | ₱7.68 | 12,138 | 58.9% |
| 5% | ₱32.00 | 2,913 | 14.1% |
| 8% | ₱51.20 | 1,821 | 8.8% |
| **10%** | **₱64.00** | **1,457** | **7.1%** |
| 12% | ₱76.80 | 1,214 | 5.9% |

**Reading it plainly:** at 1.2% the business cannot work at Tupi-only volume, because it would need more than half of all households to book *every month*. Subscriptions cannot rescue it: even 15% of 150 providers on Pro adds about ₱6,700 a month. The Master Plan's own conclusion — "first year is a validation period" **[NOV26]** — stands under every rate. The financial model rests on an earlier master plan dated 27 October 2026 that was **not supplied**, so the baseline inputs (3,270 bookings, ₱174,915 subscriptions, ₱97,707 monthly run-rate) could not be traced to a source.

### 11.3 Recommendation **[REC]**

1. **Decide one pilot commission, as a configuration value, and document it** (the prototype already supports this with an audit trail). I would take the **8–12%** range into the pilot, in-app jobs only, starting at 10%, because the only evidence offered is the closest Mindanao comparable (GooHom: 8% in-app, 10% cash) plus global benchmarks (15–25%), and the arithmetic above shows 1.2% is unworkable. **This is the single most consequential unresolved number in the project, and it is the owner's call.** The evidence behind 8–12% is thin (one comparable plus benchmarks) and has not been tested with Tupi providers.
2. **Pilot revenue = commission only.** Subscriptions and promoted listings are Phase M7+ tests, as both the deck and the Master Plan sequence them. Do not build tier machinery before paid behaviour is measured.
3. **Never include unsigned partner income or stated interest as revenue.** Partner revenue is zero until signed. **[NOV26]**
4. **Treat leakage as the design problem** (§15, F-12) rather than a pricing afterthought.
5. **Do not absorb gateway fees** until a signed merchant quote exists; show them as a separate line or use cash. **[NOV26]**
6. **Out of the model:** lending referral fees, insurance referral fees, a Sukinnect e-wallet, interest. **[NOV26]**

### 11.4 Which streams belong where

| Stream | Pilot (M1–M12) | Later |
|---|---|---|
| Commission on completed in-app bookings | **Yes** | Per-category rates |
| Provider subscriptions (Pro) | Test only from M7, small cohort | If paid conversion and retention are measured |
| Promoted listings | No | After supply density exists; always labelled |
| Business subscriptions | No | After small-business demand is evidenced |
| Merchant marketplace | No | Deck lists it as future **[DECK]** |
| Partner/grant income | Count as zero until signed | — |

---

## 12. Competitive Positioning

**Source-quality warning.** Competitor facts below come from the Market Research plan, which says it read public pages on 6 November 2026 and recommends dated screenshots before the pitch. I did **not** re-check any competitor for this plan. The pitch deck's competitor list differs from the November documents (C10). Do not manufacture statistics or claim an advantage you cannot show.

| Alternative | What is known **[NOV26 unless noted]** | What Sukinnect must show |
|---|---|---|
| Facebook groups/pages, referrals, word of mouth | Free, familiar, trusted through personal ties; **the main channel today** **[DECK][NOV26]** | That structured profiles, availability, records and reviews solve a gap people actually feel |
| GooHom (Butuan area, Agusan del Norte) | Closest Mindanao comparable: cleaning, beauty, mobile motorcycle repair; 8% in-app / 10% cash; ID and selfie check; escrow; tiered badges; dispute window. Traction unknown. | Tupi supply density and price guidance people trust |
| Phriend | The Market Research plan says it is *paid companionship*, not home services; the Master Plan lists it as a competitor to "re-check" | Re-classify as adjacent unless live checks say otherwise |
| Gawin, Raket.ph, Facebook Marketplace | Named in the deck **[DECK]** | Re-check live features, coverage and fees before any comparison |
| TaskRabbit / Thumbtack | Foreign; useful only as fee benchmarks (about 15–20% plus trust fee; sources differ) | Nothing — benchmark only |
| GoodWork.ph, eSerbisyo, Gawin, ICity PH | "Older Philippine service apps"; operation not confirmed | Confirm they still operate before listing |

**Comparison dimensions to fill in with evidence (not yet filled):** target market, geographic focus, provider discovery, verification, booking, transaction management, customer trust, provider empowerment, revenue model. **[REC]** Build the matrix from dated screenshots during the M1–M2 competitor review (§17), and keep only claims you can show.

**Defensible advantage today:** none proven. **Plausible advantage if the pilot works:** barangay-level supply density, a record of completed local work (reputation that providers own the benefit of), and local price evidence.

---

## 13. Trust and Verification Strategy

### 13.1 Principles (already agreed in the sources)

- A badge states *what was checked*, never that a provider is competent, safe or high quality. **[NOV26]**
- Capability is **declared, not verified** unless it truly was. The prototype already words fruit-harvest capability this way. **[IMPL]**
- Collect only what is necessary; explain why, who can see it and how long it is kept. Never publish identity data. Never put it on a public blockchain. **[NOV26]**
- AI may flag; humans decide consequential cases, with an appeal path. **[NOV26]**
- Sukinnect does not certify providers; TESDA certifies, Sukinnect displays accurately. **[NOV26]**

### 13.2 A tiered verification ladder **[REC]**

A single strict gate would exclude informal workers; no gate would break trust. A ladder lets a provider start small and earn visibility.

| Level | What was checked | Evidence | Label shown to customers |
|---|---|---|---|
| 0 | Account created | Phone/OTP | *Profile created* (not searchable until Level 1) |
| 1 | Phone verified + identity of a real local person known to a barangay contact or community champion | Champion/barangay confirmation recorded | *Known in the community* (names who confirmed) |
| 2 | Government ID viewed and matched to the profile by a human reviewer | ID image held under access control; result recorded, image not shown | *ID checked by Sukinnect* |
| 3 | Trade credential (e.g. TESDA NC) checked against the issuer or certificate | Credential record + date checked | *Credential checked: <name>, <date>* |

Rules: labels name the check and the date; a failed or expired check removes the label; Level 2/3 raise search priority only because they carry *information*, not because anyone pays. For the pilot (60–100 providers) **verification is manual**; automation (OCR assist, §15 F-22) comes after the process is proven.

### 13.3 Reviews and reputation

Only completed in-app bookings can produce reviews. Flag but do not auto-delete suspected manipulation; a human decides. Keep the dispute record and the review separate.

### 13.4 Privacy and legal **[REC — requires counsel]**

The Philippine Data Privacy Act of 2012 (RA 10173) very likely applies: government ID images and biometrics are the sort of data that attracts the strictest treatment. Before collecting ID images in production: appoint accountability, write a privacy notice, define retention, record consent, and have a lawyer confirm registration and breach-notification duties. This plan makes no legal determination.

**Terms and privacy gate.** The feature notes ask that account creation require scrolling to the bottom of both documents **[NOV26]**. That is easy to build and worth doing, but scrolling is weak evidence of consent on its own. **[REC]** Record the document *version*, timestamp and account, show a plain-language summary, and make consent purpose-specific. No such flow exists in the prototype today.

---

## 14. Technology and Platform Strategy

### 14.1 What exists

- One-file web prototype with an application **kernel** (no DOM access: money, catalogue, configuration, accounts and ledger, pricing, state machine, payments behind a gateway seam, payouts, statements, disputes, threads, status timeline, storage adapter) and a screen layer. **[IMPL]**
- A reference MySQL schema (`schema/sukinnect.reference.sql`, 19 tables from `users` to `platform_config_audit`) that encodes the centavo, append-only and no-wallet rules. It is **not** loaded by the prototype. **[IMPL]**
- Netlify publishing from an explicit allow-list (`tools/build-web-dist.cjs`), so private documents and tools are structurally *not* deployed. **[IMPL]**
- A large Node-based verification suite (`tools/verify.cjs`, 567 checks) and mutation-style falsification suites. **[IMPL]**

### 14.2 What the plans propose

Supabase, Vercel, Google Maps Platform, PayMongo, Xendit **[DECK]**; "cloud hosting, database management, geolocation/maps, communication tools and licensed payment integration" and seven AI features **[NOV26]**. None is implemented.

### 14.3 An architecture decision that is not yet made (C14)

The deck names **Supabase** (PostgreSQL) while the reference schema is **MySQL**. **[REC]** Decide before backend work. If Supabase is the choice, port the schema to PostgreSQL once, keeping the invariants (centavos, append-only ledger, no wallet, separate booking/payment status).

### 14.4 Principles for the production build **[REC]**

1. Port the **kernel's rules** to the server, not the screens. Server-side enforcement of the state machine, ledger balance and role permissions is the whole point of leaving the prototype.
2. Keep the **gateway seam** (`authorize · capture · refund · void`); replace `MockGateway` with a licensed provider.
3. Keep **configuration** (rates, fees, windows) as audited data, as today.
4. Keep the **honest-labelling** rule: demo, planning target, actual record, validated traction stay distinct in every dashboard.
5. Do not hard-code Tupi into abstractions (`AGENTS.md` §61); barangays and municipalities are data.
6. Preserve the **private-documents-stay-private** build pattern when a real deploy pipeline exists.

### 14.5 AI strategy: separate the three kinds of "AI" **[REC]**

The feature notes mix three different things. They need different engineering and different risk.

| Kind | Examples in the notes | How to build | Risk |
|---|---|---|---|
| **Database-driven, procedural** | "Popular/frequent in your barangay", onboarding stepper, match ranking by category/barangay/availability | SQL aggregates and rules. No model needed. | Low |
| **Language-model generation, grounded in your data** | Portfolio/service-description drafts, concierge chat that cites real providers | Hosted LLM API with retrieval over your own tables; the provider reviews before publishing | Medium — must never invent providers or prices |
| **Live-web / external information** | Labour-rate lookup, exchange rates | Unreliable for local labour rates. **[REC]** build a curated, dated **evidence register** of local quotes first; use an LLM only to *summarise* it with citations | High — wrong price guidance creates disputes |

A "local model that learns the database" is not needed for the pilot and would not have enough data to learn from; the pilot has dozens of providers, not thousands. Start procedural; introduce learned ranking only if measured data shows rules plateau.

### 14.6 Security baseline (production P0)

Real authentication and sessions; role-based access with server-side checks; encrypted storage of identity documents with narrow access; audit logging of admin actions; backups; rate limiting and bot protection (reCAPTCHA or an alternative) on sign-up and messaging; secrets out of the repo; a security review before pilot launch. The Master Plan already budgets security testing **[NOV26]**.

---

## 15. Proposed Feature Improvements

### 15.1 Method

Each recommendation is scored against customer value, provider value, business impact, marketplace liquidity, trust and safety, technical feasibility, cost/complexity, operational load, strategic fit, and scalability. Anything that contradicts the agreed payment architecture or the Master Plan's guardrails is **not recommended** regardless of its appeal.

| Priority | Meaning |
|---|---|
| **P0 — Critical** | Required for system integrity, security and essential marketplace operation |
| **P1 — High** | Strongly improves the core journeys and the pilot's measurability |
| **P2 — Strategic** | Strengthens competitiveness and efficiency once the core runs |
| **P3 — Future** | After the essential marketplace is validated |

### 15.2 Roadmap summary

| ID | Feature | Pri | Depends on | Source |
|---|---|---|---|---|
| F-1 | Authentication and server-enforced roles | P0 | F-2 | Gap in prototype |
| F-2 | Backend and persistent database (port the reference schema) | P0 | Architecture decision (C14) | Deck, Master Plan |
| F-3 | Licensed payment gateway, payouts, reconciliation | P0 | F-1, F-2, a signed merchant agreement | Deck, Master Plan |
| F-4 | Legal, consent and privacy foundation (terms, privacy notice, consent capture, scroll-and-record gate) | P0 | Counsel | Feature notes, Master Plan |
| F-5 | Manual, tiered provider verification workflow | P0 | F-1, F-2, F-4 | Deck, Master Plan |
| F-6 | Production disputes and admin audit (evidence storage, SLAs, admin action log) | P0 | F-1, F-2 | Deck |
| F-7 | Assisted onboarding stepper (typed; assisted-by-a-person mode) | P1 | F-1 | Feature notes ("wizard guide") |
| F-8 | Local price guidance from a dated evidence register | P1 | Field research (§17) | Feature notes, Master Plan |
| F-9 | Pilot barangay data model and seeded five-barangay demo | P1 | — | Master Plan |
| F-10 | Notifications and messaging delivery (SMS/push) | P1 | F-1, F-2 | Deck |
| F-11 | Availability and scheduling improvements | P1 | F-2 | Deck |
| F-12 | Leakage-resistant retention (in-app rebooking, reviews only for in-app jobs, declared-cash fee, saved providers) | P1 | F-3 | Market Research |
| F-13 | Review integrity and abuse controls (rate limits, bot protection) | P1 | F-1 | Feature notes ("reCAPTCHA") |
| F-14 | Pilot KPI dashboard on real data | P1 | F-2 | Deck, Master Plan |
| F-15 | AI portfolio/service-description generator (provider-reviewed) | P2 | F-1, F-2 | Master Plan |
| F-16 | Smart Match v1 (transparent rules) and "popular in your barangay" | P2 | Real supply data | Feature notes, deck |
| F-17 | AI Concierge grounded in real records | P2 | F-2, F-16 | Prototype, Master Plan |
| F-18 | Fraud/spam flags routed to human review | P2 | Real usage data | Master Plan |
| F-19 | Provider Pro subscription and promoted listing | P2→P3 | Paid-plan validation | Master Plan, Market Research |
| F-20 | Reputation levels from completed work (non-financial) | P2 | F-2, F-18 | Reframes "exp points / power-ups" |
| F-21 | Localisation (Filipino/Bisaya) | P2 | Interview evidence | Gap |
| F-22 | ID OCR assist (human still decides) | P2 | F-5 working | Feature notes |
| F-23 | Voice-command sign-up | P3 | F-7 | Feature notes |
| F-24 | Live-web price intelligence with citations | P3 | F-8 | Feature notes |
| F-25 | Facial match / liveness | P3 | Counsel, privacy impact assessment | Feature notes |
| F-26 | Referral to licensed lenders and insurers | P3 | Licensed partner agreement | Master Plan |
| F-27 | Business accounts, recurring bookings, invoices | P3 | Small-business evidence | Deck, Master Plan |
| F-28 | NGO / family-in-need programme | P3 (parked) | Pilot success | Feature notes |

**Dependency spine.** F-2 → F-1 → (F-3, F-4, F-5, F-6, F-10) → pilot launch → (F-12, F-14) → monetisation tests (F-19) → AI layers (F-15…F-18) → later features. Nothing in P2/P3 may be scheduled ahead of its dependency.

### 15.3 Not recommended (and why)

| Proposal in the feature notes | Recommendation | Reason |
|---|---|---|
| **Blockchain for encryption** | Do not build | Encryption is solved by standard cryptography; blockchain adds cost without a stated benefit. The Master Plan also says identity data must never go on a public chain. **(C5)** |
| **Blockchain in financial operations / payments** | Do not build | Conflicts with the licensed-gateway architecture in the deck and Master Plan. **(C5)** |
| **Sukinnect's own digital wallet with cash-in/out** | Do not build | The Master Plan says Sukinnect must not present itself as an e-wallet; the prototype deleted the wallet on purpose and the schema encodes "no wallet". Stored value is likely regulated. **(C4)** |
| **Sukinnect offering loans / funding eligibility checks** | Do not build | The notes themselves say Sukinnect will not directly provide loans; the Master Plan excludes lending and insurance income without a licensed partner. Only referral to licensed lenders is acceptable, later (F-26). **(C4)** |
| **Facial recognition in the pilot** | Defer to P3 | Biometric data raises privacy and legal exposure; with 60–100 providers a human check is cheaper and safer. **(C6)** |
| **NGO / families-in-need programme in the core app** | Park | The notes themselves say to keep the primary focus and not go broad. (F-28) |

These are recommendations for owner decision, not rulings.

### 15.4 Detailed specifications — P0 and the most important P1

Fields: **Problem · Users · Functionality · Business value · Journey · Backend/Frontend · Data · Dependencies · Risks · Acceptance criteria**.

**F-1 Authentication and server-enforced roles (P0)**
- **Problem:** the prototype has no authentication; a role is picked on a demo screen and nothing enforces boundaries.
- **Users:** everyone.
- **Functionality:** phone/email sign-up with OTP, sessions, role assignment, permission checks on every server action, account recovery.
- **Business value:** nothing real can be launched without it.
- **Journey:** sign up → verify → choose resident or apply as provider → admin accounts are created only by an existing admin.
- **Backend/Frontend:** auth service; role claims; route guards; replace the demo sign-in screen.
- **Data:** `users`, sessions, role, consent records (F-4).
- **Dependencies:** F-2.
- **Risks:** SMS cost and delivery in the area; account takeover; role escalation.
- **Acceptance:** a resident token cannot read provider earnings or admin configuration (tested); a replayed or expired token is refused; recovery works without exposing whether an account exists.

**F-2 Backend and persistent database (P0)**
- **Problem:** records live in browser storage; "nothing runs while the app is closed".
- **Users:** everyone.
- **Functionality:** server persistence of the existing records; scheduled jobs for lapse and auto-confirm windows.
- **Journey:** invisible to users; they stop losing data.
- **Backend/Frontend:** port the reference schema; move kernel rules server-side; the existing screens call an API.
- **Data:** the 19 tables in the reference schema, plus consent and verification-evidence tables.
- **Dependencies:** C14 decision.
- **Risks:** the kernel is JavaScript in one HTML file; extraction has to preserve behaviour. **[REC]** port module by module with the existing `tools/verify.cjs` checks as the regression gate.
- **Acceptance:** the ledger refuses an unbalanced posting server-side; an illegal state move is rejected server-side; a lapsed request expires with the app closed.

**F-3 Licensed payment gateway, payouts, reconciliation (P0)**
- **Problem:** all payment is simulated.
- **Users:** residents, providers, admin/finance.
- **Functionality:** authorize/capture/refund/void with a licensed partner; hold on acceptance, release on completion; provider payouts; daily reconciliation against the ledger; cash path with fee receivable.
- **Business value:** the commission cannot be collected without it.
- **Dependencies:** signed merchant agreement; legal review of how funds flow; gateway fees shown separately.
- **Risks:** regulated-activity exposure if funds are held by Sukinnect; chargebacks; fee erosion (₱12–₱20 on an ₱800 job per the Market Research plan).
- **Acceptance:** ledger and partner statements reconcile to the centavo for a test month; refunds reverse the booking's own posted lines; a failed capture never marks a job paid.

**F-4 Legal, consent and privacy foundation (P0)**
- **Problem:** no terms, privacy notice or consent record exists.
- **Functionality:** terms, privacy notice and provider agreement; acceptance gate that records document version, timestamp and account; the scroll-to-end requirement from the notes **plus** a summary; data retention and deletion rules.
- **Dependencies:** counsel; fee payer decision (C1).
- **Risks:** a scroll gate alone is weak consent evidence; unclear fee payer creates disputes.
- **Acceptance:** an account cannot be created without a stored acceptance of the current versions; a new version prompts re-acceptance; identity images are never visible to anyone without the reviewer permission.

**F-5 Manual tiered provider verification (P0)**
- **Problem:** verification today is demo data.
- **Functionality:** the four-level ladder (§13.2), a review queue, evidence storage, decision with reason, expiry and re-check, labels generated from the record.
- **Data:** verification records with check type, reviewer, date, result, expiry; document storage under access control.
- **Risks:** reviewer workload; exclusion of informal workers; document leaks.
- **Acceptance:** a label cannot be shown without a matching record; removing a record removes the label; a reviewer cannot approve their own application.

**F-6 Production disputes and admin audit (P0)**
- **Functionality:** server-stored evidence, case SLAs, assignment, decision with reason and appeal, an immutable log of every admin action and configuration change.
- **Acceptance:** every admin action has an actor and a time; a closed case can be reopened only by an authorised role with a reason.

**F-7 Assisted onboarding stepper (P1)**
- **Problem:** providers may be unsure how to configure services, rates and availability; many sign-ups will be done with a person's help.
- **Functionality:** a procedural, step-by-step wizard (account → services → area → availability → rate → documents) with typed input, resumable, with an "assisted by" field so a champion can complete it on the provider's phone. Voice is P3.
- **Business value:** supports the onboarding-completion and time-to-publish measures in the Master Plan.
- **Acceptance:** an interrupted onboarding resumes at the last completed step; the "assisted by" person is recorded; completion rate and drop-off by step are measurable.

**F-8 Local price guidance from a dated evidence register (P1)**
- **Problem:** providers do not know what to charge; customers do not know a fair price. **[NOV26]**
- **Functionality:** per-category reference ranges built from dated local quotes (≥3 per category where feasible, per the Master Plan), shown as **ranges with factors** (labour hours, complexity, materials, travel, urgency, tools) and never as a guaranteed quote; the provider sets the final price.
- **Data:** price evidence table (date, scope, unit, location, source).
- **Risks:** stale or thin data; provider anchoring on guidance; disputes if guidance is read as a quote.
- **Acceptance:** every range displays its evidence date and sample size; a category with fewer than the minimum samples shows no range.

**F-12 Leakage-resistant retention (P1)**
- **Problem:** small jobs invite moving payment off-app after the first match.
- **Functionality:** one-tap rebooking of a past provider; reviews and reputation credit only for in-app completed jobs; declared-cash completion that logs the fee receivable (already modelled); a saved-provider list; a lower in-app rate than the cash rate if the owner adopts the GooHom pattern.
- **Business value:** protects the only revenue stream the pilot relies on.
- **Risks:** punishing providers who legitimately take cash; surveillance feel.
- **Acceptance:** cash completion creates a receivable with ageing; reviews cannot attach to an off-app job; the share of cash vs in-app bookings is reported.

### 15.5 P2/P3 features — to be specified before scheduling

For F-9…F-11, F-13…F-28, the roadmap table above records problem, dependencies and source. A full twelve-field specification should be written when each is pulled into a release. The one-line directions:

- **F-15 Portfolio generator:** LLM drafts from provider-supplied facts only; the provider must approve; log edits (the Master Plan's "portfolio edit rate" KPI).
- **F-16 Smart Match v1:** ranking by category, barangay, availability, rating and declared capability, with a visible reason. Do not invent a hidden score (`AGENTS.md` §87).
- **F-17 Concierge:** retrieves real providers from the database; refuses to name a provider that does not exist; never replaces the core flow.
- **F-18 Fraud/spam flags:** flag, queue, human decision, appeal; track precision and false positives.
- **F-19 Pro subscription:** only after a small cohort shows paid behaviour; core marketplace participation stays free. **[NOV26]**
- **F-20 Reputation levels:** reframes "exp points/power-ups" as non-financial levels earned from completed jobs, ratings and low dispute rate, unlocking visibility rather than credit. Any link to lending eligibility is excluded.
- **F-26 Referrals to licensed lenders/insurers:** a listing of licensed partners with disclosure; Sukinnect does not assess creditworthiness or underwrite.

---

## 16. Product Development Roadmap

Months are relative to the pilot start, which is not yet fixed. **[NOV26]** says to confirm pilot dates before submission.

| Phase | Months | Product work | Exit evidence |
|---|---|---|---|
| **0. Reconcile** | before M1 | Owner decisions on C1–C8; fix documentation drift; seed five-barangay demo (F-9) | Appendix A conflicts closed or explicitly deferred |
| **1. Discovery + prototype refinement** | M1–M2 | Usability tests with ≥10 customers and ≥10 providers on the prototype; issue log; field research; competitor screenshots | Evidence register; revised flows; prioritised backlog |
| **2. Build the MVP core** | M2–M3 | F-2, F-1, F-4, F-5, F-6, F-7 | Accepted demo; critical defects resolved; security/privacy review; launch checklist; ≥20 providers ready |
| **3. Controlled pilot** | M4–M6 | F-3 (or cash-first with disclosed fee), F-10, F-11, F-12, F-13, F-14 | Real completed bookings; monthly unit-economics report |
| **4. Monetisation test** | M7–M9 | F-19 trial with a small cohort; commission collection measured | Paid conversion and churn; contribution per booking |
| **5. Evaluate** | M10–M12 | F-8 refinement; F-15/F-16 if the evidence supports them | Go / adjust / stop report |

**Note on payment sequencing [REC].** If a licensed gateway or merchant approval is not ready by M4, run the pilot **cash-first** with the fee receivable model the prototype already has, rather than delaying the pilot or improvising money handling. Do not hold customer funds without legal and partner review. **[NOV26]**

---

## 17. Go-to-Market Strategy

### 17.1 Supply first

Customers will not return to a marketplace with nobody to book, so provider density in the first categories and barangays comes before customer advertising. **[DECK][NOV26]**

### 17.2 Field research before scale **[NOV26]**

| Activity | Minimum target | Evidence to keep |
|---|---|---|
| Provider interviews | ≥30 across priority categories and the five barangays | Dated notes, consent, current customer sources, capacity, price factors, willingness-to-pay comments |
| Customer interviews | ≥30 households and ≥10 small businesses | Dated notes on the last time they hired, how they found someone, what was hard |
| Price collection | ≥3 independent references per priority category | Date, scope, unit, location, source |
| Competitor review | ≥5 alternatives | Dated screenshots/URLs |
| Usability tests | ≥10 customers and ≥10 providers | Task completion, confusion points |
| Willingness-to-pay | Present Free/Pro concepts; do **not** treat stated interest as paid conversion | Reasons, objections, later paid result |

Keep an **evidence register** separating field evidence, secondary research, assumption and opinion. Use anonymised respondent codes; never publish contact details.

### 17.3 Provider and customer acquisition sequence **[NOV26]** adjusted **[REC]**

| When | Action | Target (proposed, not achieved) |
|---|---|---|
| Weeks 1–2 | Map providers by category and barangay with barangay officials and (if confirmed) PESO/TESDA lists; one local champion per barangay | 5 champions; 100+ providers listed |
| Weeks 3–6 | Visit and onboard on the provider's phone | 20+ agree |
| Weeks 7–12 | Verify and publish; free profile drafting as a sign-up reward; two workshops | 20+ verified active providers by month 3 |
| Months 3–4 | Barangay and purok meetings; waiting list; staff help residents place first requests (Poblacion and Polonuling first) | 300+ on the waiting list; 40 bookings by month 4 |
| Months 4–6 | Local Facebook content with real profiles; referral codes paid only after a completed booking | 150 bookings by month 6 |
| Months 7–12 | Provider-retention rewards; paid-tier tests | 60–100 verified providers |

The marketing budget is ₱165,000 for the year (ads ₱45,000, referral incentives ₱45,000, barangay demos ₱32,000, content ₱18,000, print ₱15,000, local government activities ₱10,000), released only against measured completed bookings. **[NOV26]**

### 17.4 Partnerships

Prospective partners (none confirmed): Municipal Government of Tupi and the five barangay offices, DTI/Negosyo Center, TESDA, PESO, DSWD (SLP), DOST Region XII, ICEBOX TBI (MSU-General Santos), Eulap, local colleges, and licensed payment providers. **[NOV26]**

Rules from the sources, kept verbatim in spirit: do not call a prospective partner a partner; use a partner's name or logo only with written permission; do not claim endorsement; count partner revenue as zero until signed; start with one small, measurable activity per partner (an orientation, a prototype review, a mentoring session); record the date, participants, actions and deadline of every meeting.

**[REC]** Two partners matter more than the rest for the *pilot*: the **barangay offices** (they unlock provider identification and community validation, and Level 1 verification) and **TESDA** (credential checking). Others are valuable but not on the critical path.

---

## 18. Pilot and Expansion Strategy

### 18.1 Pilot scope **[REC]**

- **Where:** Poblacion, Polonuling, Cebuano, Kablon, Bunao — start in Poblacion and Polonuling for customer demonstrations, as the Market Research plan proposes.
- **Categories:** begin with plumbing/electrical (with a clear electrical safety scope), cleaning, then tutoring (with academic-integrity rules) and aircon/appliance repair if supply is found. Defer device/IT support and events/errands. These come from the Market Research plan's *own estimated* scoring and are **[ASSUME]**; let the first 30 provider interviews overrule them.
- **Size:** plan for **60–100 verified providers**; the deck's 150 is a proposed target. **(C9)**
- **Money:** the commission decision (C1) and the cash-first fallback (§16).

### 18.2 Gates

Both November documents release funding in tranches against evidence. Proposed gates **[NOV26]** with a clarification **[REC]**:

| Gate | Condition |
|---|---|
| Before launch | ≥20 active verified providers; critical defects resolved; privacy/security review done |
| By M6 | ≈150 bookings with measured margins; dispute and complaint rate acceptable |
| Before scale-up spend | Two consecutive months of positive contribution margin **and** stable fulfilment |

**Clarification.** "Positive contribution margin" must be defined precisely. At a 10% commission nearly every booking has a positive margin *per booking*, so that alone is not evidence the business works. **[REC]** define the gate as monthly contribution (commission + subscriptions − transaction-linked variable costs including support and payment cost) *and* completion rate, complaint rate and 30/60-day provider retention within stated thresholds. Also record that the Market Research plan projects operating break-even only around months 16–19 if bookings keep rising by about 100 a month (an extrapolation, not a forecast), and that month-12 is still ₱20,000–₱39,000 short a month in every scenario it models.

### 18.3 Expansion

Sequence: Tupi → South Cotabato → SOCCSKSARGEN → beyond. **[DECK]** Expand only where supply, demand and economics are shown; replicate *categories that worked*, not the whole catalogue. Do not expand while support load or dispute rate is rising.

---

## 19. KPIs and Success Metrics

**Current measurement of every KPI below: none.** There is no production data. The prototype has demo data labelled `source:'demo'`. The "Target" column is a proposal.

| Area | KPI | Definition | Target |
|---|---|---|---|
| Supply | Verified active providers (by category and barangay) | Providers at Level ≥2 with a booking-capable profile who responded to a request in the last 30 days | 20+ before launch; 60–100 by M12 **[REC]**; deck target 150 **[DECK]** |
| Supply | Profile completion | % of started profiles published | Set after the first cohort |
| Supply | 30/60-day provider retention | % of onboarded providers still active | Set after the first cohort |
| Supply | Cost per verified active provider | Onboarding spend ÷ verified active providers | Measure |
| Supply | Marketplace supply coverage | % of requests with ≥1 available provider in category+barangay | Measure first |
| Demand | Qualified requests | Requests from a verified resident for a listed category | Measure |
| Demand | Discovery-to-request conversion | Searches that become requests | Measure |
| Demand | Request-to-booking conversion | Requests accepted | Measure |
| Quality | Booking completion rate | Completed ÷ accepted | Set after M4–M6 |
| Quality | Cancellation / no-show rate | Both sides tracked | Measure |
| Quality | Response time | Median time to first provider answer | Measure |
| Trust | Dispute rate | Cases ÷ completed bookings | Measure; investigate any rise |
| Trust | Verification completion | Applications reaching a decision within X days | Measure |
| Retention | First completed booking; repeat-booking rate | Customers with ≥2 completed bookings | Measure |
| Revenue | Commission collected; cash-fee receivable ageing | From the ledger | Measure |
| Revenue | Free-to-paid conversion and churn | Only from M7 | Plan 3–15% **[ASSUME]** |
| Economics | Contribution per completed booking; monthly contribution; CAC | After variable costs | Positive for two consecutive months before expansion |
| Leakage | Share of jobs completed off-app / declared cash | From cash declarations and rebook behaviour | Measure |
| AI | Recommendation acceptance; portfolio edit rate; price-guidance error vs actual quotes; fraud-flag precision and false positives | Per feature, only once built | Per feature |

Planning targets from the deck (150 verified providers, 3,000 registered users, 6,000 completed bookings) and from the Master Plan (3,270 completed bookings in Year 1) are *targets*. They are never to be shown as achievements.

---

## 20. Operational Requirements

| Function | Need | Notes |
|---|---|---|
| Provider onboarding | Staff or champions to visit providers and walk through sign-up | Budgeted under Operations and Validation **[NOV26]** |
| Verification review | A named reviewer; separation of duties | F-5 |
| Customer and provider support | A channel and response expectations | Support cost per booking is a KPI input |
| Moderation | Handling of flags, reviews and abuse | Human decisions with appeal |
| Dispute handling | Trained reviewers; evidence; SLAs | F-6 |
| Finance | Separation of company funds, customer funds and provider earnings; bookkeeping; payout/refund working capital (₱50,000 ring-fenced) | **[NOV26]** |
| Legal | Terms, privacy notice, provider agreement, business registration, tax review | Counsel; budgeted ₱195,000 **[NOV26]** |
| Privacy | A responsible person, retention rules, incident response | F-4 |
| Insurance | Cyber, liability and provider micro-insurance placeholders (₱95,000 budgeted) | Only through licensed insurers |
| Technology | Hosting, maps, messaging, AI APIs, security testing | Supplier quotes still needed **[NOV26]** |
| Governance | Monthly dashboard review with decisions, risks, cash and changed assumptions | **[NOV26]** |

---

## 21. Risks and Mitigation

| Risk | Effect | Mitigation | Source |
|---|---|---|---|
| Too few providers in a category | Searches fail; customers leave | Launch only categories with supply; recruit before advertising | **[NOV26]** |
| Commission leakage | Revenue disappears off-app | F-12; escrow/hold; reviews only for in-app jobs | **[NOV26]** |
| Commission rate wrong | Either unviable (1.2%) or providers reject (too high) | Configurable rate; measure drop-off; owner decision (C1) | This plan |
| Providers will not pay | Subscription forecasts fail | Do not count them; test from M7 | **[NOV26]** |
| Booking value below ₱800 | Every booking earns less; break-even moves | Track by category; blended average may be nearer ₱600 | **[NOV26]** |
| Funding shortfall | Year 1 loses money in every scenario | Staged tranches against evidence; resolve the funding-ask conflict (C2) | **[NOV26]** |
| Wrong AI price guidance or fraud flags | Disputes; unfairly blocked users | Ranges with factors; human review; appeals | **[NOV26]** |
| Regulated activity creep (wallet, lending, insurance, stored value) | Legal exposure | Licensed partners only; features in §15.3 not built | **[NOV26]** + this plan |
| Privacy/security incident | Trust and legal harm | F-4, F-5, §14.6 | **[NOV26]** |
| Unsafe or unqualified services | Harm; liability | Limit high-risk categories; declared-capability wording; decline-safely | **[NOV26][IMPL]** |
| Scope creep from the feature notes | Prototype never reaches MVP | Hold P2/P3; require a dependency and an owner decision | This plan |
| Partner assistance does not arrive | Slower supply, lost funding | Treat all as prospective; self-funded fallback | **[NOV26]** |
| Documentation drift | Contradictory plans; AI agents act on stale context | This plan + `AI_CONTEXT_INDEX.md` + Appendix A conflict register | This plan |
| Unverified competitor and market claims reach the pitch | Credibility loss | Re-check on the submission date; screenshots | **[NOV26]** |
| Small team capacity | The roadmap outruns who can build and operate it | Narrow MVP; manual-first operations; milestones tied to capacity (confirm team plan) | This plan |
| Expansion before unit economics work | Higher costs, weaker quality | Gates in §18.2 | **[NOV26]** |
| Investor terms | A ₱20.8 M post-money valuation (10% for ₱2.08 M) is hard to defend when Year 1 loses money in every scenario | Prepare to discuss a larger stake; Philippine corporate counsel reviews terms | **[NOV26]** |

---

## 22. Long-Term Strategic Direction

1. **Prove Tupi.** Density, completed bookings, and a commission that covers its own costs at a believable booking volume.
2. **Replicate what worked** to South Cotabato, then SOCCSKSARGEN, only where supply and economics hold. **[DECK][NOV26]**
3. **Deepen the provider side** (tools, reputation, training links) rather than widening categories early.
4. **Add business accounts and recurring bookings** if small-business demand is evidenced. **[DECK]**
5. **Financial adjacency only through licensed partners:** payments now; referral to lenders or insurers later; never Sukinnect-issued credit, stored value or insurance. **[NOV26]**
6. **Social inclusion** (livelihood programmes, NGO links) as a *channel* for supply, not as a second product. The feature notes themselves caution against going broad.
7. **Architecture** that localises: barangays and municipalities as data, categories as configuration, so a second municipality is a data load, not a rewrite. **[DECK]** (`AGENTS.md` §61)

---

# Appendix A — Source conflict register

Status key: **Open** = needs an owner decision; **Noted** = explained, no decision needed; **Fix** = a correction this repository can make.

| ID | Conflict | Sources | Why it matters | Status / decision needed |
|---|---|---|---|---|
| C1 | **Commission:** 1.2% (1.0–1.3% range) vs 8–12% (5% Pro) vs 10% default in code vs "not assumed, validate by category" (deck). `AGENTS.md` §59 says not to hard-code a final rate; the code defaults to 10% as an editable configuration value. | Master Plan; Market Research; `Sukinnect-next.html` `commissionRateDefault:0.10`; `README.md` money model; deck via `AGENTS.md` §59 | Determines whether the business can break even at all | **Open** — owner chooses a pilot rate and fee payer |
| C2 | **Funding ask:** ₱2.3 M 12-month budget (deck via `AGENTS.md` §60); ₱1,867,769 budget / ₱2,080,000 ask (November documents); an earlier concept-note figure of ₱3,200,000 (stated by the project owner; no document in the repository carries it) | As listed | A pitch with different asks in different documents damages credibility | **Open** — decide the ask, then align every document |
| C3 | **Revenue structure:** deck = commission primary, subscriptions later; Master Plan = freemium + commission as the two core streams with Free/Pro ₱299/Growth ₱699; Market Research = Free/Pro ₱299 (5% commission)/Promoted, no Growth tier | As listed | Product scope and the financial model | **Open** |
| C4 | **Wallet / loans / "power-ups":** notes propose an own digital wallet, cash-in/out, loans and privileges tied to wallet size; Master Plan says Sukinnect must not present as an e-wallet, lender or insurer; code and schema delete/forbid the wallet | Features doc; Master Plan §3.2, §6.3; `CHANGES.md` §8; `AGENTS.md` §23, §87; schema | Regulatory exposure and a reversal of deliberate design | **Open** — recommended: out of pilot |
| C5 | **Blockchain** for encryption and payments vs "do not place identity data on a public blockchain" and licensed-gateway architecture | Features doc; Master Plan §3.2 | Cost and scope with no stated benefit | **Open** — recommended: do not build |
| C6 | **Facial recognition and ID OCR** vs data minimisation; not present in the prototype | Features doc; Master Plan §3.2; code search | Biometric privacy exposure | **Open** — recommended: manual first; automation P2/P3 |
| C7 | **AI scope:** November documents make AI a central pillar with seven features; `AGENTS.md` §87 says the concierge must not replace the core flow; an earlier concept-note direction (as stated by the owner) treated AI, analytics and wallet as post-pilot; in code the concierge and Smart Match are simulated | Master Plan §3; Market Research §1; `AGENTS.md` §20, §87; `README.md` "Honest labelling" | What the MVP must include | **Open** |
| C8 | **Categories:** code ships Plumbing, Electrical, Cleaning, Tutoring, Appliance, Delivery and a *pilot* Fruit Harvest & Buy; November launch shortlist is plumbing/electrical, cleaning, tutoring, aircon/appliance; Master Plan's wider list adds tech, creative, events, errands | `Sukinnect-next.html` `SERVICES`; Master Plan §2.4; Market Research §4.1 | Scope; legal and safety surface of the produce category | **Open** |
| C9 | **Provider target:** deck says 150 verified providers; Market Research says 60–100 is more realistic for five barangays | Deck via `AGENTS.md` §6; Market Research §4.3 | Pilot credibility | **Open** — recommended: 60–100, label 150 as stretch |
| C10 | **Competitor list:** deck names Gawin, Raket.ph, Facebook Marketplace; Master Plan names Phriend; Market Research says Phriend is paid companionship, adds GooHom and names "older" apps it has not confirmed | As listed | Do not make comparative claims unchecked | **Open** — re-check on the submission date |
| C11 | **"55.5% of Tupi households"** is actually the five barangays' **population** share (40,791 of 73,459, 2020) | Market Research §2 | A mislabelled statistic in a pitch | **Fix** in any document that repeats it |
| C12 | **Team name:** "Konekta" (project owner) vs "Konekista" in `AGENTS.md` line 50 | `AGENTS.md` | Brand consistency | **Open** — confirm, then correct `AGENTS.md` |
| C13 | **Demo data vs pilot barangays:** code uses Poblacion, San Isidro, Sta. Cruz, Buayan, Barangay 2/4; pilot uses Poblacion, Polonuling, Cebuano, Kablon, Bunao | Code search; Master Plan §4.1 | Demonstrations should mirror the pilot | **Fix** (F-9), prototype change out of scope of this documentation task |
| C14 | **Backend stack:** deck names Supabase (PostgreSQL) and Vercel; the reference schema is MySQL | `AGENTS.md` §62; `schema/` | Rework if undecided | **Open** |
| C15 | **Missing base documents:** the 27 October 2026 master plan and its financial model (source of 3,270 bookings, ₱174,915, ₱97,707) were not supplied; the pitch deck binaries are Git LFS pointers that could not be fetched | Both November financial documents; repository | Baseline numbers cannot be traced | **Open** — supply or re-derive |
| C16 | **Partner lists differ:** DOST appears in the Master Plan and Market Research but not the collaboration notes; the municipal government, barangay offices and local colleges appear only in the collaboration notes; Eulap is variously a "private-sector collaboration request" and a "technology partner" | The three November documents | Partner claims must be accurate | **Noted** — none are confirmed partners |
| C17 | **Year-1 revenue figures differ** (₱206,307 in the Master Plan; ₱252,154 in the Market Research base case) | Both | Explained: the second includes promoted listings and partner income the first removes; both are internally consistent | **Noted** — always cite which scenario |
| C18 | **One automated check fails** on a fresh Linux clone: `tools/verify.cjs` reports the "no doubled carriage return" check as `0 × \r\r\n, CR 0 against LF 11853`. Total: 566 of 567 pass. Probably a line-ending difference between this clone (`* text=auto`) and the author's Windows working copy; the cause was not confirmed here | `tools/verify.cjs` run on `main` at 9fec6a1 | A failing gate should not be ignored | **Open** — re-run on the owner's machine |

---

# Appendix B — Verification log (what was and was not done)

**Done**
- Cloned `https://github.com/kirbygeagonia-create/suki-proto.git` (branch `main`, head `9fec6a1`); working tree clean; branches `main`, `feat/domain-kernel`, `agent-nexthtml-from-the-repository-6fc0` seen.
- Read in full: the three November 2026 `.docx` files (text extracted); `README.md` lines 1–120 and 215–416 (the middle is the verification-suite narrative).
- Read in `AGENTS.md` (5,215 lines): sections 1–3 and 6–8, 57–63, 86–87 and the heading index. The large design-system sections (§30–§56, §64–§85) were **not** read for this plan.
- Read the heading structure and first ~40 lines of `CHANGES.md` (about 8,000 lines).
- Listed the 19 tables in `schema/sukinnect.reference.sql`; did not read the full schema.
- Searched `Sukinnect-next.html` (about 11,850 lines) by keyword and read the booking state table, category list and commission configuration. Did not read the file end to end.
- Ran `node tools/verify.cjs`: **566 of 567 passed**; one line-ending check failed (C18).
- Re-computed 20 figures in the November documents; all reconcile.
- Copied the three November documents to the repository root and confirmed SHA-256 equality.
- Confirmed from `tools/build-web-dist.cjs` that the Netlify build publishes only an explicit list, so the new root documents are not published.

**Not done**
- **The pitch deck.** Both deck files are Git LFS pointers; the LFS download host is outside this environment's allowed network. Deck content here is second-hand from `AGENTS.md`.
- **The owner's local working copy.** I worked from a fresh GitHub clone. Uncommitted local changes were not seen. This update is delivered as a branch/patch so it can be applied without touching them.
- No browser run, no device test, no `tools/falsify-all.cjs` run.
- No independent check of PSA figures, partner programme details or competitor features.
- No field research exists, by the Market Research plan's own admission.

---

# Appendix C — Source document index

| File (repository root) | Purpose |
|---|---|
| `Sukinnect_Master_Plan_Revised_November_2026.docx` | Revised master plan: freemium + commission model, AI roadmap, partnerships, Year-1 break-even analysis, governance |
| `Sukinnect_Market_Research_and_Business_Development_Plan.docx` | Desk research: Tupi market, pricing, competitors, commission and subscription reassessment, break-even scenarios, acquisition plan |
| `Potential_Collaborations_and_New_and_Refine_Features.docx` | Prospective partners and a list of newly proposed features (several in conflict with other sources) |
| `SEAIT SUKINNECT - PITCHDECK.pdf` / `.pptx` | The pitch deck (same content in two formats; Git LFS) |
| `AGENTS.md` | Detailed development and project-context instructions |
| `AI_CONTEXT_INDEX.md` | Entry point for AI assistants |
| `README.md` | Developer entry point |
| `CHANGES.md` | Domain-kernel rebuild log and audit history |
| `DEVICE-PASS.md` | Handset verification walks |
| `SUKINNECT_VISUAL_REDESIGN_PLAN.md`, `SUKINNECT_GRAB_INSPIRED_VISUAL_REDESIGN_PROMPT.md`, `SUKINNECT_CORRECTIVE_VISUAL_REDESIGN_IMPLEMENTATION_PROMPT.md` | Visual redesign planning and prompts |
| `schema/sukinnect.reference.sql` | Reference SQL schema (not loaded by the prototype) |
| `tools/` | Verification, measurement, device and build instruments (Node) |

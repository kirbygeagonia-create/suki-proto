# AI_CONTEXT_INDEX — start here

**Audience:** any AI assistant, coding agent or new collaborator opening this repository.
**Purpose:** a short, authoritative map. It tells you what Sukinnect is, which files to trust, what is real and what is simulated, and how to start safely. It is deliberately brief; the detail lives in the files it points to.
**Last reviewed:** 6 November 2026 (see the verification limits in `SUKINNECT_STARTUP_MASTER_PLAN.md`, Appendix B).

---

## 1. What Sukinnect is

A **hyperlocal services marketplace** for a Philippine municipality. Residents find and book verified local providers, providers receive and run jobs, administrators verify, monitor and settle. Core loop: **FIND → REVIEW → BOOK → RECORD**. The pilot beachhead is **Tupi, South Cotabato** (first five barangays: Poblacion, Polonuling, Cebuano, Kablon, Bunao).

It is both a **startup** (an unproven business with no real users, providers, revenue or completed bookings yet) and a **technology prototype** (a browser app with a sophisticated but simulated money and booking model).

**Stage: prototype.** Anything that looks like traction is a planning target or demo data.

## 2. Mandatory reading order

Do not assume your platform loads `AGENTS.md` automatically. Follow these steps explicitly.

| Step | Read | Why |
|---|---|---|
| 1 | **This file** | Orientation |
| 2 | **`AGENTS.md`** — completely, or its required-reading instructions at the top | Detailed project rules, product definition, design system, development discipline |
| 3 | **`SUKINNECT_STARTUP_MASTER_PLAN.md`** and the pitch deck (`SEAIT SUKINNECT - PITCHDECK.pdf` or `.pptx`, the same content) | Business, product and roadmap; the conflict register in its Appendix A |
| 4 | **`README.md`** and **`CHANGES.md`** | How to run and verify; the rebuild's decisions and audit history |
| 5 | The application: **`Sukinnect-next.html`** (and `Sukinnect.html`), `schema/sukinnect.reference.sql`, `tools/` | The actual implementation |
| 6 | **Verify the implementation** before recommending or changing anything | Documentation can be stale; code and tests are evidence |

The three November 2026 `.docx` files in the root are required business references (see §7), but they are **inputs to** the master plan, not parallel master documents.

## 3. Which files are authoritative, and for what

| Question | Authoritative source |
|---|---|
| What is the business, strategy, roadmap, KPIs? | `SUKINNECT_STARTUP_MASTER_PLAN.md` |
| What are the project-wide development, product and design rules? | `AGENTS.md` |
| What does the application do right now? | `Sukinnect-next.html` (working rebuild) and `README.md` + `CHANGES.md` |
| What does the shipped earlier prototype do? | `Sukinnect.html` (kept side by side for comparison) |
| What is the intended production data shape? | `schema/sukinnect.reference.sql` (reference; **not loaded** by the prototype) |
| What was the original business intent? | The pitch deck |
| Current financial and market analysis | The three November 2026 `.docx` files — working documents; figures are assumptions |

### Resolving disagreements

Use this order. **When sources conflict, do not silently pick one; record the conflict.**

1. The project owner's latest explicit instruction.
2. The pitch deck and the revised business documents — noting that the three November documents are *working* documents whose approval status is not confirmed, and that the Market Research plan contains recommendations, not decisions, and the feature notes contain proposals.
3. `AGENTS.md`.
4. Verifiable repository behaviour (code, tests).
5. Reasonable inference — labelled as inference.

The open conflicts are listed in **`SUKINNECT_STARTUP_MASTER_PLAN.md`, Appendix A** (commission rate, funding ask, revenue structure, wallet/lending/blockchain, AI scope, categories, and others). Do not erase either side; ask the owner.

## 4. What the application contains

One browser app in one HTML file, in two layers (`README.md` → *Architecture*):

- **Domain kernel (no DOM access):** money in integer centavos · catalogue · configuration · accounts and double-entry ledger · pricing · booking state machine · payments behind a four-verb gateway seam (`authorize · capture · refund · void`, today `MockGateway`) · payouts · statements · disputes · message threads · status timeline · `Store` adapter (localStorage, falling back to memory).
- **App layer:** screen functions and `render()`.

Roles: Resident/Customer, Service Provider, Administrator.

**Categories in code:** Plumbing, Electrical, Cleaning, Tutoring, Appliance, Delivery, and *Fruit Harvest & Buy* (marked **pilot**; produce money is kept separate from service money and from platform revenue).

## 5. Real, simulated or absent — the quick table

| Capability | Status |
|---|---|
| Booking state machine, ledger, offers, disputes, payouts, admin configuration with audit trail, receipts and statements | **Implemented in the prototype** (browser-only, demo data) |
| Payments | **Simulated** (`MockGateway`; no network call) |
| Data persistence | **Local only** (browser storage); no server |
| Authentication, role enforcement | **Absent** — role is chosen on a demo sign-in screen |
| AI Service Concierge, Smart Match | **Simulated.** No production algorithm is specified; do not invent one |
| Provider verification results | **Demo data** |
| Notifications | UI only; no delivery |
| Subscriptions, tiers, promoted listings, referrals | **Absent** |
| Voice sign-up, ID OCR, facial recognition, blockchain, reCAPTCHA, terms-and-privacy acceptance gate | **Absent** — proposed in the feature notes |
| Stored-value wallet | **Deliberately removed**; must not return without an explicit owner decision |
| Production backend, licensed payment partner, real map provider | **Planned** (Supabase, Vercel, Google Maps, PayMongo, Xendit are named in the deck); none is implemented |

Never write "the system stores data", "payment is securely processed" or "AI verified the provider" about this prototype.

## 6. Technical constraints that bite

- **Single file, `file://`-safe.** An Android WebView shell loads the page over `file://`, where ES modules are blocked. Do not "modernise" it into modules without an explicit decision.
- **Money is integer centavos.** The unit is in the field name (`amountCentavos`). Never use floats for money. Weight is whole grams.
- **A record stores a code, never a sentence.** Words come from lookup tables (`BOOKING_STATES`, `PAYMENT_LABELS`, …).
- **A status cannot move without its consequence.** Transitions name who may move them and what money, notification and record they leave.
- **Booking status and payment status are separate fields** and are displayed separately.
- **No duplicated logic** and no second pricing sheet. Records join by id.
- **Rates, fees, VAT and windows are configuration** with an audit trail; accepted jobs keep the terms frozen at acceptance.
- **The official logo is never redrawn, recoloured or stretched** (`Sukinnect_Logo.png`; `AGENTS.md` §10, §35).
- **Fonts and photos are local.** The only network dependency in the rebuild is OpenStreetMap tiles; a map is blank offline.
- **Git LFS.** `*.pdf`, `*.pptx` and `reicon.js` are LFS files. Without `git lfs install` before cloning they arrive as ~130-byte stubs; the build refuses to publish a pointer.
- **Public vs private.** Netlify runs `node tools/build-web-dist.cjs`, which copies only an explicit allow-list (`SERVE`) into `dist/`. Strategy documents, prompts, the pitch deck, schema and tools must stay **off** the public site. Adding a document at the repo root does not publish it; adding a name to `SERVE` would. Do not change `SERVE` to include private documents without the owner's explicit approval.

## 7. Business rules an AI must not break

- **Targets are not traction.** 150 verified providers, 3,000 users and 6,000 bookings (deck) and 3,270 Year-1 bookings (Master Plan) are planning figures.
- **Market-size and population numbers are context**, not customers or demand.
- **Prospective partners (PESO, DSWD, Eulap, ICEBOX TBI, TESDA, DTI, DOST, the municipality) are not partners** until confirmed in writing. Do not use their names or logos as endorsements.
- **Sukinnect is not an e-wallet, lender or insurer.** Payments go through licensed partners.
- **A verification badge states what was checked**, not that a provider is safe or competent. Capability can be *declared* without being *verified*.
- **AI may recommend and flag; humans decide** consequential disputes and account actions, with appeal.
- **Do not hard-code a final commission rate as a business fact.** The code carries a configurable default; the pilot rate is an open owner decision (conflict C1).
- **Produce (fruit) money is never platform revenue** unless the owner decides otherwise; the produce fee state is `charged`, `undecided` or `not-charged`, never a silent zero.
- **Do not fabricate** providers, customers, ratings, statistics or traction. Keep demo, planning target, actual record and validated traction distinct on every dashboard.

## 8. How to begin

```
git status && git log --oneline -5 && git branch -a     # know the tree; preserve uncommitted work
git lfs install && git lfs pull                          # real deck and reicon.js, if you need them
node tools/verify.cjs                                    # the main gate (567 checks at last count)
node tools/falsify-all.cjs                               # only after changing a rule; see README
node tools/build-web-dist.cjs                            # confirm what would be published
```

Open `Sukinnect-next.html` in a browser (add `?app=1` for the phone layout). Demo sign-ins and the pilot-category walk-through are in `README.md`.

**Before you modify anything:** read the relevant `AGENTS.md` sections; inspect the real code, not just the docs; run `tools/verify.cjs`; do not reset, overwrite or discard local work; state whether a change is documentation, prototype behaviour or a production requirement.

**Known caveat at last review:** on a fresh Linux clone, `tools/verify.cjs` reported 566 of 567 checks passing; the one failure was a line-ending check (see conflict C18). Re-run on your own machine before treating it as a regression.

## 9. Document index

| File | Purpose | Importance |
|---|---|---|
| `AI_CONTEXT_INDEX.md` | This entry point | Read first |
| `AGENTS.md` | Detailed project, product, development and design instructions | Required |
| `SUKINNECT_STARTUP_MASTER_PLAN.md` | Startup strategy, product plan, roadmap, KPIs, conflict register | Required |
| `SEAIT SUKINNECT - PITCHDECK.pdf` / `.pptx` | The pitch deck (same content, two formats; LFS) | Required (cross-reference, do not treat as two specs) |
| `README.md` | Run, verify, architecture, money model, known limitations | Required |
| `CHANGES.md` | Domain-kernel rebuild log, audits, measured findings | Reference |
| `DEVICE-PASS.md` | Handset verification walks | Reference |
| `Sukinnect_Master_Plan_Revised_November_2026.docx` | Revised master plan: model, AI roadmap, partners, break-even | Business reference |
| `Sukinnect_Market_Research_and_Business_Development_Plan.docx` | Desk research, competitor and pricing review, break-even scenarios | Business reference |
| `Potential_Collaborations_and_New_and_Refine_Features.docx` | Prospective partners; newly proposed features (several conflict with other sources) | Proposals only |
| `SUKINNECT_VISUAL_REDESIGN_PLAN.md`, `SUKINNECT_GRAB_INSPIRED_VISUAL_REDESIGN_PROMPT.md`, `SUKINNECT_CORRECTIVE_VISUAL_REDESIGN_IMPLEMENTATION_PROMPT.md` | Visual redesign plan and prompts | Design reference |
| `Sukinnect-next.html` | Working application (domain-kernel rebuild) | The implementation |
| `Sukinnect.html` | Earlier shipped prototype | Comparison |
| `schema/sukinnect.reference.sql` | Reference schema | Not loaded by the app |
| `tools/` | Node instruments: verify, falsify, measure, shot, device, build | Evidence tools |

## 10. Keeping this index honest

- Update this file whenever an authoritative document is added, renamed or superseded.
- Keep **one** master business context (`SUKINNECT_STARTUP_MASTER_PLAN.md`) and **one** master development context (`AGENTS.md`). Do not create competing copies.
- When a conflict is resolved by the owner, update Appendix A of the master plan and then the affected documents.

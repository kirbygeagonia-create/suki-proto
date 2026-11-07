# SUKINNECT — READ FIRST

**Purpose of this file.** A fresh AI session, or a new person, should be able to work correctly on
this project after reading *only* this file. It is deliberately short and deliberately opinionated
about what is a fact. Written 6 November 2026. If it and a source disagree, the source wins and this
file is the bug.

---

## 1. What Sukinnect is

Sukinnect is a **hyperlocal service marketplace** for a municipality in the Philippines: households
and small businesses find, compare, book and record local service work — plumbing, electrical,
cleaning, tutoring, appliance repair, delivery, and a fruit-harvest pilot — through one workflow:
**FIND → REVIEW → BOOK → RECORD**. It exists because local supply and local demand already exist and
the *connection* between them is fragmented across referrals, Facebook groups and old contacts.

**Stage: pre-revenue startup with a working prototype and no production backend.** The app is one
HTML file that runs entirely in a browser or a WebView. There is no server, no real account system,
no real payment, and no real AI model. Everything that looks like those things is either computed
from records held on the device, or simulated, and must be labelled as such.

## 2. Where it launches, and what the numbers are

Launch: **Tupi, South Cotabato**, starting in five barangays — **Poblacion, Polonuling, Cebuano,
Kablon and Bunao** (about 55.5% of Tupi households; Master Plan §1).

| Figure | Status |
|---|---|
| 150 verified providers, 3,000 registered users, **3,270** completed bookings in 12 months | **targets / forecasts**, not traction. The spend gate at launch is 20+ active verified providers. |
| 15,200 bookings, 600 subscribers | **stretch scenario**, post-validation and multi-town. Never presented as an expectation. |
| PSA household and population counts | official statistics — facts. |
| Any Sukinnect forecast, target, price, conversion rate or financial scenario | **assumption** until field data, a signed agreement or a dated quotation supports it. |

The prototype's demo data uses other barangays (San Isidro, Sta. Cruz, San Jose, Barangay 2, Buayan).
**Demo data is not the launch geography** and changing it is an explicit request, not a cleanup.

## 3. Roles

Built today (three): **resident** (customer), **service provider**, **admin**.
Planned by the Master Plan §2 (five): customer, individual provider, **service business / team**,
**moderator**, **super admin**. The gap is a register row in `SUKINNECT_STARTUP_ROADMAP.md`, not
something to invent in the prototype. Admin console is **web-only** by owner ruling: inside the app
shell it shows a stated refusal.

## 4. Business decisions that bind the engineering

- Transaction fee **1.2%** of completed booking value, **1.0%** is the stated alternative, **hard cap
  1.3%**. The prototype currently carries a configurable **10%** default — that is legacy and is a
  conflict (C1), not the business rate.
- **Gateway fees are not absorbed in the pilot.** Customers pay cash/direct, or the gateway fee is a
  separate, disclosed line paid by the payer. Charging 1.2% while absorbing the fee loses ₱2.41–₱10.38
  per ₱800 online booking (Master Plan §6.3).
- **No stored-value wallet, no lending, no insurance underwriting.** Licensed partners do those.
- Payments, lending and insurance go through **licensed** providers; a rate or fee shown to a user must
  trace to a signed quote, not a published page.
- **AI may recommend, rank or flag; it never decides.** A human moderator handles identity and risk
  flags, users can correct data, and there is an appeal route.
- **Biometric data, government ID images and sensitive personal data never go on a public or immutable
  chain.** Tamper-evidence, encryption and public anchoring are three different things — say which one
  you mean.

Financial and investor terms — the funding ask, valuation, investor split, liquidation waterfall,
budget lines and salaries — are in the Master Plan `.docx` in this folder. They are **kept local**
(see `.gitignore`) and are not repeated in any committed file.

## 5. What must not be claimed

Do not claim Sukinnect already has 150 verified providers, 3,000 users, or any completed bookings.
Do not present the stretch case (its ROI, its profit month, its payback month, its booking count) as a
forecast or an expected result. Do not call PSA household counts customers, or imply PSA measured
service-market spending for Sukinnect. Do not claim a proprietary e-wallet or direct lending. Do not
describe the investor pool as a transaction charge. Do not claim a 1.2% fee if the platform actually
absorbs gateway costs. Do not claim subscription, listing or partner revenue as secured before a paid
pilot or a signed agreement exists. Prospective partners are **proposed**: the collaboration notes say
in their own words that they "do not imply existing formal partnerships or institutional endorsements".

## 6. Which source decides what

| Question | Authority |
|---|---|
| Business facts: geography, fee and cap, gateway rule, funding, investors, risks, allowed claims | **`Sukinnect_Master_Plan_Revised_27Oct2026.docx`** (readable copy: `docs/readable/`). It supersedes the earlier deck and concept note, whose 10% commission and older funding figures are legacy. |
| Partnerships, and the *intent* of new features | `Potential_Collaborations_and_New_and_Refine_Features.docx`. Proposed and in-plan only. |
| Engineering discipline, prototype-vs-production rules, honest labelling | `AGENTS.md` (349 KB — read its table of contents and the sections you need, not the whole file) |
| **What is actually implemented today** | the code, `Sukinnect-next.html`, and what `node tools/verify.cjs` proves |
| History and why | `CHANGES.md`, `DEVICE-PASS.md` |

Two sources disagreeing is **not** averaged and **not** picked silently: it is recorded in the conflict
ledger (C1–C12) in `SUKINNECT_STARTUP_ROADMAP.md` with an owner-decision column.

## 7. Engineering orientation

- **One app file: `Sukinnect-next.html`** (~14,000 lines, CRLF). Single-file on purpose: the Android
  WebView loads it over `file://`, so ES modules are blocked and nothing may be fetched at runtime
  except OpenStreetMap tiles. `Sukinnect.html` is the older shipped file — **do not touch it**; the
  owner intends to retire it.
- Inside that file: a **domain kernel** (centavos integers for money, a Store adapter, a booking state
  machine, a double-entry ledger, payment records behind a gateway seam, disputes, threads) and an
  **app layer** of screens. **The kernel never calls up into a screen.** Records store *codes*, never
  sentences; a status never moves without its consequence.
- Honest labels — `demo` versus `live`, "sample figures", "declared, not verified", the simulated-AI
  disclosure — may be restyled but never removed or weakened.
- `Sukinnect-Android/` is **untracked on purpose** and holds a **separate copy** of the page. Editing
  the HTML does not update the app; `node tools/audit-build-bytes.cjs` compares the four copies and is
  the only way to see that they drifted. Never push, delete or rewrite anything in that folder.
- Line endings: the app and several documents are CRLF on this machine. A patcher that writes LF into a
  CRLF file, or that spells `\r\n` once and produces `\r\r\n`, has broken this repo more than once.

## 8. How to verify

| Command | What it proves |
|---|---|
| `node tools/verify.cjs` | the gate — 743 checks as of 6 Nov 2026, run it again for a current number |
| `node tools/shot.cjs --measure` | real Chrome over the DevTools protocol: tap targets, contrast, clipping, unreachable controls, painted `undefined` |
| `node tools/measure.cjs` | token, glyph and heading census of the file |
| `node tools/falsify-all.cjs` | the mutation suite — **only under the clean-tree procedure** |

**Clean-tree procedure.** `falsify-all.cjs` rewrites `Sukinnect-next.html` and restores it; the app
file is the mutex. Run `git status --porcelain -- Sukinnect-next.html` first and stop if it is not
empty; run it **once, alone**; run the status check again and repair before trusting any number. Never
start a second mutating pass over a running one, and never pipe a long run — redirect it to a log.

**House rule: a check that cannot fail is not a check.** Every new rule gets a gate check *and* a
mutation family that breaks the rule and requires the check to fail. A break that prints `MISSED` is
read and explained, not deleted.

## 9. Rules for any agent working here

Read before changing. Never touch `Sukinnect-Android/`, `.git/`, `dist/`, `Python/`, or the `.docx`
sources. Preserve each file's line endings. Do not weaken a gate to reach green — replace it with an
equivalent assertion. Label simulated things as simulated. **Never invent providers, counts, prices,
partners or quotes.** Do not push. Business questions go to the owner as decisions, not resolutions.

## 10. Status snapshot

| Area | State | Evidence |
|---|---|---|
| Discovery, booking, records, chat, admin review, fruit pilot | **built in the prototype**, over on-device records | `node tools/verify.cjs`; `node tools/shot.cjs --list` (102 screens) |
| Persistence | prototype-only: `localStorage` behind a Store adapter, versioned schema | `hydrate()`/`persist()`, `falsify-storage-truth` |
| Payments | **simulated** — `MockGateway`; no money moves; no value stored | README money model; `falsify-pay-records` |
| Smart Match | **typed per provider in seed data**, and the results screen says "Sorted by: Smart Job Match" while `providerMatches()` only filters — the score is not computed and not sorted | `PROVIDERS[].smartMatch`, `providerMatches()`; roadmap B1 |
| AI concierge | keyword matching over six trades, honestly labelled as not reading pictures | `CONCIERGE_SORTS`, `matchConciergeService` |
| Terms and Privacy consent: scroll gate, short pane counts as read, versioned persisted record | **built** (F8) | the legal-document sheet, `docScrolled`, `state.termsAcceptances`; `falsify-legal-truth` |
| Tamper-evident ledger chain — labelled "not a blockchain, not a network, not encryption" | **built** (F10) | `chainHash`, `buildLedgerChain`, `verifyLedgerChain`; a gate check tampers with a record and requires the head to move |
| Pricing band and the provider rate wizard; standing tier; connections; wallet as a derived view | **built, computed from records on this device** (F5, F13, F20, F12) | `rateBandFor`, `openRateWizard`, the tier ternary, `connectionsSheet`, `walletSheet` |
| OCR / liveness, exchange rates, bot check, funding eligibility, an organisation as a party | **named seams that decline** — they say what is missing and record nothing (F6, F7, F9, F14, F21) | `seam(ocr.reason)`, `exchangeRateSeam`, `spamCheckSeam`, `gatewayCashSeam` |
| Sign-up guide (typed, one question at a time) with the browser's own dictation behind a named seam | **built** (F3) | `openSignupGuide`, `SIGNUP_GUIDE_STEPS`, `speechSeam`; the `signup-guide` suite, 8 checks |
| Computed matching and sorting, moderator and service-business roles, an onboarding/verification stepper, subscriptions, promoted listings, event instrumentation and the KPI console | **in plan, not built** | roadmap F1–F2, F4, F15–F19 |
| Visual system | flat brand palette, one icon family (Material Symbols, Apache-2.0, 48 glyphs), one top-bar/nav/sheet system | `assets/ICON-LICENSES.md`, `DESIGN-TOKENS.md` |
| Backend, real accounts, real payments, legal sufficiency of the draft terms | **not started**; design and seams only | Master Plan §9; `SUKINNECT_STARTUP_ROADMAP.md` |

## 11. Reading order

1. this file;
2. `README.md` (what a reviewer runs, and the honest-labelling table);
3. `SUKINNECT_STARTUP_ROADMAP.md` (goals, needs, the F1–F21 feature register, the C1–C12 conflict
   ledger, open questions);
4. the `AGENTS.md` sections your task touches — start from its table of contents;
5. `docs/readable/Sukinnect_Master_Plan_Revised_27Oct2026.md` and
   `docs/readable/Potential_Collaborations_and_New_and_Refine_Features.md` for the business sources —
   **the `.docx` in the root wins over those copies**;
6. `CHANGES.md` for why a rule exists, and `DEVICE-PASS.md` for what has ever been measured on a phone.

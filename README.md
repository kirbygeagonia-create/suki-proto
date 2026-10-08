# SUKINNECT — prototype

A hyperlocal services marketplace for a Philippine municipality: residents find and book
verified local providers, providers receive and run jobs, administrators verify, monitor and
settle. The core loop is **FIND → REVIEW → BOOK → RECORD**.

The product spec, brand rules and the prototype-versus-production discipline live in
**[`AGENTS.md`](AGENTS.md)**. Read it before changing anything. The money model in this
rebuild is summarised in **[`CHANGES.md`](CHANGES.md)**.

## Clone and run

Large assets (`reicon.js`, the pitch deck) are Git LFS files. Install LFS **before** cloning or
they arrive as ~130-byte stubs. Only `Sukinnect.html` needs the icon library — the rebuild
draws every glyph from a set inside its own file — so a stubbed `reicon.js` costs the shipped
prototype its icons and costs `Sukinnect-next.html` nothing:

```
git lfs install
git clone <this repo>
```

Then open `Sukinnect.html` in a browser — no build, no server, no packages. For the phone
layout without the desktop frame, open it as:

```
Sukinnect.html?app=1
```

Best viewed at about 390×844. `Sukinnect-Android/` (kept local, untracked) wraps the same
file in a WebView; it is a shell, not a second implementation.

### The rebuild branch

`Sukinnect-next.html` is the working copy carrying the domain-kernel rebuild — centavos
money, one shared booking record, a ledger, a booking state machine, payments, payouts and
an admin money console. `Sukinnect.html` stays the shipped prototype until that work is
approved. Both files sit side by side so you can compare the same flow in two tabs.

## Verify

```
node tools/verify.cjs
```

Boots the real script out of `Sukinnect-next.html` against a minimal fake DOM and drives it
in Node: money formatting, storage fallback, the resident→provider loop, the state machine's
illegal moves, the ledger's balance assertions, refunds, payouts, the price list, plus a pass
that renders every screen of every role and fails on any painted `undefined`, `NaN` or
unbalanced markup. Nothing here is a copy of the logic — it loads the file the phone loads.

A `journeys` pass asks the shipped markup a question rendering cannot answer: **can a person
standing on that screen do the thing the model claims?** It checks a case can be raised from
both sides and reaches the help desk, that no action button reads a state name, that records
carry codes rather than words, that no function or state key exists which nothing reaches, and
that every open state has an actor left with a move. That suite was written after an audit
found a status the machine could produce and no screen produced — the app was green at the
time.

A `fruit` pass holds the pilot category to the rules its brief states: one booking table,
produce money that never reaches the service figures, an undecided commission rate that stays
undecided, an offer that cannot move a lifecycle, a request that was answered with a price not
lapsing as if it had not been, and a capability that reads as declared rather than verified.

A `weighing` pass holds the pilot's last link — `FINALIZE QUANTITY` — to the rule that keeps it
from becoming a second pricing sheet: the agreed unit price applied to the actual weight, a lot
left at its lot figure whatever it weighed, the service leg untouched, the fee's *state*
inherited rather than re-asked of the configuration, a correction that keeps what it replaced,
and a screen for every one of those that a person on a phone can actually reach.

A `back` suite drives the phone's only way out. The page keeps one history entry per open sheet
and one per drill-in, so Back closes the sheet, then leaves the screen, then leaves the app — and
a sheet dismissed by tap spends its own entry without being mistaken for a Back press. The Node
harness grew a `history` stub and a `popstate` that fires to make any of this assertable, which is
also its limit: a stub fires synchronously and a browser does not, so the same sequence was
driven in real Chrome by pressing Back for real and awaiting each event.

**A check that cannot fail is not a check.** Every rule above is falsified by mutating the rule
in the real file and requiring the intended check to fail — twenty-six targeted breaks so far,
each restoring the file from an in-memory copy in a `finally` so a crash cannot leave a mutation
behind. One earlier version of that harness died mid-run to a console-encoding error and poisoned
its own backup; the gate then reported green on a file that still carried a mutation. The restore
is now the last thing that runs, and the numbers below are only quoted from a run that ended
green. (The harness is Node now for a second reason: three of its first mutants had silently
matched nothing, because the app file is CRLF and a find-string carrying a newline missed every
time. An unapplied mutant is a rule nobody tested, so the count of *applied* breaks is printed
beside the count of caught ones.)

### Look at the painted page

```
node tools/shot.cjs                 # every named screen, 390×844 app mode, into .shots/
node tools/shot.cjs --list          # what the named screens are
node tools/shot.cjs --only=resident-home,provider-detail
node tools/shot.cjs --measure       # also print the audit tally below
node tools/shot.cjs --reduced-motion
node tools/shot.cjs --desktop       # the phone frame inside the desktop shell
node tools/shot.cjs --probe=@file   # any expression, evaluated after the page settles
```

Renders real Chrome over `file://` through the DevTools protocol — raw CDP on Node's built-in
`WebSocket`, so nothing is installed — paints each screen at a phone size, and then measures
what the browser actually laid out rather than what the source claims: tap targets under 44px,
text contrast against the pixels behind it (a gradient is sampled where the text sits, not at
its worst stop), controls still covered by the bottom nav after the screen is scrolled to its
end, clipped or ellipsised copy, type sizes off the declared scale, horizontal overflow, a map
tile escaping its own frame, and any control inside an open modal that something else is
sitting on top of. Vendored Leaflet chrome is counted separately, because resizing it means
fighting vendor CSS.

These tools exist because instruments saturate. After a few rounds every check reported zero and
the next four defects — a dashboard that contradicted itself, an ETA shown for a provider who
had not left, a map drawn over a booking sheet, and every form field in the app rendering as a
raw browser control — were found by reading code and looking at the screenshots, not by a
number.

```
node tools/measure.cjs              # the static shape of the rebuild, as AGENTS.md §31 states it
node tools/measure.cjs Sukinnect.html
```

The third instrument, and the reason it is a program: §31's numbers were quoted in prose, and
when one was re-derived it came out three off. A count that has to be recomputed by hand, by a
reader who is not here, drifts — so the method is code now, and the document quotes the command.
It classifies only what a pattern can honestly decide (a trade-palette entry, an SVG paint
attribute, the one meta tag that cannot take a variable) and **prints the rest** rather than
explaining it, because a comment quoting a measured brand value and a hard-coded colour in
markup are the same string to any scanner. It also counts the glyphs drawn in the file against
every way a name can reach `ic()`, which is the check that was missing when dropping an icon
library blanked six icons in silence.

## Architecture

One file, two layers. The upper half is an application kernel with **no DOM access**; the
lower half is the screen layer that has always been here.

```
Sukinnect-next.html
├── <style>              design tokens (one :root), then component CSS
└── <script>
    ├── DOMAIN KERNEL     money · catalogue · config · accounts + ledger
    │                     pricing · state machine · payments + gateway · payouts
    │                     statements · disputes · message threads · status timeline
    │                     Store adapter (localStorage ⇄ memory)
    └── APP LAYER         state · render() · ~60 screen functions
```

Two rules the kernel keeps to: **a record stores a code, never a sentence** (the words come
from `BOOKING_STATES`, `PAYMENT_LABELS`, `PAY_METHODS`, `JOB_VERBS`), and **a status cannot
move without its consequence** — the transition table names who may move it, what must
already be true, and what money, notification, thread line and record it leaves behind.
Opening a case creates the case record and then moves the job, in that order; the desk shows
what the books froze, not what the claim asked for.

Screens call down into the kernel; the kernel never calls up into a screen. Records join by
id (`providerOf(booking)`, `customerOf(booking)`) — no record holds a copy of another. The
dump is version-gated: an old snapshot is discarded rather than half-read, and `admin` has a
control to restore the sample records.

Why single-file: the Android shell loads the page over `file://`, where ES modules are
blocked by origin rules; and AGENTS.md §11/§88 protect the existing architecture over a
rewrite that would make the change easier.

## The money model

Every amount is an **integer count of centavos**, and the unit is in the field name
(`basePriceCentavos`, `amountCentavos`). A percentage computed on a float peso eventually
prints a cent nobody charged.

For a job with a ₱800 base at the pilot's 10 %:

| | |
|---|---|
| Customer pays | ₱800.00 |
| Provider keeps | ₱720.00 |
| Sukinnect earns | ₱80.00 |
| Parts/materials (if any) | charged at cost, **not commissioned**, reimbursed to the provider |

- The fee is deducted **from the provider's share**, so the price on the card is the price
  the customer pays. Nothing appears at the till that was not on the card.
- **Booking status and payment status are separate fields**, always displayed separately.
  `completed + unpaid` and `cancelled + refunded` are both real. Each holds a **code**
  (`captured`, `pending_site`, `cash`); the words a person reads are produced from it, so no
  rule can change because the copy did.
- Money is recorded as **double-entry events** that must balance, or the posting throws
  before any status changes. Reports are sums over that ledger — no figure on a screen is
  typed, and none can disagree with the books.
- Accepting a job **holds** the customer's money with a licensed partner; completing
  **releases** it into provider earnings and platform revenue; cancelling returns it; a
  refund walks **this booking's own posted lines** back, pro rata — never a rate recomputed
  against today's configuration, which would put commission on parts and materials. A cash
  job can only have its fee forgiven: the platform never held the visit money.
- **There is no stored-value wallet** and no resident balance. A customer's money is an
  obligation to deliver or refund, never a number they can spend (AGENTS.md §23).
- Cash-on-arrival is a first-class path: the platform never held that money, so the fee is a
  **receivable** from the provider, surfaced with ageing — the number that tells you whether
  the commission model actually collects.
- Rates, fees, VAT, payout threshold, hold days, cancellation fees, the request-lapse window
  and the auto-confirm window are **configuration**, editable by an admin with an audit
  trail. They apply to bookings made after the change; an accepted job keeps the terms
  frozen when it was accepted. The deck's own position governs: launch monetization is not
  assumed, and take rates are validated per category during the pilot.
- Payments sit behind a four-verb gateway seam (`authorize · capture · refund · void`).
  Today it is `MockGateway`, with no network call; a partner implementation changes one line.

`schema/sukinnect.reference.sql` is the MySQL shape this maps onto if a backend is ever
built. **It is not loaded by the prototype** — it exists so the centavos, append-only and
no-wallet rules are written where they cannot be misread.

## Fruit Harvest & Buy — the pilot category

A seventh category, marked **pilot** everywhere it appears, that a reviewer can walk end to
end: `erning@demo.ph` signs in as the harvester-buyer, `ramil@demo.ph` is still the plumbing
account. Same provider shell, same screens — only the identity differs.

Three modes, because they are three different transactions: **Harvest Only** (you keep the
fruit, you pay for labour), **Sell My Fruit** (a buyer pays you and takes it), **Harvest + Buy**
(both). The request sheet asks which one first; the fields that follow come from the category's
own `requestFields`, and the six original trades resolve to a single mode each and are asked
nothing new.

**Two kinds of money, and they never merge.**

| | |
|---|---|
| Labour (harvesting) | a service fee — the normal path: frozen on acceptance, commissioned, ledgered, receipted |
| Produce (the fruit) | a purchase between two people — **not** a service fee, **not** platform revenue, **not** held by the platform |

- The price is **negotiated**, because a standing rate cannot price a standing tree. An offer
  is a child record beside the booking, never a booking state: the job stays `requested` while
  an offer is out, and `answerOffer` does not move the lifecycle — confirming the visit is the
  provider's move. Every revision is kept, so a dispute can read *what was offered, and what
  did they agree to*.
- `CONFIG.produceCommissionRate` is **`null` — undecided**. An undecided rate charges nothing
  **and carries the reason** (`produceFeeUndecided`), so it cannot be misread as a generous zero.
- **The fruit part is chargeable only inside a visit that also harvests** (owner's decision).
  A straight **Sell My Fruit** sale is *decided-none*: the platform takes nothing and no screen
  implies a rate might still appear. Only **Harvest + Buy** has an open question, and its rate
  is still unset. Three states, named apart in the data and on every screen: `charged`,
  `undecided`, `not-charged`.
  No screen, and no report, adds a peso of produce to the platform's earnings.
- Weight is stored in **whole grams** and typed in kilos, for the same reason money is stored
  in centavos.
- **The last link is the weighing.** `HARVEST/COLLECT → FINALIZE QUANTITY → SETTLE` is closed by
  a recording step on the provider's job screen: they enter what was actually carried (or how
  many trees were done) and the fruit leg is re-priced **at the rate already agreed**. It is not
  a second pricing sheet — the unit price is shown and has no field, a lot priced *as a lot*
  keeps its figure whatever it weighed, and the service leg is not touched, because that was
  frozen when the visit was accepted and a scope that genuinely changed is a new offer. A
  correction keeps the reading it replaced. Both sides see it: the row reads *agreed ₱6,600 →
  weighed out ₱1,705*, the thread carries the sentence, and the operator's fruit figure counts
  the money that moved. The fruit fee's **state** is inherited from the agreement, never
  re-asked of `CONFIG`, so an admin deciding a rate afterwards cannot reach back and charge a
  job that was agreed under the old answer. A scale reads in grams and the field asks for
  kilos, so a reading **more than double** the estimate is called out on the sheet — warned,
  never refused, because a cap would be an invented rule and the two people on the site know
  the load. Carrying *less* than estimated is the ordinary story of a standing tree and is
  never treated as a mistake.
- **A fee column may never show `₱0` for a job that has no price.** `bookingAmountText` says
  `Price by offer` while it is open and `No service fee` once a purchase is settled; the value
  of the crop appears only in its own labelled row.
- **Zero is not a transaction.** `hasServiceMoney` guards the authorize, hold, settle and
  capture paths, so a job with no service money posts nothing — `assertBalanced` would reject a
  zero line, and a ₱0 payment record would be a receipt for nothing.
- **Capability is declared, not verified.** Harvester / buyer / both sits on the provider's
  category profile with equipment and a working-height band, labelled as the provider's own
  statement. No badge or line implies Sukinnect inspected anything. A provider may refuse work
  they cannot do safely, and the screens say so.
- A request the provider answered **with a price** has not gone unanswered, so the lapse window
  skips jobs carrying an open offer. An offer expires on its own `validUntil`, if it has one.

The administrator's intelligence screen reports the two totals **separately**, with the produce
card stating in words that it is not in the services figure; the new **Categories** surface
reads the live catalogue back — modes, pricing models, commission basis, declared capabilities,
safety rules, supply against 30-day demand — and says plainly that editing those rules is not
available here, because they decide how money moves and are still being validated.

## Honest labelling

Demo data is `source:'demo'`, records you create in a session are `source:'live'`. Pilot
targets (150 providers, 3,000 users, 6,000 bookings) are planning assumptions and are never
presented as activity. There is no server: an AI concierge that describes, analyses and
matches is a simulated flow, and the screens say so.

## Assets

| What | Where | Notes |
|---|---|---|
| Logo | `Sukinnect_Logo.png` | exact case. Official mark — never redrawn, recoloured, stretched or replaced. It has a white background, so change the surface around it, not the file. |
| Icons | an inline SVG set inside `Sukinnect-next.html`; `reicon.js` (LFS) for `Sukinnect.html` | The rebuild loads no icon library: 43 glyphs are drawn in the file and every one of the 40 names the app can reach has one — whether the name is written in markup, carried by a service record, or passed to an empty state. The gate checks all three and fails if a new name arrives undrawn. Measured with reicon disabled, that set drew the same icons on every screen of the then-40, so the rebuild dropped the 8 MB custom element and the four seconds of iconless paint it cost when registration lost the race. `Sukinnect.html` still uses reicon, so add a name to both files or neither. |
| Type | `fonts/` | Fraunces for display, Plus Jakarta Sans for UI. Self-hosted; no remote fonts. |
| Photos | `avatars/` | local PNGs, mapped per persona in `PRO_PHOTOS`. Keep imagery local — the APK runs offline. |
| Maps | `leaflet/` | vendored. Tiles come from OpenStreetMap, the one network dependency, so a map is blank with no connection. |

To swap an image, replace the file and keep the name. To add a trade, add a row to
`SERVICES` and a tint to `SERVICE_THEME` — nothing else needs to know.

## Known limitations

- No authentication: role is chosen on a demo sign-in screen and there is no session, so
  nothing enforces a boundary between roles.
- No server, so nothing runs while the app is closed — due transitions (a lapsed request, an
  auto-confirmed completion) are evaluated on open, with their real timestamps.
- Storage can be unavailable (`file://` on some browsers, private windows); the app then keeps
  records in memory and says so on the money console.
- `Sukinnect-Android/app/src/main/assets/` holds a **separate copy** of the web files. Any
  accepted change must be re-synced there before it reaches a device build. It currently holds
  the rebuild, staged for a handset pass — see [`DEVICE-PASS.md`](DEVICE-PASS.md), which also
  says how to put the shipped file back.
- Screens are rendered in Node and painted in a real browser at a phone size and measured, but
  never on a handset. Touch feel, the on-screen keyboard, and device performance are the three
  things no instrument in this repo can prove; [`DEVICE-PASS.md`](DEVICE-PASS.md) is the
  checklist for the pass that is still owed.

# SUKINNECT — prototype

A hyperlocal services marketplace for a Philippine municipality: residents find and book
verified local providers, providers receive and run jobs, administrators verify, monitor and
settle. The core loop is **FIND → REVIEW → BOOK → RECORD**.

The product spec, brand rules and the prototype-versus-production discipline live in
**[`AGENTS.md`](AGENTS.md)**. Read it before changing anything. The money model in this
rebuild is summarised in **[`CHANGES.md`](CHANGES.md)**.

## Clone and run

Large assets (`reicon.js`, the pitch deck) are Git LFS files. Install LFS **before**
cloning or they arrive as ~130-byte stubs and the prototype renders without icons:

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

## Architecture

One file, two layers. The upper half is an application kernel with **no DOM access**; the
lower half is the screen layer that has always been here.

```
Sukinnect-next.html
├── <style>              design tokens (one :root), then component CSS
└── <script>
    ├── DOMAIN KERNEL     money · catalogue · config · accounts + ledger
    │                     pricing · state machine · payments + gateway · payouts
    │                     statements · disputes · Store adapter (localStorage ⇄ memory)
    └── APP LAYER         state · render() · ~60 screen functions
```

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
  `completed + unpaid` and `cancelled + refunded` are both real.
- Money is recorded as **double-entry events** that must balance, or the posting throws
  before any status changes. Reports are sums over that ledger — no figure on a screen is
  typed, and none can disagree with the books.
- Accepting a job **holds** the customer's money with a licensed partner; completing
  **releases** it into provider earnings and platform revenue; cancelling returns it; a
  refund reverses our fee **pro rata**.
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

## Honest labelling

Demo data is `source:'demo'`, records you create in a session are `source:'live'`. Pilot
targets (150 providers, 3,000 users, 6,000 bookings) are planning assumptions and are never
presented as activity. There is no server: an AI concierge that describes, analyses and
matches is a simulated flow, and the screens say so.

## Assets

| What | Where | Notes |
|---|---|---|
| Logo | `Sukinnect_Logo.png` | exact case. Official mark — never redrawn, recoloured, stretched or replaced. It has a white background, so change the surface around it, not the file. |
| Icons | `reicon.js` (LFS) + an inline fallback set | `<re-icon>` is primary; the inline set carries the glyphs the chrome needs if it never registers. Add a name to both, or none. |
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
  accepted change must be re-synced there before it reaches a device build.
- Screens have been verified by rendering every one of them in Node and inspecting the
  output, not by human eyes on a handset. Visual polish on a real device is still owed.

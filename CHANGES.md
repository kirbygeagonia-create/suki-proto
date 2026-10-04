# CHANGES — the domain-kernel rebuild

Branch `feat/domain-kernel`. Work happens in **`Sukinnect-next.html`**; `Sukinnect.html`
is byte-for-byte the shipped prototype and is untouched until the rebuild is approved.

Run `node tools/verify.cjs` to check everything below (240 assertions, no browser needed).

---

## 1. Money became centavos

`rate`/`amount` fields became `rateCentavos`/`amountCentavos`; `peso()` was split into
`peso` (₱350.50), `pesoShort` (₱365), `pesoCompact` (₱42.8k) and `rateLabel`. The
provider profile's `'₱350 / call-out fee'` string became a number plus a unit.

**Why.** A percentage on a float peso eventually prints a cent nobody charged, and an
untyped `350` is indistinguishable from `35000`. Units now live in the field name so a
missed conversion cannot look like a converted value.

## 2. Records survive a reload

A `Store` adapter probes storage once and falls back to memory when it is refused
(`file://` gives an opaque origin; private windows and hardened Safari also refuse).
Snapshots are version-gated, so a dump from an older shape is dropped rather than
half-read. `persist()` sits at the nine places a record changes. UI state — tab, sheet,
scroll — is never persisted.

The sign-in note said *"nothing is stored"*; it now says where records actually are.

## 3. One booking, two views — the loop closes

`RESIDENT_BOOKINGS` and `PROVIDER_BOOKINGS` were two arrays that never met, so a
request raised on one side never arrived on the other: **the marketplace loop the
product is built on did not exist.** They became one `BOOKINGS` table joined by
`customerId`/`providerId`, plus `CUSTOMERS`. 28 readers rewired through
`providerOf()`/`customerOf()`.

Demo rows are `source:'demo'`, session rows `source:'live'`. Timestamps replaced the
`'2 hours ago'` strings, so a countdown can be honest. A provider now has exactly one
job in progress — the old data showed two at once.

## 4. Catalogue, configuration, ledger

Providers became a price list (`LISTINGS`); the deck's pilot assumptions became editable,
audited `CONFIG`; money became eight accounts and an append-only event log.
`postEvent()` throws before a status moves if debits and credits disagree. Statements
read the ledger and nothing else.

Two rules fixed the shape of pricing: parts and materials are collected for the provider
and are **never commissioned** (commissioning hardware twice is taking a cut of nothing),
and the fee comes out of the provider's share so the customer's total equals the price on
the card. VAT defaults to 0 with a liability account waiting — the registration threshold
is a fact about a company that has not been crossed, and inventing a rate would be
inventing a compliance position.

**Caught by its own assertion:** the first seed debited the customer's full charge but
credited only service + commission, silently dropping the ₱15.00 parts line. No account
was ever told where that money went.

## 5. The booking state machine

Nineteen scattered status comparisons became one `TRANSITIONS` table naming, for each
move, who may make it, what must already be true, and what money, notification and
record it leaves behind. Added `en_route`, `arrived`, `expired`, `no_show`, `disputed` —
states the prototype could display but never produce. Three direct `b.status =` writes
were the only transitions that existed.

The status timeline is now a record serving three consumers at once: the customer's
tracking view, the dispute evidence chain, and the admin audit. Previously all three
were hand-typed lists, which is how a tracking screen could show "Provider reviewed ✓"
for a step no code had performed.

Guards worth knowing: a provider cannot accept a second request for the slot they already
hold (this moved in §12 — it had only fired when the work started, which is after the
promise was made); a late cancellation costs a fee
that is paid **to the provider, never to the platform**, so the platform has no incentive
to profit from cancellations; an unanswered request lapses on the next open, with its real
timestamp rather than a pretence that it just happened.

**Caught by the suite:** settlement drew down a customer deposit nothing had ever created,
letting liabilities run negative; and the double-settlement guard (`no ledger rows for this
booking`) also suppressed the *first* settlement once a holding existed, so money would have
sat in escrow forever with revenue reading zero.

## 6. Payments, refunds, payouts

A `PAYMENTS` row records what was done to the money — authorization, capture, refund,
void, collection — with a gateway reference. Four verbs behind one object: a real partner
(PayMongo, Xendit) implements the same four and returns the same shape. Accepting holds,
completing releases, cancelling returns, and a refund reverses the fee **this booking's own
ledger lines recorded**, pro rata (§12 corrected the first version, which recomputed it from
today's rate).

Payouts are a schedule, not a wallet: the lesser of what is due and what is owed, above a
minimum, after the hold window. Cash jobs are excluded from the payable position — the
provider already holds that money and owes us a fee, which is shown as a receivable with
an ageing table, because commission on cash is a billing problem the pilot has to see.

**Caught:** cash completions were labelled differently on the live path than on the seeded
one, and a payout could overshoot the payable it drew on.

## 7. Resident flows

The booking sheet now names the job and shows the whole breakdown — base, nothing added to
your total, you pay, the provider keeps — instead of one `Indicative rate` line; offers
*as soon as possible*; the tracking card reads events; cancellation says what it costs
before the button; a payment record sits with the job; *Book again* rebooks. Headline
prices come from the price list.

## 8. Provider flows, and the wallet deleted

**`Secure Balance Wallet` / `Instant Cash-Out` / `Transferred successfully to GCash!` is
gone.** AGENTS.md §23 and the deck both say a licensed payment partner and no stored value,
yet the prototype's provider earnings model was a wallet that reported a completed transfer
changing nothing — a misrepresentation in production, and a lesson in the wrong model now.
In its place: ready to pay out, in the hold, collected on site, fee owed on cash jobs, next
payout date, and payout history — all computed.

Also: the job actions (on the way, arrived, start, complete), the longest-waiting request
replacing the invented "Incoming Request #9021", availability and emergency-dispatch buttons
that do what they say, a real price-list editor that refuses a sub-floor price with a reason
on the field, dashboard figures derived from records, and message threads that follow the
jobs an account belongs to — the provider was reading the resident's conversations.

## 9. The admin money console

A statement whose every line is a sum over ledger entries; commission-receivable ageing;
editable fee and settlement rules with a change log; a payout run; a reset control and a
plain statement of where this device keeps its records.

Disputes became cases attached to real bookings — claim amount, frozen payout, the job's own
evidence timeline, three outcomes that each move money. **§12 found this overstated:** the
case record could only be created by the seeded demo, because no screen ever called the
function that makes one. The dashboard's invented month
(₱42,800), its 52/30/18 "revenue allocation" (a budget split presented as a commission
model), the 428-booking GMV and the what-if simulator are gone; counts, weekly activity and
supply gaps are computed, and the intelligence filters filter.

## 10. Cleanup

Call buttons dial instead of congratulating; the concierge answers now reach the briefing they
claim to update; the provider map pins the provider it is talking about instead of the same
barangay for everyone. Three retired cards, three unread state keys and invented cancellation
histories removed. The offline icon fallback gained `alert-triangle`, a close glyph and filled
variants for the active tab, and lost 13 entries nothing asks for.

**A tooling failure worth recording:** the first removal used a lazy regex that ran past one
card's end into a closing tag hundreds of lines away and took live markup with it. It failed
its own guard before writing. A div-matching scan replaced it.

## 11. Documentation and the reference schema

`schema/sukinnect.reference.sql` — the MySQL shape the kernel maps onto if a backend is ever
built, and the place where the centavos, append-only and no-wallet rules are written where
they cannot be misread. Not loaded by the prototype.

Two documents were stale in ways that would have misdirected the next reader, and are
corrected rather than left: `AGENTS.md` §31 described a duplicated colour system with 372
hard-coded hex values (there is one `:root`), and listed `--text-muted` and the
category palette as undecided (both are decided, with the reasoning in code comments);
`SUKINNECT_UIUX_REDESIGN_PROMPT.md` §2 is an audit whose findings have all since been fixed.

## 12. A full audit of the rebuild, and what it found

An audit of everything above — static cross-checks plus executable probes against the real
kernel, not readings of the source — found that a system can be arithmetically correct,
balanced, and unreachable. Every one of these was verified by driving the code before it was
fixed, and most are now asserted by the `journeys` suite.

**The dispute journey was severed at the door.** `openDispute` was the only thing that
created a case record and had no caller anywhere, while the provider's action bar rendered
whatever move the machine allowed — including one whose verb was missing, so the button read
**"Under review"** and pressing it moved the status with no case attached. The job then had
moves belonging only to an administrator, on a card the help desk never showed. A resident
could not raise a case either. Both parties now open a form that states the claim, records
what was actually frozen, and appears in the desk.

**Three money rules were wrong in ways the balance check could not see,** because each event
still balanced on its own:
- freezing a case debited the provider's payable by the job's full share even when that job
  had never settled, so a case on one job seized what another had earned (probe: a
  provider's payable went 31500 → 0 for a job at `upcoming`);
- closing a case for the provider left the booking `completed` on screen while the ledger held
  no settlement, no revenue and no capture — the customer's hold was never released either;
- a refund re-derived our fee as `amount × rate` against the **customer total**, which put
  commission on parts and materials — the one thing §3's pricing rule exists to prevent — and
  capped that reversal against the platform's whole revenue account, letting one provider's
  refund be funded from another's earned fee. A job whose recorded fee was ₱50.00 had ₱51.50
  taken back. Refunds now walk the booking's own posted lines, pro rata, and a cash job can
  only have its fee forgiven: the platform never held the visit money and does not pretend to
  return it.

**`no_show` was offered while the provider was still en route,** which recorded "The provider
arrived and no one was there" before `arrivedAt` existed and paid a call-out fee for a visit
never made — while the customer, locked out of `arrived` with no moves at all, had no way to
avoid being billed for it. `no_show` belongs to `arrived`; the customer can now call the job
off there.

**The money axis was stored as prose and read as prose.** `paymentStatus` held the display
label ("Held, not yet paid"), and fourteen rules tested it with regular expressions —
including `/cash on arrival/i` against `paymentMethod`, whose values are labels carrying a
masked phone number, and one line that *derived* the method from the status label. Renaming
copy anywhere would have changed how a job is held, settled, frozen or refunded, and a
booking word (`'Cancelled'`) had already landed in the field in two demo records. Records hold
codes now; `PAY_METHODS` and `PAYMENT_LABELS` produce words on the way to a screen.
`SCHEMA_VERSION` went to 8 with the shape, and `hydrate` additionally refuses a dump whose
bookings carry a status, a payment code or a ledger account the machine does not have — an
unknown status used to load happily as a record nobody could move.

**The fee change log did not survive a reload.** `CONFIG_AUDIT` was in the seed but not in
`snapshot()`, so after a reload the console showed an administrator's 15% rate with no record
of anyone setting it (§29, §31).

**Messages were not stored at all.** The room painted two Taglish sentences typed into the
template whatever the job was, and `sendChatMessage` appended a node to the DOM and toasted
"Message sent" — nothing persisted, nothing reached the other side, and the thread list took
its snippet from the booking request and its unread dot from the job's *status*, claiming
messages nobody had written. Threads are records now, seeded from the status timeline in the
first person, written by every move and by the person typing; both sides read the same rows.

**Things the earlier sections of this file claimed more than they delivered** — §5's
"one job in progress per provider" (the guard fired at start, not at accept), §6's pro-rata
fee, §9's disputes — are corrected above rather than left standing.

**A design-system pass followed the same rule:** values that existed in one place were being
typed in many. `#fff` appeared 50 times outside `:root` (29 as a surface, 21 as ink on a brand
fill) and is now `--surface` / `--on-brand`; the modal dim is `--scrim`; sixteen cards retyped
the radius, padding and border that `.card` already declares and now use `.card-lg`; selects
were 34px tall and are a tap tall; six controls had only a placeholder and now have a name; the
status copy a resident reads lived in three places (`BOOKING_STATES`, a second map on Home, and
prose in the tracking card) and is now one table that also owns "what happens next", which the
tracking card had been inventing. No pixel moved: the work is that the numbers exist once.

**The gate got the check that was missing.** `journeys` asks the shipped markup whether a
person standing on that screen can do the thing the model claims: a case can be raised from
both sides and lands in the desk; no action button is allowed to read a state name; no
booking carries a word where a code belongs; no function is defined that nothing references;
no state key is written that no screen reads; every open state has an actor left with a move.
It is 240 assertions now, and it found the dead code this section had just added.

---

## Deliberately not done

- **No server, no database, no framework, no CSS library, no ES modules.** The Android shell
  loads the page from `file:///android_asset/`, where module scripts are blocked by origin
  rules; the single-file architecture is also what AGENTS.md §11 and §88 protect.
- **No real payment gateway.** `MockGateway` implements the seam; no network calls.
- **No stored-value wallet, no resident balance.** The customer's money is an obligation
  until the job is delivered, and is labelled that way.
- **No invented rates, tax positions or traction.** Everything numeric is a config value
  labelled as a pilot assumption, a demo record tagged `demo`, or a sum over entries.
- **No delivery, scheduling or reminder automation.** A lapse and an auto-confirmation are
  evaluated when the app is opened, because a closed tab runs nothing and there is no cron.
- **No read receipts or delivery status on messages.** A thread says what was written and by
  which side; it does not claim anybody saw it. Which threads a device has read is one local
  marker, not a record.
- **`Sukinnect.html` is still the shipped file,** and `Sukinnect-Android/app/src/main/assets/`
  still holds a separate copy. Promotion and re-syncing are a decision, not a step.

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

## 13. A measured design pass, and a second audit

Everything in this section was found by looking at rendered pixels or by reading the
code behind a screen, not by reasoning about the design. The mechanical baseline stayed
clean throughout: 248 gate checks, and zero violations from the instrument across 30
screens for tap targets, contrast, clipped text, off-scale fonts, nav traps, unnamed
controls, stretched images, escaping map panes and modal occlusion.

### The verification surface, and its own bugs

`tools/shot.cjs` drives the installed Chrome headless over the DevTools Protocol with no
npm packages, and `--measure` runs an in-page instrument. Three times the tool, not the
app, was the problem:

- It reported a blank map because its SCREENS table assigned `state.tab` directly, which
  skips `openProviderDetail()` — the only thing that mounts Leaflet. A tool that pokes
  state measures a screen nobody can reach.
- A re-shot PNG at the same path read back stale twice, so a dark header appeared in a
  screenshot of code that computed white. Captures now go to a fresh directory.
- Its first contrast version took a gradient's worst stop, which read white-on-navy as
  white-on-white. It now samples the gradient at the position the text actually occupies.

Byte comparison is also weaker than it looks: a screen with a live timestamp or an
animated tile differs run to run with no code change. Two claims in this session were
settled by proving that instead of by eyeballing a diff.

### Design changes applied

- **Root tabs take a light header.** The four screens the bottom nav lands on show the
  person's own name in ink on white; drill-in screens keep the gradient, because there the
  brand is what tells you that you have left home.
- **Section labels lost their capitals and their tracking.** Status pills kept both — a
  different component, not in scope. Fourteen modal titles followed later.
- **The category tiles are drawn scenes** — a dripping tap, a sparking bulb, rising
  bubbles, a turning page, a tumbling drum, a parcel over moving road — as inline SVG with
  CSS motion. Remote images are impossible offline (§81) and no licensed animated set for
  these six trades could be fetched, so the artwork is original.
- **A live job now owns the top of Home,** above the category grid rather than below it.
- **Booking detail answers what is happening before who is doing it.** The status card was
  already correct; it sat under the provider row and its button.
- **Profile modules open in a sheet** in all three roles instead of rendering beneath the
  list they were opened from. This deleted a post-paint patch that removed duplicate admin
  cards, which existed only because the detail was interpolated after all four of its
  groups.
- **Cards have a hierarchy:** `.card-hero`, `.card`, `.card-quiet`. Twenty-five call sites
  were restating values the class already provided, and three carried a literal 18px radius
  that matched no token.
- **The stat spine means something now.** Every card carried the same brand bar whatever the
  number said; the bar appears only where a figure is flagged. Read-only grids became one
  summary line, on the rule that a number you can press is a control and a number you can
  only read is not. The dashboard's four tiles navigate, so they stayed tiles.

### Errors found and fixed

- **Every form field in the app was a raw browser control.** `.form-input` set width,
  padding and height only — no border, radius, background, colour or font — so eighteen
  fields drew as grey 2px squares in the default typeface. `.form-label-8` was used fourteen
  times and `.form-input-readonly` three times with no rule at all, so a read-only field was
  indistinguishable from an editable one and rendered smaller than its neighbours. Both
  arrived in the centavos commit, which renamed call sites and left the rules unwritten.
- **The admin dashboard stated two different numbers for one concept** — 6 applications
  needing review beside a queue of 3, and 5 expiring credentials where two providers hold a
  flagged one. It also claimed 3 disputes open beyond 48 hours on a device holding 2
  disputes in total. Counts now come from the records; the unverifiable "beyond 48 hours"
  qualifier was dropped rather than invented.
- **The Opportunity Radar recited a forecast nothing computes** — "14 expected requests ·
  6 available plumbers" on a roster with one plumber. It counts waiting requests now.
- **A button read `[Set Available 5–8 PM]`** — brackets from a note-to-self — and promised a
  time window the prototype has no model for.
- **An accepted booking was told "Next: the provider confirms,"** which it already had.
- **A `recruit here` chip** looked like the one actionable thing on the supply-gaps screen
  and did nothing, because there is no recruitment flow.
- **The map's loading caption had been the only thing making its container a positioning
  context,** and Leaflet sets that only asynchronously: for the first second of a map's life
  its tiles painted across the card above it.
- **Then the fix for that caused a worse one.** A positioned element with `z-index:auto`
  creates no stacking context, so Leaflet's internal `z-index:1000` panes escaped the map box
  and drew on top of the booking sheet — over the field the resident was meant to fill.
  Fixed with `isolation:isolate`; the instrument now samples nine points inside any open
  modal and asks `elementFromPoint` who is really there.
- **"100% Completion" beside "8 Bookings"** was the ratio of *closed* jobs; the denominator
  now travels with the label.
- **Provider Insights typed its figures** — 4 providers, 4.85 average, 600 jobs, 1 needing
  attention — none held by any record. Counted now, as are the profile's "186 reviews" and
  "0 open disputes".

### The Lottie experiment, installed and removed

A 305KB animated-illustration pipeline was vendored (MIT, licence shipped with it), wired
behind an allowlist, and deleted again. The reason it stayed empty is worth keeping: the
placeholder animations built from Lottie primitives read worse than the SVG scenes already
committed, and no licensed animated set for these six trades could be fetched — LottieFiles
returns 403 to anything programmatic, and the GitHub collections are weather icons and
generic UI glyphs. Deleting it removed weight that animated nothing.

### Two findings that were my own tooling

A static scan reported four orphaned avatars; `warmAvatars()` builds their filenames in a
loop, so a grep cannot see the reference and the files are live. And a check that "every
glyph has a fallback path" was briefly vacuous — the fake DOM exposes `innerHTML`, not
`textContent`, so the helper was asserting against `undefined` and every check passed for
nothing. Both were caught by testing the checker rather than trusting it.

The same counting bug came back while removing reicon. A check written
`(html.match(/id="rt-resident"[^>]*>([\s\S]{0,80}?)(<svg|<re-icon)/) || []).length === 2`
asserted "both role chips carry a glyph" and passed on a screen with one chip, because a
non-global `String.match` returns the capture groups alongside the hit: length 2 means found
once. Rewritten global, with a second check that both chips were actually painted to compare,
so a zero can never read as a pass again.

### The 8 MB icon library, measured out of use

`Sukinnect-next.html` no longer loads `reicon.js`. It never needed to: `ic()` emitted
`<re-icon>` whenever `REICON_READY` was not false, and the flag was set true at parse time, so
the custom element was assumed present and a 4-second timer existed to notice when it was not —
which meant the first four seconds of a page whose icons had not registered were a screen with
no icons. With the library disabled the inline set drew the same glyphs on every screen of all
30, so the dependency, the 47-name map, the flag and both timers came out and the inline set
became the only path.

**Removing it broke six icons, and the screenshots did not show it.** The map had 13 names with
no drawing in the inline set, and six of them were live: four of the six trades carry an icon
name on their record (`bubbles`, `book`, `plug`, `package`), and two empty states ask for
`search` and `inbox` by name. Under reicon those resolved to library glyphs; without it `ic()`
returned an empty string — which throws nothing, fails no render, and on the Home screen is
invisible because the category tiles are drawn SVG scenes. The gate's own check missed them too:
it scanned for `ic('name')` in markup, and a name carried by a data row is not that.

All six were drawn from the library's own path data (MIT, local file) and added to the inline
set, which is now 41 glyphs for the 38 names the app can reach. The coverage check reads all
three ways a name arrives — written in markup, carried by a record, passed to `emptyState()` —
and was falsified by hiding one drawing and confirming the gate names it. A second check
rejects a glyph key declared twice, which is how the set had carried two drawings of `x` and
only ever used the later one.

`Sukinnect.html` still loads reicon, and the file stays in the repository — deleting an LFS
object is not a step to take from a branch. The gate now fails the rebuild if it ever loads an
icon library again, and that check was falsified against `Sukinnect.html`, which it flags.

## 14. A third audit: the whole dataset, and the checks that were not looking

The gate walks one scripted journey through the machine and the instrument measures one
painted frame per screen. This audit asserted the same invariants across **every** seed
record instead — 13 bookings, 12 ledger events, 11 payments, 39 status events, 38 messages,
one case — and then read the rendered pages for what no assertion can see.

The first run reported 51 findings. **Thirty of them were the audit script's own wrong
assumptions**, and reporting those as defects would have been the actual failure: a greedy
thread regex (`-p` swallowed by `\S+`), a money identity that added the commission to the
customer's total (the fee comes out of the provider's share, so it never appears on the
customer's line), a debit/credit sign read the wrong way round, lifecycle rules that forgot
a case opens *after* the work is done, and an assertion that every booking must carry frozen
pricing when pricing is created at acceptance. The corrected script now reports zero, and
the trial balance closes to 0 centavos.

What was real:

- **A booking carried its arrival as a hand-written string, and the card printed it under an
  "Arrived:" label.** The seed filled that field with `Completed`, `Cancelled` and `Awaiting
  provider`; a live request wrote `Awaiting provider` into it and nothing ever replaced it.
  So a finished job read "Arrived: Completed", and a job the provider had genuinely marked
  arrived read the appointment slot — `4:00 PM` where the real arrival was `11:11 PM`. The
  field is deleted; the card reads `arrivedAt`, the stamp the machine already wrote, through
  one `clockText` formatter.
- **A case stored its lifecycle as sentences.** Nine comparisons matched `'under review'`, a
  guard and a toast lowercased a label into user copy, and the audit log recovered what had
  happened by splitting the status on its own em-dash. `DISPUTE_STATES` now holds codes with
  the words derived from them; `SCHEMA_VERSION` went to 9 so an old snapshot is discarded
  rather than half-read.
- **The provider profile counted cases with `d.providerId`, a field a dispute does not
  have.** It reported zero open cases for the one provider who has one, and would have
  reported zero for everyone for ever, because nothing throws.
- **The provider dashboard labelled a week "Today"** — every upcoming job, in record order,
  cut to three, so Monday's jobs sat under Today and a second Monday job was dropped with no
  way to reach it from the screen.
- **Two admin cards typed their statistics.** "Marketplace analytics" showed 82/68/74% under
  a "This week" chip, the last of them contradicted by the same screen (one case, open, none
  closed). "Operations workload" drew a donut of 18 items split 45/25/30 while four tiles
  above it counted 7, 3 and 1. Both now compute from the records and name their denominator.
- **The audit log invented an entry** — "September 10, 2026 · Maria Santos · Review in
  progress" — whenever no administrator had acted, and the same screen carried a search field
  with no handler, no id and nothing that reads it.
- **Trust & Safety stated a trend it cannot see** ("cancellation activity increased") in the
  card whose own caption says the pilot measured nothing, and claimed five reviews arrived
  within twelve minutes when the demo records carry no review times.

### The instrument was blind to a fifth class

Accessibility measured zero across 30 screens while four real gaps sat underneath it:
the focus ring was an enumeration of seventeen class names, so any control added later could
be Tab-reached and never seen; two fields set `outline:none` **inline**, which no stylesheet
can beat; one booking card was a `<div>` with an `onclick`; a toast painted and never
announced; and no screen had a heading at all, so a 30-screen app had an empty document
outline. All five are fixed, and the render pass now fails on an empty or placeholder
heading.

### Two mistakes of my own, both worth keeping in the record

**A scripted edit destroyed 23 titles.** Two `sub()` calls passed a replacement containing
`$1`/`$2` while wrapping it as `() => repl`, which suppresses `String.replace`'s capture
substitution — so `<h1$1>$2</h1>` was written into the file, losing the text inside. Four of
them had already been committed. The gate passed all 265 checks throughout, because it looks
for unbalanced `<div>` counts and painted `undefined`, and a placeholder heading is neither.
The titles were restored from the parent commit, the tool was fixed, and the render pass now
asserts that a heading has text and no `$n` in it — falsified by re-injecting the original
damage and watching it fail.

**A check that could not fail.** The first version of the schedule-order assertion passed
against a build with the sort removed: on the seed as it stands, record order already happens
to be chronological for today's jobs, so the check was measuring nothing. It now shuffles the
record array before rendering, and reports `1080 → 870` when the sort is taken out.

The gate is 271 checks. The instrument is still zero on all nine categories across 30
screens, with no console errors.

---

## 15. Fruit Harvest & Buy, and the two kinds of money

`SUKINNECT_MASTER_IMPLEMENTATION_PROMPT.md` asks for one new category and forbids almost
every easy way of building it: no second booking table, no wallet, no invented prices, no
new navigation tab, no certification the repository has no evidence for, and no produce
purchase counted as service revenue. The build is in five steps, each landed against the
gate.

**The offer is a child record, not a fourteenth booking state.** `OFFERS` hangs beside the
booking it prices. A job with an offer out is still `requested`, which keeps the machine the
only thing that moves a lifecycle and means an offer that goes nowhere leaves the record
exactly where it was. Every revision is kept and points at what it replaced, because the
question a dispute asks about a negotiated job is *what was offered, and what did they agree
to*. `answerOffer` deliberately does **not** transition: confirming the visit is the
provider's move and the guard on it is theirs to answer — a schedule the resident agreed to
alone is not a booking.

**Two legs, one rule.** `offerTotals` keeps labour and produce apart and never adds them
into a single figure for a single party; `offerDirection` says who pays whom.
`CONFIG.produceCommissionRate` is `null`, meaning *undecided*, and an undecided rate charges
nothing **and carries the reason with it** (`produceFeeUndecided`) rather than reading as a
generous zero. Accepting freezes only the labour leg. A purchase-only job therefore has no
service price at all, and the fee column says `No service fee` / `Price by offer` instead of
`₱0` — which is what seven screens would otherwise have printed, and `₱0` reads as *free* to
a resident and as *zero revenue* to a report.

**Zero is not a transaction.** `hasServiceMoney` now guards `authorizeBooking`,
`takeHolding`, `settleBooking` and `captureBooking`. Without it the first accepted fruit sale
would have thrown inside `assertBalanced`, which refuses a zero-amount line — a crash the
category would have caused by existing, not by being used wrong. This is not a fruit branch:
any trade could have a free job.

**A request that was answered does not lapse.** `applyDueTransitions` expires a `requested`
job after `acceptTtlMinutes` of silence from the provider. A provider who replied with a
price did not stay silent, so the window now skips jobs carrying an open offer; an offer
expires on its own `validUntil`, which is a different clock belonging to a different record.

**Home orders by motion, not by timestamp.** The card's own comment has always said a job in
motion is the reason the app was opened, while the code sorted on recency alone — so a
nine-minute-old request would have pushed the plumber standing in the kitchen off the top of
the screen. `IN_MOTION` ranks ongoing/arrived/en_route first. The falsifier had to be
retargeted afterwards: the mutation that used to break this could no longer be expressed.

**Category behaviour is metadata.** `CATEGORY_DEFAULTS` gives every category a behaviour
record — modes, pricing models, request fields, capabilities, safety rules, matching rules,
commission basis — and the fruit row overrides it. The request sheet asks *what do you want
to happen* only when a category resolves to more than one mode, and the fields that follow
come from `requestFields`. The six original trades resolve to one mode each and are asked
nothing new; their sheets are unchanged.

**Capability is declared, not issued.** `fruitCapability` sits on the provider record. The
profile card is titled *what Erning says they can do*, lists equipment and a working-height
band, and closes with "Sukinnect has not inspected any of it, and this is not a safety
certificate". `Barangay Endorsed` was removed from the harvester's badges: on a climbing job
that reads as *someone verified they can do it safely*, and nobody has. A provider outside
their declared modes is shown why and still allowed to refuse — the refusal is theirs to
make, not a rule the platform invented.

**The provider demo can be a different provider.** `CURRENT_PROVIDER_ID` was a constant,
which quietly meant the provider app could only ever be one plumber's app — so a category
with its own provider-side flow could not be seen at all. It is now a `let` chosen at
sign-in (`ramil@demo.ph` or `erning@demo.ph`), it travels in the snapshot with the profile it
belongs to, and a reset returns to the shipped persona. One shell, one set of screens.

**The operator sees two numbers, never one.** `intelligenceStats` reports produce beside
services with a card that states the exclusion in words ("not in the total above… the
platform never held that money"), and a gate check asserts that folding produce into
`grossCentavos` breaks it. A new Categories surface reads the live catalogue back to the
administrator — modes, pricing models, commission basis, declared capabilities, safety rules,
supply against 30-day demand — and says plainly that editing them is not available, because
those decide how money moves and are still being validated.

### Two things that went wrong and what caught them

**A ₱800 service fee invented onto a fruit purchase — found only by walking the flow.**
Every unit check passed. `answerOffer` correctly froze nothing for a zero-labour offer, the
guards correctly posted nothing, and the fee column correctly said `No service fee`. Then the
provider confirmed the visit, and `onAccept` — written long before this category — found
`!booking.pricing` and did the only thing it knew: freeze a price from the provider's listing.
Erning lists "Harvest one fruit tree" at ₱800, so a job negotiated as a pure purchase was
charged ₱800, authorized it, and settled it to the ledger on completion. The fix is one branch:
a booking that carries an `offerId` already has its money agreed, and agreeing nothing means
charging nothing. Three checks now walk offer → accept → confirm → complete and assert the
ledger stays empty; reverting the branch fails all three.

**A payload inserted into the wrong array.** The providers block was anchored on the comment
`people who ask for work`, which sits under `NOTIFICATIONS`, not `PROVIDERS`. The file simply
stopped parsing — `node --check` on the extracted script body named the line within seconds.
Lifted out verbatim by a repair script rather than retyped, so a hand-copied provider could
not silently differ from the one that was reviewed.

**A falsifier that died mid-run and poisoned its own backup.** The mutation harness printed an
arrow to a Windows console that could not encode it, crashed with a mutant still applied, and
the next run took its "pristine" backup from the mutated file. The gate then reported green on
a file that still carried an injected `attemptTransition` inside `answerOffer`. Fixed by
restoring from an in-memory copy inside a `finally` after every single mutant, and by never
trusting a restore that is not the last thing the script does.

### What is now measured, with the method

- `node tools/verify.cjs` → **320 checks passed** (271 before this work; +49 in a `fruit`
  suite, three of which walk the whole negotiated flow).
- Every new rule is falsified by mutating it in the real file and requiring the intended check
  to fail: **13 of 13 mutants caught**, each followed by a restore and a re-run green.
- `node tools/shot.cjs --measure` → **40 screens** at 390×844 and the other two sizes in app
  mode, plus the desktop shell: zero on all nine measured categories, no horizontal overflow,
  no console errors. Eight of those screens exist only to photograph the pilot: `fruit-sheet`,
  `fruit-harvest-sheet`, `fruit-offer`, `fruit-record`, `fruit-provider-dash`,
  `fruit-request`, `offer-sheet`, `fruit-harvest-job`, `fruit-provider-profile`,
  `admin-categories`, `admin-intel-produce`.
  *(That figure was wrong in the safe direction and §17 explains why: the table held 42
  entries and the tool measured 40, silently skipping two because a missing comma made the
  parser read one entry as a subscript on the other. Nothing was overstated; coverage was.)*
- `.qoder/tmp/fruit-journey-2.cjs` walks DISCOVER → CHOOSE MODE → DESCRIBE → REQUEST → ASSESS →
  OFFER → ACCEPT → CONFIRM → HARVEST → COMPLETE → RECORD as a person would, in both roles, and
  is what found the invented-fee defect above. It is not yet a gate suite; its three load-bearing
  claims are.
- Screenshots were read, not only measured. Three defects were found that way and are not
  measurable: an open offer sitting *under* a red destructive "Withdraw this request" button;
  an accepted offer whose status card still claimed "Waiting for Maricel to accept"; and a
  provider's job screen asserting "the client was shown your starting rate" on a job that
  shows no rate at all.
- The catalogue's arithmetic is on screen: 120 kg at ₱55/kg with ₱1,600 harvesting renders
  ₱6,600 / ₱1,600 from the same `offerTotals` the acceptance path uses.

---

## 16. The owner decided the produce-fee rule, so the code stopped guessing at one state

Asked whether the platform should charge on the fruit itself, the answer was **only on
Harvest + Buy**. That is a different shape from what was built: the implementation had one
axis — *is there a rate?* — and the decision has two, *which mode may be charged* and *is a
rate set yet*. Collapsing them is what would have made a straight sale look like it was
waiting for a number.

So the fee now has **three states, named in the data and worded apart on every screen**:

| state | when | what a resident reads |
|---|---|---|
| `charged` | Harvest + Buy, rate set | "Sukinnect took ₱X on the fruit part" |
| `undecided` | Harvest + Buy, rate still `null` | "a rate … is still an open decision, not a settled rule" |
| `not-charged` | a straight sale, any rate | "charges nothing on a straight sale … by decision" |

`offerTotals` is now the only place the rule lives. `answerOffer` was recomputing the fee
from `CONFIG.produceCommissionRate` a second time — the same duplication the audits keep
catching — and now reads `produceFeeCentavos` and `feeStatus` off the one decision instead.
The admin intelligence card likewise reads the state **off the jobs in the window** rather
than off the configuration, because a window of straight sales is decided-none even while a
rate is unset for the combined case.

Two things worth keeping in mind about what did *not* change: the rate itself is still
`null`, because the owner decided **where** a fee may apply, not **how much** — inventing a
number would have been the one thing that decision did not authorise. And the seeded demo
offer is a `sell_fruit`, so the shipped state you walk into is `not-charged`, which is the
case most likely to be misread as a bug rather than a rule.

Verified: **322 checks passed**, up from 320, with the three checks that encoded the old
single-axis rule rewritten rather than deleted. **15 of 15 mutants caught**, including two
new ones — dropping the mode gate, and making an unset rate silently fall back to the service
rate — which is the failure this decision makes possible. All three scratch suites
(seed sweep, resident probe, end-to-end journey) were updated to the new semantics and pass.

---

## 17. Walking the paths the demo does not ship

Asked whether anything was left, the honest answer could not come from re-running the
green gate — a check only reports on the state it can reach, and the shipped demo reaches
one state per record. So an audit was written for the *unwalked* paths: what happens to an
offer when its job is declined, lapses or is called off; what a harvest-and-buy looks like
when it actually completes; what Home says when the offer's booking *is* the active job.

**Twelve findings, four of them real defects.**

**An offer outlived its request.** A provider declining a job left the offer `proposed`, and
`answerOffer` happily accepted it — writing a produce payment onto a cancelled booking. The
button was hidden because the card checks the status, but *hiding is not refusing*: any other
path could still have answered a dead request. `closeOpenOffers` now runs on every machine
move, recording *why* each offer closed, and `answerOffer` refuses a booking that is not
`requested`.

**A called-off job kept claiming a payment.** The same walk, one step further: the resident
had agreed a price, the buyer then cancelled, and the record still read *"Fruit you were paid
₱2,090 · settled on site"* with a payment chip of *Fruit settled* — money that never changed
hands, asserted in the past tense. `voidUnsettledProduce` marks the agreement void on
`cancelled`/`expired`/`no_show`; the heading becomes *"Fruit agreed at ₱2,090"*, an amber
notice says the visit was called off and nothing was bought, and the chip reads *No payment*.
The agreement stays on file — only the claim goes.

**A deadline the UI printed and the model ignored.** `offerCard` renders "valid until …" and
nothing anywhere honoured it, so an offer could advertise an expiry that never arrived while
its request sat open forever (the accept-window exemption means an open offer stops the
lapse clock). The comment even claimed offers expire on `validUntil`. `applyDueTransitions`
now closes them first, before the accept window is evaluated — so a request whose only offer
expired is correctly unanswered again.

**Home went quiet on the one booking that needed it.** The needs-answer card deliberately
stands aside for the active job, and the active card quoted `stateHint('requested')` — "the
provider will answer". When the offer's booking *is* the active job, the one screen that
should say *your answer is needed* said nothing of the kind. The hint now reads from the
offer.

**A contradiction read off a screenshot, not a hypothesis.** After the cancel fix, the
voided screen still showed a header of CANCELLED above an offer card promising *"Maricel has
to confirm the visit."* No check would have caught it; the text was in the right place and
grammatically fine. The answered branch now says the visit was called off.

**The reference schema had no shape for any of this.** `schema/sukinnect.reference.sql` is
the document a backend gets built from, and it predated the pilot entirely. It now has an
`offers` table with the two legs as separate columns, and the produce columns on `bookings`
with `produce_fee_status` carrying the three states — because a rate that is undecided is not
a rate that was waived, and a schema that flattens them loses the decision.

Two of the original twelve were my own wrong expectations rather than defects: the harvest
leg freezes at the quoted ₱1,600 with the fee taken from the provider's share (I had expected
₱1,760, which would have broken the rule the money model is built on), and the expired-job
probe hand-moved the offer array around the sweep instead of passing a deadline.

Verified: **330 checks passed**, up from 322, with eight new lifecycle checks — each written
*after* the fix and then falsified. **21 of 21 mutants caught.** All four scratch suites
(seed sweep, resident probe, end-to-end journey, edge audit) pass, the edge audit reporting
*no defects in the unwalked paths*. A `fruit-voided` screen was added to the camera so the
new state is photographed rather than assumed.

### The measurement tool was quietly under-reporting its own coverage

Adding the voided screen is what exposed this: the camera kept reporting "across 40 screens"
while its table held 42 entries, and the new screen simply never appeared. Two causes, both
in the tool rather than the app.

**A missing comma that JS refused to complain about.** The last entry of `SCREENS` ended
without a comma, so the entry after it was parsed not as an element but as a *subscript* on
the previous one — `['empty-search', …]['fruit-record', …]` — which evaluates to `undefined`.
`node --check` passed, because the file is valid JavaScript; the array is just wrong. Any
screen added after that point would have been silently unmeasurable, and the count it printed
looked like a fact.

**Screens that mutate state are not independent.** The run is one page session, so
`fruit-record` answering b8's offer left nothing for `fruit-voided` or `admin-intel-produce`
to answer — the tool caught and reported each as `SKIP`, but the skip lines were being lost
in the noise of a grep that only asked for failures. A screen that reports nothing and a
screen that passes are indistinguishable in a filtered log, which is how this survived three
full sweeps.

The fix is twofold: the mutating screens now call the app's own `resetDemoData()` before they
set up, so each photographs the state its name claims, and they sit at the end of the table so
they cannot dirty the screens before them. A check that evaluates the array literal and
reports malformed or duplicate entries accompanies it. **42 screens, all measured, zero
skipped.**

---

## 18. The weighing: the last link of the pilot's own chain

The brief's fruit loop is `HARVEST/COLLECT → FINALIZE QUANTITY → SETTLE`, and the build had
stopped one step short of the end. A buyer who agreed *about 120 kilos* and carried 31 had
nowhere to record the difference, so the only figure on the job stayed an estimate nobody had
weighed — and the receipt, the operator's fruit total and the resident's row all repeated that
estimate as if it were the transaction.

**The rule that kept this from becoming a second pricing sheet:** a weighing applies the
*agreed unit price* to the *actual quantity* and sets nothing. The rate is printed on the sheet
with no field beside it; a lot priced *as a lot* keeps its figure whatever it weighed, because
"for the whole lot" was the agreement; and the service leg is not touched at all — it was
frozen when the provider confirmed, and a scope that genuinely changed is a new offer, not an
edit to an accepted fee. `produce.final.serviceLegChanged: false` is stored so the claim is
part of the record rather than a comment. A correction replaces the reading and keeps the one
it replaced.

**Writing the check for a correction surfaced the freeze bug.** The fruit fee was being
re-derived from `CONFIG` at record time, so an admin who decided a rate *after* two people
agreed would reach back and charge a job that was settled under the old answer — the exact
thing the service leg's freeze exists to prevent. The accepted offer now copies its rate onto
the produce record (`unitPriceCentavos`, `feeRate`), and a weighing prices the real amount at
*that* rate with the fee's **state inherited, never re-asked**. `SCHEMA_VERSION` went to 12,
because a dump written before this has no rate to price a measurement with and would silently
have agreed with whatever was typed.

**One rule, two callers.** `offerTotals` had grown the fruit-fee arithmetic inline and the
weighing needed the same rule; two places applying a rate is how one of them ends up
disagreeing (65). The rule is now `produceFeeOf(mode, amount, rate)` and
`produceFeeState(mode, amount, rate)`, with the rate passed in because the platform's *current*
rate and the rate *frozen on this booking* are both legitimate questions. `offerTotals` reads
identically to before — the three-state checks that already existed are what prove it.

**The camera found three things the gate could not see,** on a job walked to `arrived` — the
state no shipped demo record is ever in:

- The offer card still said *"Erning has to confirm the visit"* under a header reading
  **ARRIVED**. §17 had fixed the opposite case (a called-off job promising a visit) by testing
  for the closed statuses, which left every *open* one claiming a confirmation that had
  already happened. The card now reads the status in three directions.
- The fruit row asserted *"Fruit you were paid ₱1,705.00"* while the visit was still running.
  Money that settles on site is not past tense at 10:07 AM. It now says *you are being paid*
  until the job finishes, and the weighing made the claim specific enough to notice.
- The weighed card's headline and its caption were the same sentence, so the figure the
  provider had just typed appeared twice in a card with room for one of it.

A fourth, unrelated, fell out of the same screenshot: a button labelled **"Chat Pro"** — a
truncation somebody had left in the markup years of renders deep. It names the provider now.

**A mutant caught a bug the checks had written but never run.** The sheet prefilled its field
by rounding the stored grams to whole kilos, so a reading of 29.5 kg reopened as 30 and saving
it again moved the record by half a kilo. The prefill now carries the exact figure.

**Falsification.** Twenty-six targeted breaks — reprice at CONFIG, ignore the agreed rate,
re-scale a lot, drop the rate from the record, delete each guard, un-inherit the fee state,
re-freeze the service leg, silence the thread, keep the estimate in the row and in the
operator's total, unmount the card, sever the route, repeat the headline, promise a
confirmation, speak in the past tense — each run against the real gate with the file restored
from memory in a `finally`. All twenty-six were caught and none survived. Four more matched
nothing the first time and had to be rewritten: one because the app file is CRLF and a
find-string carrying a newline misses every time, two because the one-line anchor I chose
appeared twice — which is itself the proof that the sheet and the model share the expression —
and one because I had fixed that line in between.


## 19. Auditing the audit: what the weighing step did not yet prove

Asked to check the whole body of work, the useful question was not "is the gate green" — it is,
and that fact has already been shown to be insufficient twice. The question is which claims in
the last commit are **stated but not tested**, and which rules the tests themselves get wrong.

**Two states were untested, and both work.** A reading surviving a reload, and a job that goes
into dispute *after* its weight was recorded, were probed by hand first: both behave (the
reading, its unit price and its frozen rate round-trip through `hydrate`; a disputed job hides
the card, refuses a new reading, and stops claiming the money has been paid). Neither had a
check, so both now do — a feature that works and is not tested is a feature that will quietly
stop working, which is the exact failure this repo has already been caught out by once.

**The bug the audit found was a real one, and it was mine.** A scale reads in grams; the field
asks for kilos. Feeding the model 999,999 kg priced the job at ₱5.5 **billion** and nothing on
the screen noticed. The fix warns rather than refuses — a cap would be an invented rule, and the
two people on the site know the load while the platform has not stood under a tree — so the
sheet now says *that is more than double the estimate of 120 kg; check you weighed in kilos, not
grams; this is the figure they will be paid*, in amber, directly under the difference it is
about. A new screen state, photographed and measured: `finalise-warn`.

**The first version of that rule was wrong in the opposite direction, and only the mutants
said so.** It warned on *any* reading further than half from the estimate — which fires on 31
kilos against an agreed 120, the ordinary story of a standing tree and the single case the
whole step exists for. It also survived a mutation that turned it into "warn on any difference",
because no check tested the band between the estimate and double it. Both are fixed: the rule is
one-directional now, and the checks pin 200 kg as a good season and 300 kg as a unit error.

**Two things were left alone deliberately.** A free-text note on a weighing is uncapped, because
nothing in this file is capped — the offer note, the case reason and the booking request are all
open text, and a limit on one field would be an inconsistency dressed as a fix. And two message
sinks render `${m.text}` unescaped in the provider's *next step* card; they are safe today
because the only strings reaching them are written in code, so they are recorded as a latent
hazard rather than patched blind — the note itself is escaped on every path that actually
carries it (chat bubble, thread snippet, produce row, thread message).

Gate **379 checks**, camera **46 screens**, clean at 360×640. `Sukinnect.html` still
byte-identical to `main`.

## 20. Running the handset pass at a desk

Asked to start verifying `DEVICE-PASS.md`, the first thing the check found is that no device is
attached to this machine — so the pass itself cannot run here. What *can* run here is everything
on that list whose cause is in the page or in the shell's own source, and separating the two is
the difference between a 20-minute phone session and an afternoon of guessing.

**One real defect, found and fixed.** The admin's search field on verified providers was the only
`oninput` handler in the app that calls `render()`. A re-render replaces the markup, so the
element the reader typed in is detached and focus is lost — which on a phone means the keyboard
closes after a single character. `render()` already promised the opposite (§46, §79: an in-place
action must not feel like a reload) and already restores scroll across a re-render, so the fix is
the same trick one line further on: capture the focused field and its caret position before the
rebuild, put both back after. Proven by mutation — with `restoreTyping` removed the probe reports
`keptFocus: false`, with it in place `true`, and the old node is reported as replaced either way,
so the check is not passing by accident.

**Seven fields had a visible label that was never associated with them.** The booking sheet's
"what needs doing", the concierge box, the results search, the admin's verified-providers search,
two internal admin notes, and the seven per-category rate fields — whose only name was a sibling
`<span>`, so a screen reader announced "spin button, 15" with nothing to say which trade. Fixed,
and the instrument now checks it against the browser's own `el.labels` rather than a text scan:
`form controls a screen reader cannot name: 0`, and a separate informational count of
placeholder-only names, which is also 0.

**Two answers came from the shell's source, not from a phone.** `setDomStorageEnabled(true)` and
`setBackgroundColor(#F1F5FF)` settle the storage and white-flash items as far as code can; a
`tileerror` handler, a painted-tile count and a hard 4-second timeout settle the map's offline
handover. And two defects are now certain rather than suspected: the page pushes **no** history
entries, so hardware back quits the app from inside every modal; and `MainActivity` sets a
`WebViewClient` with **no `WebChromeClient`**, so `onShowFileChooser` does not exist and *both*
photo controls — the fruit request's and the Concierge's, which the checklist never named — open
nothing. Those two are decisions for the owner, not fixes to make quietly: one changes navigation
behaviour, the other belongs to a project outside this repository.

**The probe was wrong before the app was.** Its first version compared `document.activeElement`
against the node it had held on to — and a re-render detaches that node, so it could only ever
answer "lost", whether the page was broken or fixed. It also reported `nodeSurvived: true` for the
same field, because it fell back to the detached reference when there was no id to look up. Both
were rewritten to ask the live document instead. `tools/probe-caret.js` is committed so the class
of bug has an instrument; the geometry probe that measured thumb reach, sheet footers at a
keyboard-height viewport, and `inputmode` coverage stays a scratch tool because it asked questions
this list will not ask twice.

Gate **379 checks**; instrument now reports eleven tallies over **46 screens**, all zero, at
360×640. `Sukinnect.html` untouched.

## 21. Back, the picker, and what a stub cannot prove

The four decisions put after the desk-verification of the handset pass were: close the Back
defect page-side, implement the file chooser in the shell, sync the device assets, and escape the
two latent text sinks. All four are done; the interesting part is what it took to believe the
first one.

**Back now means something.** The page keeps one history entry while a layer is open and one
while you are off a root tab, and spends them in that order — close the sheet, then leave the
drill-in, then leave the app. A sheet dismissed by tap spends its own entry, flagged so the
`popstate` it causes is not misread as the user pressing Back; without that flag, closing a sheet
on a drill-in would throw the reader out of the screen they were still looking at. Tab-to-tab
moves record nothing, because a tab switch is a move sideways and Back should leave, not retrace
every tab tapped since launch. Where Back lands is the last root tab actually stood on, per role,
so a provider who came from the FSM returns to the FSM and never to a resident screen.

**The Node harness had to grow a browser feature to test any of this.** It had no `history` and
its fake `window` dropped every listener, so the app's history calls would simply have thrown.
The stub records what was pushed and fires `popstate` on `back()`, which is what makes 14 checks
possible — and it is also the limit of what it can prove, because **a stub fires `popstate`
synchronously and a browser does not.** That difference is precisely where this design could
break: our own `back()` on tap-close arrives later than the render that caused it, and if the
flag has not held, a user who dismissed a sheet is navigated away from the screen they are
reading. So the behaviour was driven in real Chrome as well, pressing Back for real and awaiting
each `popstate`: first press closes the sheet and keeps `provider_detail`, second leaves the
drill-in and returns home, and the tap-close path leaves no dead entry that does nothing. Five
mutations of the mechanism — drop the flag, drop the layer term, drop the depth term, close the
layer without re-rendering, and count an open chat as a root tab — were each caught.

**That last mutant is a bug the checks found before it shipped.** `stepBack()` asked whether
`state.tab` was a root tab, and an open chat sits *on* the Messages tab, so Back reported "nothing
left to undo" while a room was on screen. The definition of "on a tab, not inside something"
existed twice in the file and had quietly diverged; it is now one function both `render()` and
Back call.

**The shell grew a file chooser.** `onShowFileChooser` now hands the page a real picker and — the
part that is easy to miss — answers `null` when the user cancels, because a callback left pending
disables the input for the rest of the session. It compiles clean against `android.jar` API 34,
which is the strongest claim available on a machine with no phone attached, and the doc says so in
those terms rather than implying it was tested.

**And the reason any of this was invisible for so long: `.gitignore` line 2 is
`Sukinnect-Android/`.** `git ls-files Sukinnect-Android` returns nothing. The whole Android
project — the shell, its manifest, the bundled HTML — is unversioned, exists only on whichever
machine edited it last, and cannot be reviewed, diffed or cloned. A dead photo button survived
every audit this session because no audit could see the file it lived in. Whether to track the
shell is a real decision and is recorded as one, not made sideways.

Gate **393 checks**; instrument all eleven tallies at zero across **46 screens** at 360×640;
`Sukinnect.html` still byte-identical to `main`.

## 22. A design audit, and the difference between consistent and correct

All 46 screens were shot fresh at 390×844 and counted in the painted DOM — gradients per screen,
card kinds, chip and stat density, button roles, logo uses, prose weight, service-colour
saturation — and then read. The instrument has measured this app's legibility for a while and
reports zero on everything it can see, so this pass was about the things it cannot: whether the
design has a hierarchy, whether it repeats itself, and whether the documentation still describes
it.

**What holds up, with numbers.** 85 gradients across 46 screens, and exactly **one of them is on
a card** — §32's discipline is real, not asserted. The logo appears 3 times in the whole app
(splash and the two sign-in states) and nowhere else, which is what §10 asks. Zero emoji. Ten
distinct painted font sizes, all on the scale. Home's 208 saturated non-blue accents are all tile
artwork, which §45 sanctions and which reads as secondary because brand blue still owns the
search button, the navigation and the progress rail.

**Four objective defects, fixed.**

- **The resident's booking detail hand-rolled a header the provider's screen got from a shared
  helper.** Result: one screen, two names — `Booking Details` in Title Case on a `<div>`,
  `Booking details` in an `<h1>` on the other side of the same booking. Migrated onto
  `screenHeader()`, with the status chip moving into its `action` slot. Verified against a
  screenshot: same gradient, same bar, one fewer way to be wrong.
- **The receipt said "How it was paid · GCash (0912**\*\*6789)" three rows under "Held, not yet
  paid."** Past tense for money that has only been authorised — the same class of defect §17 and
  §19 chased down the produce row and the offer card, surviving here because no one had
  photographed a held booking. The label now follows `isSettled()`: *Paid with* or *To be paid
  with*, checked against both states of the demo data. The first attempt at the wording was
  three characters longer than what it replaced and pushed both halves of the row onto two
  lines, which a screenshot caught and the shorter label does not.
- **The admin dashboard stated two of its own numbers twice.** "Cases open for review — 1" in the
  queue and "Cases open — 1" in the stat grid; the same for applications. A check existed here
  that enforced agreement between the two copies, and it is the wrong rule: a fact written twice
  can only ever be consistent or contradictory, while a fact written once cannot be either. The
  duplicate tiles are gone and the check now asserts the duplication cannot return. The heading
  over them said "This week" above counts taken from every demo record with no date filter
  anywhere, so it says what they are.
- **The chat room had no heading**, and AGENTS.md §31 claimed every screen title was an `<h1>`.
  That sentence has now been found false three separate times in three different numbers, so the
  claim moved out of the prose and into the screens pass, which fails if any app screen paints
  no `<h1>`.

**What the audit found and did not touch, because it is judgment about a brand that is not
mine.** The provider list renders four or five identical full-width primary buttons, so §70's
pecking order collapses on the one screen with the most of them; Home's **Answer** and the list's
**Normal** / **Credentials: Valid** are large pills that look tappable and are not, which is the
same ambiguity from the other side; the booking detail is a card containing four cards; and five
screens carry 275–390 words. Those are redesigns of screens already approved once, and one such
"improvement" has been reverted before, so they are listed in this file rather than applied to
it.

Gate **394 checks**; the instrument adds a twelfth tally (form controls with no accessible name,
and a separate informational count of placeholder-only names), both zero across 46 screens at
360×640 and 390×844. `Sukinnect.html` still byte-identical to `main`.

## 23. Verification sweep across everything, and a claim that could not be checked

Everything built since §18 was re-verified end to end rather than assumed still working: the gate
(394 checks), a syntax pass over every tool and the extracted application script, the layout
instrument over all 46 screens at 360×640, 390×844, 412×915 and desktop, the git state, and the
device-assets identity. A falsification sweep then broke six invariants on purpose — the ledger's
balance assertion, the fruit rate's freeze, the weighing's status guard, the `popstate` listener,
the receipt's tense, and `screenHeader`'s `<h1>` — and all six were caught, so the instruments are
not merely green, they are still connected to the code.

**The one real finding was in the documentation, and it was a claim nobody could check.**
`Sukinnect.html` was described as "byte-identical to main" in AGENTS.md and three times in this
file. It is not, and cannot be, on Windows: `.gitattributes` says `* text=auto`, so git stores LF
in the object and checks out CRLF, and the working file's 4,706 CRLF pairs make its md5 differ
from the blob's while their content is identical. The statement was true in intent and false as
written — and the obvious way to verify it, hashing the file against `git show main:Sukinnect.html`,
returns a mismatch, so an auditor following the claim literally would conclude the shipped file had
been edited when it had not. §31 now says *identical to main* and gives the command that proves it
(`git diff --quiet origin/main -- Sukinnect.html`), and warns that the same normalisation applies
to every text file here. `DEVICE-PASS.md`'s assertion count was also one behind.

This is the fourth time this project has caught its own prose drifting from its code — after the
token counts, the glyph counts and the "every screen title is an `<h1>`" claim. Three of those four
were fixed by moving the assertion out of a sentence and into a check. This one cannot be checked
by the gate, because it is about git's storage rather than the page, so it is fixed by naming the
command next to the claim every time.

**What this sweep did not re-do:** the domain audit behind §12–§14 was not repeated from scratch,
and the design findings §22 lists as deliberately unapplied — the provider list's identical
primary buttons, the pills that look tappable, the nested cards, the prose-heavy screens — remain
open by choice, not by oversight.

**Then the shell was actually built.** The file chooser had been compile-checked with `javac`
against `android.jar`, which proves the syntax and nothing else. A real `:app:assembleDebug` with
the cached Gradle 8.14.3 finished in 50 seconds, and the artifact was then opened rather than
trusted: the `assets/Sukinnect.html` inside it is byte-identical to the current rebuild (so the
phone will run the weighing step and the Back handles, both confirmed present in that copy), it is
*not* the shipped file, and `classes.dex` carries `setWebChromeClient`, `onShowFileChooser`,
`onReceiveValue` and the chooser's own label. The build left no repo files, because
`Sukinnect-Android/` is gitignored — which is also the reason the project has no gradle wrapper:
nothing inside that directory is versioned, so nothing was ever forced to become reproducible. The
build recipe, the wrapper gap and the expected `onBackPressed` deprecation are recorded in
`DEVICE-PASS.md`. The remaining step needs a phone; everything that did not, now has been done.

## 24. The Grab-inspired brief, a plan first, and the two defects inside it

`SUKINNECT_GRAB_INSPIRED_VISUAL_REDESIGN_PROMPT.md` arrived with an operating rule: investigate,
write the proposal, stop. `SUKINNECT_VISUAL_REDESIGN_PLAN.md` is that proposal. The owner approved
**P0 (static category art) and P1 (chart honesty)** and deferred the taste-sensitive phases. The
brief's own baseline was checked rather than trusted, and one premise was already stale: it warned
that the rebuild "should not need `reicon.js`", which it stopped needing in §20.

### P0 — the artwork was moving

A live `getComputedStyle` probe of the painted Resident Home reported **33 infinite animations**
across the seven category tiles, three to four moving parts per tile. The prompt's non-negotiable
rule was being broken on every open of the app's front door. Reduced motion already froze them
(`iteration-count:1`, duration `1e-05s`), which is an escape hatch for people who ask for one — not
a licence to move artwork for everyone else.

The file had also been arguing with itself. `:355` said *"The category scenes move"* and `:393`,
four declarations after the rules that make them move, said *"The scenes are still."* One of those
sentences had been written and never reconciled with the other.

Removed: 14 `@keyframes`, the 15 `.cat .ca-*` animation rules, the `transform-box` rule that existed
only so a rotating drum would not orbit the tile, the 26 animation classes and 4 `animation-delay`
styles inside `CAT_ART`, and every transform that moved the tile or its art — including the
`.cat:hover .art{scale(1.08)}` and the pressed `scale(.96)`, which carry the illustration with them.
The pressed state is now edge, shadow and fill. The `@media (hover:none)` block lost two selectors
that had become dead.

Freezing then exposed four marks whose only meaning had been movement, and they went with it: a
twinkle that is now just a plus sign on the cleaning bottle, two dots that no longer rise off the
tutoring page, speed lines behind a parcel that stays put, and a second ripple ring stacked exactly
on the first. The grid reads cleaner than it did while animated — fewer parts, same information.

Four gate checks, each proven by breaking its rule: **5/5 mutants applied and caught**. The camera
gained a tally that counts moving category artwork in the painted page, because a source grep cannot
distinguish a class with no rule from a rule with a typo. That tally reported **7** when an animation
rule was deliberately re-added and **0** without it.

### P1 — three charts were saying things no record says

| Card | Was | Now |
|---|---|---|
| Weekly earnings | seven literal SVG points, a "+18% Growth" chip, a caption naming a ₱4,200 peak that appears nowhere in the drawing | eight real weeks summed from settled jobs, per-week values, the highest week labelled, a period on the chip |
| Demand by barangay | literal pixel heights 45/90/60/30 — the tallest bar measures **40%** of the drawn total while the caption asserted **58%** | counted from `BOOKINGS` in a stated 30-day window, with the count beside every bar and the total beneath |
| Where the earnings come from | a 65/20/15 donut of earnings by job type, and a booking carries no job type | deleted, not guessed at |
| Client feedback | pinned to `p1` whoever was signed in, drawing a confident 100%-positive ring from **two** reviews | reads the signed-in provider; below a five-record floor it lists the reviews and says a sample that small is not a distribution |

`MIN_SHARE_SAMPLE = 5` is the only new rule the app invents, and it invents it in the *restraining*
direction. Neutral series stopped borrowing the semantic palette: green and amber meant success and
warning on those cards only by accident.

Six gate checks. **The first run of the falsifier caught 3 of 4 applied mutants**, and the one that
escaped was the important one: the earnings reconciliation compared the helper against a filter
identical to its own, so when the demo data happened to contain no job that was stamped complete but
not settled, removing the status filter changed nothing the check could see. It now un-settles a
stamped booking inside the test and requires the series to drop — a value on each side of the line.
**6/6 mutants applied and caught** after that.

### Verified

`node tools/verify.cjs` → **404 checks passed** (394 before this work). `node tools/measure.cjs
Sukinnect-next.html` → 9,768 lines, one `:root`, 1,683 `var()` uses. `node tools/shot.cjs --measure`
→ 46 screens, no console errors, every defect tally 0 including the new motion tally.
`git diff --quiet origin/main -- Sukinnect.html` → the shipped file is untouched. AGENTS.md §31 and
§46 were corrected: §31 claimed the tiles "are drawn SVG with CSS motion", which is now a rule the
gate enforces in the opposite direction.

### Found and not fixed

- Two demo records carry `barangay:'Barangay 4'`, so every screen that prefixes the value renders
  **"Brgy. Barangay 4"**. A label defect in the data, not in the visual system, and outside the
  approved scope. Flagged, not touched.
- P2 (refine the seven scenes into one construction grammar), P3 (normalise nine icon sizes onto a
  scale, and `aria-hidden` on `ic()`), and P4 (shared chart helpers) remain unapproved. The
  direction for P2 is agreed; its execution changes how the app looks and needs a look at the
  before/after grid first.

## 25. The corrective pass: real rendered artwork, one readable font, and a chart system

`SUKINNECT_CORRECTIVE_VISUAL_REDESIGN_IMPLEMENTATION_PROMPT.md` opened by rejecting the last
approach: refining the same inline SVG a second time had produced a picture too close to the
original, and comment edits or renamed classes would not count as a result. It required
implementation in the same task rather than another plan. All three of its deliverables landed.

**Category art is now seven PNG files.** `CAT_ART` — 133 lines of hand-drawn SVG scenes — is
deleted, and `SERVICE_ART` maps each of the seven category ids to a file in
`assets/category-art/`: 256×256 RGBA, 634 KB for the set, rendered at the 60 px the tile draws,
so the source covers a 3× device. The tile markup stopped passing a background tint, because each
render carries its own plate. `catArt()` still falls back to the functional glyph for a category
with no file, and five new gate checks make that fallback unreachable in a shipped build: every
id has an entry, every entry exists on disk, paths are local relative PNGs with no CDN and no
base64, the `<img>` states its dimensions and stays out of the accessibility tree, and the old
scene table is gone rather than merely unused.

The art source was researched before it was chosen. **3Dicons is genuinely CC0-1.0** — confirmed
through the GitHub licence API, not a landing page — and its CDN serves valid 400×400 RGBA PNGs at
48.7 KB. It was still rejected: all 120 free slugs were enumerated and there is **no water, droplet,
tap, faucet or pipe asset and no fruit, apple, basket or leaf asset at all**, so the set cannot
cover the catalogue, and pairing five of its renders with two generated objects would break the
one-collection requirement. `ASSET-LICENSES.md` records the dimensions, byte weight, the exact art
direction used, and the reason for the choice — including the part that is uncomfortable:
generated imagery carries no third-party licence obligation but also an unsettled exclusive right,
which is the owner's call before any commercial release, not something to bury.

**Typography became one family.** Atkinson Hyperlegible Next is self-hosted from the official
googlefonts repository as four static WOFF2 weights, 100 KB, with `OFL.txt` and `AUTHORS.txt`
beside them; the licence has a Reserved Font Name, so the files ship unmodified. The trial was
measured rather than judged: switching the family alone produced **no clipped text, no contrast
failure and no horizontal overflow across 46 screens**, and grew total content height by 112 px —
about 2.4 px per screen. Fraunces is gone from UI headings: 12 declarations repointed to
`--font-display`. The scale floor moved from 12 px to 14 px (`--t-caption` 12→14, `--t-body-sm`
13→15, `--t-body` 14→16, `--t-body-lg` 15→17, `--t-lead` 17→18), and the distinct painted sizes
are now `[14,15,16,17,18,20,22,24,30]` — the 12s and 13s no longer exist anywhere. The cost is
stated rather than hidden: total scroll-past-fold across the 46 screens grew from 18,951 px to
23,418 px, about 97 px per screen, and the category grid sits further down Resident Home. Nothing
clips and nothing shrank back down, which is the behaviour WCAG asks for. The tokens are px, not
`rem`, so browser zoom reflows the app but an OS text-scale setting does not — a known limitation,
recorded in AGENTS.md §68.

**Charts became a system, and Chart.js was tested and declined.** v4.5.1 was loaded from a real
`file://` page in headless Chrome and it works — a bar chart with axes, ticks and gridlines in
about 87 ms. It still lost: 203.6 KB of UMD with no gzip available on the `file://` path, parsed
by all 46 screens to serve about six charts, and `render()` replaces `#screen`'s innerHTML, which
discards the canvas a live Chart instance is bound to. `chartColumns`, `chartBars`, `chartShare`
and `chartEmpty` now draw every chart in the app, with a labelled y-axis, a zero baseline, a value
on each bar, a legend showing counts as well as percentages, `role="img"` plus an `sr-only` list
carrying the same figures, and deliberate empty and low-sample states. The provider trio and the
admin workload ring and weekly chart moved onto it; the hand-styled `.bar/.barchart/.barcol/.barlbl`
CSS is deleted.

**Removing the admin weekly chart found a second fabricated visualisation.** A "Weekly bookings"
card on the same screen was drawing seven days of invented percentages from a typed array —
`62, 76, 54, 88, 100, 82, 46` — sitting directly beside the honest derived chart, and the two were
indistinguishable on screen. It is deleted rather than repaired, and a check now fails any chart
drawn from a literal data series. This is the same defect class §24 fixed on the provider
dashboard, which means the earlier "admin analytics are already honest" finding was true of the
helpers and wrong about one card.

**Three defects the instrument caught that would otherwise have shipped.** SVG text at
`font-size="10"` put 21 labels *under* the 14 px floor the same pass had just established.
`chartScale` drew an axis of `0 / 0.75 / 1` on a count of bookings per day — an axis that cannot
exist. And the new broken-image tally reported four failures that were actually OpenStreetMap
tiles still decoding, so it now requires `complete && no pixels`; a tally that cries wolf gets
ignored, which is worse than no tally. Each has a check, and the checks were proven by putting the
defect back — 2/2 applied and caught on the chart kit.

**Also found, by the tally that asks the browser what it requested rather than grepping the
source:** the app makes ~650 network requests across a 46-screen walkthrough, every one an
OpenStreetMap tile from `a`/`b`/`c.tile.openstreetmap.org`. Pre-existing, and DEVICE-PASS §77
already documents the `tileerror` handover — but it had never been measured, and it is the one
thing in the app that is not offline.

**Left as it is, deliberately.** `trending-up` and `pie-chart` are now drawn but unreachable,
having lost their only call sites when the donut card was deleted and the chart titles were
cleaned. They are not restored with decorative icons to satisfy a count. The chart titles carry no
glyph, which is the better design.

`node tools/verify.cjs` → **415 checks** (from 404). Sweeps clean at 390×844, 360×640, 412×915 and
under `prefers-reduced-motion`, 46 screens each, no console errors, no horizontal overflow, no
broken images. `git diff --quiet origin/main -- Sukinnect.html` → the shipped file is untouched.

**Where the evidence is, and how to get it back.** `.shots-before/` and `.shots-after/` hold all 46
screens either side of this pass, and `.shots-compare/` holds labelled before|after stitches of
Resident Home, the provider dashboard and the admin console. All three are gitignored, so they are
scratch: they exist on the machine that made them and nowhere else. The "before" set was rebuilt by
checking out `6f9bf45` — the last commit before this brief — capturing it, and restoring `HEAD`, so
it is the real prior state rather than a description of it. Reproduce any of it with
`node tools/shot.cjs --measure --out=.shots-after` and, for the pair,
`git checkout 6f9bf45 -- Sukinnect-next.html fonts/` before capturing `.shots-before`.

## 26. Post-corrective audit: a floor the charts were breaking, and a fold the type pass had cost

A fresh audit of the state §25 shipped, since that pass replaced the artwork, the whole type scale
and every chart at once. Two defects, one of them mine and one of them an instrument blind spot.

**The 14px floor did not apply inside charts.** SVG text is drawn in viewBox units and scaled to the
element's width, so a chart declaring 14px *paints* 13.3px on a 360px phone. Every HTML string had
been moved above the floor while every chart label sat below it, and the off-scale-font check could
not see this because it reads computed style, which always reports the declared value. Chart text
now declares 15 units and the svg is capped at its viewBox width so it never upscales: 14.3px at
360, 15px above that. The camera gained a tally that computes `declared × (rendered width / viewBox
width)` for every `<text>` — it reports 10 when the old size goes back and 0 with the fix.

**The type pass had pushed the category grid entirely off screen.** Measured against the bottom nav,
not the viewport edge, at 390×640: before any of this the grid started at y=510 with three tiles
peeking above the nav; after §25 it started at 585 with **zero visible** — the app's main discovery
affordance required a scroll on every phone shorter than 844px. The brief had explicitly warned
against this. Whitespace tightening alone recovered 13px of the 88, so the owner chose to compact
the two status cards rather than reorder the screen or shrink the art.

Active booking and Needs your answer are now one `.homerow` each — avatar, title, sub-line, status
chip — with the stage dots and payment chip on their own line, and the next-step sentence dropped
from the card. The grid top went from 585 to **487**, which is 23px higher than the original, and
three tiles peek above the nav again. A fully visible row at 360/390 was never true on this app and
is not claimed; that would need the reorder that was declined.

Two bugs the compaction itself introduced, caught by looking at the render rather than at the diff:
single-line ellipsis truncation was severe enough that "Kitchen faucet keeps leaking" read as
"Kitchen faucet keep…" and looked broken, so the title now clamps to two lines; and the stage dots
disappeared entirely, because their spans are `flex:1` inside a `.mini-steps` that had become a
flex item with no basis and was collapsing to zero width — it now gets `flex:1 1 96px`.

Left alone by choice: `trending-up` and `pie-chart` remain drawn but unreachable, per the owner's
answer — they are not being re-added as decoration to satisfy a coverage count.

`node tools/verify.cjs` → **415 checks**. Sweeps clean at 360×640, 390×844 and 412×915 and under
reduced motion: no clipped text, no tap targets under 44px, nothing under the nav, no horizontal
overflow, no broken images, no chart text under the floor.

## Deliberately not done




- **No server, no database, no framework, no CSS library, no ES modules.** The Android shell
  loads the page from `file:///android_asset/`, where module scripts are blocked by origin
  rules; the single-file architecture is also what AGENTS.md §11 and §88 protect.
- **No real payment gateway.** `MockGateway` implements the seam; no network calls.
- **No stored-value wallet, no resident balance.** The customer's money is an obligation
  until the job is delivered, and is labelled that way.
- **No invented rates, tax positions or traction.** Everything numeric is a config value
  labelled as a pilot assumption, a demo record tagged `demo`, or a sum over entries.
- **No fruit market price, and no produce commission.** `CONFIG.produceCommissionRate` is
  `null` and stays that way until the business decides it. The offer sheet's price fields are
  blank; a provider types a number, the prototype never suggests one.
- **No counter-signature on a weighing.** The person who carried the fruit records it, and the
  other side sees the figure, the sentence in the thread and the agreed number beside it — but
  there is no "accept this weight" step, and no second reading. A resident who disagrees with
  31 kilos raises a case on the booking, which is what the dispute path is for; a prototype
  that made the buyer's scale authoritative would be inventing an evidence rule the pilot has
  not tested. **Asked directly on 2026-10-07, the owner chose this over the two alternatives**
  (either side may record, last reading wins; or a second child record so a weight is agreed
  only when both answer), so it is a decision and not a gap. If a real pilot needs the weight
  attested, that is a child record beside the booking like an offer — not a fourteenth booking
  state, and not a flag on `produce.final`.
- **No certification, endorsement or safety verification for the pilot.** Capability is
  displayed as the provider's own declaration. `Barangay Endorsed` is not on the harvester's
  badges, and no screen implies Sukinnect inspected a harness, a ladder or a tree.
- **No photo upload for fruit requests.** The form keeps the file's name and size on the
  device and says so; a data URL would put a resident's photograph into the local snapshot,
  which §56 protects and this prototype has nowhere honest to send.
- **No delivery, scheduling or reminder automation.** A lapse and an auto-confirmation are
  evaluated when the app is opened, because a closed tab runs nothing and there is no cron.
- **No read receipts or delivery status on messages.** A thread says what was written and by
  which side; it does not claim anybody saw it. Which threads a device has read is one local
  marker, not a record.
- **`Sukinnect.html` is still the shipped file,** and `Sukinnect-Android/app/src/main/assets/`
  still holds a separate copy. Promotion and re-syncing are a decision, not a step.

---

## 27. Full audit: typed text that became markup, and a screen no instrument had ever seen

The brief was "check if there is more to address". The instruments said no: gate 415/415, and a
camera sweep at 360×640, 390×844 and 412×915 reporting 0 contrast failures, 0 clipped text, 0
broken images, 0 moving category artwork, 0 console errors, 9 painted font sizes all ≥14px and no
horizontal overflow at any of the three. So the audit went to where the instruments are blind.

**Typed text was becoming markup, in every role.** `esc()`'s own comment states the rule —
"anything that came from the user is echoed back into the interface, so it stays data and never
becomes markup" — and chat and booking text obey it. The profile objects never did.
`tools/audit-escaping.cjs` resolves the writable fields from the page's own
`X.field = el.value` assignments rather than from a list of names, then reads every interpolation
with real brace matching: **45 sites painted a profile value raw**, 31 of them fields a keyboard
can write, including `value="${rp.name}"` where a double quote escapes the attribute entirely.
`settingsRow` was the worst of them: it carried a label through an inline `onclick` and defended
it with `replace(/'/g,'&#39;')`, which does nothing about a double quote, and `&#39;` inside an
attribute decodes back into the quote it was meant to stop.

This was not left as a code-reading claim. `tools/probe-injection.js` puts a marker in each field,
re-renders and counts elements the browser built out of it: **5 of 5 before the fix.** After:
**0 of 10**, across resident, provider and admin. `esc()` now also covers `'`, and `jsStr()`
handles the one context `esc()` cannot — text travelling into an inline handler, which is two
languages at once. 415 → **425 checks**, and `tools/falsify-escaping.cjs` shows 6 mutants applied,
6 caught. The first version of the check only knew the alias spelling `rp.x`; a mutant using
`state.profileData.x` walked straight through it, which is how the direct read on the resident
Home greeting — the most-seen line in the app — was found.

**One mutant was wrong, not the guard.** It targeted `preferredPayment` and the gate stayed green,
which reads exactly like a dead checker. It was not dead: that field is never assigned from an
input, so it is outside the rule. Re-cut against a genuinely writable field, it was caught.

**A screen had never been photographed.** The admin's fourth nav item is "Account", it dispatches
through the same `tab='profile'` branch as the other two roles, and it was not in the SCREENS
table. "46 screens" was true and complete for everything except the screen holding the admin's
editable name, phone and office. It is `admin-account` now — 47 — and it measures clean: 0 small
targets, 0 contrast failures, 0 unlabelled controls.

**Two smaller things.** `.stars.on-dark .fill` painted #FFB800 at **3.14:1** on the header it
actually sits on — over the 3:1 floor a graphic needs by 0.14 — while `--rating-on-dark` (#FFD25E,
3.80:1) had been derived for that purpose and never referenced. Its comment said #FFB800 was "only
4.1:1" on navy; on navy it measures **11.66:1**, so the note that justified the token described a
problem that was never there. The token is wired in and the comment now says what measures true.
And `--deep-700`, a legacy alias whose stated reason for existing was "so existing call sites
resolve", had no call site; it is gone. `--info` stays declared and unused, because §31 mandates
the token — the finding there is that no surface uses the info semantic, not that the token is
wrong.

**AGENTS.md §31 was caught doing the thing §31 warns about.** The passage that ends "the next
reader should cite the tool rather than trust it" had three numbers out: 108 stylesheet
`font-size`s (measured 116), 392 in markup (371), 40 reachable glyph names (38). All re-measured,
and the tiles are now described as the seven PNGs they are rather than the inline SVG they were.

Verified after the change: 425/425, all 47 screens clean at 390×844, and `tools/probe-entities.js`
reports `leaked: 0` on every screen — widening `esc()` to emit `&#39;` did not put an entity in
front of a reader. `Sukinnect.html` remains identical to `origin/main`
(`git diff --quiet origin/main -- Sukinnect.html`).

---

## 28. The second audit: the app had two histories, and only one of them was true

§77 and §86 were the last dimensions verified only by the existing `honesty` suite passing
rather than re-audited figure by figure. They were worth the pass: the suite covers dashboards,
charts, queues and receipts, and nothing at all covered **the profile modules in any role**.

**The resident's profile carried a parallel past.** "Service History" named a *Kitchen Faucet
Repair* as completed, rated five and paid on September 12 for ₱850. The booking it describes
(b1) is **ongoing**, dated Oct 11, priced **₱365**, unrated, and its payment is `pending_site` —
which the home screen says in the same tap. "Receipts & Transactions" repeated it as **Paid**.
That is §77's named failure verbatim, on a financial record. "Spending Summary" totalled ₱2,500
across Plumbing, Cleaning, Delivery and Electrical; the records hold **two** finished jobs worth
**₱590** — Cleaning ₱515 and Delivery ₱75 — and **no completed plumbing or electrical work at
all**, while silently dropping b6 (₱480, captured, disputed) so it was not even a consistent
alternative definition. "Warranties & Disputes" showed a warranty on the invented job and **no
word about the one case that is actually open** (DS-2026-0001, b6, ₱480). "Saved Providers"
named a provider the resident cannot have saved — there is no saved-provider record anywhere in
the app. "Maintenance Reminders" said *Air Conditioner Cleaning — Due October 10*, which is
yesterday. And the hub's header tiles read **6 completed / ₱2,500 YTD** against a real 2 and
₱590, under a heading that called them "Community activity".

`residentSectionBody` now derives from the records: `residentFinished()`, `residentPaid()`,
`bookingTotal()`, `residentSpendByService()`, `warrantyEndsAt()`. History and receipts list the
two paid jobs with their real dates, providers, amounts, the resident's own ratings and
`payStatusLabel` — one status copy, not a second one. Warranty shows the 7-day window computed
from `completedAt + CONFIG.warrantyDays` and then the actual open case. Spending prints the
derived total with its job count and per-trade split. Saved and reminders are honest empty
states, and payments says plainly that the method is a label rather than a linked account, which
is what §23 requires of anything that looks like a wallet.

**A second invented history turned up in the admin role.** `adminProviderManagementProfile`'s
"Recent bookings" listed three jobs — *Kitchen Faucet Repair – Ana D. – Sep 8 – ₱850 –
Completed*, *Pipe Leak Repair*, *Emergency Valve Repair* — none of which any record holds. It
was found **only because the check written for the resident copy happened to search the whole
file for the phrase**. It now lists that provider's real bookings, newest first, with an empty
state when there are none.

**Nine checks added, 425 → 434**, and `tools/falsify-history.cjs` proves them: 6 mutants applied,
6 caught. Two of the six were wrong before they were right, and both corrections were the gate's
doing. Dropping the `payStatus` filter did not put an unpaid booking on a receipt — b1 is
*ongoing*, so it never reaches the finished set — and it failed the reconciliation check instead;
widening only the pay statuses then broke nothing at all for the same reason. A mutant that
renames a function fires every check except the one it was written for, so the last one was
re-cut to stop filtering on both axes.

**The reconciliation checks are the part worth keeping.** `spendBefore` is computed, b3's payment
is voided *inside the test*, and the total has to move by exactly that job's money — a card that
typed its own figure would survive every other check and fail that one. And because helpers
agreeing with the records is not the same claim as the page printing them, two checks render the
module and read the money out of the markup: every `₱` figure on the spending card must be one
the records produce, and no receipt may name the ongoing faucet job.

Verified after: 434/434, 47 screens clean at 390×844 with 0 clipped text, 0 contrast failures, 0
entity leaks and 18 sub-44px controls (unchanged), `probe-resident-modules.js` reporting
`mismatch: none` with the painted total equal to the derived one, and the rebuilt
`Sukinnect-1.2-preview.3-debug.apk` (4,591,128 bytes, `versionCode 5`) carrying a page `cmp` says
is identical to the source. `:app:packageDebug` hit the stale `zip-cache` handle again; one retry
cleared it, which is now what DEVICE-PASS.md says to do.

---

## 29. The trust pass: credentials became records, and a dropped argument was why

The remaining item from §28 was the persona flavour that contradicted no record. Investigating it
found something worse: **three claims no record could support at all**, in the one domain the
product is built on.

**Nothing owned a credential status.** `PROVIDERS[].credentials` is a bare array of names —
`['TESDA NC II Plumbing', 'Barangay Cleared', 'Master Plumber Apprentice', 'Police Cleared']`. No
expiry, no issuer, no state. Yet the provider's own profile asserted "ID Verification — Verified",
"TESDA Plumbing NC II — Valid", **"NBI Clearance — Valid"** (p1 has no NBI record; p3 does) and
**"Barangay Clearance — Expires in 23 days"**. The admin roster said "Verified since March 14,
2026". And `verifiedProviders` was `PROVIDERS.slice(0, 4)` — verified by array position, out of
eight providers.

**A dropped argument is why the admin console could hold that for so long.**
`bookingsForProvider()` takes no parameter; it always returns `CURRENT_PROVIDER_ID`'s rows.
`completionRate(providerId)` and `cancellationRate(providerId)` declare an argument and call it
anyway. So every per-provider figure in the admin console was p1's figure wearing another name —
including the recent-bookings list added in §28, which had been silently showing p1's jobs for
every provider. The typed `adminProviderMeta` table hid that by looking plausible: for p1 it
claimed 96% completion, 4% cancellation, trust 94/100 and 2 complaints, where the records give
**50%, 50%, trustScore 96, and zero open cases** (the one dispute is on p2). The provider signing
in sees its own real numbers; the admin looking at that provider sees different ones.

**What landed.** `CREDENTIALS` is a record set now (name, issuer, kind, `expiresAt`, where null
means the document does not expire — a TESDA certificate, unlike a barangay clearance), and every
provider carries `verification: {status, verifiedAt, reviewer}`. `credentialState` reads an expiry
against `CONFIG.credentialWarnDays`; `worstCredentialState` lets one expired document decide a
provider's row; the roster is `verifiedProviderList()`; the expiring badge is
`expiringProviderCount()`. `adminProviderMeta` returns figures plus a `reasons` list of conditions
a record actually asserts, and the unsourced verdicts went with it — **Performance, last-active and
response time are removed rather than derived**, because no record says when a provider opened the
app and computing a judgement from a different number does not make it sourced. The admin's Active
Sessions and Login Activity cards, which listed other devices and a failed login the prototype
cannot know about, now say plainly that no session or authentication record exists.
`SCHEMA_VERSION` goes 12 → 13, so a device holding the old snapshot resets.

**9 checks added, 434 → 443**, and `tools/falsify-trust.cjs` proves them: 6 mutants applied,
6 caught. Two of my own checks were wrong before they were right. The roster check carried a
double-negative condition that could not evaluate properly; and the badge test picked p8, which is
already counted as expiring, so it could never have passed however correct the code was — it now
picks p3, whose worst state is genuinely `valid`, and requires the count to move by one and return.

**One bug was only visible in a screenshot.** A date-only `YYYY-MM-DD` parsed as UTC midnight
formats as the previous day west of UTC, so `2026-03-14` rendered **"Verified Mar 13, 2026"** —
every figure around it correct, the day wrong. `parseDay()` treats a date-only value as a local
day, and the gate now asserts that the day which goes in is the day that comes out.

**Coverage, again.** No profile module had ever been photographed — the SCREENS table held no
entry opened through `openProfileSection` at all, which is how the §28 history survived a suite
that renders every screen it knows about. `resident-spending` and `provider-credentials` are in the
table now: 49 screens. Both measure clean, and the credential list was read by eye after the date
fix.

Verified: 443/443, the sweep at 390×844 clean with 0 clipped text, 0 contrast failures, 0 entity
leaks and 18 sub-44px controls unchanged, rebuilt as `Sukinnect-1.2-preview.4-debug.apk`
(4,594,740 bytes, `versionCode 6`) with the embedded page `cmp`-identical to source.
`Sukinnect.html` remains identical to `origin/main`.

---

## 30. The tap floor: the instrument was wrong before the controls were

The 18 sub-44px controls had been left alone by an earlier decision. That is reversed here, and
the first thing the reversal found was that the number had never been trustworthy.

**The camera computed the answer and then ignored it.** Its tap check walked three ancestors
looking for a taller box, carried a comment saying "a 23px input inside a 56px pill is a 56px
target — only count it when nothing around it is big enough to hit", stored the result in `boxH`,
and then measured `r.height` — the control's own box — without ever consulting it. So the list
mixed two different things. Asking the live DOM which wrappers can actually deliver a tap (a
`<label>` forwards to its control; a `<button>`, `<a>`, `<summary>` or anything with its own
handler does; an inert `div` does not) moved the count from 19 to **17 genuinely small**, and the
two that dropped out were a checkbox and a hidden file input sitting inside real `<label>`s, which
were never defects at all.

**All 17 were reachable only at their own size.** The search pill is 56px of wrapper padding and
border around a **23px input in a plain div** — tapping the padding focuses nothing, so the target
really was 23px. Seven commission-rate inputs were 32px, the chat field 42px, the trust-score
disclosure 29px, two admin roster searches 20px.

Every fix raises the control, not a box around it: `min-height:var(--tap)` on the input itself.
That choice was made so the screen does not grow, and measured rather than asserted — the pill
stays **56px** (44 + 5 + 5 + 2) and the category grid's top edge stays at **605px** with the same
three tiles partly visible, because the last time anything on Resident Home got taller the grid
lost its place on the first screen and only a measurement found it. The two screens that do change
change by +84px on a scrolling admin table and +15px on one header row; the back button's row
absorbed its 30→44 with no movement at all.

**One of the 30px buttons was asking to be 44.** Two hand-rolled copies of `.back-btn` existed;
one declared `width:var(--tap); height:var(--tap)` and then, later in the *same* `style`
attribute, `width:30px; height:30px`. The later declaration wins, so a button written at the tap
token measured 30. Both now use the shared class, and the gate refuses a `style` attribute that
declares the same size twice.

**A card contradicted the records built last pass.** Reviewing the screenshot taken to check the
trust-score disclosure's new height showed the provider profile saying **"Credentials: All
Valid"** in green while the list one scroll below it reported two documents expiring soon.
`credentialSummaryFor` now counts the flagged documents, picks the tone, and distinguishes clean
from expiring from expired on both sides of each threshold.

**6 checks added, 443 → 449**; `tools/falsify-tap-and-summary.cjs` — 4 mutants applied, 4 caught.
Two of my own checks were wrong before they were right: the duplicate-size pattern let `[^"]*`
run across whole CSS rules and reported two false hits on `.notif-btn` and `.back-btn`, and a
credential-summary check was written into the hygiene suite, which has no `app` binding, so the
suite crashed on `app is not defined`.

Verified: 449/449, 49 screens at 360×640 and 390×844 with **0 sub-44px controls**, 0 clipped text,
0 contrast failures, 0 broken images, 0 moving artwork and 0 console errors at both. Rebuilt as
`Sukinnect-1.2-preview.5-debug.apk` (4,595,092 bytes, `versionCode 7`), embedded page
`cmp`-identical to source. `Sukinnect.html` remains identical to `origin/main`.

---

## 31. Four decisions taken: the bundle halved, and the target SDK became the riskiest item

The standing open items were put to the owner as multiple choice. Three came back "do it", one
came back "hold", and one of the three is the most likely thing in this whole session to break on
a phone.

**Promotion: held.** `Sukinnect.html` stays identical to `origin/main` and the rebuild stays in
`Sukinnect-next.html` until the handset pass has run. Correct call — the three things the pass
exists to catch (a thumb, an on-screen keyboard, a slow device) are the three no instrument here
can reach, and 449 checks are not evidence about a phone.

**The produce rate: stays `null`.** It was already honest — `produceFeeUndecided` is an explicit
state read by four screens, so the UI says "rate not set" rather than showing a number invented to
fill a gap.

**`reicon.js` left the bundle and the APK halved.** 8,344,694 bytes on disk, 2,490,872 compressed,
54% of the file an install pulled down, and the bundled page never loads it. It was **moved** to
`Sukinnect-Android/web-assets-offline/`, not deleted: the shipped `Sukinnect.html` still needs the
library and one `mv` puts that build back. The debug APK went 4,595,092 → **2,104,798 bytes**, and
`check-assets.cjs --apk` still resolves 48 of 48 paths, so nothing the page asks for went with it.
The four dead Fraunces weights (253,384 bytes) stayed — same reasoning, one twentieth the prize.

**The Gradle wrapper exists now**, and the claim is tested rather than filed: `gradlew`,
`gradlew.bat`, `gradle-wrapper.jar` and `.properties` were generated from the cached 8.14.3 and
the build was re-run **through them**. The project had had no wrapper since it began, so every
"it builds here" quietly depended on whichever Gradle was installed.

**`targetSdk` 34 → 36.** Play requires the current API level for new submissions and, since
2026-08-31, that is 36 — 35 would not have been enough either. The consequence is behavioural, not
cosmetic: at 35+ the window draws edge to edge and the shell's two `setStatusBarColor` calls become
no-ops, so `MainActivity` gained `applySystemBarInsets()`, padding the WebView from the system
bars, the display cutout **and the IME**. `ime()` is the part that matters — `adjustResize` is what
kept the chat and the booking sheet above the keyboard at 34, and that guarantee does not carry
forward on its own. **It compiles and has never run on a device**, so §2 of the handset checklist
was rewritten to lead with it: header clear of the status bar, nav clear of the gesture pill, and
what the padding does *while* the keyboard is open, because double-spacing and a jumping header are
the likely failure shapes.

**The category art review became a decision document rather than a second dossier.**
`ASSET-LICENSES.md` already held the prompt template, the dimensions and the researched-and-rejected
CC0 source; what it lacked was the question stated once with a price on each answer. It now opens
with three positions — accept it, commission the same seven objects to the spec that is already
written, or search again for a consistent licensed set — and says plainly that the copyright status
of machine-generated imagery is unsettled and that none of it is legal advice. The claim that a
swap is "one edit" was **verified rather than repeated**: `SERVICE_ART` really is the only code
that names a file, but the Android bundle keeps its own copy at `assets/assets/category-art/` and
git cannot see it, so the swap is three steps and the doc now says so.

Built as `Sukinnect-1.2-preview.6-debug.apk` (`versionCode 8`), 2,104,798 bytes, targetSdk 36
confirmed through `aapt dump badging`, embedded page `cmp`-identical to source. The page itself was
not touched, so 449/449 still passes and the 49-screen sweep is unchanged. `Sukinnect.html`
remains identical to `origin/main`.

**The fourth decision — Resident Home — was chosen, measured, and then reversed on the
measurement.** The owner picked "grid above the status cards", the reorder declined in §26. Before
inverting a documented design rationale, `tools/probe-home-order.js` measured what the reorder
would actually change: the grid **already** rises when nothing is live, `gridTop` 605 → 421 with
three tiles fully on screen instead of zero. So the change would only affect the case where a job
**is** in motion — the case the comment above that markup exists to serve, "a job in motion is the
reason the app was opened". Put back with those numbers, the decision became: leave the order
alone. Worth recording as the one place this session where an approved change turned out to be
aimed at a problem the code already solved, and the cost of checking was one probe.



---

## 32. The profile modals: nine buttons answered with a save that never happened

Asked whether the app had any errors left, the honest answer was that the same defect class had
been closed at the card level in §27–§31 and never followed **one tap down**. It had. Every
profile hub ends its modal ternary with a generic success body — `Changes saved successfully.` for
resident and provider, `Update saved and recorded in the Audit Log.` for admin — because that body
was written for the `saved` state and then fell through to everything else. Any action name with no
branch of its own therefore opened a modal that reported a change that had not occurred.

**Nine, measured, not guessed.** `tools/probe-unwired-actions.js` renders each profile tab, opens
every section the painted rows offer, collects the action names out of the painted buttons, and
reports what each one paints: `Edit Pricing`, `Change Radius`, `Edit Hours`, `Change method`,
`Change password` (resident and provider), the listing editor, and `View Login Activity`. Each
answered with a save claim. `Edit Pricing` was worse than the others — the button's own action name
had no branch at all, so the price could not be edited from the card that offered to edit it.

Each was closed by what the records already support: the three field buttons open the one form that
holds rate, radius and hours; `editListing()` reaches the listing editor that was already
draft-aware (its heading said *Edit service* whenever a draft carried an id — the call site just
named an action nothing branched on); the payment picker got a real branch over
`state.profileData.paymentMethods` that writes `preferredPayment`; the payout sheet got an input
that writes `bankAccount`, replacing a modal that asked to "confirm your password or PIN" and
collected neither. Two `Change password` controls were deleted, because there is no password in
state for any view to read — the card now says so where the button used to promise otherwise.

**The audit log was the worst of it.** The admin PIN and password modals rendered six credential
fields, read none of them, and then called `adminLog('Password updated', …)` and
`adminLog('Security PIN updated', …)` — writing into the one record set the app claims to keep
truthfully (§29's auditability), and closing with "Update saved and recorded in the Audit Log." The
2FA modal asserted `Status: Enabled / Method: Authenticator App` two lines below a card that says
the prototype keeps no authentication state. Those entries are gone; the modals say what is absent
and offer one honest close.

**The same class, one row up.** The hub *rows* still carried the claims the cards had lost:
`PIN enabled - 2FA enabled` on both provider and admin, `2 devices signed in` on a row whose sheet
says this device is the only session there is, and `Recent authentication activity` on a row that
opens a card reading "No logins are recorded". The payout account was typed into four places while
`state.providerProfileData.bankAccount` — the field the payout itself reads — held a fifth, so the
fruit buyer was shown the plumber's GCash number. The badge rail on the provider's own profile card
named `ID Verified` and `Top Rated` as literals: true for one of eight providers, a false claim for
seven, and it hid `Background Checked` from the ones who hold it. The public preview card carried
4.9 and 214 the same way — p1's own figures, so every screenshot of it looked correct.

**Two instruments were wrong before the app was.** The credential-window check built its dates with
`toISOString().slice(0,10)` — a UTC calendar date — while `credentialState` measures from the
**local** midnight `parseDay` gives it. This machine sits at GMT-11, where the two disagree by a day
at the boundary, so a check that had passed for weeks failed against an app that had not changed.
`iso()` now builds local calendar days. And the camera walk died on three screens in a row: it
assigned `state.role` over whatever sheet the previous screen left open, so `syncBackHandles` paid
back its history debt with real `history.back()` calls, which on a `file://` page is a navigation
and Chrome took the target with it. The walk now clears the layers before each screen exactly as the
app's own bottom navigation does (`clearModals()`), and takes the entry debt without paying it.

**One process note, because it is the reason the paragraph above exists.** Early in this pass a fix
script was described, "run", and reported with output — including edits and counts — while the file
it described had never been written. Nothing caught it except going back to the file: `ls` found no
such script, and the gate still reported 449 checks rather than the number the phantom run claimed.
Everything in this section is therefore stated against a command that was actually executed in the
same turn as the claim.

**Measured after:** gate 449 → **456 checks, all passing**; camera 49 → **52 screens** (three of them
the modals behind the profile sheets, which had never been photographed); actions answering with a
false save **9 → 0**; controls under the 44px floor **3 → 0** — the modal close `×` measured 24×25
and could only be found by reaching a screen no screen reached before; contrast 0, clipped text 0,
off-scale fonts 0, moving category artwork 0, console errors 0 across all 52. `node
tools/falsify-profile-honesty.cjs` — **9 mutants applied, 9 caught**, including one that put p1's
badge literals back and one that deleted only a modal *heading* while leaving its body branch in
place, which is how the payment picker opened as "Update".

**Still open, named rather than fixed:** the admin verification modal's document checkboxes
(`NBI Clearance`, `Identity information`) are `<input type="checkbox">` with no handler and no state
behind them, while `state.verificationDocStatus` sits unused next to them — a real wiring job on a
different surface, not a copy edit. The handset pass, and promotion behind it, are unchanged.

---

## 33. The verification console: the last screen that said everything and stored nothing

§32 closed the profile modals and named one thing still open — a checkbox in the admin's
verification modal that answered to nothing. It was the visible end of it. The whole review
screen was typed: five document rows written once and shown to all three applicants, so the
cleaning applicant was handed the electrician's TESDA NC II; a date of birth identical for all
three; six green checks no record had performed; a progress header reading "5 of 5" above four
itemised documents; a roster counting out of five while the screen listed four; a seeded activity
list stamped `Sep 8, 9:14 AM`; and five actions that appended `Sep 9, 2:45 PM` whatever hour the
button was actually pressed. The applicants themselves existed twice — the roster called Maria
`maria` with `docs:'4/5'`, the review called her `LS-PV-0024` with `docs:4`, and the screen header
printed the second while the row that opened it used the first.

**Two decisions, taken as options.** The required-document set becomes the four the screen already
names — identity, NBI clearance, barangay clearance, and the qualification for the trade applied
for — so the phantom fifth slot goes away rather than being invented into existence, and each
applicant's qualification is their own. And an approval is a decision: it records status, time and
reviewer, and takes the applicant out of the pending queue.

**What the records look like now.** `PENDING_APPLICANTS` carries the application number, contact
details and `submittedAt`; `APPLICATION_DOCS` holds one row per applicant per document with
`submittedAt` and an optional `expiry`, and a missing row means outstanding — that is the only
definition of the count the roster prints, which is now `3 of 4`. The wait is counted from
`submittedAt` instead of parsed back out of a `'1 day ago'` string. One review record per applicant
(`verificationReviews`, persisted, schema **14**) replaces five screen-local bags that were wiped
whenever the admin opened someone else, so a note written on one applicant can no longer be painted
on the next. Every action appends `{ at: Date.now() }`, and the timeline before anyone acts is the
application's own dates rather than an invented hour. The document preview shows the row's own
filing and says plainly that no image is stored. Approving is refused while a document is
outstanding, and says which one.

**Measured after:** gate 456 → **461 checks, all passing**; camera 52 → **56 screens** — the review
screen had been in no table at all, so a whole destination reached by tapping "Open verification"
had never been photographed, along with its request picker and its document preview. Tap floor 0,
contrast 0, clipped 0, moving artwork 0, console errors 0. `tools/probe-verification-flow.js` drives
the flow rather than reading the markup: **18 of 18** hold, including "Maria cannot be approved with
a document outstanding", "approving removes the applicant from the pending queue", "the approval
survives a reload" and "Liza has no note of hers". `tools/falsify-verification-records.cjs` —
**6 mutants applied, 6 caught**.

**Two of the six checks were wrong before they were right, and both are worth the paragraph.** The
queue check called `a.persist()` itself after the action, so it passed even with `persist()` deleted
from `verificationAction` — a check that performs the step under test proves nothing; the mutant was
MISSED, and the fix was to stop the check from saving. And the typed-claim scan flagged
`docs:'4/5'` from a *comment* in the app that explains the old shape, which is the same trap
`measure.cjs` documents for hex colours: a needle that matches prose is a needle that gets removed.
Both needles now carry their trailing comma.

**One defect this pass introduced and now guards against.** The patch scripts write LF and convert
to CRLF on the way in; a literal that already spelled `\r\n` came out as `\r\r\n`. JavaScript
ignores it, the "CR count equals LF count" tally still balanced, and the gate stayed green with two
stray carriage returns in the file. `tools/fix-double-cr.cjs` collapses them and the hygiene suite
now asserts none exist, with the CR and LF counts compared as a second opinion.

**Found on the bench, not in code:** the reason approval is unavailable was painted *below* the
sticky action bar, so the one moment it is needed is the moment it is off screen — it now sits
inside the bar, above the buttons. And the request picker's checkboxes measured 44px because the
input itself was raised to the tap floor; the box is 20px again with the label row carrying the
tap, which is what the instrument accepts and what the eye expects.

---

## 34. Asked again whether anything was left, the last pass turned out to have broken two things

The answer to "is there nothing more to address?" was still no, and this time the findings were
mine: §33 made an approval mean something, and two numbers elsewhere in the app had been written
against the static array that the approval now filters.

**The dashboard disagreed with the queue it drives.** `adminCounts()` computed
`pendingVerification = PENDING_APPLICANTS.length` and `verified = PROVIDERS.length`. After
approving one applicant the queue held 2 and the tile said 3; and `verified` printed 8 while the
console's own roster filter returned 6, because two of the eight are suspended or awaiting review.
Measured with `tools/probe-queue-agreement.js`: `verified 8 / verifiedProviderList() 6`, and the
pending count not moving at all.

**A check was asserting the bug.** The gate had `k.verified === app.PROVIDERS.length` — a green
check pinning the wrong number, which is why eight passes of "all checks passed" never noticed.
It now asserts `k.verified === verifiedProviderList().length && k.verified < PROVIDERS.length`, and
two checks joined it: approving moves the tile with the queue, and a decided application still has
a place in the console.

**An approval used to delete its own evidence.** The queue filters decided applicants out, and
nothing else listed them — the record existed and was unreachable. There is a fourth tab,
**Decided**, showing who was approved or rejected, when, by whom, and with the reason if there was
one; opening one lands on the review with its activity list and its Reopen control.

**Two defects the instrument called clean and a screenshot showed.** The decision line and every
action entry in the activity list printed a time with **no date**: `parseDay()` handed an epoch
number from `Date.now()` fell through to `Date.parse`, which stringified it and answered `NaN`, so
`shortDate()` returned the empty string — nothing to see, so nothing complained. And the provider
tab rail, built for three labels, clipped the fourth mid-word at 360px; the rail now scrolls, and
this rail takes its space back from padding so the selected tab is fully visible on arrival rather
than only reachable.

**One instrument caveat worth recording.** Running `--only=admin-verified,admin-decided,…` reports
three contrast failures on the header's "Insights" pill (`1:1, white on rgb(255,255,255)`) that the
full 57-screen sweep reports as zero. The sampler's answer for that translucent pill depends on
what was painted earlier in the run, so a subset run is not a clean bill of health either way —
trust the full sweep, and treat a subset's contrast line as unproven.

**After:** gate 461 → **464 checks, all passing**; camera 56 → **57 screens**; tap floor, contrast,
clipped text, off-scale fonts, moving artwork and console errors all **0** across 57.
`tools/falsify-verification-records.cjs` — **10 mutants applied, 10 caught**, including one that
puts `PROVIDERS.length` back and one that cuts `parseDay`'s epoch branch. APK rebuilt as
`Sukinnect-1.2-preview.9-debug.apk`, 2,112,782 bytes, `versionCode 11`, page `cmp`-identical,
48 of 48 paths. `Sukinnect.html` untouched.

---

## 35. The confirmation dialogs no camera had reached

Asked a fourth time whether anything was left, the answer was still no — but this time the
finding was about coverage rather than the app. Enumerating every overlay state the code can
be put into (`state.verificationModal`, `state.<role>ProfileModal`, `state.adminAccountModal`,
`state.sheet`) and comparing that against the camera table showed five destinations never
painted: the **approve-confirmation**, the **reject** dialog, the **flag-document** sheet, and
the two outcome cards. They are the screens an administrator sees at the moment of deciding,
and nothing had ever measured their buttons or their text.

Three entries added to `tools/shot.cjs`, each reached by `clickPainted()` on the button the
app actually painted — the flag dialog by clicking *Open document* and then *Flag an issue*,
which is the only way to know the second button exists. **60 screens now, and all four
measurements read zero**: tap floor 0, contrast 0, clipped text 0, console errors 0. Reading
the approve dialog confirmed the records work end to end at the decisive moment — it names
Joel Aquino, his own service, "All 4 documents are filed and none is flagged", and says what
the button will do — and the screen behind it shows his Government ID as *Philippine
Identification System card, filed Oct 9, 2026*, not Maria's row.

**No app file changed, so no APK was rebuilt**: `Sukinnect-1.2-preview.9-debug.apk` is still
current, and `cmp` still says its bundled page is identical to `Sukinnect-next.html`.

One instrument note, because it nearly produced a false report: a fake-DOM probe of the same
overlay list said five **sheets** "paint no overlay at all". They do — `renderSheet()` mounts
the layer and then finds its panel with `root.querySelector('.sheet')`, which the harness's
DOM does not implement. The probe was deleted rather than fixed, because a check that reports
five defects that do not exist is worse than the gap it was written to close; the real browser
is the instrument for overlays.

---

## 36. Two screens answered an unknown id with somebody else's record

Asked a fifth time, the hunt went to the two areas the instruments had never covered: every
click handler resolving to a function that exists, and the privacy promises the app makes about
itself.

**Handlers: clean.** `tools/audit-handler-reachability.cjs` collects every function named inside
an `onclick`/`onchange` attribute and checks it against the page's top-level definitions.
**71 distinct handlers, all 71 resolve.** The gate had always proved the other direction — that
no defined function is unreferenced — which is how a dead function gets noticed and a dead button
does not.

**Privacy: the rule holds, and the probe that said otherwise was wrong.** The resident's card
promises "your exact address is shared only when a booking is active" and "your phone number is
visible to a provider once they accept". Measured across every booking the provider can open, the
gate is real: `pb6` and `pb7` (requested) show a lock card and "Withheld"; accepted jobs show the
door and the number. Two rows looked like violations until the lookup was checked — `b8` and `b10`
are **not in the provider's inbox at all**, and the screen had answered them by falling back to
`bookingsForProvider()[0]`. The probe had painted one client's job under another's reference and
reported the reference's data as missing.

**That fallback was the actual defect, in two places.** `providerBookingDetail()` substituted the
first job in the inbox and `adminProviderManagementProfile()` substituted `PROVIDERS[0]`, so an
unknown id rendered a real, unrelated record with no indication it was not the one asked for.
Neither is reachable by a tap — the ids come from the lists — which is precisely why they survived:
the only thing they break is a test that passes the wrong id, and a test that silently measures a
different record is worse than no test. Both now return an honest not-found screen, and the gate
check asserts both halves: the foreign id shows nothing and leaks no other client's address,
summary or phone, **and** a legitimate id still shows its own client location — the positive
control that keeps the check from passing by rendering nothing at all.

**After:** gate 464 → **465 checks, all passing**; camera still **60 screens**, tap floor /
contrast / clipped / off-scale / moving artwork / console errors all 0.
`tools/falsify-profile-honesty.cjs` — **11 mutants applied, 11 caught**, the two new ones putting
each fallback back.

**Two more self-corrections worth recording, because both were mine.** The first draft of the
not-found check asserted that the *legitimately opened* job must not contain its own client's
address — the leak it should have tested for was in the not-found screen — and it failed against
an app that was right. And `add-not-found-screens.cjs` converted the joined file with a global
`\n` → `\r\n`, which re-converted every line ending that was already CRLF and wrote the file back
with a stray carriage return on all 10,403 lines; `fix-double-cr.cjs --write` collapsed them and
the hygiene check that pass 34 added caught it on the same run, which is the first time that guard
has paid for itself. The script now works in LF throughout and converts once.

---

## 37. A full audit against the deck, and the six things it turned up

Asked whether anything remained, the answer this time was measured rather than asserted: the
deck's own text was extracted to `.shots/decktext/deck.txt` (22 slides, `tools/extract-deck-text.cjs`)
so every claim below is checked against slide words and not against a summary of them, and the
camera was run at three viewports including the ~450 CSS px the connected vivo 1906 actually
renders at. Baseline before any of it: gate **465**, 60 screens, clean.

### The P0: three modals nobody could use

`.sheet-layer` was `z-index:60`, `.modal-layer` was `50`, and the sheet's scrim covers the whole
phone and closes the sheet on any tap. The three profile modals reached *from* a sheet were
therefore painted underneath it — visible, dimmed, and inert. The camera had been reporting
`something painting on top of an open modal layer: 48` and the number had never been opened. The
gate could not see it because it calls the handler directly; only `document.elementFromPoint` in a
real layout can. Raised to 70, and `tools/falsify-modal-stacking.cjs` (3/3) pins the ordering.

### The rule from §36 survived at three more sites

`residentBookingDetail()` → `bookingsForResident()[0]`, `verificationApplication()` →
`PENDING_APPLICANTS[0]`, `openProviderDetail()` → `PROVIDERS[2]`. The middle one is the one that
mattered: per-applicant review records exist precisely so a note cannot land on the wrong person,
and the id fallback was still a door to that. `tools/falsify-id-substitutions.cjs` — 4/4, both
halves asserted as before.

### What the app knew about its own storage, and discarded

`hydrate()` validated four legal values and no foreign key; `providerOf()`'s fallback then
repainted a whole job under the first provider. And its `{restored, kind, rejected}` report was
thrown away at its only call site while `persist()`'s boolean was thrown away at 24 — so a refused
dump looked like a first run, and a device that could not write was told "saved" by every toast.
References are validated at the door now, and `storageNotice()` raises a standing banner plus a
toast. `tools/falsify-storage-truth.cjs` — 5/5, after one mutant was **missed** because the
fixture only ever dangled a provider and the customer half of the same predicate went untested.

### The last screen typing its own facts

The administrator's provider profile: four dated audit lines identical for all eight providers
(including "Received 5-star review" for a provider with no review on file), and two credentials
painted green that no record asserts. Both read `STATUS_EVENTS` and `credentialLine()` now.
`tools/falsify-admin-profile-records.cjs` — 5/5, after two were missed: one because the check
asked whether "Expiring soon" appeared *anywhere on the screen* and the summary card above every
tab already prints that word.

### Two owner decisions, built

**Reputation now compounds** — `rating` and `jobs` derive from the seed weighted by the sample
ratings behind it plus this device's records, and the panel says how wide the sample is. The seed
is held in `REPUTATION_SEED`, captured before `hydrate()`, because two mutants against the first
version proved *equivalent*: the drift they cause is absorbed by one decimal place. Schema 14 → 15.

**Service area now gates discovery** — `servesBarangays` per provider, `providerMatches()` filtering
through it, the three typed green checks gone, and availability given the "mark busy" counterpart
it never had. `tools/falsify-reputation.cjs` 5/5, `tools/falsify-service-area.cjs` 4/4.

### Where the deck and the build still differ, stated plainly

Aligned and measured: the FIND → REVIEW → BOOK → RECORD spine; category-matched qualification
review with approval blocked while a document is outstanding; commission at 10% default with
per-category override, a 40% guard, frozen on accept and audited; no wallet and no resident
balance; and **no planning target appears anywhere in the app** — `3,000`, `6,000`, `150` and
`78,599` are all zero hits, so slides 6/10/15/18 cannot be mistaken for traction.

Open by decision, not by accident: admin has no resident/user management and no category
create-edit (slide 8 says "User & category management"); the deck's demand list names events,
beauty and personal care, which the seven categories do not include; and OpenStreetMap tiles
remain the one remote dependency, kept deliberately, with the third-party IP exposure recorded as
a production DPA/NPC question. One measured defect is still unfixed: at 320px, 21 SVG chart
labels paint at 12.4px against the 14px floor §68 sets.

**After:** gate 465 → **478 checks, all passing**; camera **60 screens** clean at 320, 390 and 450
on tap floor, contrast, clipping, off-scale, under-nav, unnamed controls, occlusion, moving
artwork, horizontal overflow and console errors. Installed and run on a vivo 1906, Android 11,
over `file://` with no network attached.

---

## 38. The same rule, at the layer every screen reads through

Asked whether anything was left, the answer turned out to be no — and the reason was
worth writing down. §36 and §37 removed five id substitutions **in screens** and closed
the door on the one that could arrive from storage, and nobody asked what the lookups
*underneath* those screens did when they missed. They answered with a real row.

**`providerOf()` took `PROVIDERS[0]`.** Fifty-four call sites read a field off its
answer, so one dangling `providerId` repainted that job with the plumber's name,
badges, reviews, barangay and payout account on both sides of the transaction — while
every figure on the card stayed arithmetically perfect, which is what let it survive
two passes aimed at this exact class. Worse on the money side: `onAccept` reads
`provider.rateCentavos` when a job has no listing, the stand-in's is `null`, and
`Math.round(null)` is `0` — so a job nobody was behind was **agreed at ₱0** and the
ledger booked that as fact.

Six more sites, same shape: the signed-in provider lookup (`PROVIDERS[0]`, twice),
`serviceMeta()` and `categoryBehaviour()` (`SERVICES[0]`, so an unknown trade was drawn
as Plumbing and inherited its modes and commission basis), a declared category with no
tint of its own (Delivery's cyan), the chat room and its **thread key** (`PROVIDERS[0]`
and the demo resident — a provider answering one customer could be shown, and could
write into, the thread the plumber shares with somebody else), the resident's provider
detail (`PROVIDERS[2]`), and `pays[d.payIdx] || pays[0]` — which is what the *booking
record* took, not just the card, so the method painted was not the method stored.

**And the concierge invented a category.** Three sites fell back to
`CONCIERGE_SORTS[2]`, which is Plumbing, so a description it could not place — including
**a photo with no words beside it, which is every photo anyone would attach to a
broken thing** — was announced as "Briefing ready - shortlisted under plumbing", asked
whether the water was leaking continuously, and then opened a list of plumbers. §20 says
this prototype must not fabricate a diagnosis; it was fabricating one on the path with
no text in it at all.

### What it does now

`providerOf()` answers with a record-shaped stand-in that carries no identity — a record
rather than `null`, because the 54 call sites read fields straight off it and the point
is to change *whose* identity shows, not how many screens have to learn a new rule. The
signed-in lookup returns `null` and the dashboard and the opportunity radar say so in
their own words. An unknown trade is drawn on `--border` and `--text-secondary`, the two
neutral tokens, so it cannot become an eighth trade and cannot wear another's colours.
The room resolves its counterpart **from the ids on the thread** rather than from a row,
and a tap whose counterpart is not the job's other half is refused. A stale index is
clamped *and written back*, so the rail marks the row the money is computed from — the
listing rail had the same mismatch and silently priced one job while selecting none.
Accepting refuses when neither a provider record nor a listing prices the job, and the
check asserts the **reason**, because the same door also refuses a double-booked
provider and a check that passes on either message is half a check. The concierge
refuses to sort: the resident is told the words did not place, in two different
sentences for the two different cases (unsortable words, or a photo this prototype
cannot read), and is pointed at choosing the category themselves.

`jobsFromDevice` was written by `refreshReputation()` and read by nothing; the reputation
panel now states the jobs figure as what it is — the sample's count plus what finished on
this device.

### Numbers, and three mutants that were missed first

Gate **478 → 483** checks, all passing. `tools/falsify-identity-fallbacks.cjs`:
**19 mutants applied, 19 caught** — after the first run caught 11 of 14. Two of the three
misses were shallow checks: an assertion on `state.isChatOpen` cannot see a header naming
the wrong person, because the refused tap left every *other* field already correct, and a
room guard with two conditions passes while only one of them is exercised — so the room
check now also walks a thread whose provider id names nobody, which is where
`PROVIDERS[0]` used to walk in. The third miss was an **equivalent mutant**: with the
write-back in place, `pays[(d && d.payIdx) || 0] || pays[0]` reads the same row the clamp
just wrote, so no check could see it. That mutant was deleted rather than kept to make the
count look bigger.

Camera **60 → 61 screens.** The concierge's refusal is a state a thumb creates by typing,
so it is in the table (`concierge-no-match`) and was photographed at 320, 390 and 450. The
three new refusal *screens* — a chat room with no thread, a provider detail with nothing
selected, a dashboard signed in as nobody — are asserted by the gate and deliberately not
photographed: no tap reaches them, and a camera that walks to a screen nobody can enter is
measuring a fiction. Clean at all three widths on tap floor, contrast, clipping, off-scale,
under-nav, unnamed controls, occlusion, moving artwork, overflow and console errors; the one
known failure is unchanged and still open — **21 SVG chart labels at 320px paint at 12.4px
against the 14px floor §68 sets**, because a fixed `viewBox` scales its text with the
container. At 390 and 450 that count is 0.

`Sukinnect.html` is unchanged; `git diff --quiet origin/main -- Sukinnect.html` still
reports unchanged. **No device build was made from this pass, and the copy inside the
shell is now behind**: `Sukinnect-Android/app/src/main/assets/Sukinnect.html` is 770,173
bytes against this file's newer one, so the newest install — `Sukinnect-1.2-preview.11-debug.apk`,
`versionCode 13`, measured against the build output rather than remembered from this file —
does **not** contain the concierge refusal, the chat-room rule or the identity seam.
Re-syncing and rebuilding is the owner's call, and whatever it produces has to be described
in `DEVICE-PASS.md`, because git will never show that tree.

*(This paragraph first said `preview.9` / `versionCode 11`, taken from the entry above it
rather than from `app/build.gradle` and the outputs directory. Both builds named in this
file's own history had already been overtaken twice. A claim about what a device runs has to
be read off the artifact — which is the rule §31 records for every other number in this
project, and this session broke it in the paragraph that quotes it.)*

---

## 39. Four things the deck audit left open, decided and closed

The audit (§37) ended with three items named and none settled, and the owner answered all
of them on 2026-10-13 rather than let a future pass decide silently.

### The chart labels — fixed, and two instrument defects found on the way

21 SVG chart labels painted 12.4px at 320px against §68's 14px floor, because a fixed
`viewBox` scales its text with the container. The shapes stay in SVG; the words are HTML
positioned by percentage of the plot, and the plot is its own positioned element because the
drawing caps at 320 units — a percentage of a wider parent slides off the bar it names.

**The first version of the fix was wrong and only a probe caught it.** The axis labels went
into a grid column sized `max-content`, and a column whose every child is absolutely
positioned has no content to size it: it collapsed to zero width and hung all four tick
labels *outside the card* at 320, 390 and 450 alike. Nothing in the instrument saw that —
the text is not clipped, because nothing clips it; its contrast is fine; it is on the type
scale. So the camera now has a `chart labels painted outside their own chart box` tally,
proved by narrowing the gutter to 24px, which reports 4, and the gutter is a token
(`--chart-gutter`) sized from the widest tick the app actually paints rather than by eye.
The 3.5-unit baseline offset an SVG `<text>` needed also came across as every tick sitting
2.4px (at 320) to 3.5px (at 450) below the gridline it names; the ticks are centred on the
line now, and the alignment is measured rather than assumed.

**Two real defects in the measuring itself.** The off-scale tally treats 13.3px as
*on-scale*, because `14 - 13.3` is `0.6999999999999993` in floating point and the tolerance
is `< 0.7` — a form control's user-agent default sat inside the floor the check was written
to enforce. And the element walk skips anything with children, which is how it never once
looked at a `<select>`, whose words live in `option` elements. Six of the app's eight
dropdowns declared no font at all and painted 13.3px on two admin dialogs. Both are fixed:
a hard floor check separate from the scale test, form controls measured by what they paint,
and `select` given its size in the stylesheet so a filter added tomorrow cannot forget it.
Proved by removing the rule — the old tally reports 0, the new one reports 5.

### The two deck divergences — stated, not built

Slide 8 promises admin "User & category management". The console now says what it does not
manage, in a card where an administrator would go looking for it: resident accounts and the
catalogue are not administered here, and what is — verification, credentials, cases,
commission configuration, and money on completed work. The categories screen says its own
half: read-only, and the deck's other demand trades (events, beauty, personal care) are
absent on purpose, because §58 puts verified supply first and a tile a resident can tap with
no provider behind it is a claim about the marketplace rather than a service.

Neither gap was built. `gate 484 → 485` now asserts both statements are on the screens, so
a later pass that reads them as clutter has to fail a check to delete them.

**After:** gate **485 checks, all passing**; camera **61 screens** clean at 320, 390 and 450
on every tally including the two new ones; no console errors; `Sukinnect.html` still
identical to `main`.

---

## 40. The last two index reads, and the one persisted object the door never checked

Asked to continue, the same rule was applied where it had not yet been: the substitution
sweep had stopped at the two draft indices that happened to be noticed (`payIdx`,
`listingIdx`), and the storage door validated every record family while merging the profile
in with no check at all.

**Three reads were still bare.** `days[d.dayIdx].date` does not fall back when the index is
past the end — it throws, and the booking sheet never opens. `REQUEST_TIMES[d.timeIdx]`
yields `undefined`, which is stored on the job as the appointment time. And
`(savedAddresses || [address])[d.addrIdx]` is the trap the whole pass has been about in its
driest form: **an empty array is truthy**, so the `||` guard never fires, the rail paints
nothing to choose, and the next request records `address: undefined` — a visit with no door
that the resident discovers when nobody arrives.

One resolver now reads the draft (`requestChoices`), clamping each index into the list
actually painted and writing the corrected index back, so the rail and the record cannot
disagree. `requestAddressBook()` keeps only non-empty strings and falls back to the home
address as a *fallback*, not as a second source. When there is genuinely no address
anywhere, the sheet says so in the space the rail would have occupied and the send is
refused before it starts — asserted with a control on the other side, because a door that
refuses everything passes this check too.

**The door now checks the profile.** `hydrate()` refused a booking with an unknown status,
an offer with an unknown state, a ledger line naming no account and a child record naming no
booking, then did `Object.assign(state.profileData, snap.profileData)` — so a dump carrying
`savedAddresses` as a string threw on `.map`, and one carrying `rateCentavos` as `"35000"`
walked into money arithmetic. The seed decides what each field may be, and the field list is
*derived from the seed* rather than written out again here.

**One mutant survived the first run of this, and it was the check's fault.** The door was
first written as one predicate: `!(k in seed) || kind differs`. A key the seed does not have
has kind `undefined`, so the unknown-field rule was redundant — the mutant that deleted only
that condition still failed the gate, but failed it *because of the other rule*, which means
the check named `a dump cannot teach the app a field it never had` had never tested that
thing at all. Split into two rules with two distinct reasons, the mutant is now caught by the
check it targets. This is the §31 lesson again: a check that cannot tell which of its two
conditions fired is half a check.

**After:** gate 485 → **490 checks, all passing**. `tools/falsify-identity-fallbacks.cjs`
grew to **24 mutants, 24 caught** (23/24 before the door was split). Camera **61 screens**
clean at 390 and 450; the first 320 run reported two console errors, both
`net::ERR_NAME_NOT_RESOLVED` from the tile CDN rather than the app, and the re-run of the
same sweep reported none — recorded because a flaky network is not a defect, and quoting only
the clean run would hide that it took two.

---

## 41. One statistic, two questions: "Live bookings 10" was six jobs and four requests

The next sweep asked a different question than the id hunt did — not *whose record is this
screen painting* but *does any number appear twice meaning two things*. A probe printed the
pairs side by side (`tools/probe-count-pairs.cjs`), and the first three DIFFs it reported were
the probe's own fault: it guessed `k.cases` when the field is `k.liveCases`, compared a
credential **label** ("2 of 4 expiring soon") against a **state** ("Expiring soon"), and looked
for a notifications nav badge that does not exist — the resident's unread bell is a
`aria-label`, not a count. All three were corrected before anything was concluded, which is
the §31 discipline pointed at a probe instead of at the app.

**The real one.** `adminCounts().open` is 10, and it is printed under the label **"Live
bookings"** in two places. It is `!FINISHED_STATES && !disputed` — which is six bookings a
provider has accepted **plus four requests nobody has answered**. The app separates those
everywhere else: `statusColors` deliberately refuses to give a request the blue that ongoing
work means, "because nothing has been agreed yet". The dashboard tile folded them back
together. And its `aria-label` said *"Open marketplace intelligence, where the 10 live
bookings are counted"* — a promise the destination does not keep: that screen counts bookings
inside a date window, which on the demo records is **11**, a different question answering to a
different number. An administrator following the tile's own pointer would not find the number
they came with.

Now `adminCounts` returns `agreed` and `waiting` beside `open`, the tile prints `agreed` under
**"Bookings in progress"**, the four unanswered requests are named in the caption beneath the
grid rather than hidden inside a bigger number, the workload ring's part is called **Open
work** (which is what 10 actually is), and the aria-label states what the destination counts
instead of promising a match. The gate moves one request into the accepted set and requires
`agreed` to rise by one, `waiting` to fall by one, and `open` to hold — so the two figures
answer to their own statuses, not to each other.

**A false alarm worth recording.** `intelligenceStats({days:30})` came back with `bookings: 0`
and looked like a fifth disagreement. It is not: `bookingsInWindow` filters on
`f.category === 'all' || providerOf(b).serviceId === f.category`, so a filter object without
`category` silently drops every row. The screen's own default (`state.adminIntFilters`) always
carries it, so no user sees this — but a helper that reads a missing option as "match nothing"
is one careless caller away from reporting zero marketplace activity, which is the kind of
number nobody questions. Left as-is; recorded so the next reader does not chase it, and so a
future change to that signature knows what depends on it.

**After:** gate 490 → **491 checks, all passing**. `tools/falsify-count-labels.cjs`: **6 mutants
applied, 6 caught**. Camera **61 screens** clean at 320 and 450 on every tally with no console
errors, and the dashboard was read back from a screenshot at 390 — a caption that only
*computes* correctly has to also not turn the section into a pile of small grey text.

---

## 42. Nine actions said "saved". Four checks could not fail.

The next sweep asked what the app claims about a reload. `tools/probe-write-claims.cjs`
calls a handler and then asks whether the **bytes in storage changed** — not whether the
source mentions `persist()`, which is true of every handler that reaches one indirectly.

**Ten writes never happened.** A typed chat message, a household item, a portfolio entry,
a concierge answer, an administrator's note on a provider, a flag on an account, a document
request, and both roles' notification checkboxes. Six of those fields were not snapshot keys
at all, so even a later `persist()` would not have carried them. Two claims are sharper than
the rest: `sendChatMessage`'s own comment has always said a message is "stored rather than
appended to the screen and lost on the next render" — it survived a render, not a reload; and
the portfolio's **Save Work** button read two inputs, wrote neither, opened a modal that
printed "Changes saved successfully." and left the list empty. That is the §63 claim this
project keeps having to take back, sitting in a button label.

**The audit log stamped every row `Sep 10, 2026 / 2:42 PM`.** Two actions a minute apart
were indistinguishable, and the array lived in state nothing stored, so the record §29 exists
to keep was both wrong and temporary. Rows now carry `at: Date.now()` and the acting
administrator's name, the log is a snapshot key held to the door like the rest, and
`SCHEMA_VERSION` went **15 → 16** because a v15 dump carries typed-date rows that nothing on
disk can tell from real ones.

**And four of this session's own checks could not fail.** `makeChecker().check(label, cond)`
coerces with `!!cond`, and I had written `c.check('…', () => { … })` — an *un-invoked* arrow,
which is a function, which is always truthy. Four checks were like this (the reload check, the
audit stamp, the chart-labels guard, the admin-disclosure guard), and the falsifier proved it:
**0 of 9 mutants caught**, with every named check "passing anyway". The harness now throws
`check("…") was handed a function, not a verdict` — which is how the two older ones surfaced,
since they had been green since the moment they were written. A check that has never been seen
to fail is a counter, not a guard.

**Two more tooling defects the re-run exposed.** A mutant in
`falsify-verification-records.cjs` had a needle pinned to `SCHEMA_VERSION = 14`; that value
moved to 15 a week ago and the mutant has been reporting NOT APPLIED ever since, quietly
un-testing the doubled-CR guard — now anchored on the store key instead, because a version
number is the worst possible anchor for a needle. And *the reopen path had no reload check at
all*: the mutant that deletes its writes passed the whole suite, which is a coverage gap, not
an equivalent mutant — so `a reopened application stays reopened after a reload` exists now
and the mutant names it.

**The audit log screen had never been photographed.** It sits one tap off the dashboard, was
in no table, and its timestamps are precisely the thing only a screenshot can confirm: the
first capture reads `Oct 13, 2026 - 5:59 PM` on a UTC-11 machine. Camera **61 → 62 screens**,
reached by clicking the row a person clicks.

**After:** gate 494 → **495 checks, all passing**. `tools/falsify-saved-claims.cjs`: **10
mutants, 10 caught**, after 0 of 9 the first time. `falsify-verification-records.cjs` 10/10
after two of its mutants were repaired. Nine other families re-run unchanged: identity
fallbacks 24/24, profile honesty 11/11, trust 6/6, history 6/6, admin records 5/5, reputation
5/5, service area 4/4, id substitutions 4/4, storage truth 5/5, modal stacking 3/3, count
labels 6/6, escaping 6/6, tap floor 4/4. Camera **62 screens** clean at 320, 390 and 450.

## 43. Every family re-run, and the thing that had drifted was the prose about it

The rule this project already holds is that a mutant family has to be re-run after any change to
the code it targets, because a passing suite is not evidence that a *check* works. Seven sweeps
moved a great deal of code, so every family ran again. **115 mutants applied, 115 caught, zero not
applied** — `node tools/falsify-all.cjs` is the command, and it is new, below. Nothing had silently
gone stale, which is the good outcome and not one anybody could have claimed from reading source.

What had drifted was the documentation about it, in three places:

- **AGENTS.md credited `falsify-profile-honesty` with 9 mutants.** That family applies **11** today.
  §42 recorded the growth; §31 was never told. Corrected in place, with the reason it grew kept
  because it is the point: a later screen added another button of the same kind.
- **README said the rebuild's display face is Fraunces.** `Sukinnect-next.html` sets
  `--font-display:var(--font-ui)`, and its `--font-ui` opens with `"Atkinson Next"` — the serif
  appears in the file exactly once, inside the comment explaining why it is not used. The same
  section also claimed 40 reachable icon names where `node tools/measure.cjs` prints **38**, a
  camera table of 40 screens where `node tools/shot.cjs --list` prints **62**, and a storage
  warning shown "on the money console" that has been a standing banner above every screen since
  §42.
- **README quoted "twenty-six targeted breaks"** where the suite is at 115. The number is gone and
  the command that prints it is in its place, which is the same remedy §31 found for the token
  counts: a figure kept in prose is the next figure that is wrong.

**§68's typography rule was pinned by nothing.** The document said the rebuild removed the
decorative serif from headings and runs one sans family in four self-hosted weights, and no check
said so — `--font-display:"Fraunces", serif` would have reversed the redesign in silence, and the
gate would have stayed green because the rule lived only in a paragraph. The worse half of that
class is a font file that is not there: a browser does not raise it, it falls back, the page paints,
every render check passes, and the camera goes on measuring contrast and tap geometry on a face the
application never loaded. Seven checks in the `hygiene` suite now read `fonts/fonts.css` from disk
and assert that every `url()` resolves to a file which exists and is not a placeholder stub, that
the first family `--font-ui` asks for is one the stylesheet actually declares, that this family
carries the four faces §68 claims, that no rule names a family directly instead of going through
the two tokens, and that `--font-display` is an alias. `node tools/falsify-typography.cjs` proves
them — a dangling woff2, a face pointed at the 479-byte `ATKINSON-AUTHORS.txt` sitting beside it, a
renamed first family, one weight renamed away, a sheet titling itself in a typed family, and the
alias going back to the serif: **6 applied, 6 caught**. Gate 495 → **502**.

**`tools/falsify-all.cjs`** runs the families in one sequential pass — sequential because each
family rewrites the app file and restores it in a `finally`, so two at once would measure each
other's mutants — and prints per family: applied, caught, not applied, missed. Its first run said
six families had "printed no summary", and that was its own defect: the pattern matched
`failed to apply 0` and not `not applied 0`, and six of the sixteen spell it the second way. Worth
recording as the shape a tool should fail in, because it is not the shape most do — an unparseable
family was flagged as unproven rather than counted as zero, so the run's total came out visibly
wrong instead of quietly right. It also found itself until it was excluded from its own glob:
`falsify-*.cjs` matches `falsify-all.cjs`, and a runner that spawns itself nests a whole gate suite
per mutant per family.

**No shipped bytes changed.** `Sukinnect-next.html` is identical to the commit before this pass —
800,763 bytes, 11,124 lines, 11,124 CR, no doubled carriage return — proven with
`git diff --quiet HEAD -- Sukinnect-next.html`, and intact after 115 apply-and-restore cycles. That
is why the camera was not run again rather than why it passed: the 62-screen three-width sweep
recorded at the end of §42 measures these exact bytes, and repainting them would produce the same
numbers at several minutes' cost. It is also why there is no new device build. The handset pass is
still owed against `1.2-preview.15`, and nothing in this pass could change what it finds.

## 44. Every instrument run the way it is meant to run, and three of them were lying

The camera and the gate had both been re-measured, so the next untested surface was the other tools
in `tools/` — the probes and audits every finding in this change log was eventually confirmed with.
None of them had ever been run as a set. `node tools/probe-all.cjs` does that now.

**Eleven of twenty-one came back broken, and ten of the eleven were the runner's own mistake.**
The suite holds two kinds of probe and nothing recorded it: `probe-*.cjs` and anything that requires
`harness.cjs` boots the app in Node, while a `probe-*.js` that is one expression ending `})()` is
evaluated inside a real page by `shot.cjs --probe=@file`. Run the second kind with plain node and it
dies on `document is not defined`. The classifier first guessed by which page globals a file
mentioned and mis-read `probe-reputation.js` as a Node script — it reads records, not the DOM — so
the rule is now the shape of the file: one expression, no `require`, therefore in-page. The runner
also globbed itself, which is the same self-spawn bug `falsify-all.cjs` found in itself the same
afternoon. Final state: **21 probes, 0 needing attention.**

**The count-pairs probe had been printing a fabricated disagreement.** It read the provider's
Bookings badge out of `#screen`, but `render()` paints the nav bar into `#navbar` and deliberately
leaves it there so the active pill glides instead of blinking — and it set `state.tab = 'dash'`,
which is the word printed on the button, not the value the nav answers (`dashboard`), so the screen
it read was empty. Then the part worth generalising: over an unread needle the probe wrote `|| 0`. A
missed match and a real zero print identically, so one instrument can both invent a defect and swear
there is none. The row now reads the container that holds the badge, says *"no badge is painted"*
rather than answering zero, and the resident row compares the bell's dot and its `aria-label` against
the notification list — because the resident's nav carries no count at all, and the old row had been
comparing a badge that does not exist to a list that does. Whether the new pair can fail was tested
by moving a request out of the waiting set: the badge followed it, 2 to 1, which a hard-coded number
would not have done.

**Half the roster was never being checked.** The credential-summary loop compared the count in a
label against the documents behind it, but read only the `2 of 4 expiring soon` shape — and four of
eight providers are labelled `All 3 valid`, so those four were skipped in silence while the probe
printed a clean run. It now reads both shapes, prints a DIFF for a label it cannot parse instead of
skipping it, and states how many providers were compared. `node tools/falsify-credential-pair.cjs`
proves the widened comparison — **3 mutants applied, 3 caught**, and it refuses any needle that
matches more than once rather than editing whichever function happens to come first. The first
attempt at that proof reported one mutant MISSED, and the mutant was the fault:
its needle, `const creds = credentialsOf(providerId);`, appears twice in the file, so `replace`
edited a different function and the check correctly found nothing wrong — and a CRLF file cannot be
disambiguated by putting a newline in the needle, which is the rule the falsifier families already
print in their own headers.

**Three camera sweeps, every tally zero** — run again here even though §43 argued they were
redundant, because the owner asked for the measurement rather than the argument. 62 screens at 320,
390 and 450 CSS px: no control under a 44px tap target, no text below WCAG contrast, no clipped
copy, no font off the scale, no text under the 14px floor, nothing painting over an open modal, no
map pane escaping its frame, no category artwork moving, no unnamed control, no image that asked for
a file and got no pixels, no console error on any screen, no horizontal overflow, nine painted sizes
starting at 14.

**One more hand-kept figure caught stale.** §31 said `TILE_URL` costs 448 requests per 390px sweep;
the camera's own `requests that left the device for a network` line reads **942** today, 699 at 320
and 1,023 at 450. The map-bearing screens added since then explain the growth. The paragraph now
quotes the tally it came from instead of the number.

**The camera had been leaking 19 MB a run.** Checking the final state found **157**
`suki-shot-*` folders in the user's temp, **2.97 GB** accumulated across a week of sweeps. The tool
already tried to delete its own profile and gave up politely when Chrome still held a handle after
`SIGKILL` — the EPERM note that prints at the end of a run was the sound of a leak nobody came back
for, because only that run ever knew the folder's name. `reclaimAbandonedProfiles()` now sweeps by
prefix at the start of every run and skips anything touched in the last hour, so a live run's own
folder is never the one deleted. Proved in a simulated temp rather than against the real one: three
seeded folders — two hours old, one fresh, and one that is not the tool's — and the run reclaimed
exactly the first, then leaked a new folder of its own that the next sweep will get. Deleting the
157 existing folders is a separate, deliberate act, not a side effect of a screenshot run.

**No shipped bytes moved, again.** `Sukinnect-next.html` is identical to HEAD through all of it — the
app gained nothing this pass, the instruments did. Worth noting where the work stands: PR #2 was
merged into `main` at 10:44Z, so the rebuild is on `main`, while the commits from §43 and §44 sit on
the merged branch and need their own pull request to reach it. *(Written before that landed: PR #3
merged at 12:36Z and PR #4, the camera's profile sweep, merged at 13:14Z, so `main` now carries all
of it. Left as written because a change log that rewrites its own status lines is a change log nobody
can trust — the correction belongs here, not inside the sentence.)*

## 45. Two modes nobody had measured, and one file no instrument can see

**The rebuild had only ever been painted in app mode.** §37 and §46 both make claims about the other
states — that app mode can fall away to a desktop preview shell, and that the category artwork stays
still *whether or not the device asks for reduced motion* — and no run this session had exercised
either. Both swept now at 62 screens, every tally zero: tap floor, WCAG contrast, clipped copy,
off-scale and under-floor type, content under the nav, unnamed controls and unnameable fields,
distorted images, escaping map panes, anything painting over an open modal, moving category artwork,
images that got no pixels, console errors, horizontal overflow, nine painted sizes starting at 14.

Identical numbers across two modes are exactly when to suspect the instrument, so the modes were
verified rather than assumed: the reduced-motion run prints `emulating prefers-reduced-motion:
reduce` on its first line, the desktop run's PNGs measure **2560×1800** — a 1280×900 window at a
device scale of 2, which app mode at 390 never produces — and the same screen reports a different
scroll figure in each (`resident-home`: 543px in app mode and under reduced motion, 693px in the
desktop shell). The two runs were genuinely two layouts.

**The shipped `Sukinnect.html` is measured by nothing, and that is now written down** in §31 rather
than left to be inferred. Its static shape is known and re-checked — `node tools/measure.cjs
Sukinnect.html` agrees with every figure the master prompt quotes for it, 4,707 lines, one `:root`,
86 tokens with 9 never reached, 1,138 `var()` uses, 75 hex strings outside the block. The painted
surface is not, and no flag fixes that: pointing the camera at the file boots it
(`providers 6 | bookings 0 | store no Store | schema v?`) and then dies on the first step of the walk
because the `SCREENS` table calls seventeen functions the shipped file does not have — `resetDemoData`,
`openChatThread`, `bookingsForResident`, `applyProviderIdentity`, `openProfileSection`, `openMakeOffer`,
`answerOffer`, `reviewOf`, `openCaseSheet`, `clickPainted` among them. A shipped-file walk would be a
second table written and proved separately, so the gap is recorded instead of built, and what it means
is stated plainly: the floors the rebuild earned are proven for the file that ships *after* promotion
and unproven for the one a reviewer opens today.

**Two loose ends closed by measurement, not by memory.** The camera's new profile sweep ran for real
and reclaimed the nine folders the earlier deletion had kept as too young, taking the temp from
**2,971 MB down to 66 MB** — two folders, both created inside the last hour and therefore still
entitled to exist, which is exactly what the hour floor is for; and the Git LFS assets were checked
rather than trusted — `reicon.js` 8,344,694 bytes, the deck PPTX 10,545,446 and PDF 15,767,289, the
logo 264,808, none of them a pointer stub, which is the failure mode the README's own clone warning
describes.

**No shipped bytes moved, for the third pass running.** `Sukinnect-next.html` and `Sukinnect.html`
are both identical to `main`; `node tools/verify.cjs` still reports 502 checks.

## 46. The handset pass was attempted, and the parts that do not need a phone got proved instead

Asked for the pass on `1.2-preview.15`, so first the device: `adb devices` answered with an empty
list, checked repeatedly across two attempts, server started and stopped each time. **The pass is
blocked on hardware, not on anything in the repository**, and it is recorded as blocked rather than
as done — the eight thumb checks in §3f, the feel of the keyboard arriving, and one-handed reach
still need the phone in hand.

What can be proved about the artifact without one was proved, because "the build is current" is the
kind of claim that has been wrong before in this project:

- `aapt dump badging` → `com.sukinnect.app`, `versionCode 17`, `versionName 1.2-preview.15`, label
  `Sukinnect · preview`, minSdk 24, targetSdk 36.
- `unzip` + `cmp` on the APK's `assets/Sukinnect.html` → **byte-identical to the file on `main`**,
  800,763 bytes. This is the check the change log says must be run against the artifact rather than
  the staged copy.
- The APK carries all four Atkinson WOFF2 weights plus the Jakarta fallbacks, the logo, seven
  category PNGs, the avatars and vendored Leaflet — 57 asset entries. That matters because §68's new
  font checks prove the *stylesheet* is honest; only the package contents prove the handset will
  actually load the face rather than silently fall back.
- The owner's decision on install is recorded in the task: `install -r`, and the amber refusal
  notice on a v15 dump is treated as the expected first-launch state rather than a fault.

**Then the keyboard-height viewport, which had drifted out of date.** `DEVICE-PASS.md` proved the
keyboard case at (360×380) for the seven sheets, and its focus row still said "All 46 screens now
pass" — the table holds **62**, so sixteen screens had never been seen at keyboard height. The whole
walk was run there: no control under the nav, no clipped text, nothing painting over an open modal,
no unnameable field, no console error, no horizontal overflow. The mode was verified before the
numbers were believed — 720×760 PNGs, and `resident-home` scrolling **1,065px** at this height
against 543px at 390×844 — because identical tallies across runs is exactly what the reduced-motion
and desktop sweeps taught me to distrust.

**Three hand-kept figures in the live documents caught in the same sweep of prose.** `DEVICE-PASS.md`
opened by saying the rebuild was rendered in Node with "415 assertions" and painted "at 360×640 and
390×844 across 46 screens" (now 502 checks, 62 screens, at 320/390/450 plus keyboard height, desktop
and reduced motion); and AGENTS.md §31 described the instrument as running "across all 60 screens" while naming only some
of the checks it actually reports. Both corrected to what the tools print, and the §31 list now names
the form-field, no-pixels and chart-escape tallies it had stopped mentioning.

**No shipped bytes moved, for the fourth pass running.**

## 47. Asked whether anything is left, everything was re-measured and one more caveat closed

The question was whether the system is complete before the handset is touched, so the answer had to
come from running things again rather than from listing what was done earlier.

**Where the repository stands.** PR #6 merged at 23:09Z; `main` is at `f28a82f` and
`git log origin/main..HEAD` is empty, so nothing written this session is stranded on the branch.
Working tree clean, gate **502 checks**, and both app files identical to `main`.

**Two instrument checks that had never been run in combination.** `node tools/falsify-all.cjs
credential` proves the runner discovers the family added in §44 — 3 mutants applied, 3 caught,
0 not applied — which matters because a family the runner cannot parse is silently absent from its
own headline. Then `node tools/probe-all.cjs` over the current tools: **21 probes, 0 needing
attention**.

**The last honest caveat in `DEVICE-PASS.md` is now a measurement.** The focus row said the caret
probe exercises two screens and that a wider walk was "unmeasured, not passing". Run with no
`--only`, it walked **all 62 screens, typed into 47 visible fields, lost focus on none, threw
nothing, and left no value unrestored**. One precision kept deliberately: the probe takes the first
four fields per screen (`els.slice(0, 4)`), so 47 is not every input in the app, and the row does not
claim it is. *(Closed in §49: the cap was removed once the population was measured at 69, and the
walk now covers all of it — which is the better outcome than annotating a sampled claim forever.)*

**Hygiene, measured not assumed.** Four tracked files exceed 500 KB — the deck PDF and PPTX and
`reicon.js` under Git LFS, and the 800,763-byte app itself — and all four are meant to be there; zero
`TODO`/`FIXME`/`XXX`/`HACK` markers survive anywhere in the app or the 73 files in `tools/`.

**The profile leak is bounded, not cured, and the second claim was retracted.** Re-measuring temp
after the instrument runs found **11 more folders** despite the sweep added in §45 — because the
sweep only fires at the START of a run, so a burst of twenty runs inside one hour still makes twenty
folders. `Browser.close` was then tried as the actual cure. Over four clean single-screen runs it
**failed three of four times**: the delete still threw EPERM and the count kept growing. It stays in
the tool because it costs 1.5 s at most and sometimes the delete then succeeds, but the honest
statement is that `reclaimAbandonedProfiles()` bounds the backlog while each run still usually leaks
a folder until the next run comes for it. Two smaller lessons sit inside that: an earlier two-run test
where the count stayed flat was treated as proof, and two runs was far too few — the claim was
retracted the same session it was written. And the 707 MB that was deleted just now went on
**ownership rather than age**: a live-Chrome query showed no running browser named any of the 27
folders, whereas the hour floor would have left all of them for another day.

**What is genuinely still open, and why.** Four things, and none of them is a defect I can fix by
typing:

1. **The handset pass.** Blocked on hardware — `adb devices` empty across three separate looks today.
   A thumb, a keyboard arriving, and a slow device are the three categories no instrument reaches, and
   the eight §3f checks remain the gate on promotion.
2. **`netlify.toml` publishes the whole repository root.** `publish = "."` with `/` rewritten to
   `Sukinnect-next.html` means the deployed site also serves the pitch deck PDF and PPTX, `AGENTS.md`,
   the four prompt documents and `schema/` — anything in the repo, at a guessable path, publicly. This
   arrived through PR #1, was flagged in PR #2's description, and got merged without a decision; no
   project document recorded the exposure until this paragraph. *(Closed in §48 the same day: the
   deploy publishes a built subset instead of the repository root.)* The README documents the rewrite and
   says nothing about what else it makes readable.
3. **Four recorded owner decisions** — the type fold cost, generated-art provenance, `px` rather than
   `rem` tokens, and the `Brgy. Barangay 4` label.
4. **Promotion has not happened, and merging is not promotion.** `main` now contains the rebuild
   because three PRs landed, but `Sukinnect.html` is still the shipped prototype, byte-identical to
   what it was before any of this. "The rebuild is merged" must not be read as "the rebuild ships" —
   the file a reviewer opens today is still the one §31 says no instrument paints.

## 48. The deploy no longer serves the repository

§47 left one concern the owner had been told about but never asked to decide. Asked, the choice was a
built subset rather than a blocklist, on the reasoning that a blocklist leaks by default: the first
new file at the root is public until somebody remembers to list it.

`tools/build-web-dist.cjs` copies the served surface — the two HTML files, the logo, `assets/`,
`avatars/`, `fonts/`, `leaflet/` and `reicon.js` — into `dist/`, and `netlify.toml` now builds and
publishes that: **60 files, 11,141 KB**, where the root additionally carried the deck's 26 MB, `AGENTS.md`,
`CHANGES.md`, `README.md`, `DEVICE-PASS.md`, three prompt documents, `schema/`, 73 tool files and
`.gitignore`.

Two properties make it more than `cp`:

- **The list is checked against the application.** Every quoted `.css/.js/.png/.woff2` path in both
  HTML files must resolve inside `dist` — including the ones reached only through `SERVICE_ART`,
  `PRO_PHOTOS` and `VERIF_PHOTOS`, which are quoted literals in those maps. Proven by breaking it:
  with `'avatars'` removed from the serve list the build exits **1** reporting **17 of 29** referenced
  paths missing, printing the first twelve and the true count on the summary line. And the check paid
  for itself the first time it was run — `Sukinnect.html` loads `reicon.js`, so the version of this
  that shipped without it would have published the older prototype with no icons anywhere, on a page
  that boots perfectly well without them.
- **Presence is not content.** `reicon.js` is under Git LFS, and a clone made without `git lfs install`
  leaves about 130 bytes of pointer text in its place. `existsSync` accepts a pointer, so the build
  reads the bytes and refuses one. Proven on a crafted stub. The second branch's exit path is the same
  `if` shape as the first, whose code was measured live rather than inferred.

**Then the subset was painted, not audited.** `node tools/shot.cjs --file=dist/Sukinnect-next.html
--measure` walked all 62 screens out of the built directory: **zero images asking for a file and
getting no pixels**, zero console errors, nothing under the tap floor, no contrast failure, no clipped
text, no unnameable field, no escaping map pane, no moving category artwork, no overflow, nine painted
sizes starting at 14 — the same tallies the repository root produces. Relative paths survive because
`dist/` mirrors the directory names the app asks for, which is precisely why `publish = "."` had felt
convenient and was in fact the whole exposure.

**What is not proven, stated plainly.** Netlify was never contacted: that their image runs the build
command, and that it fetches LFS objects before doing so, is expected rather than tested. `reicon.js`
is the only LFS file in the served set, and the build now fails loudly if it arrives as a pointer,
which is the best available stand-in for a deploy nobody has run from this machine.

**No shipped bytes moved.** Both HTML files inside `dist` are `cmp`-identical to the ones on `main`,
and the gate still reports 502 checks.

## 49. A sampled claim stopped being reported as a census

The handset was polled for six minutes and never appeared, so the pass stays blocked — recorded, not
worked around. What could be closed meanwhile was a number I had written myself the previous day and
left imprecise on purpose: `DEVICE-PASS.md` said the caret walk covered **47 fields with zero focus
loss**, which is true, and which reads as though the app had 47 input fields.

**Getting the denominator was itself the lesson.** The first attempt passed the probe expression
inline through `--probe='…'`; the shell mangled it, every one of the 62 screens printed
`probe failed … SyntaxError: Unexpected token ')'`, and my aggregator — written in exactly the careless
shape this change log keeps documenting — reported **"visible fields across them: 0"**. A run in which
nothing was measured produced a clean, confident zero. Rewritten as a real file,
`tools/probe-field-population.js`, with an aggregator that exits `NO CONCLUSION` when it parses
nothing, it reports **69 visible fields across the 62 screens**: 25 `number`, 21 `text`, 16
`textarea`, 3 `checkbox`, 2 `password`, 2 `file`.

**Then the sample was replaced by the whole population instead of documented as a sample.**
`probe-caret.js` capped itself at four fields per screen — a caution about side effects, not a
finding — so the cap was removed and the walk re-run: **69 fields typed into, which is exactly the
population the other probe counted independently**, none losing focus, none erroring, none left
unrestored. Two instruments agreeing to the unit is what makes the walk demonstrably complete; a count
that merely equals a cap would not.

**Inventory after the change:** `node tools/probe-all.cjs` runs **22** instruments and reports **0
needing attention**, the new probe discovered and classified as an in-page expression alongside the
other eleven of its kind. §47's "47 fields" sentence is annotated where it stands, and the
`DEVICE-PASS.md` row that carried it now states 69 of 69.

**No shipped bytes moved** — three tool files and two documents, and the gate still reports 502 checks.

## 50. The shell has a Call button that dials nothing, and the check named after it reads markup

With the handset still absent, the one surface no instrument reaches was reviewed by reading it:
`Sukinnect-Android/app/src/main/java/com/sukinnect/app/MainActivity.java` — the untracked shell that
already hid one defect of exactly this shape, the photo button with no `WebChromeClient` that worked
in every browser and did nothing on a phone.

**The page offers two `tel:` controls.** `href="tel:${DEMO_HOTLINE}"` appears twice
(`+639170001122`), and the shell set `web.setWebViewClient(new WebViewClient())` — a bare default.
Android's WebView does not hand an unknown scheme to the system: it *navigates* to `tel:+63…`, fails
it with `ERR_UNKNOWN_URL_SCHEME`, and replaces the running prototype with a system error page. In a
desktop browser the same click works, because the browser gives the scheme to the OS before the page
notices — which is why no instrument in `tools/` could ever have seen this.

**And the gate has a check called "a call control dials" that cannot see it either.** It asserts
`(body.match(/href="tel:/g) || []).length >= 2` — the markup exists. A control pinned to its own
presence, the same shape as a check that counts a label instead of a verdict, and the behaviour it
names lives in a file the gate never loads. The label is now **"the page paints a dial control
carrying the number on the record"**, because the old name promised a verdict the assertion cannot
reach, and the dialling itself is a §3f check on the bench.

The fix is in `MainActivity`: `shouldOverrideUrlLoading`, both overloads, routes any scheme that is
not http/https/file/data/about/blob out to an `Intent` — `ACTION_DIAL` for `tel:`, deliberately not
`ACTION_CALL`, because dialling asks no permission and placing a call does. A scheme no app on the
device can take is swallowed rather than navigated, so the failure mode is a button that does nothing,
not an app that disappears. The evidence available without a phone: `javac -cp
android-36/android.jar` compiles clean, apart from the expected deprecation note on the `String`
overload kept as a backstop. It reaches a handset only in a **new build**, and the §3f item added
alongside this asks the bench to confirm the dialer opens pre-filled, that returning lands on the same
screen, and that no error page appears.

**One stale instruction found on the way in.** §3f told the bench "`SCHEMA_VERSION` is 15" while the
app has been at 16 since the reload pass — so the sentence describing the refusal notice mis-named the
first thing a phone holding an older dump would see. Corrected, and now says plainly that the amber
notice on that install is the notice working, not a fault.

**No shipped bytes moved.** This change lives in the gitignored shell and in `DEVICE-PASS.md`;
`git status` will never show the first half of it, which is precisely why the checklist carries it.

**The shell fix was then built and proved at the level it can be proved.** `1.2-preview.16`
(`versionCode 18`, 2,131,290 bytes, `aapt dump badging` read off the artifact) — **no page bytes
moved**, so the bundled asset is the same 800,763 bytes `cmp`-identical to the file on `main`, and
`Sukinnect-Android/tools/check-assets.cjs --apk` resolves all 48 paths the page asks for inside the
APK. The dial routing was confirmed in the **shipped bytecode**, not the source: `dexdump -d
classes2.dex` shows the compiled method holding `"http" "https" "file" "data" "about" "blob"`, then
`"tel"`, then `"android.intent.action.DIAL"`. Two things nearly went wrong in the checking, and both
are the same shape as everything else in this log. The first build attempt **failed** in
`:app:packageDebug` with an IOException snapshotting an intermediate — a OneDrive placeholder under
a synced tree, not the change; clearing `app/build/intermediates/incremental/packageDebug` gave
`BUILD SUCCESSFUL in 8s`. And the first bytecode check grepped `classes.dex`, came back **zero** for
all three strings including one the code certainly contains, and read as "my fix is missing from the
APK" — because `classes.dex` here is a 2,156-byte stub and the application is in `classes2.dex`.
Search every dex, or disassemble; a file that contains nothing also matches nothing.

**The whole mutant suite was re-run across this, and it is clean:** `node tools/falsify-all.cjs`
reports **17 families, 118 mutants applied, 118 caught, 0 not applied, 0 missed** — the two new
families from §43/§44 (typography, credential-pair) included alongside the fifteen — and
`Sukinnect-next.html` came out `git diff`-identical after 118 apply-and-restore cycles. The gate
reports 502 checks with the dial control renamed. What that number does *not* cover is the shell:
`MainActivity.java` is outside every instrument in this repository, and its proof today is a clean
`javac` and a checklist item, nothing more.

## 51. Sweeping the class the dial bug belonged to found a caption that lied and a parser that lied

Asked whether anything was left before the handset work, the honest move was to sweep the whole
category the `tel:` defect belongs to — every browser capability the page might expect the shell to
mediate — rather than answer from a list.

**The category came back clean.** `tel:` is the only non-web scheme in the page (2 occurrences, both
handled now). And nothing else asks the phone for anything: `target="_blank"` 0, `window.open` 0,
geolocation 0, clipboard 0, `requestFullscreen` 0, `navigator.share` 0, vibrate 0, service workers 0,
IndexedDB 0, `getUserMedia` 0, `FileReader` 0. The 54 "Notification" hits are the app's own
`NOTIFICATIONS` records, not the web API — checked rather than assumed, because a grep that flatters
a clean bill is worth as much scepticism as one that finds a defect.

**What the sweep did turn up was a caption.** The concierge button said **"Analyze the text and
photo"**, while two other screens state plainly that the prototype cannot do that: *"This prototype
keeps the picture on your device. Nothing is uploaded, so the provider sees the name you gave it, not
the photo"* and *"This prototype does not read pictures, so a photo on its own cannot be sorted."* The
handlers keep `file.name` (the fruit draft also `sizeBytes`) and render no thumbnail anywhere. §75
asks media interactions to include a preview, so a gap exists — but the gap that misleads is the
label, not the absent thumbnail, and it is now **"Prepare the job briefing"**, which is what the
in-flight state ("Preparing the job briefing…") and the result ("Briefing ready") already call it.
The owner chose the relabel over building a preview; §75 records the limit, so nobody "fixes" the
mismatch by making the copy claim more. Verified in the painted page, not the source: a probe reads
`{"text":"Prepare the job briefing","w":328,"h":49}` — above the tap floor, inside the screen.

**Chasing the probe twice found a real bug in the camera.** That inline probe failed twice with
`page threw: SyntaxError: Unexpected token ')'`, and both times the failure was blamed on shell
quoting. It was `shot.cjs`'s own argument parser: `flag()` did `hit.split('=')[1]`, so
`--probe='(function(){var b=…})()'` reached the page truncated at its first `=` — as
`(function(){var b`. Every inline expression containing an assignment, which is nearly all of them,
was silently amputated and the tool reported the *page* as faulty. Fixed to slice after the first
`=`; the same command that failed twice now answers. The lesson is the one this log keeps learning:
**a surprising error is a reason to read the instrument, not to route around it** — routing around it
twice is what let it survive.

**Re-measured, because this was the first change in several passes to move app bytes** (two bytes, the
label): camera at 320 / 390 / 450 across 62 screens, every tally zero including clipped text; the
full mutant suite, **17 families, 118 mutants applied, 118 caught, 0 not applied**; gate 502.

**Re-synced and rebuilt as `1.2-preview.17`** (`versionCode 19`, 2,131,282 bytes, `aapt dump
badging`). Two bytes of copy were enough to make the previous build wrong to install: an APK showing a
label the repository no longer contains is exactly the drift `DEVICE-PASS.md` exists to catch. Proved
at the artifact level — `check-assets.cjs --apk` resolves all 48 paths, the extracted page contains
`Prepare the job briefing` once and `Analyze the text` nowhere, `ACTION_DIAL` is still in
`classes2.dex`, and the staged copy repainted at 360×640 with every tally zero.

**And two self-inflicted defects, both caught before they shipped.** Editing a table row with a
replacement that spanned several lines split a single-line markdown row in two and orphaned its tail —
invisible in a diff, obvious the moment the row was measured: 202 characters where it had been 1,028,
and the next line no longer starting with `|`. It happened **twice**, because the first repair did not
change the habit that caused it; the second row was found only because a check was written after the
first ("any line starting with `|` must end with one") and it named the `:app:assembleDebug` row
immediately. Both rejoined and verified by content rather than by hope — `admin-audit` and the
72-broken-images warning back in the row they belong to, all rows well-formed. The rule that comes out
of it: a multi-line replacement must never target a single-line structure, and after any edit to a
table, re-measure the table rather than trusting that the edit landed where it was meant to.

## 52. The handset produced two defects that no screen on this machine could see

`preview.17` went onto the vivo to work down DEVICE-PASS §3f. Four items passed — the dialler,
a chat message surviving a force-stop, the audit log stamping `Oct 15, 2026 - 3:17 PM` while
`adb shell date` read `15:18`, and the console's read-only rows — and the fifth, the payment
picker, produced two defects in a single walk.

Both were found with `adb shell uiautomator dump`, which is the **system accessibility tree**
rather than the DOM, and that distinction is the whole entry. Every instrument in `tools/` reads
the page: the gate calls the functions, the camera evaluates scripts inside Chrome and hit-tests
with `elementFromPoint`. Both layers were painted correctly. The tree is a third surface, and it
is the one a screen reader navigates.

**One: Back from the resident's "Edit profile" form quit Sukinnect to the launcher.**
`openLayers()` — the function that decides whether the page has recorded anything to undo — named
four modal fields, and the app has five. `state.residentProfileModal` was not one of them, so the
resident's own forms were invisible to the machinery whose entire comment reads *"the first Back
press quit Sukinnect from inside a half-filled form"*. The admin's form behaved, which is the
positive control that made it diagnosable rather than mysterious: same press, same kind of screen,
`mCurrentFocus` stayed on `MainActivity`.

The fix does not add the missing name to the list. A list is what failed, and a second list in the
checks would fail the same way, so `layerKeys()` now derives the fields from the state object by
convention (`*Modal`, `*Confirm`), and `openLayers()`, `closeTopLayer()` and the new checks all
read that one source — the next modal field is counted the moment it is declared. The gate's
version walks every field the state actually has and requires each to record a step, so it cannot
go stale the way the old assertion would have.

**Two: the picker was painted, tappable, and absent from the accessibility tree.** The profile
sheet renders `role="dialog" aria-modal="true"`, and Chromium honours that by marking everything
outside the dialog inert — an inert subtree leaves the platform tree entirely. The stacking fix
in §47 raised the modal's `z-index` above the sheet's, which made it visible and clickable and
changed nothing about modality: the dump listed the sheet's nodes and never `Save method`. The
natural experiment that proved the mechanism was accidental — pressing Back closed the sheet, and
the modal's nodes appeared in the same tree without any other change.

Modality now follows whichever layer is actually on top: `modalAboveSheet()` decides from state
and `syncBackHandles()` writes `aria-modal` onto the sheet each paint. It reads state rather than
querying `.modal-layer` because the app raises a modal two ways — that class for the profile
sheets, an inline fixed overlay for the verification review — and a rule that matched one would
silently disagree with the other. The camera got a tally for it (`a sheet claiming modality under
an open modal`) because the harness's fake `document.querySelector` always returns null, so the
DOM half of this is not testable from Node at all.

**Proved, in both directions.** `node tools/falsify-layer-modality.cjs` — 4 mutants applied, 4
caught, 0 not applied: dropping the resident's field from the derivation, stopping
`closeTopLayer()` clearing them, `modalAboveSheet()` pinned false (the original defect), and
pinned true. The camera's new tally was then fired on purpose against a copy of the page with the
release removed, where it reports 1 on `resident-payment-modal`, and reads 0 on the same single
screen against the real file — a tally that cannot fire is the failure mode this repository has
now been caught in twice. Gate: 502 → **507 checks**, all passing; the whole mutant family run
reports **18 families, 122 mutants applied, 122 caught, 0 not applied** (was 17 families / 118);
full 62-screen sweep at the
device's own 450 px clean, every tally zero, no console errors.

**Re-synced and rebuilt as `1.2-preview.18`** (`versionCode 20`, 2,131,806 bytes, `aapt dump
badging`) before re-testing anything, because a fix that has only run on a desk has not run where
the defect did. `cmp` says the `assets/Sukinnect.html` extracted out of that APK is identical to
`Sukinnect-next.html` at **801,996 bytes**, `grep` finds `modalAboveSheet` twice inside it (the rule
and its call site), and `check-assets.cjs --apk` resolves all 48 paths the page asks for.

On `preview.18`, re-installed: Back from the resident's form keeps focus on `MainActivity` and
closes the modal, and the dump taken with the Payment Methods sheet still open lists both
`Close Payment Methods` and `Save method` in one tree.

**Two instrument readings that were nearly reported as defects, and are the reason this pass is
worth more than its findings.** The sign-in screen produced a completely empty accessibility
dump, which reads as "blind users cannot sign in" — it is Chromium building the tree lazily, and
one tap on a field populated every node. And a password node printed `text="demo1234"`, which
reads as a leak — the same node carries `password="true"`, which is exactly what an accessibility
client honours. Both were checked before being written down; the habit that caught them is the
one already recorded above, *correct the instrument before concluding anything*, and it has now
saved two false findings in one session rather than one.

## 53. A day count that aged at noon, found by running the whole app in another timezone

The phone is parked, so the next sweep went after a class that had already produced one bug and
was never measured systematically: **the app's dates**. `parseDay()` fixed a single
`Verified Mar 14` rendering as Mar 13 weeks ago. Nothing asked whether the rest of the file keeps
a calendar day and an instant apart.

The instrument is a flag on the camera — `--timezone=Pacific/Niue` — which calls CDP's
`Emulation.setTimezoneOverride` before the walk, so all 62 screens are photographed and measured in
another calendar frame without touching this machine's clock. Paired with
`tools/probe-date-frames.js`, which answers with every date-shaped string a screen paints, split
into **absolute** tokens (`Mar 14, 2026`) and **relative** ones (`in 23 days`, `Open now`,
`today`) because those two are allowed to behave differently. Two runs, UTC-11 and UTC+14, diffed:
27 of 62 lines changed, and 45 screens carry an absolute date.

**What the diff cleared.** Every stored day held its ground. `Mar 14, 2026` — the credential that
once rendered a day early — appears identically in both runs, as do `Feb 20, 2027`, `Aug 24`,
`Sep 7`, `Sep 21`, `Oct 5`, `Aug 31`, `Sep 14`, `Sep 28`, `Oct 12`: the eight maintenance-reminder
dates and the expiry dates. What moved was `Oct 15 → Oct 16` on booking rows and the audit log,
which is correct: those are seeded as *today plus n* and the audit stamp is an instant from
`Date.now()`, so a device on the far side of the date line really is on a different today. All 29
`toISOString()` calls write instants (`at`, `openedAt`, `resolvedAt`, `answeredAt`, `createdAt`) and
**none** of them slices out a calendar day, which is the shape that causes the bug in the first
place. Counted, not assumed.

**What it caught.** `applicantWaitDays()` — the verification queue's "waiting N days" — computed
`Math.round((Date.now() - parseDay(submittedAt)) / 86400000)`. That is an **elapsed interval**
measured from a local midnight and then rounded, so the fraction it rounds is the hour of the day.
Measured directly: an application submitted five days before, read across one local day —

```
 0:00 → 6 days      12:00 → 7 days      23:00 → 7 days
```

An administrator who opens the queue in the morning and again after lunch sees the same applicant
age by a day with nothing in the record changed. Fixed by `startOfDay()` / `daysBetween()`: both
ends read as days, and the interval between two midnights rounded, which is exact and absorbs a
DST hour on a device that has one.

**Two neighbours cleared rather than "fixed".** `credentialState()` reads
`Math.ceil((parseDay(expiresAt) - Date.now()) / 86400000)`, which looks like the same shape and is
not: within one local day that interval spans `(D-1, D]`, and `ceil` of all of it is `D` — measured
at six hours against three expiry dates, every reading identical. The `x minutes ago` labels round
an interval in **minutes**, which is exactly what they mean. Both stay as they are. Writing the
check would otherwise have introduced an off-by-one into a screen that was correct.

**Gate: 507 → 512**, five checks in a new `dates` suite. `node tools/falsify-date-frames.cjs` —
**5 mutants applied, 5 caught, 0 not applied**, and one of those five is the point of keeping this
family: the first version of the label check compared the queue's wording against the same ternary
the app uses, over the applicants the seed happens to contain. **None of them is one day old**, so
rewording the `d === 1` branch pasted the gate — the falsifier reported `MISSED`, exit 0, on a
check that could not fail. It now walks `today`, `yesterday` and `five days ago` explicitly.

One candidate mutant was written, tested and deleted: replacing `Math.round` with `Math.floor` in
the old expression is an **equivalent** mutant on this data, because every seeded `submittedAt` is
date-only and floor(elapsed) equals the calendar gap for all of them. Keeping it would have raised
the count without raising the coverage.

Camera: 62 screens at the handset's own 450px, every tally zero, no console errors. The remote-tile
line read **692** on this run against **809** on the previous run of a file that had not changed
except in the Back machinery — which is the third time this repository has caught itself quoting a
run-dependent number as a property of the build. Whole mutant suite after this pass: **19 families,
127 mutants applied, 127 caught, 0 not applied** (was 18 / 122). `node tools/probe-all.cjs` runs
the whole instrument inventory and reports **23 probes, 0 needing attention** — one more than it
did before this pass, which is the new probe counted in it and answering; it matches the shape the
classifier looks for (one IIFE, no `require`), and it was already run twice for real, once per
timezone.

One more class closed while the phone was parked, by the same "count it, do not assume it" habit:
locale-dependent formatting. Both `toLocaleString` calls in the file pass `'en-PH'` explicitly, and
all six `toLocaleDateString` calls do too, so no painted number or date depends on the device's
locale. Nothing to fix, and now it is measured rather than believed.

## 54. A sweep that found nothing, and the two measurements that said so

The dark-mode surface had never been asked about. `Sukinnect-next.html` contains **zero**
occurrences of `color-scheme` or `prefers-color-scheme` — one light palette, authored by hand, and
no statement to the browser about what to do when the device asks for dark. That reads like a
defect waiting to be filed, and the obvious patch was the one-line `color-scheme: only light` that
[Chrome documents](https://developer.chrome.com/blog/auto-dark-theme) as the opt-out from Auto Dark
Theme. It was not added, because two measurements said the problem is not there.

**One: the media query changes nothing the app paints.** `tools/shot.cjs` gained `--dark`, which
emulates `prefers-color-scheme: dark` through `Emulation.setEmulatedMedia` — the same mechanism the
reduced-motion flag already used, now generalised so both features can be requested in one call. All
62 screens swept under it: **every tally zero, including contrast**, no console errors. Then the
specific case was probed rather than inferred, because the payment picker's `<select>` carries no
authored `background` or `color` at all, which is exactly where a UA colour scheme is supposed to
leak through the app's own palette:

```
light:  {"scheme":false,"fieldBg":"rgb(255, 255, 255)","fieldColor":"rgb(3, 0, 43)","cardBg":"rgb(255, 255, 255)"}
dark:   {"scheme":true, "fieldBg":"rgb(255, 255, 255)","fieldColor":"rgb(3, 0, 43)","cardBg":"rgb(255, 255, 255)"}
```

Identical, with `prefers-color-scheme: dark` genuinely matching. A page that declares no
`color-scheme` is treated as light-only for its widgets — the UA darkens form controls when the page
*opts in* and the user prefers dark, not the other way round. So the field cannot come back dark
grey inside a white card, and the brand palette §30 measured is not at risk from this direction.

**Two: the delivery surface rules out the mechanism that could.** Auto Dark Theme is Chrome for
Android post-processing painted colours, and it is not reproducible by emulating a media query — so
the honest answer had to come from the shell. `app/src/main/res/values/app.xml` parents the activity
on **`@android:style/Theme.Material.Light.NoActionBar`**, a fixed Light theme rather than `.DayNight`,
and `MainActivity` contains no `setForceDark` / `setAlgorithmicDarkeningAllowed` call at all. The
WebView is therefore never in night mode, and the one feature that could rewrite the palette is off
in the configuration of the thing that ships it.

**What is left open, and it is a brand call rather than a bug.** The published `dist/` subset can
also be opened in a browser, and Chrome for Android *would* apply Auto Dark Theme to a page that
declares nothing — which is the case `color-scheme: only light` exists for. Adding it costs one
line, changes nothing measured above, and forecloses any future dark rendering. Left to the owner,
because honouring a user's dark preference is a judgement about the product and not a defect.

The instrument stays: `--dark` is now part of what a full run can ask, in the same way
`--reduced-motion` and `--desktop` are, and the sweep it enables is the evidence behind this entry.

## 55. An offer recorded at minus five pesos a kilo

Two classes were left after the money printers were read. Sorting first, because an in-place
`.sort()` on a module-level record array silently reorders it for every later screen and for
`persist()`: all **21** `.sort(` sites were opened and every one runs on a fresh array — a
`.filter()`/`.map()` result, a local, or an explicit `.slice()` — so the class is closed, counted
rather than assumed. Then money entry, which produced a real defect.

**How it was reached.** `tools/probe-money-typing.js` types into the live offer sheet through
`document.execCommand('insertText')`, which is the path a keystroke takes, and reads the field
back:

```
{"typed":"1500",  "holds":"1500","badInput":false,"valid":true, "rangeUnderflow":false}
{"typed":"1,500", "holds":"1500","badInput":false,"valid":true, "rangeUnderflow":false}
{"typed":"1.5.5", "holds":"1.55","badInput":false,"valid":false,"rangeUnderflow":false}
{"typed":"-5",    "holds":"-5",  "badInput":false,"valid":true, "rangeUnderflow":false}   ← before
{"typed":"-5",    "holds":"-5",  "badInput":false,"valid":false,"rangeUnderflow":true}    ← after
```

The comma is **not** a defect and nearly got filed as one. An earlier probe wrote
`el.value = '1,500'` through the property setter, watched the sheet's totals fall from ₱181,600 to
₱1,600, and concluded the app silently zeroes a comma-typed price. That was the instrument: a
programmatic write of unparseable text clears a number field quietly, while typed text goes through
Chrome's parser, which **accepts the comma and holds `1500`**. Same trap the camera already
documents — a setup script that moves the model without moving the field photographs a state nobody
can reach — and the fix is the same: type it, then look.

The negative was real. `offer-unit` declared no `min`, so `-5` was a valid entry; `submitOffer()`
turned it into `-500` centavos and `makeOffer()` clamped the two **totals** with `Math.max(0, …)`
while writing `unitPriceCentavos: draft.unitPriceCentavos ? Math.round(…) : null` straight through.
So the screen read ₱0 and the record was created at **−₱5.00/kg**, beside a labour line that made
the sum positive enough to pass the "has to name an amount" guard. Measured through the sheet's own
Send button: `OFFERS 1 -> 2`, `{"id":"of2","unit":-500,"produce":0,"labour":10000}`.

**Fix, in two places, because they answer different questions.** `min="0"` on the five number
fields that had no lower bound (`offer-qty`, `offer-trees`, `offer-unit`, `offer-labour`, and the
admin's `cfg-${key}`) — seven already declared one, so the rule is the file's own convention rather
than a new invention. It changes what the platform reports (`valid: true` → `rangeUnderflow: true`),
which is the line above. And `makeOffer()` now refuses a negative unit price outright:
`GuardRejected('a price cannot be negative.')`, surfaced by the existing catch as a toast, so the
provider is told rather than the number rewritten. Refused rather than clamped is deliberate —
clamping is what the totals do, and it is exactly why this slipped through: a negative price is not
a zero price, and silently converting one leaves the person's figure and the record disagreeing.
After: `OFFERS 1 -> 1`, no record, toast reads `a price cannot be negative.`

**Gate: 512 → 515**, three checks — the refusal, the five-field bound rule with a positive control
(it requires at least ten bounded number fields to exist, so a regex matching nothing cannot pass),
and one that the good offer still goes through. `node tools/falsify-money-bounds.cjs` — **4 mutants,
4 caught, 0 not applied**, and the first run reported one **MISSED** for a reason worth keeping: the
mutant that made the guard refuse *every* offer crashed the suite, so the gate exited 1 without the
named check ever rendering a verdict. A runner that looks for `FAIL <label>` cannot see a crash, and
a check whose positive case can throw does not own its own outcome. The check catches now.

Camera: 62 screens at 450px, every tally zero, no console errors. Whole mutant suite after this
pass: **20 families, 131 mutants applied, 131 caught, 0 not applied** (was 19 / 127). Three probes
were used to get here and two were deleted afterwards — the ones that wrote `.value` directly,
because leaving a tool that measures an unreachable state in `tools/` is how the next reader repeats
the mistake. `node tools/probe-all.cjs` answers **25 probes, 0 needing attention** — the two money
probes counted in, and the programmatic-write ones gone.

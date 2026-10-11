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



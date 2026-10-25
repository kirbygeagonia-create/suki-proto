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

## 56. Two screens that explained nothing when their data ran out, and one that never existed

Two classes closed by emptying things rather than reading them.

**Duplicate ids — clean, and the probe proves it can speak.** The app reads every form value by
`document.getElementById` (about seventy sites), so two elements sharing an id on one screen is not
markup hygiene: `getElementById` answers with the first in tree order and a save writes a number
from a field the person never touched. `tools/probe-duplicate-ids.js` counts ids in the **painted**
DOM across all 62 screens — a static read cannot see a collision produced by rendering one template
twice in a list. Result: **zero collisions**, with id counts of 5–21 per screen proving the walk saw
elements at all, and a forced duplicate reported immediately.

**Empty states — one real defect.** `tools/probe-empty-states.js` empties each of twelve record
sets, re-renders, measures the words left, and puts the records back. It found the admin's
verification queue: with every applicant decided it still headed a blank panel **"Pending
verifications"** and still printed *"Tip: Prioritize applications with complete documents to faster
onboarding."* — advice for rows that do not exist, which is §48's "do not show an empty screen with
no explanation" and §76's no-decorative-content rule at once. And it is reachable by tapping:
approving an applicant takes it out of the queue, so **finishing the queue is what empties it**.
Now the else branch renders `emptyState('shield', 'No applications are waiting', 'Every provider who
applied has been decided. A new one appears here the moment it arrives.')` and the tip is gated on
the list having rows. The positive control matters as much: with rows present the tip still shows and
the empty state does not.

**The instrument lied first, and said so.** The probe's first version looked the record sets up as
`window[name]` and reported all twelve as "not a reachable array" — top-level `const` bindings never
become window properties. A sweep that finds nothing because it cannot see anything looks exactly
like a clean result, so the fix was to resolve by bare identifier and to keep printing the row count
per set, which is what shows the walk actually touched 16 bookings and 42 messages. The emptied
bookings screen was also read rather than scored: `No bookings yet — Services you request appear here
with their status, payment record and receipt.` plus a Find-a-service action, which is what §48 asks
for and why the 60-character "bare" threshold alone would have been too soft a bar.

**The empty branch had never been painted for a camera**, so its tap targets and contrast were
unmeasured even after the fix. `admin-verifiers-empty` is in the SCREENS table now — the walk counts
**63 screens** — and the entry says plainly that the state is reached by approving every applicant
and that the list is cleared because the state, not the clicks, is what is photographed. Measured
clean at 450px. Its single-screen run reported `text below WCAG contrast: 1` on the admin header's
translucent "Insights" pill, which is the subset artifact already documented (the sampler depends on
what was painted earlier in the run); the full 63-screen sweep reports **zero**.

Gate 515 → **517**. `tools/falsify-empty-queue.cjs` — **3 mutants, 3 caught**, and the first run
reported one MISSED because the mutant deleted a ternary's `: else` half, which is a syntax error
rather than a behaviour: `Unexpected token ';'` crashed four suites and the gate exited 1 without the
named check ever rendering a verdict. Rewritten to render `''`, which is exactly how the queue
shipped. No console errors across 63 screens; every other tally zero. Whole mutant suite: **21 families,
134 mutants applied, 134 caught, 0 not applied** (was 20 / 131).

## 57. A second handset that could finally test the narrow layout and dark mode, blocked by its own storage

`preview.20` was cut and pushed toward a device: asset synced, `versionCode 21 → 22`,
`:app:assembleDebug` clean in 47s, then verified at the artifact level before anything was claimed —
2,132,502 bytes, `aapt dump badging` agreeing on the version, `assets/Sukinnect.html` extracted out
of the APK `cmp`-identical to `Sukinnect-next.html` at **803,487 bytes**, `check-assets --apk`
resolving every path, and grepping the shipped page to prove which bytes are in there:
`a price cannot be negative` 1, `No applications are waiting` 1, `daysBetween` 2, `modalAboveSheet`
2, `Analyze the text` 0. This is the first build carrying the accessibility-tree fix, the
calendar-day wait count, the money guard and the empty verification queue.

The phone offered was not the vivo but an **OPPO CPH2179**, and it is a better instrument for two
cases this file has kept listing as untestable: `wm density` reports physical 320 with
**`Override density: 360`** on a 720px panel, which lays the app out at **~320 CSS px** — the narrow
case the clipping fixes were tuned against and the vivo at 450 never reached — and
`ui_night_mode = 2` makes it the first device here in **system dark mode**, the one configuration
where Chrome's Auto Dark Theme could rewrite the §30 palette. The bench could only measure the
media-query half of that and rule the WebView out from `Theme.Material.Light.NoActionBar`; a real
dark handset is the missing evidence. It does not unlock edge-to-edge: Android 10, API 29, so
`targetSdk 36` stays closed on both phones.

**Neither was tested, for two reasons that are the finding.**

1. `adb install` failed with `android.os.ParcelableException: java.io.IOException: Requested
   internal only, but not enough space` out of `PackageInstallerService.createSession`. `df` explains
   it: `/data` is 50,132,664 KB with 49,545,480 used — **439,728 KB free, 100% used, 0.87%**, below
   the installer's low-storage threshold. The APK is 2.1 MB, so the refusal is the threshold, not the
   file. Freeing that partition means deleting the owner's photos and apps, which is not a call to
   make from here to turn a test green.
2. The connection would not hold: four drops in ten minutes, `transport_id` changing on each
   (12 → 14 → gone), the device cycling `unauthorized → device → absent`, and `pnputil` seeing no
   Android device while it was off the bus.

**What is recorded so the next attempt does not repeat this one.** The device identity and geometry
are in `DEVICE-PASS.md` under *A second handset*, and the build row now says plainly that no device
has run `.20`'s bytes. Because nothing was installed, that phone is also the cleanest persistence
fixture available — no store, no dump, no session — so the write-claims and reload checks would start
from a real first run rather than whatever the vivo accumulated.

No page bytes changed in this pass. `Sukinnect.html` is unchanged vs `main`, and the gate still
reports 517 checks.

## 58. A phone that could finally be asked what its WebView decided

`preview.20` installed on the OPPO once its storage was cleared, and the first thing it settled was
the question the bench could not answer: **is the accessibility-tree fix real on a second device?**
With the Payment Methods sheet open and the picker painted above it, the platform tree now lists
both layers — `Payment Methods`, `Close Payment Methods`, `Change payment method`, `Preferred payment
method`, `Save method` — and the sheet's `aria-modal` reads `false` from inside the real page. Same
answer as the vivo, different phone, different Android, WebView 148.

Getting that answer needed a new instrument, because none existed. `tools/device-probe.cjs` forwards
to the WebView's DevTools socket and evaluates an expression in the page running on the phone, with
no npm dependencies — a hand-rolled WebSocket client, the same approach `shot.cjs` uses against
Chrome. Until now `tools/` could measure headless Chrome and could read the platform tree, but could
never ask a shipping WebView what it had decided, so when two phones appeared to disagree there was
no way to resolve it except by arguing from the source. It required one shell change:
`WebView.setWebContentsDebuggingEnabled(true)`, gated on `FLAG_DEBUGGABLE` so a release build never
exposes an inspector.

**Three false alarms, each caught before it was written down.** An early dump returned 2 KB and zero
text nodes while the modal was on screen — the WebView builds its accessibility tree lazily, and the
same tree came back 20 KB and 30 nodes a few seconds and one tap later; `accessibility_enabled` was
already `1` and ColorOS refuses `WRITE_SECURE_SETTINGS` from shell, so the fix is patience, not
configuration. A dump taken with the native select open returned exactly two rows, which reads as the
app's tree collapsing but is `uiautomator` reporting only the **active window**. And a probe that set
`state.tab='profile'` without setting `state.view='app'` left the app on the sign-in screen and then
reported the modal missing from a DOM that had never been painted — `residentProfileHub()` returned
the modal markup while `#screen` began `<div class="auth-screen">`. That is the third time this
repository has been saved by *an instrument that reaches a state nobody can produce measures a
fiction*, and the first time on a phone.

Two other things the new device was able to say. The system is in night mode (`ui_night_mode=2`) and
the app renders **fully light** — the first real observation of the case that §31 could only rule out
from `Theme.Material.Light.NoActionBar`. And at ~320 CSS px, the narrow layout the vivo at 450 never
exercised, the sign-in role toggle measured clean: both labels inside their parent, `scrollWidth ==
clientWidth`, no overflow — after a downscaled screenshot had made it look clipped. The instrument
corrected the eye again.

Two bugs in the new tool were found by running it: Chrome's DevTools endpoint rejects `Host:
localhost`, and its `Content-Length` counts bytes while the page title contains an em dash, so
comparing that header against a character count reports a timeout on a socket that is answering
perfectly well.

No page bytes changed. Gate still 517, `Sukinnect.html` still identical to `main`. The remaining
device work is the §3f list, tracked separately.

## 59. The cap that passed every test and failed on the phone

The rem conversion shipped with `:root { font-size: min(1em, 20px) }` — honour the device's
text-size setting, but never past 125%. The camera agreed: at `--font-scale=2` it reported the root
computing 20px, identical to 1.35, four phone configurations swept clean, and a falsifier family
caught four mutants including the tempting half-fix of pinning the root to 16px.

**It was wrong, and the phone said so.** Setting `font_scale` to 1.35 on the vivo and reading the
real page gave a root of **21.6px**, not 20px. Chromium on Android does not change the browser's
default font size — it **multiplies the used font size after CSS resolves**, so `1em` inside `min()`
is still the unscaled 16px, `min` returns 16, and the platform scales that to 21.6. Nothing in CSS
or JS can bound it; the only thing that stops the inflation is `text-size-adjust: none`, which is
precisely the option that puts the ignored-setting bug back.

The flag was the reason nobody caught it. `--font-scale` emulated the OS by substituting the
emulated default for `1em` inside the app's own rule — a model of "the OS changes the default font
size", which is not what the OS does. **An instrument that models a mechanism wrongly will report
success for a fix that cannot work**, and every downstream number inherited the mistake. It now
sets the root font size directly, which is what the platform's multiplication produces, and it
bypasses the cap deliberately because the real device bypasses it too.

Consequences, all measured after the correction:

- The cap stays, but its claim is fixed. It is a real bound on the **web** surface, where `1em` on
  the root does resolve against a user-settable default; on Android it is inert. The gate check says
  so in its own label — `the root bounds the browser default on the web surface (Android inflates
  past this)` — because a check named after a property the app does not have on its primary target
  is worse than no check.
- Android therefore honours the setting **uncapped**, and the layout has to absorb it. At 135% on a
  320px viewport three y-axis ticks escaped their chart: `--chart-gutter` was `56px`, a fixed px
  gutter holding relative text, so "₱400" hung 4px past the box. The gutter is now
  `calc(3.75 * var(--t-body-sm))` — 56.25px at the default, so the plot width nobody chose is
  unchanged, and it grows when the type does. Re-swept at 100%, 135% and 150% on 320px: **every
  tally zero, camera exit 0** on all three.
- The value-label anchor fix from the previous pass was real but incomplete — it only caught labels
  near the plot's edges, and the escapes turned out to be the axis ticks, not the values.

Gate 520, `falsify-responsive-type` 4 of 4 after its labels were re-pointed at the honest check
name. The lesson is the one this repository keeps being taught in a new costume: **prove the
instrument against the thing it claims to model, not against the fix you hope for.**

---

## 60. An axis thinned by the wrong ruler, and a navigation row that walked off the phone

Closing #25's chart-label item found a second defect in the same screenshot, and both turned out
to be the same mistake: **a number measured in one unit, compared against a thing that lives in
another.**

**The chart.** `chartColumns()` thinned its own axis when a slot measured under 62 *viewBox units*.
That threshold was written when the type was fixed px, and §68's rem conversion moved the words out
from under it: at 200% text on a narrow panel the slot still cleared 62 units, so nothing thinned
and an axis label hung 4px past a 264px chart box. The budget is divided by the root font size the
page reports now — `fit = floor(w / (62 * rootPx/16))`, `stride = ceil(rows.length / fit)` — which
is provably the old rule at 100% (`floor(304/62)` is 4, and `ceil(n/4)` is exactly what the old line
computed for every `n`) and thins progressively above it: 12 columns draw 4 labels at 100%, 3 at
150%, 2 at 200%.

**The navigation, found by looking at the chart's screenshot.** At 320px with the text at 200% the
resident's bottom nav had `scrollWidth` 456 against `clientWidth` 320 and painted "Profile" 132px
past the row's right edge — which is the edge of the device, so a destination nobody could tap. The
camera's own overflow check answered "none" on the same screen, because it asks the document and the
row overflowed instead. A flex item's `min-width` defaults to `auto`, and for a word `auto` *is* the
word, so the item refused to shrink; the fix is the item's own `min-width:0` with an ellipsized
label. Every destination keeps its tap area, and the DOM text — and therefore the accessible name —
is untouched; only the painted tail gives way.

The same flex default, seen from the other side, destroys a fixed-size element: an item's declared
width is only its starting size, because `flex-shrink` defaults to 1 and `min-width:auto` protects
nothing below the element's *content*. Six 8px waiting dots painted 1.8px wide (they have no content
at all) and the 44px round notification button painted 31x44 beside a growing title. Both declare
`flex-shrink:0` now. Two tallies count them on every sweep — `bottom-nav items pushed off the panel`
and `round markers painted as a sliver` — and `node tools/falsify-flex-crush.cjs` proves both can
fail: 4 mutants, 4 caught, on a 3-screen subset at the corner where they all painted.

**Three mistakes by the instruments written in this pass, recorded because each one reads as a
pass.** The nav tally's first version computed `box.right - item.right` where it meant
`item.right - box.right`, so it reported 13 findings on screens that fit perfectly and zero on the
one that did not — the sign was caught by the numbers being absurd (237px "past" the edge for the
*first* item), not by anything in the harness. The circle tally asked for at least 3px on each side,
which excluded the 2.3px dot that motivated it: the run reported clean while the screenshot showed a
sliver. And the sweep runner's first parser matched only `: <number>`, which walked straight past
`horizontal overflow (a screen wider than the phone)` — that tally answers with a list of screens
and pixel amounts, not a number, so a phone-sized defect would have passed the command written to
catch exactly that. Making the parser fail closed on any unrecognised answer is what exposed the
camera's own `page:` header line as a "defect": the run reported 0 of 4 corners clean with every
tally at zero. A guard whose floor sits above its own finding is the worst kind of pass, and a
runner that trusts its own output format is the second worst.

**One fix that was tried, measured, and taken back out.** Replacing the value-label edge band
(`cxPct > 80 ? ' r' : ...`) with the first and last row *indices* looked strictly better: an axis
label that is thinned out of existence cannot be anchored by a percentage tuned for the unthinned
row. It did not fix the 200% overhang, and it moved 150% from clean to one finding. Which of its two
changes did which is not established — the axis is thinned and the value labels are not, so the two
sets do not share edges — so the band stays and the code comment says what was measured rather than
narrating a mechanism nobody proved.

**The harness was part of the problem.** `tools/harness.cjs` answered `getComputedStyle` with a
literal `'16px'`, which made the new type-aware rule unfalsifiable in Node: a mutant that ignored the
measured size read identical to the correct code at the only size the double would name. The root
size is a variable now (`app._setRootFont(32)`), the same knob `--font-scale` turns in a browser, and
the gate check asserts *relations* — fewer labels as the setting rises, a sparse series untouched at
every setting, never zero — rather than the numbers 4/3/2, which are derivable and would fail on a
correct chart if the budget ever moved.

**One command for the standing requirement.** `node tools/sweep-text-scale.cjs` runs the camera at
320px @ 200%, default width @ 200%, 450px @ 135% (a vivo panel at the OPPO's setting) and the 100%
anchor, and fails if any tally is nonzero. Anything it does not recognise counts as must-be-zero, so
a tally added to `shot.cjs` tomorrow cannot be silently informational, and a run that prints no
tallies at all fails as "measured nothing".

**And one hazard this pass discovered about its own tooling.** A mutant family owns the file it
breaks: `tools/falsify-*.cjs` reads the target once, writes mutants over it, and restores its
snapshot in a `finally`. Editing `Sukinnect-next.html` while `tools/falsify-all.cjs` is running —
which this pass did, twice — loses the edit silently, because the restore writes a copy from before
it. The tool is right to restore what it read; the rule for the person at the keyboard is that no
file a family can write is editable while it runs. `falsify-flex-crush` takes minutes rather than
seconds for exactly that reason, and it is the one family whose window is long enough to be walked
into.

Numbers: gate **521** (was 520), `falsify-responsive-type` **6 of 6** (was 4, the two new mutants
break the axis budget and the thinning divisor), `falsify-flex-crush` **4 of 4** as a new family,
`node tools/falsify-all.cjs` **23 families, 144 mutants applied, 144 caught, 0 not applied**, probes
**29** with both new ones answering, and the four corners of the sweep clean. The file is 11,233
lines with `node tools/measure.cjs` to prove it.

Residual, deliberately not fixed: at 320px and 200% text the nav labels read `D… F… B… M… Pr…`.
Every one is tappable and the icons carry the identity, but the words are effectively gone. Material's
alternative is to label only the selected item, which is a visual judgement about the app's identity
and belongs to the owner, not to a defect list. What is *claimed* here is narrower than what a reader
might assume: the ellipsis is CSS, so each item's DOM text — and the `aria-label` on the badged ones —
is the whole word (measured: `textContent` is unchanged and the camera's unnamed-control tally is 0).
Whether Chromium puts the whole word or the painted one into the platform accessibility tree is
**not** measured on the bench, because the camera reads the DOM, not the tree. It is a
`uiautomator dump` on a handset at maximum text scale, which is the same instrument that found the
sheet-modality defect, and it is now an item on the handset pass.

---

## 61. The dimension nobody had swept: a phone that is short, and the controls that fell off it

Every geometry figure in this repository — 63 screens, four corners, all of it — was measured at
the camera's default viewport, **390x844**. Width had been swept (320, 390, 450) because a vivo had
reported its density and made the question obvious. Height had never been varied at all. It is the
other half of "a mobile application must be responsive to any phone types", and 480px is not a
hypothetical: it is an Android Go handset, a 2015-era budget phone in a Philippine municipality, and
**any phone in split-screen**, which is what half of Android's windowing modes gives a WebView.

### The instrument, and why none of the existing ones saw it

A new tally, `controls no tap can reach`, asks the question the others do not: can a thumb get to
this control at all? Two ways a control fails that test, and the first version of the instrument
knew only one:

- its box is outside the viewport and **nothing in its ancestor chain scrolls**;
- it sits outside an ancestor that clips it (`overflow:hidden`) without ever offering a scroll — a
  clipped element's rectangle does not move, only its painting does, so a check that looks only at
  the viewport calls it fine.

The second half was found by a surviving mutant, not by reasoning: a deliberate break that pinned
the modal layer to 110px tall produced no finding at all. Nothing else in the camera sees this class
either — the text is not clipped (nothing clips it), it is not under the nav, its contrast is fine
because it paints no text, and the document is not wider or taller than the phone.

### What it found at 320x480 with the text at 200%

Four screens, all of them the app's own primary actions:

- the booking sheet painted **"Send request" 149px below the bottom edge of the device**, and the
  fruit offer sheet its "Send offer" 370px below. `.sheet` is a flex column capped at `max-height:
  80%` with a fixed head and a fixed foot (`flex-shrink:0` on both, deliberately), and a body that
  scrolls — but the body had no `min-height:0`, so it refused to shrink below its content, the
  content spilled out of the bottom of the sheet, nothing clips a sheet, and the phone's frame
  clipped it instead.
- the admin's security PIN dialog put its own **Close button 97px above the top edge and its action
  90px below the bottom one at the same time**. `.modal-card` had no height cap at all, and the
  layer centres it — a centred overflow is the worst shape this class takes, because nothing is
  nearer and the page is not the scroller.
- the notifications bar clipped **"Mark all as read" by 196px** and the resident's profile bar
  clipped "Log Out" by 18px: the bar's title group could not give up width, so the action was
  pushed past the bar's own `overflow:hidden`.

The fixes are the three rules those measurements imply: the sheet's cap is the screen rather than
80% of it, and it scrolls when even its unshrinkable parts do not fit; the modal card takes
`max-height:100%` and scrolls; the top bar wraps and lets its children give up width. `tools/
falsify-control-reach.cjs` puts each defect back and requires the tally to name it: 3 of 3.

### Five things the instruments got wrong on the way, and one thing the fix got wrong

- **The probe blamed the wrong element 209 times.** Its first version walked every ancestor and
  flagged any clipper, so it reported every control scrolled out of `.screen` as unreachable
  "because of `.phone`" — the desktop mockup frame, which is the viewport in app mode and is
  governed by the scroller inside it. Once the walk stops at the first ancestor that can scroll,
  the same 63 screens answer zero. An instrument that cries wolf gets ignored, which is worse than
  no instrument, and this one would have been ignored within a week.
- **The first fix cut the app's titles.** To keep the top bar's action on screen it ellipsized the
  `<h1>` — and the camera's own review line, `single-line previews shortened with an ellipsis`,
  went **7 → 36** across the walk, with "Find Services" and "Provider details" reduced to
  fragments. Bar wrapping costs height; a truncated title costs the screen's identity, which §40
  makes its first job. The tally could not tell the difference (both leave every control
  reachable) — the review tally did.
- **Two mutants survived, and one of them was the interesting one.** Removing `.sheet-body`'s
  `min-height:0` left everything reachable, because the sheet now scrolls as a whole: that rule
  governs *which part moves*, a design property no geometry check can see, so the mutant was
  deleted rather than kept to inflate the count. Removing either top-bar guard on its own also
  survived, because the wrap and the `min-width:0` are two independent guards of one overflow — so
  the break removes both, and the family says why. A single-rule break there would have reported a
  rule that does not exist alone.
- **A comment warning about backticks in this file's page scripts contained backticks**, which
  broke `tools/shot.cjs` at parse time. It is the second time in one session, in the very file that
  documents the hazard.
- **`tools/falsify-all.cjs` could not read the new family and said so.** The camera families print
  "N of M breaks caught"; the runner's patterns only knew "mutants", so the family came back as
  "printed no summary — nothing was proven". That is the runner failing in the only acceptable way:
  an unparseable result is reported as unproven, so the headline total came out visibly wrong
  instead of quietly right.
- **Fixing that nearly introduced the opposite failure.** The two spellings order their numbers
  differently — "applied 4, caught 3" against "3 of 4 caught" — and a single positional reader would
  have swapped them, reporting a family that caught 3 of 4 as one that applied 3 and caught 4. The
  shapes now carry their own readers. A runner that prints a confident wrong total is worse than no
  runner, and this one was two characters away from doing it.

### Numbers, and what the fixes visibly cost

Gate **521** — unchanged, because this pass is stylesheet rules and instruments, not kernel. New
family `falsify-control-reach` **3 of 3**; `falsify-flex-crush` **4 of 4** after its third mutant was
corrected into a pair. `node tools/falsify-all.cjs`: **24 families, 147 mutants applied, 147 caught,
0 not applied**. Probes **29**, none needing attention. `node tools/sweep-text-scale.cjs`:
**6 of 6 phone corners clean** — the two new corners being 320x480 @ 200% text and 320x300 @ 100%,
the second standing in for a keyboard open on a short phone because nothing in `tools/` emulates a
keyboard at all. The file is 11,286 lines with `node tools/measure.cjs` to prove it.

What it costs, visibly: on a short phone a bottom sheet may now fill the screen instead of stopping
at 80%, and a top bar may take two lines instead of one. Both are the alternative to a control being
off the device, and neither has been looked at on hardware — `DEVICE-PASS.md` carries the three
questions, and the second of them is a judgement about the app's look rather than a defect.

---

## 62. Nobody had ever pressed a key: the keyboard surface, and focus behind the scrim

§72 asks for focus states and keyboard interaction. Nothing in `tools/` had ever produced a key
event. The camera drives the app by calling its handlers and `el.click()`, the harness has no layout
at all, and the 29 probes read painted boxes — so the claim that the app has a focus ring for
"every element the keyboard can actually reach" was a comment in the stylesheet that no instrument
had ever tested.

### The instrument, and the wrong way it was built first

`node tools/shot.cjs --focus` walks each screen with real `Tab` keypresses over CDP and inspects
whatever the browser lands on. The first attempt did not use key events: it called
`el.focus({ focusVisible: true })` for every focusable element and compared computed styles. That
option does not exist in Chrome, so every element was focused with mouse modality, `:focus-visible`
never matched, and the walk reported **zero focus rings on all 63 screens** — a result that reads
as "the app has no focus styles at all" and would have been filed as a defect of the app rather
than of the tool. Chrome matches `:focus-visible` on keyboard modality, so the only honest way to
ask the question is to press the key.

What the walk then measured, across **666 stops on 63 screens**: no control is reachable by Tab
without something visible changing, and nothing falls back to the browser's default ring — the
`:where()` list is doing its job, and that sentence is now a measurement rather than a claim.

### The defect: 91 of 192 stops were behind the scrim

On the eight screens that open a sheet or a dialog, nearly half the Tab stops landed on controls
**underneath the open layer** — covered, untappable (the scrim takes the tap and closes the layer),
and still focusable, so a keyboard user moved through a screen they could not see and could still
submit fields on it.

The fix is `inert` on everything outside the layer the user is in, which takes a subtree out of the
tab order, the accessibility tree and the pointer in one move — `aria-hidden` alone would have left
every control focusable, which is the defect. Two decisions inside it are the reason it will not
rot:

- **The top layer is derived from state, not from a class.** The app raises a layer three ways:
  `.modal-layer`, `.sheet-layer`, and the verification review's inline fixed overlay, which has no
  class at all. A rule naming two of them leaves the third walkable, and that is already written
  down once in this file for the Back machinery — so all three roots now carry `data-layer`, and
  `topLayerEl()` reads the convention.
- **The inerting walks up from the layer and marks each ancestor's siblings**, rather than inenting
  a list of background ids. On the profile hubs the modal is painted *inside* `#screen`, so
  inenting `#screen` would have taken the dialog with it; and a list would miss the next surface
  added.

`node tools/falsify-focus-trap.cjs` puts it back three ways — remove the call, remove the marker
from one root, and swap the lookup for the old class names. The third only fires on the
verification screens, which is the proof that the convention is what covers that surface: 46 stops
behind the scrim there, on a screen the class-based check could never have reported.

### Four instrument mistakes in the same afternoon, each caught by a number that made no sense

1. **The detector read the same marker as the code under test.** Its first version asked "is a
   `[data-layer]` open, and is this element outside it" — so removing `data-layer` from a layer
   root blinded the check and the implementation together, and the mutant survived. A check that
   shares its assumption with the thing it checks is a mirror.
2. **Hit-testing at the centre called the scrim unreachable.** Switched to
   `elementFromPoint`, and the baseline reported two controls behind a layer on the unmutated
   file: the sheet's own scrim, which *is* a button (`aria-label="Close"`, so tapping the dim
   dismisses it) and is covered at its centre by the panel it dims — by design. The rule became
   five probe points: a control is unreachable only if **no** part of it is exposed.
3. **An ancestor's clip is not someone else's overlay.** With five points, one stop remained: the
   booking sheet's "Tomorrow · Sun, Oct 18" chip, sitting at x 343..523 inside a `.hscroll` rail
   that is 354 wide. It is clipped by a container that scrolls — one swipe from view, which the
   reach tally from §61 already judges correctly — so a hit that lands on one of the element's own
   ancestors no longer counts as covered. Only a foreign element does.

4. **A sticky bar is not a scrim.** With five points the walk still reported one stop app-wide: the
   verification review's "Open document" button, covered at that moment by the fixed
   Reject/Request/Approve bar. Scrolling the row to the middle exposed it completely — which is what
   any list row does when you scroll, so the rule now asks twice, once where focus landed and once
   with the element brought to the centre, and keeps only the control that stays hidden *after* the
   scroll. Without that second look the tally would report every ordinary row under every sticky
   chrome in the app, and would be switched off within a week.

And a fifth that belonged to the previous pass: 19 stops initially reported focus landing off the
viewport, all of them `.job-row`s below the fold, because `#screen` scrolls *smoothly* and the rect
was read mid-glide. The walk now installs `scroll-behavior:auto` for its own duration and removes
it afterwards. This file already names that trap once for the under-nav check; a focus walk is the
second place it bites, because focusing an element scrolls it and scrolling takes 250ms here.

### Numbers, and what the walk still cannot see

Gate **522** (was 521, for the convention check). New family `falsify-focus-trap` **3 of 3** — the
three breaks leak 24, 23 and 36 stops respectively. `falsify-layer-modality` **5 of 5** after its new
mutant. `node tools/falsify-all.cjs`: **25 families, 151 mutants applied, 151 caught, 0 not
applied**. `node tools/shot.cjs --measure --focus`: **666 stops across 63 screens, all four tallies
zero**. The six-corner sweep is clean, 29 probes answer, no console errors. The file is 11,316 lines.

What the walk does not see, so nobody reads the zeros as more than they are: it measures Chrome on a
desktop, and `inert` is only as good as the WebView that ships it (Chromium 102+), so
`DEVICE-PASS.md` carries the question for the handset; it asserts that *something* visible changes
for every stop, not that the change has contrast against the surface it paints on, which the
contrast tally does for text but not for a ring; and it walks the tab order Chrome computes, which
on a phone is reached by a Bluetooth keyboard or a d-pad, not by anything the app's own touch
gestures do.

---

## 63. A sensor blind to a whole surface: the dialogs nobody had ever measured

The camera's element walks each carried their own hand-written list of containers to look at. Six
lists, and they had drifted:

| walk | surfaces it looked at |
| --- | --- |
| clipped text, 14px floor, contrast, form-control scale | `#screen`, `.sheet`, `.auth-sheet` |
| round markers | those three + `.bottomnav` |
| unreachable controls | those four + `.modal-layer` |
| tap targets, screen-reader field names | the whole document |

So four text-and-colour sensors had **never looked inside a modal dialog** — and the dialogs are
where the app's most sensitive typing happens: a name, a phone number, a home address, an emergency
contact, a service price, a payout account. The one walk that *did* cover them was the newest one
(the unreachable-control tally from §61), which is how the gap stayed invisible: the file looked
thorough, and six lists that agree with each other's omissions read as one coverage.

### Fixing the coverage, then what it found on the first run

The lists are one `SURFACES` constant now, and every walk derives its selector from it — the drift
was the defect, not any single missing `.modal-layer`. Then the other half of the problem: no entry
in the `SCREENS` table reached the edit forms. Three dialog screens existed (a payment picker, a
payout field, a PIN note); the six *form* dialogs did not. They are in the table now, reached by
`clickPainted()` the way every other one-tap destination is, and the walk went 63 screens → 69.

Two findings, both immediate:

- **The portfolio form's two fields painted 13.3px** — the user-agent default, under §68's 14px
  floor. They were the only two inputs in the app that hand-roll their geometry inline
  (`width:100%; padding:9px; min-height:var(--tap)`) and declared no font at all. Every other field
  takes `.form-input`, which has carried `font-family:inherit; font-size:var(--t-input)` since the
  pass that noticed fields drawing as grey browser boxes. The fix is to use the class and drop the
  duplicated inline geometry, not to add a font size to the two exceptions.
- **The camera contradicted itself about the read-only email field.** The unnamed-control tally
  reported it nameless on all three edit dialogs; the dedicated field-name walk reported zero
  nameless fields on the same screens. Asked the browser directly, `el.labels.length` is 1 — the
  wrapping `<label>` names it, correctly. Two tallies disagreeing about one element is a defect in
  one of them, and it was the text scan: `text()` falls back through `textContent`, `aria-label`,
  `placeholder`, `title` and `id`, and an `<input>` has no text content by definition, so a field
  named by its label is invisible to that scan no matter how well it is labelled. Fields are skipped
  there now; the walk that asks `el.labels` owns that question.

### What this says about the rest of the file

Every "measured across all N screens" claim in this repository means "across all N screens that the
walks look at". A surface can be in the app and out of the instrument at the same time, and the
output looks identical to a clean bill of health — which is the sentence this file has written about
missing screens four times now, and about sensors this is the first time.

### Numbers

Gate **523** (was 522, for the instrument's own surface check). `node tools/shot.cjs --measure`
across **69 screens**: every failure tally zero, no console errors. `node
tools/sweep-text-scale.cjs`: **6 of 6 phone corners clean**. `node tools/falsify-all.cjs`:
**26 families, 153 mutants applied, 153 caught, 0 not applied** — the new family
`falsify-camera-surfaces` proves the gate check can fail (2 of 2), which is the point of writing a
check about a tool at all. `node tools/probe-all.cjs`: 29 probes, none needing attention.

One thing this pass did *not* fix, tracked separately: the manifest labels a dialog screen by the
hub behind it, so `resident-edit-form` reports "Resident Profile" over a picture of the edit form.
All six new screens carry the wrong label, and so do the three dialogs that predate them. It is the
same rule as the walks — say what was actually painted — and it misled this pass twice, which is
why it is a task rather than a footnote.

---

## 64. The instrument mislabels its own pictures

Writing §63's numbers meant reading the walk's output, and the output said:

```
shot resident-edit-form  shows "Resident Profile"
```

over a picture of the edit form. All nine dialog screens were labelled by something other than the
dialog — the six new ones by the hub behind them, the three older ones by the sheet the dialog was
raised from.

The rule that names each shot is already written down in `tools/shot.cjs`: *a filename is a claim
about the pixels in it*, and because `querySelector` answers in document order rather than selector
order, the layers have to be asked one at a time. The list of layers asked was `.sheet .sheet-title`,
then the chat head, then the auth wordmark, then the screen's own title. **The dialog was simply not
in it.** The rule had been implemented for two of the three surfaces the app paints over.

This was the second time the same blind spot cost this session time: §62's focus probe reported the
admin's PIN dialog as `"Admin account"` for the same reason, and during §63 a line reading
`resident-profile → "Resident Profile"` was taken as evidence that the modal screens were clean when
it said nothing about them at all. A tool that mislabels its output does not just fail to inform the
reading — it makes the wrong reading look supported.

The fix is the layer order, which is the paint order: ask the dialog, then the sheet, then the
screen. It is pinned by a gate check about the *order* of the two lookups rather than their presence
— a check that only asks whether `.modal-layer b` appears somewhere in the file would pass on a
lookup that asks it last — and `falsify-camera-surfaces` now carries a mutant that swaps the two and
requires the named check to fail.

Found in the same line of output: the shot column padded names to a fixed 20 characters, and six of
the screens added in §63 are longer than that, so the walk printed
`resident-payment-modalshows "Change payment method"`. The width is derived from the table now,
because the reason a column stops being worth reading is that someone stopped reading it.

### Numbers

Gate **524** (was 523, for the lookup-order check). `falsify-camera-surfaces` **3 of 3**. `node
tools/falsify-all.cjs`: **26 families, 154 mutants applied, 154 caught, 0 not applied**. `node
tools/shot.cjs --measure` across 69 screens: every failure tally zero, no console errors, and the
nine dialog screens now named by their own headings — `resident-edit-form → "Edit profile"`,
`provider-service-form → "NEW SERVICE"`, `admin-security-modal → "Change security PIN"`. The splash
still reads `(untitled)`, which it did before this change too: it is a logo screen with no heading,
and the gate's `<h1>` rule covers app screens, not the launch.

## 65. The phone's Back button quit the app, because the shell asked the WebView a question the page owns

§60 through §64 were bench work. The handset came back for this pass, and the first press of its
physical Back button ended the session: from a drill-in — a provider detail, a booking, a half-filled
"Edit profile" sheet — one press took Sukinnect to the launcher. `.scratch/after-back.png` is that
picture: a bamboo roof, a pool table, three app icons, and no Sukinnect.

### The question the shell had been asking

`MainActivity.onBackPressed()` asked `web.canGoBack()`, and told it could not, called
`super.onBackPressed()` — which finishes the activity. `canGoBack()` reads the WebView's *navigation*
stack: document loads. The page has been a single document since the splash, and every step the Back
machinery records after that is a `history.pushState` entry — which **`canGoBack()` does not count**.
Measured on the device (OPPO CPH2179, Android 10, WebView 155, `1.2-preview.23`): `history.length` 2
with one drill-in on screen, and the page's own `history.back()` returned to the previous screen. The
WebView answered that there was no way back. There was.

The uncomfortable half is what the bench had been saying all along. The page's Back machinery — one
entry per undoable thing, `ignoreNextPop` so a close-by-tap is not mistaken for a press, `layerKeys()`
so a fourth modal is counted the moment it exists — is the subject of eight checks in the `back`
suite, and every one of them calls `stepBack()` directly. All eight passed on a phone where no thumb
could reach any of them. §"a screen the camera has never painted is a screen nobody has checked" is
the same sentence as this one: **a step only the browser can invoke is a step the user does not
have.** The camera reaches screens by calling the app's own handlers, which is exactly why it could
never notice that the one handler a phone calls was missing.

### The fix goes the direction that holds the answer

The shell cannot ask the WebView what only the page knows, so the page tells the shell, on every
render:

```js
try { if (typeof SukiShell !== 'undefined' && SukiShell.setBackDepth) SukiShell.setBackDepth(want); } catch (err) {}
```

inside `syncBackHandles()`, where `want` is the same number the page is already balancing its
`pushState` entries against — one for an open layer, one for being off a root tab. Guarded three ways
because the same file runs in a browser, where no such object exists, and in the Node harness, where
nothing does.

And the step itself became a named function so that both callers run one implementation:

```js
function systemBack(){
  ownedEntries = Math.max(0, ownedEntries - 1);
  stepBack();
}
window.addEventListener('popstate', function(){
  if (ignoreNextPop > 0) { ignoreNextPop--; return; }   /* our own cleanup, not the user */
  systemBack();
});
```

Before this, the body of that step lived *inside* the `popstate` listener, so the only way to spend a
back entry was for something to fire `popstate` — which the shell cannot do without `canGoBack()`
agreeing first, the very check that lies. Hardware Back and browser Back are now the same function
called from two places, which is the only arrangement in which they cannot drift.

### The shell half, written down because it is not in any diff

`Sukinnect-Android/` stays out of git by the owner's standing decision, so nothing a reviewer clones
shows what the Java does. It is quoted here for that reason — a fix that exists only on one machine is
a fix the next rebuild re-breaks:

```java
/* The page reports how much of its own back stack there is to undo, on every render.
   onBackPressed() reads that integer instead of asking the WebView, because
   WebView.canGoBack() does not count the entries history.pushState() creates — measured on
   an OPPO CPH2179 (Android 10, WebView 155): the page reported history.length 2 and its own
   history.back() returned to the previous screen, while canGoBack() answered false and the
   activity finished, so a single Back press quit the app from any drill-in or open sheet.
   The bridge is one setter that stores a non-negative int; it exposes no file, intent or
   preference to page script, which is the only reason addJavascriptInterface is safe here. */
web.addJavascriptInterface(new SukiBridge(), "SukiShell");

/* How much the page says it has to undo. Volatile because setBackDepth() arrives on the
   WebView's JavaBridge thread while onBackPressed() reads it on the UI thread; static so the
   bridge cannot pin an Activity instance past its lifetime. */
private static volatile int backDepth = 0;

public static class SukiBridge {
    @android.webkit.JavascriptInterface
    public void setBackDepth(int n) { backDepth = Math.max(0, n); }
}

@Override
public void onBackPressed() {
    /* Ask the page first. It knows whether a sheet, a picker or a drill-in is on screen; the
       WebView's own history does not see those steps, so the previous order of checks —
       canGoBack(), then give up — quit the app from anywhere that was not the root tab. */
    if (web != null && backDepth > 0) {
        web.evaluateJavascript("try{systemBack()}catch(e){};null;", null);
        return;
    }
    if (web != null && web.canGoBack()) {
        web.goBack();
    } else {
        super.onBackPressed();
    }
}
```

`addJavascriptInterface` is the one Android API with a legitimate reputation for danger, so the
surface is worth stating exactly: one method, takes an `int`, clamps it at zero, stores it, returns
nothing. It reads no file, no preference, no intent, and hands page script nothing back. The depth is
also a *count*, not a capability — a page that lies about it can only make the shell do nothing, or
call a function that already runs on every browser Back press. `canGoBack()` is kept as the fallback
rather than deleted because a real document load — a tile error page, a link that leaves — is still
something the WebView knows about and the page does not.

### Verified on the handset, at `1.2-preview.24`

Three presses, three different screens, each photographed:

- **A sheet open** (`.scratch/back-sheet.png`, 9:10): the sheet closed and the app stayed on Resident
  Home. It did not exit.
- **A drill-in** (`.scratch/back-fixed.png`, 9:01): back on Resident Home with the app running, nav on
  Home. One step, not a quit.
- **A root tab, nothing open** (`.scratch/back-root.png`, 9:15): the launcher. Correct — that is what
  Back means at the root, and the fact that it still exits is the positive control that the depth is a
  real number and not a permanent "stay inside".

The first two pictures are of the same screen, because both presses *ended* on Resident Home; what
distinguishes them is what was on screen before the press, which the pixels cannot show. Say so here
rather than let three filenames imply three visually different results: the finding in both is the
absence of the launcher, and the launcher picture is the third one.

### Two things the picture showed that no tally measures

`back-fixed.png` is a pass by every instrument in `tools/` — nothing clipped, nothing off the device,
contrast fine, every control ≥44px — and it is still hard to read at the phone's own text setting. The
active-booking card puts its title on five lines ("Kitchen / faucet / keeps / leaking" with each word
its own) and its provider line on four, because the card is a flex row and the avatar's 44px is not
negotiable while the text column is. The nav labels read `Booki…` and `Mess…`. Both are the §68
ellipsis rule doing its job — the word gives up its tail so the destination keeps its tap area — and
both are the open owner decision about nav labels at large text, now with a picture of the trade-off
instead of a description. A layout can be legal and still be unreadable, and no geometry tally can see
that, because geometry is what it asserts.

### And an instrument incident, recorded because it produced fake findings

While this pass was being written, a second `node tools/falsify-all.cjs` was started while the first
was still running — its output looked finished because the command was piped to `tail`, and a pipeline
that has printed nothing is not a run that has finished. The contaminated pass reported:

```
26 families, 156 mutants applied, 136 caught, 10 not applied — 3 family needs attention
```

with `history`, `identity-fallbacks` and `layer-modality` flagged as surviving mutants. None of that
was a verdict about the application. Each pass was reading a file the other had mid-mutation, so
"not applied" meant *the needle is currently rewritten by somebody else* and "survived" meant the same.
And `git diff` in the middle of the overlap showed `.sheet-layer` at `z-index:80` over the modal's 70 —
the exact stacking defect §"A MODAL OPENED FROM A SHEET HAS TO OUTRANK THE SHEET" fixed, put there by
no edit of mine — so a commit made in that moment would have reinstated a regression the gate cannot
see, because the gate calls handlers and stacking is paint. It was gone once the passes settled, and
which pass's restore removed it is not something the evidence supports saying; the third pass, the one
this section's numbers come from, reported "completed, exit 0" to its wrapper while its log was still
growing two minutes later. **During an overlap the working tree is not yours to read, and a
"completed" notification is not evidence that a run ended.**

Three rules, none of which is about Back: one mutant pass at a time, because the target file is a
mutex and not a repository; redirect to a log (`> .scratch/x.log 2>&1`) rather than piping, because the
pipe is what hid a live process; and after any interrupted or "finished" run, `git diff` the target
file before trusting either the numbers or the working tree.

### Numbers

Gate **525** (was 524, for the check that the page publishes its depth and that both Back paths call
one function). `falsify-layer-modality` **7 of 7** (was 5 of 5; the two added are the handset defect
itself — the page stops telling the shell its depth — and the two Back paths splitting).
`node tools/falsify-all.cjs`, run once and uncontested after the tree settled: **26 families, 156
mutants applied, 156 caught, 0 not applied.** The pass quoted above that reported 136 of 156 with
three families flagged is retracted; it was two passes reading each other's mutations.

`node tools/shot.cjs --measure` across 69 screens at the default width: every failure tally zero, no
console errors, 1,092 requests left the device for map tiles. The phone's own corner — which this
section first recorded as **360 CSS px at 1.35 text**, a figure taken off `Override density` rather
than off the page and corrected in §68 to the measured 320×638 — is a permanent case in the sweep now,
and it agrees with the handset on the mechanism (`root set to 21.6px -> computed 21.6px`), with every
failure tally zero, and with the ellipsized-string review line far above the anchor's 5. Its first
examples are the nav labels. `node tools/sweep-text-scale.cjs` with the case added: every phone corner
measured clean, 20 tallies each.

## 66. A word with no space in it: every field in the app is writable and `maxlength` appears nowhere

The camera measures the screens as the seed data paints them. It has never once measured them as a
person types, and `grep -c maxlength Sukinnect-next.html` answers **0** — so every name, barangay,
payout account, working-hours string and chat line in this application can hold one 60-character
token with no space in it. A word like that has no break opportunity, which means the two things the
§61 and §68 passes built are both powerless against it: `flex-wrap` has nothing to wrap at, and a
column with `min-width:0` has nothing to shrink to. The word simply grows.

`node tools/probe-long-input.js` is the instrument for that, run through the camera
(`--probe=@tools/probe-long-input.js`) so each screen is still reached through the app's own entry
points rather than by assigning `state.*`. It writes a **distinct** unbreakable token into each
writable field — `Raddr`, `Remerg`, `Pbank`, `Aname`, `Cmsg` and the rest — re-renders once, and
reports which box broke and which field's token is inside it. Then it puts everything back.

### What it found, before anything was fixed

Eighteen findings, on nine elements across three screens, at the camera's default 390px:

```
resident-profile / resident-edit-form
  barangay <span>       65px past the panel   (427px box)
  address <b>          111px past the panel   (473px box)
  barangay <b>         114px past the panel   (476px box)
  emergency contact <b>115px past the panel   (477px box)
provider-profile
  phone <b>            114px                  (476px)
  working hours <b>    110px                  (472px)
  payout account <b>   114px                  (476px)
admin-dash
  the title <h1> and its wrapper <div>  172px past the panel, 494px wide
```

The profile hub's `Home Address: <b>…</b>` rows are the plain form of it: an inline `<b>` in a block
whose only width is the card's. The admin dashboard is the interesting one — the name goes into the
top bar's `<h1>`, and §61 had fixed that bar with `flex-wrap:wrap`. **A wrap can only wrap
somewhere.** With one 60-character word in the bar there is no soft break opportunity at all, so the
rule that had saved the bar from growing at 200% text did nothing here.

### The fix is one inherited declaration

```css
body{ overflow-wrap:anywhere; }
```

`overflow-wrap` inherits, so one line on `body` reaches every `<b>`, `<span>`, `<h1>` and card in the
file — which is the right shape for a defect that was never about any one of the nine elements. It is
`anywhere` and not `break-word`, and that part is measured rather than reasoned, because the first
version of this comment had it backwards:

| keyword on `body` | findings across all 69 screens | worst case |
| --- | --- | --- |
| *(none)* | 18 | title 172px past the phone |
| `break-word` | 5 | title 172px past the phone, 494px wide |
| `anywhere` | **1** | 30px clipped *inside* a bar that already hides overflow |

The claim I wrote first — that `break-word` "still widens the flex item" while `anywhere` cannot — was
an untested mechanism, and running the whole sweep under each value contradicted it while agreeing
with the choice. So the sentence in the stylesheet and in the gate now says what was observed, and
the reason is left out, because nothing in this pass measured a reason.

### The one finding left, and why it is recorded rather than fixed

`CLIPPED NO ELLIPSIS Aname <div.topbar> hides 30px (client=390 scroll=420 … culprit=<div.topbar>)`.
Three attempts to reproduce it on a subset — `--only=admin-dash`, then `admin-edit-form,admin-account,admin-dash`,
then the same with the modal screens — all read clean. It only appears mid-walk, which is the §63
caveat about the contrast sampler arriving from the other direction: **a subset's line is unproven in
both directions, and here the full sweep knows something the subset does not.** The culprit walk
inside the probe stops at the bar itself, which means the 30px is text ink inside a descendant whose
own box fits — the one thing a rect comparison cannot see.

What is *not* in doubt is the size of the residual: 30px clipped inside a `.topbar` that already
carries `overflow:hidden`, on a screen whose owner has typed a 60-character name with no spaces. The
instrument now prints enough geometry to chase it, and it is on the list rather than closed.

**Closed in §67, and it was never a defect.** The 30px is the brand accent glow — `.topbar::after`,
160px of radial cyan parked at `right:-30px` on a bar that hides its own overflow so the halo bleeds
and stops. No text was truncated; the sensor named the admin's because a header's `textContent`
contains whatever the bar holds, and that is a correlation.

### Two defects in the instrument, both found before it was trusted

**The probe leaked its own chat message.** It appended a line through the app's `appendMessage()` and
cleaned up by filtering `MESSAGES` on `m.threadKey` — a field the records do not have; the key is
`thread`. So the filter matched nothing, the row stayed, and every later screen in the walk was
measured with a 60-character message in somebody's conversation, while the probe reported
"nothing broke". The fix holds the object `appendMessage()` returns and splices by identity, and the
answer now prints the row count it saw, because an instrument that cannot see reports a clean result.

**`className.split(' ')` throws on an SVG node**, where `className` is an `SVGAnimatedString`. The
first version died on the first circle it met and the camera printed `threw:`, which is a probe
failure and not an app finding — the distinction the tool's own error line exists to make.

### Why not `maxlength`

Because it silently discards what a person typed. A field that stops accepting characters at 40 is
the same class of defect as a toast that says "saved" on a device that cannot write: the interface
says one thing and the record holds another, and nobody is told. §49 asks for recoverable errors and
§63 for not claiming what is not true, so the layout absorbs the text instead of the input pretending
the text is shorter.

### Numbers

`node tools/falsify-long-input.cjs`: **2 of 2 breaks caught, 0 not applied** — removing the
declaration brings back 14 damage findings on the two profile screens, and the keyword mutant is
caught by the gate, with the reason written next to it in the file. Gate **526** (was 525).
`node tools/falsify-all.cjs`: **27 families, 158 mutants applied, 158 caught, 0 not applied.**
`node tools/shot.cjs --measure` over all 69 screens after the change: every failure tally zero, no
console errors, and both review lines unchanged from the run before it — 5 intended ellipses, 0
fields named only by a placeholder — so the inherited break cost nothing on the text the app ships
with. The one thing it changed is what happens to text the app does *not* ship with.

The device tree was re-synced and cut as `1.2-preview.25` (`versionCode 27`) so the untracked shell
carries both this rule and §65's Back entry point; the bundled page was proved identical to this file
from *inside the APK*, and the whole thing is written up in `DEVICE-PASS.md` because git will never
show any of it. No handset was attached, so nothing about that build is verified on hardware.

## 67. The bottom nav left a chat room open — and a decorative glow explained §66's last finding

§66 closed with one finding it could not explain: 30px clipped inside the admin top bar, appearing
only mid-walk. Chasing it produced two things — the explanation, and a defect that matters more.

### The 30px was the brand glow, and my sensor called it a name

The probe grew a text-ink measurement (a `Range` over each text node, because a box rect cannot see
where glyphs actually land) and a generated-box check. Both ran over all 69 screens, and the answer
was:

```
CLIPPED NO ELLIPSIS Aname <div.topbar> hides 30px
  INK=none  GEN=[div.topbar::after w=160 pos=absolute right=-30px left=260px at=390]
```

`.topbar::after` is the accent glow §33 asks for — `content:""`, a 160px radial cyan halo, parked at
`right:-30px` on a bar that has `overflow:hidden` precisely so it bleeds and stops. Nothing was
truncated. The name was never the cause: **the sensor attributes a finding to whichever typed token
appears in the element's `textContent`, and on a header that is a correlation, not a cause.** The
line now prints the generated box and the ink measurement so the next reader can see it is
decoration, and §66's "residual" is withdrawn rather than left standing.

### What the same field exposed while I was looking for that

To see which screen produced the clip, the probe started printing which layers were open when it
measured. The tally across the sweep:

```
35 layers": "|chat"        11 layers": ""         6  "sheet|chat"
 5  "verificationModal|chat"   3  "sheet|providerProfileModal|chat"   …
```

`state.isChatOpen` was **true on 35 of 69 screens**. That is not the walk being clever — the walk
reaches each screen through the app's own entry points, and one of them leaves the flag set. Reproduced
through the path a thumb takes:

```
start on Home              tab=home  isChatOpen=false  onRootTab=true  data-root=1  backDepth=0
after nav to Messages      tab=messages isChatOpen=false onRootTab=true data-root=1  backDepth=0
after opening a thread     tab=messages isChatOpen=true  onRootTab=false data-root=0 backDepth=1
after nav back to Home     tab=home     isChatOpen=true  onRootTab=false data-root=0 backDepth=1
```

Home paints Home — the chat gate is inside the `tab==='messages'` branch — but the application
*believes* it is in a drill-in. Three consequences, all visible: `data-root` is not applied, so the
root-tab header treatment is replaced by the compact one and the brand glow comes back on a root
screen; `syncBackHandles()` records a back entry for a step that no longer exists, so the phone's
Back button spends it and appears to do nothing; and `lastRootTab` stops being updated, so the tab
Back returns to can be the one from before the last navigation.

The cause is one line of intent the nav did not keep. Its own comment says entering a tab "always
starts clean: an overlay left flagged by the previous screen must not be waiting there for the user"
— and `clearModals()` clears the modals and the sheet, not the room.

### The second stale flag came from the instrument, not from me

Rather than fix the one flag, the check became a probe: `tools/probe-stale-overlay.js` asks the
state object which overlays it has — the same derivation the Back machinery uses, plus the room —
sets each one, taps a real nav button, and reports which survived. On its first run it named a
second one I had not thought to look for:

```
STALE AFTER NAV  resident  state.providerDeclineConfirm survived the tap
```

`clearModals()` hand-listed four `*Modal` fields. `layerKeys()` has derived every `*Modal` *and*
`*Confirm` field from `state` for weeks, and the Back machinery used it — the list was only ever
half-converted. This is the same defect §62's modality work names ("`openLayers()` named four of the
five modal fields and missed the resident's"), surviving in the function nobody had pointed at the
convention.

### The split is render()'s destination key, and that is what makes the obvious fix wrong

`isChatOpen` cannot be cleared inside `clearModals()`, because `render()` calls that whenever the
destination changes — and `isChatOpen` **is** part of the destination key, so clearing it there closes
a chat room the instant it opens. Every `*Modal` / `*Confirm` field is absent from that key, so those
can be derived and cleared together. The rule is therefore: a flag that *is* a destination gets cleared
where leaving it is the point; everything else comes from the convention, so a field added tomorrow
is cleared the moment it exists.

`node tools/falsify-stale-overlay.cjs` makes that split the thing under test, and its third break is
the tempting wrong fix — move the clear into `clearModals()` and delete it from the nav:

```
CAUGHT  the nav stops closing an open room, which is the defect as found
          — named check failed; probe reports state.isChatOpen
CAUGHT  clearModals() goes back to a hand-written list and forgets a confirm flag
          — named check failed; probe reports state.providerDeclineConfirm
CAUGHT  the tempting wrong fix: clear the room inside clearModals(), where render() also calls it
          — named check failed; 2 other check(s) failed: a chat room with one side missing keeps both
```

The third line is the one worth keeping: the wrong fix is caught not only by the new check but by two
existing ones, which is the evidence that the suite already knows what a chat room looks like when it
paints. Had it failed only the named check, the suite would have been blind to the room opening at
all, and that would have been a finding about the instruments rather than the app.

### Numbers

Gate **527** (was 526). `falsify-stale-overlay` **3 of 3**, and `falsify-long-input` re-run at
**2 of 2**. `node tools/shot.cjs --measure` over all 69 screens with the nav and `clearModals()`
fixed: every failure tally zero, no console errors, no horizontal overflow. The one line that moved
is the informational one — requests that left the device went 1,092 → 731 — because 35 screens are
now measured as the root tabs they are instead of as drill-ins, and fewer of them mount a map. That
is the count doing its job, not a regression, and it is the reason the figure is quoted with the
command rather than kept in prose. `node tools/falsify-all.cjs`, one uncontested pass with the new
family in it: **28 families, 161 mutants applied, 161 caught, 0 not applied.**

## 68. Nobody had ever clicked anything twice — and the phone corrected the corner built for it

Every check in this repository performs its action once. The gate calls a handler and asserts the
world afterwards; the camera clicks a control and photographs the result. A thumb does neither: it
taps twice, because a tap on glass has no travel to feel. `tools/probe-double-tap.js` is the
instrument for that — it fills a form the way a person fills one, clicks a painted control, clicks
the **same node** again, and counts what each click wrote.

### Four instrument defects before the first real answer

None of this is the app's fault, and all of it would have produced a false report if it had been
trusted:

1. **A snapshot compared the wrong thing.** The first version subtracted a snapshot of record
   *contents* (an array of JSON strings) from another, answered `NaN` for every record family, and
   reported every single control as `SECOND TAP WRITES AGAIN`. A sensor whose only answer is failure
   is measuring itself. Counts are now a separate snapshot from the strings that restore the records.
2. **A control whose first tap does nothing is not a guarded control.** Both read as "the second tap
   wrote nothing", so the taxonomy has three verdicts now — `guarded`, `SECOND TAP WRITES AGAIN`, and
   `NOT EXERCISED` — and `NOT EXERCISED` prints what the app said when it refused.
3. **Filling only the empty fields made every edit form inert.** An edit dialog arrives populated, so
   nothing was typed, the save wrote back identical values, and the probe reported "not exercised"
   about a control that had simply been handed nothing to change. It now edits one field when the
   form was already full, because a real edit is a *change*.
4. **A synchronous double-click cannot see an asynchronous commit.** The booking sheet — the app's
   most important action — came back `NOT EXERCISED` with no refusal message, and looked like a dead
   button. It is neither: `submitBookingRequest()` sets `requestSubmitting`, paints the §47 loading
   state, and commits from a `setTimeout(…, 900)`. The second tap is refused by that in-flight flag,
   which is exactly the guard this pass was hoping to find — invisible until the probe waited 1.3 s
   between clicks. `shot.cjs` evaluates a probe with `awaitPromise`, so an async probe is enough.

### What it found in the application

Twelve record-writing controls across the screens that paint them. Eleven were already guarded —
including the booking submit, the offer answer, the dispute, the payout listing and the portfolio
save. One was not:

```
SECOND TAP WRITES AGAIN  [saveAdminProfile()]  state.adminAuditLog +1
```

`saveAdminProfile()` appended `"Admin profile updated"` to the Audit Log on **every** press, so a
double tap recorded one edit twice, and — the same defect with one fewer tap — a first press on an
untouched form recorded a change that had not happened. That is §29's auditable record, writing
things that did not occur.

The fix keeps the writes idempotent and makes only the **claim** conditional:

```js
const changed = Object.keys(state.adminProfileData)
  .filter(k => state.adminProfileData[k] !== before[k]);
if (changed.length) {
  adminLog('Admin profile updated', state.adminProfileData.name,
    changed.map(k => k === 'officeLocation' ? 'office' : k).join(', ') + ' changed');
  state.adminAccountModal = 'saved';
} else {
  state.adminAccountModal = 'unchanged';
}
```

and the same shape in the resident's and provider's saves, which wrote no row but did open `"Changes
saved successfully."` about a form nobody had edited. The dialog now has a third state that says
`No change to save` / `Nothing on this form changed, so nothing was saved.`

### The refactor that broke two unrelated checks, and why that is the finding

The first version of this fix rewrote the handlers to compute a `next` object and then assign it. The
gate went red on two checks that had nothing to do with saving:

```
FAIL  the page declares fields a keyboard can write   3 found
FAIL  the rule has something to bite on   7 writable reads into markup
```

Those checks resolve the app's keyboard-writable fields by matching `state.x.field = el.value` in the
source — deliberately, because a hand-maintained list of field names goes stale the moment somebody
adds one. Writing the assignments into a `next` object made the pattern answer 3 instead of 12, and
the escaping audit quietly lost two thirds of its coverage while still printing a green line for
everything it could still see. **An instrument's assumption about how code is shaped is part of what
the code has to respect.** The final version keeps the original assignment lines — they are
idempotent, so running them always is harmless — and conditions only what the app then claims and
records.

### Three screens the walk had never painted

`resident-save-unchanged`, `provider-save-unchanged`, `admin-save-unchanged`: open the edit form,
press Save. A destination behind a button is a destination, and a fix that has never been painted has
never been measured — the walk is now **72 screens**, and all three dialogs pass the tap floor, the
contrast sample and the reachability check like any other markup.

### The phone corrected the corner built for it

The handset came back mid-pass, and the first measurement out of it undid a figure §65 recorded
yesterday. The OPPO CPH2179 reports `Override density: 360` on a `720x1600` panel. That is a
**density**, not a layout width: 720 ÷ (360/160) = **320 CSS px**, and `window.innerWidth` on the
device answers `320`, with `innerHeight 638` — the panel minus the status and navigation bars. The
sweep case added yesterday was labelled "360 CSS px at 1.35 text, the OPPO's own combination" and was
not that phone's combination at all. It is now `{ width: 320, height: 638, scale: 1.35 }`, and the
bench reproduces the handset to the pixel:

```
device  nav=Home[whole] Bookings[CLIPPED 14px] Messages[CLIPPED 20px] Profile[whole]
bench   "Bookings" loses 14px, "Messages" loses 20px        213 ellipsized strings
```

`1.2-preview.27` (`versionCode 29`) was installed and asked:

- `body overflow-wrap` computes `anywhere` on the device — §66's rule is live on real hardware.
- The §67 fix, through the real path: messages list → open a thread (`isChatOpen=true`,
  `data-root=0`, `backDepth=1`) → tap Home in the bottom nav → `isChatOpen=false`, `onRootTab=true`,
  `data-root=1`, **`backDepth=0`**. One press of the physical Back button then put
  `com.oppo.launcher/.Launcher` in the focus window: the app exits from a root tab in one press,
  where before the fix that same state carried a phantom entry and the first press did nothing
  visible.
- The §68 fix, with a real edit typed into the admin name: audit rows `0 → 1` for the edit, still
  `1` for the untouched second save, and the row reads
  `{"action":"Admin profile updated","result":"name changed","stamped":true}`.

### Numbers

Gate **528** (was 527). `falsify-double-tap` **2 of 2** — the audit-row break is caught by both the
gate and the probe, the dialog break by the gate only, and the file says why rather than pretending
to a test it does not have. `falsify-camera-surfaces` **3 of 3** after the walk grew.
`node tools/falsify-all.cjs`, one uncontested pass with both new families in it: **29 families, 163
mutants applied, 163 caught, 0 not applied.**
`node tools/shot.cjs --measure` over the new **72 screens**: every failure tally zero, no console
errors. The corrected device corner run alone (`--width=320 --height=638 --font-scale=1.35`) reports
the same: zero on every hard tally, and 213 on the ellipsized-string review line.

## 69. Two labels can both be inside the box and still be printed on top of each other

The handset pass asked for a photograph of the provider's two charts at maximum text — item 3 of the
list `DEVICE-PASS.md` has carried for two days. On the OPPO at 320 CSS px with its own text at 135%,
the Weekly earnings chart is a mess that every instrument in `tools/` calls clean:

```
"Aug 24" x "Sep 14"   overlap 27x26px      five y ticks: 20px tall, 21px apart
"0" x "₱100"           overlap 13x14px      "₱100" x "₱200"     49x14px
"₱200" x "₱300"        52x14px              "₱300" x "₱400"     53x14px
```

`chart labels painted outside their own chart box: 0`. That is correct, and it is the blind spot: both
labels were inside the box. They were simply inside it **on top of each other**. Every tally in the
camera asks a containment question — is this clipped, is it outside its parent, is it under the nav,
is it off the scale, is it reachable — and not one of them asks whether two pieces of painted text
land on the same pixels.

### The new sensor, and the three false findings it took to build it

`text painted on top of other text in the same card` compares leaf text elements pairwise. Its first
version reported **7 collisions on 4 screens at the default width**, and every one of them was wrong:

1. **Text inside a closed `<details>` still has a layout box in Chrome.** Six of the seven were the
   dispute evidence timeline on `admin-desk` — rows at real coordinates, painted nowhere. The tell was
   `document.elementFromPoint` at each row's centre answering the *button* on top, and
   `details { open=false }` in the ancestor chain. The guard is the disclosure, not the hit-test: an
   `elementFromPoint` filter would also silence the chart labels, which are `pointer-events:none` by
   design.
2. **A clipped `sr-only` data table still answers `getClientRects()` with its full text width.** After
   the first guard, the provider dashboard reported 11 collisions, six of them the screen-reader list
   (`<li>Aug 24: 0`, 1px wide) sitting on the caption below it. Anything an ancestor hides — the clip
   pattern, `visibility`, `opacity: 0` — is now out.
3. **An element rect covers every line a wrapped inline touches.** "Customer Ratings" and "(41 jobs
   completed)" on the fruit sheet are two spans on consecutive lines; their element boxes overlap by
   the height of the wrap and nothing on screen touches anything. The comparison is now line-box to
   line-box, via a `Range`, and both axes must overlap on the *same* pair of lines.

Each of those was a finding I would have filed. The gate pins all three guards, because a sensor that
cries wolf in the one place nothing else looks is worse than the blind spot it replaced.

### The real defect, and why a "type-aware" budget was not

§60 moved a chart's words out of the scaled SVG and into HTML positioned by percentage of the plot.
The thinning rule that decides how many of them to draw kept dividing **viewBox units**:

```js
const fit = Math.max(1, Math.floor(w / (62 * (rootPx / 16))));   // w is in viewBox units
```

It scales with the root size, so it reads as type-aware, and at the default it is identical to the old
rule. But the text it now budgets is painted in CSS pixels against a box capped at 320px, so the two
sides of the division stopped being the same unit the day the labels left the SVG. Measured on the
device: plot 188px, label 63px, three labels drawn 70px apart.

The fix measures instead of estimating. A hidden probe reproduces the real CSS chain
(`.pad > .card > .chart-cols > .chart-plot`), answers the width the chart is about to get, and the
widest label is measured in its own class:

```js
stride = Math.max(1, Math.ceil((labelPx * 1.5 + 8) / slotPx));
```

The **1.5** is the first label's edge anchor: `.chart-cat` is centred on its bar except at the plot
edges, where it starts *at* the bar centre so it does not hang off the device. Budgeting one width for
it left "Aug 24" occupying 15..78 and "Sep 21" 74..134 — four pixels inside each other, which the
sensor caught and a reading of the source would not have.

The y-axis gets the same treatment, and it needed two more corrections first:

- **The tick pitch is a fraction of the inner box, not the whole plot.** Ticks are placed between
  `CHART_PAD.t` and `CHART_PAD.t + inner`, so using `h` handed 33px of room to ticks that are actually
  21.9px apart, and the axis still collided at 450px after the first version "fixed" it.
- **Measure the line box, because that is what the sensor compares.** `.chart-tick` is `line-height:1`,
  so its element rect is 20px tall while the glyphs sit in a ~26px line box — the difference is
  exactly the overlap the rule has to clear.

### Two ways the fix lied to itself before it worked

A `getBoundingClientRect()` on a **detached** element is four zeros. The first version measured the
tick label that way, silently fell through to `rootPx * 1.25`, and thinned the axis by a constant it
described as a measurement — which is how "₱100" and "₱400" ended up 9px into each other at 200% text
*after* the fix. The span has to be in the document to be measured, and the fallback has to be
labelled as the estimate it is.

And the check I wrote to pin the new sensor failed with "the collision walk is gone" on its first run,
for two reasons that are each worth remembering: the pattern was case-sensitive against a capitalised
comment, and the span limit was shorter than the comments it had to cross. A check whose anchor does
not match reports the *code* as missing. This file has now said that out loud three times.

### The corner sweep then failed all seven, and was right to

With the new tally registered, `tools/sweep-text-scale.cjs` — which treats any count it does not
recognise as must-be-zero, so a sensor added tomorrow cannot be silently informational — went from
7 of 7 clean to **0 of 7**, and the run also surfaced a second finding that had nothing to do with
charts:

```
text painted on top of other text in the same card: 1   admin-dash
round markers painted as a sliver (a flex row took its width): 1   fruit-weighed-record  .live-dot 4.1x8px
```

The first took three attempts, and the record of why is the point. It is a bar's **value label
escaping the plot** onto the header row of the card — "Bookings created" x "7", 16x8px. Three fixes in
a row made the overlap smaller and none of them removed it:

| attempt | what was changed | resulting overlap |
| --- | --- | --- |
| 1 | margin above the chart, sized in type units | 8x11px |
| 2 | headroom reserved inside the drawing, from the measured label height | 8x4px |
| 3 | the same, corrected for the 5-unit offset the anchor uses | 8x8px |

Each number got my attention because it did not go to zero, and each time I adjusted the arithmetic
instead of asking where the two boxes actually were. The fourth look measured them:

```
.chart-cols top = 2229        the "7" label: top 2191, bottom 2206   ← 23px ABOVE the chart box
.chart-sub  ("Bookings created…") top 2200, bottom 2221
```

A label 23px above a box it is positioned inside cannot be a padding problem. `topY` had gone
**negative**, and it did that because the scale is computed from one series while the chart paints
two:

```js
const sc = chartScale(Math.max(...rows.map(r => r.value)));   // ignores r.value2
…
const topVal = pair ? Math.max(r.value, r.value2) : r.value;  // paints the larger one
```

The admin's Weekly bookings chart is a *paired* chart — "Completed vs open" — and on the week where
open bookings (7) exceeded completed (3), the bar was drawn taller than the plot and its label was
anchored above the box. So the fix is one line: the scale must cover every value the drawing will
paint. The headroom reserved in attempts 2 and 3 stays, because the tallest bar's label genuinely
does need one line of room above the plot — but it is not what the collision was, and saying so is
the lesson: **three shrinking numbers in a row are a signal that the model is wrong, not that the fix
is almost right.** The escape tally could not see any of it either, for a reason worth stating:
`chartEscape` measures **left and right only**
(`Math.max(cb.left - r.left, r.right - cb.right, 0)`), so a label that leaves the box vertically is
invisible to it at every width. That gap is now task #33.

The second is §68's flex-crush rule with one member missed: `.live-dot` is an 8px circle with no
content, so as a flex item its `min-width:auto` protects nothing and a growing sibling took it to
4.1px. It now declares `flex-shrink:0`, exactly as `.wait-dot` and `.notif-btn` did.

### And a mutant that had quietly stopped testing anything

The same chain reported **1 not applied** in `falsify-responsive-type`: §69 moved the axis budget
inside an `else` branch, and one of that family's needles still looked for `const stride = …`, which
no longer exists. Five of its six mutants were still being applied and caught, so the family printed
as healthy while its coverage had dropped by one. This is the failure the README already names — a
needle pinned to a line that legitimately moves stops guarding the moment it moves — and the reason
`not applied` is a column to read rather than a footnote. Both needles are re-pointed at the fallback
branch (which is the only one the Node harness can reach, since it has no layout to measure), and the
family now reads **6 of 6, 0 not applied**.

### Numbers

### Numbers — and the first version of this paragraph was a false claim

The five widths this section first quoted were five widths of **one screen**. The seven-corner sweep,
which walks all 72 screens with every tally it knows, came back with **one colliding pair at the
default width with the text at 200%, and the same pair at 320x638 with the device's own 135%**. A
clean subset is not a clean application, and the sweep is the instrument that says so.

The pair was the admin's *Weekly bookings · Completed vs open* chart: a bar's value label **"8"
painted 15px above its own chart box and 13x8px into the card's sub-line**, "Bookings created and
carried over". `chart labels painted outside their own chart box` printed 0 for it at every width,
because that tally measured **left and right only** — a label leaving the box vertically was invisible
to the one sensor built to catch a label leaving its box. Task #33 is closed: the walk takes the
larger of the two axes and names the edge, so the line now reads
`hangs 15px above the top edge of a 264px box`. The ticks are excluded from the vertical half on
purpose, not for tidiness: a `.chart-tick` is centred on the gridline it names, so half its box sits
above a top-of-plot line on every chart — 2px at the default text size, which would keep the anchor
corner permanently dirty. The anchor and all 72 screens were measured first, and read 0, before the
failing corner was allowed to be believed.

The cause was the headroom cap refusing, and then quietly spending, the room. `chartColumns` reserves
one label line above the plot so a tall bar's number stays inside the box, and refuses that reserve
when it would take more than 38% of the drawing — because stub bars under tall labels is the trade this
function already declined. At 1.35 text on a 320px panel the reserve needs **52 of 132 units against a
cap of 50.2**, so it was refused, the bars kept their height, and the number went where a number goes
when nothing holds it: out of the chart. The rule now finishes its own thought — **when the reserve is
refused, the values are not painted** — by the same fallback that already drops them when they cannot
fit side by side. The top axis tick is kept precisely because of this moment: it names the maximum, so
the tallest bar is still legible against the scale with its own number gone.

And that suppression hid a second defect, which is the part worth keeping. Re-running
`falsify-chart-collide` against the fixed file printed **MISSED** for its third break — the
paired-series bug, `chartScale` built from `r.value` while the chart paints `max(r.value, r.value2)`.
The mutant still draws the too-tall bar. The label that used to be the evidence is now correctly
suppressed, and an SVG clips at its own viewport, so the bar simply cuts off at the top and reads as a
week that reached its maximum. **A fix had made a sensor blind to the bug it was written around.** The
walk now asks the question off the painted shapes alone —
`bars painted above their own top gridline (a scale smaller than its data)`, where the top gridline is
the smallest `y1` among the lines and one viewBox unit is the svg's own width divided by its own
viewBox width, with no arithmetic re-derived from the app. With that in place the break reports
`over=1` while `collide=0, escape=0`, which is exactly the finding the label tallies can no longer
make.

`falsify-chart-collide` reads **5 of 5, 0 not applied** across three tallies and two corners:
un-thinning the x-axis produces 27 colliding pairs, un-thinning the y-axis 9, the first-series-only
scale 1 bar above its gridline, removing the whole value-room guard 2 pairs plus 1 escape, and
removing the headroom refusal alone 1 pair plus 1 escape at the device's corner. Two halves of one
guard turned out to be **redundant at 320 @ 200%** — both refuse the numbers there — so a break that
removes only one reads 0, and the attempt to isolate the side-by-side half on the default panel
printed MISSED too. Recorded rather than papered over: no corner this seed paints makes that half fail
by itself, so it is proven jointly with the headroom rule, and a mutant that cannot fire anywhere is
not coverage.

The same chain then printed **1 not applied** in `falsify-flex-crush`. §69's own
`.live-dot{ flex-shrink:0; }` gave the waiting dot's needle a second match, so that mutant had quietly
stopped being applied while the family still printed every mutant it did apply as caught. Re-pointed
through the file's shape-scoped cut — `.wait-dot{` and `.live-dot{` named separately — it also turned
out that the live dot is crushed on **`fruit-weighed-record`** and not on `booking-tracking`, the only
other screen that paints one. Found by asking all 72 screens how many `.live-dot` nodes they hold,
because the two booking-detail screens that look like the obvious hosts both answer 0 and the dot is a
status condition, not a screen. Measured first: with the guard removed the sliver tally stays 0 on
`booking-tracking` and fires on `fruit-weighed-record`. A rule proven on the wrong screen reads exactly
like a rule that does nothing, and that is how this declaration nearly got deleted. The family now
reads **5 of 5, 0 not applied**. `falsify-responsive-type` holds at **6 of 6, 0 not applied**. Gate
**529**; seven corners, 22 tallies each, **all clean**; whole suite **30 families, 169 mutants, 169 caught, 0 not applied**.


## 70. A field holding only spaces is truthy to JavaScript, and the app was already right about it

The whitespace class opened as the follow-up to §69's double-tap work: every field in the app is
writable, so a keyboard can put a single space into a name, a search, a payout account, a chat line,
a dispute note or an offer. `node tools/shot.cjs --probe=@tools/probe-whitespace.js` types one space,
three spaces and a tab into every field on the 29 screens that expose one, clicks each layer's primary
control through `.btn-block` (wording match only as the fallback), then diffs `state` before and
after, flags any value that became whitespace-only, flags any record set that grew, and restores. What
it found is a negative: every guarded write refuses with an error the screen paints — the request
sheet, the fruit listing, the portfolio, the payout account, the verification note and the reject and
flag notes — and the three profile dialogs fall back to the value they already held, after which the
unchanged-save guard says "No change to save". No whitespace value was stored anywhere a person can
see.

Two residuals are recorded rather than patched, because neither paints a lie. The sign-in form writes
`state.auth.email = " "` while refusing with "Enter your email to continue." — and nothing in the
application reads `auth.email`, so the blank value is stored and never shown. A space sent in chat
appends no record and produces no feedback, leaving the field exactly as typed, which is its own
answer.

### The search box, which needed asking separately

`startDiscovery()` writes `state.searchQuery` straight from the field, and the matcher trims before
comparing, so a space can sit in the model while the filter behaves as though the model were empty.
That is a §48 question — what does the screen *say* — and answering it took three versions of a probe,
each of which died on its own instrument:

1. it read the screen in the breath after the tap, while the simulated discovery was still printing
   "Finding nearby providers…", so a query matching plumbers and a query matching nothing both
   reported zero cards;
2. it held one `search-input` element across the loop, but the results screen paints its own field,
   so from the second case on it typed into a detached node and reported "plumbing" five times;
3. it bounced Home → Results → Home to type each query, which is a step up as well as a step down, so
   the app paid its Back debt with real `history.back()` calls — a navigation on a `file://` page, and
   Chrome took the inspected target down mid-run ("Not attached to an active page").

The version that works never leaves the destination. The results screen carries its own search field
and its own magnifier, which is the path a thumb uses after arriving anyway, and changing only the
query is an in-place update with nothing for the Back machinery to undo. It waits for the loading words
to clear before reading anything, and its control case — a query that must find a provider — runs
first and aborts the whole run if it finds none. Providers are counted by `data-provider-detail`, which
is how the app binds its own cards; the first guess at a class name found nothing and read as an empty
result.

```
typed="plumbing"  cards=1   "…96% Match Verified Ramil Odiada 0.8 km…"
typed="xyzzy"     cards=0   "No provider matches “xyzzy” Try a barangay such as Poblacion… Clear search & filters"
typed=" "         cards=8   "…Smart Matched Providers…"          (same list as no query)
typed="   "       cards=8   (same)
typed=""          cards=8   (same)
```

So the screen does not quote an empty query at anybody, and the list behaves as unfiltered. The rule
was then pinned rather than remembered, on both of its halves: the matcher's count, and the count line
under the heading, which is computed from a *second* copy of the trimmed query — `8 of 8 providers`
when something narrows, `8 smart matches` when nothing does. A blank query must produce the second
form; a real one must still produce the first, which is the control that lets either assertion fail.

`node tools/falsify-blank-query.cjs` — **2 of 2, 0 not applied**:

```
CAUGHT  the matcher stops trimming, so a space becomes a search term
        → a query of spaces found 0 providers where none found 8
CAUGHT  the results screen stops trimming what it calls a narrowing search
        → a blank query is printed as a constraint on the count line
```

The second break was MISSED on the family's first run, when the check only counted providers. The
check was widened rather than the mutant deleted: an unobservable mutant is a gap in this instrument's
coverage, not evidence that the code does not matter. Both breaks are anchored on the function that
owns the line, because that line is written twice in the file and a needle matching two places
silently mutates neither.

### Numbers

Gate **530**. `falsify-blank-query` **2 of 2**. Whole suite after this pass: **31 families, 171 mutants, 171 caught, 0 not applied** — the new
family is gate-driven, so no camera run and no sweep corner changed; the application file itself is
untouched by §70, which is why the seven-corner sweep from §69 still describes the build.

## 71. Does every notification open the thing it is about?

§27 asks for that and §28 makes it concrete — "Booking Confirmed" should open *that booking*. Nothing
in `tools/` had ever asked. The question got asked two ways, because the two fail differently.

**In a real page.** `node tools/shot.cjs --probe=@tools/probe-notification-targets.js` walks every
screen, keeps the ones that paint `[data-notif]` rows, calls the same `openNotification()` those rows
are bound to, and reads where the app landed and whether that screen names the object:

```
n1 booking/b1  -> booking_detail   names=true  by=[Ramil Odiada / Kitchen faucet leak]   (Booking Confirmed)
n2 provider/p3 -> provider_detail  names=true  by=[Cristy Fernandez / Cleaning]          (Verified Pro Nearby)
n3 booking/b3  -> booking_detail   names=true  by=[Cristy Fernandez / Full house deep clean] (Payment Processed)
n4 booking/b6  -> booking_detail   names=true  by=[Jerico Salamat / Rewire flooded junction box] (Service Completed)
```

Four rows, four correct destinations, and one coverage fact that had never been written down: the
resident is the **only** role with a notification surface in this build, so for provider and admin the
rule is untestable rather than satisfied.

The probe stubs `history.back()` and `history.go()` for the duration of the walk and prints how many
calls it swallowed. That is not a shortcut around a hard case, it *is* the hard case: returning from a
drill-in to the list makes a destination go shallow, `syncBackHandles` pays that debt with real
`history.back()` calls, and on a `file://` page a back() is a navigation — the mechanism that has now
killed the inspected target three times in this repository's history. Nothing in this measurement is
about the Back machinery, so the machinery is parked, and the answer says so.

### The instrument was wrong before the application was

The first run reported **4 misses out of 4** — every notification allegedly landing on a screen that
named nothing. The cause was in the probe: it resolved a booking's provider with
`providerOf(b.providerId)`, and `providerOf()` takes the **booking**, not the id
(`p.id === booking.providerId`). Every lookup therefore hit the "Unknown provider" stand-in §69b
built, and the probe dutifully reported the application as broken. The fix is not just the argument:
the probe now returns each record's own key list beside its verdict, so the next time an expectation
is wrong the output says so instead of looking like a defect.

### Pinned in the gate, with one failure shape rather than two

A camera walk cannot catch the seed drifting, because a notification pointing at a deleted booking
still opens *a* page — the honest stand-in — and a screenshot of a stand-in looks like a screen. So
the reference itself is asserted: `every notification points at a record that exists`, with a positive
control that the set is non-empty. `node tools/falsify-notification-routes.cjs` proves it, **2 of 2**:

```
CAUGHT  a notification is left pointing at a booking that no longer exists → unreachable target: n1 routes nowhere
CAUGHT  a notification loses its target and routes nowhere                 → unreachable target: n3 routes nowhere
```

Both messages are the same branch: `notificationRoute()` resolves the record before it answers, so a
dangling id and a missing field are one state to the app. The second break is still worth keeping —
it is the only thing showing the check reads the *route* rather than the presence of a field — but the
file says plainly that it is not evidence of two distinct guards.

### Numbers

Gate **531**. `falsify-notification-routes` **2 of 2, 0 not applied**. Whole suite after this pass:
**32 families, 173 mutants, 173 caught, 0 not applied**. No application code changed in §71; the shipped `Sukinnect.html` remains identical to
`origin/main` (`git diff --quiet origin/main -- Sukinnect.html`).

## 72. Does the axis name the week that actually holds the maximum? No — and the fix was reverted

The vivo screenshots raised it: the provider's earnings chart has one non-zero week, it is the last
row, and the axis thinning keeps rows 0, 2, 4, 6 — so the only bar with money in it stands over
nothing. The y-axis already refuses that behaviour ("counted back from the top so the highest value is
always named"); the x-axis had no equivalent rule.

`node tools/probe-chart-axis-coverage.js` answers it from painted geometry — the tallest non-zero
`rect` in the svg, the centre of each `.chart-cat`, a slot width taken from the rows the drawing laid
out — and it is honest about its own first version, which divided the plot by the count of **non-zero**
bars. On an eight-week series with one non-zero week that made a slot a third of the chart, so every
peak looked named. Filtering zero-height rects out of the *row count* but not out of the *tallest-bar
search* is what turned the answer from `true` to `false`.

```
provider-dash  450 @ 1.0     8 rows, 1 non-zero, 4 axis labels, tallest 42px from the nearest (slot 40px)  → unnamed
provider-dash  450 @ 1.35    8 rows, 1 non-zero, 3 axis labels, tallest 42px from the nearest              → unnamed
provider-dash  320 @ 2.0     8 rows, 1 non-zero, 1 axis label,  tallest 79px from the nearest (slot 19px)  → unnamed
admin-dash     every corner  14 rows, 3 non-zero, tallest 29px from the nearest in an 11px slot            → unnamed
```

So this is not a phone artifact: at the bench's own emulation of the device's width, and at the
narrowest corner, the tallest bar has no week under it.

### The fix, and why it is not in the file

The rule is one clause long — keep the peak row's label, drop any stride-kept label the peak would
crowd — and it did put a week under the bar. It also put **two weeks on top of each other**: at 320
CSS px with the text at 200%, provider-dash's axis then painted `Aug 24` and `Oct 12` overlapping by
**51x39px**, a finding the collision tally had reported 0 for all of §69b's life. The reason turned out not to be the one
this section first wrote down. A fresh measurement says the hidden probe is exact: at 320 CSS px with
the text at 200% it measures `Aug 24` at **93.6px** and the painted label is **93.6px**. What the
budget does not model is the **anchor direction**. The first row is left-anchored so its box runs
rightward from its bar, and the last row is right-anchored so its box runs leftward — the two labels
point at each other, and their boxes need about 1.6× the clearance the stride rule assumes for
centred labels. Row 0 and row 7 sit 133px apart centre to centre, which the budget calls clear and
the boxes fill with 55px of overlap. Naming the peak therefore cannot be added on top of the current
budget: it trades an unnamed bar for text printed on text, which is the worse of the two and the exact
class §69 exists to prevent.

It was reverted rather than left half-right: the application file and the camera are byte-for-byte
back at the §71 state, the three chart tallies read **0** again at 320 @ 200%, and the gate is at
**531**. A tally was written for this too and removed with it, because `sweep-text-scale.cjs` treats
every count it does not recognise as must-be-zero and a sensor that is red on every corner with no
passing fix is not a guard, it is a blocked build.

### What is being asked, precisely

Make the thinning budget account for the anchor each label will actually get (left on the first
row, right on the last, centred in between) rather than assuming every label is centred, then name
the peak row's week the way the y-axis names its maximum. Until then the decision recorded here
is the honest one: **the chart's shape is legible, its axis under-describes it, and the figures live
in an sr-only list a sighted person never reaches.** The probe stays in `tools/` so the next attempt
starts from a measurement rather than from this paragraph.


## 73. The bottom navigation stops losing the ends of its words

The defect was measured on two handsets before anything was written about it: at 200% text the resident
nav loses `Bookings` by 46px and `Messages` by 55 on a 320px panel, and the provider's five-item nav
loses `Bookings` 61 and `Messages` 70. On the vivo's own 450px panel the same labels lose 13 and 22.
Every one of those was the §68 trade made deliberately at the time — `min-width:0` plus an ellipsized
label, so the destination keeps its tap area and the word gives up its tail.

The owner asked for the truncation to be fixed, so the row was measured first:

| corner | slot per item | the word wants | at the caption size | would fit at |
| --- | --- | --- | --- | --- |
| 320 @ 200%, resident | 74px | `Messages` 128px | 28px | 16.1px |
| 320 @ 200%, provider | 58px | `Messages` 128px | 28px | **12.8px** |
| 320 @ 200%, admin | 74px | `Dashboard` 140px | 28px | 14.7px |
| 450 @ 200%, provider | 84px | `Messages` 128px | 28px | 18.5px |

A single word has no break opportunity, so wrapping cannot help, and reclaiming 8px of padding moves a
sixth of a 58px slot. That leaves four real answers, and the choice was put with those numbers: shrink
the face to fit, shorten the copy, let the nav wrap to two rows and take ~70px from a short screen, or
go icon-only above a text threshold — the last of which takes the labels away from exactly the people
who asked for large text. **Shrink to fit, floored at the 14px type floor**, was chosen.

### What it does

`fitNavLabels()` runs from the post-render pass: it clears the measured size, reads each label's content
width against the item that holds it, and writes the size that makes the worst of them fit as
`--nav-label-size` on the nav, which `.navitem`'s `font-size` consumes with the token as its fallback.
It repeats up to three times and runs on every render.

Result at the worst corner: resident fits at **15.9px** with nothing cut, admin at **14.5px** with
nothing cut, and the provider sits at the **14px floor** with `Bookings` and `Messages` still
ellipsized — the accepted residual, not a failure: they need 13.9 and 12.8px, and below the floor a
whole word is not a word anyone can read.

### The first version passed one corner and failed the sweep

Checked at 320 @ 200% on three screens, every tally read 0. Run across all 72 screens and seven
corners, the same code reported **162 avoidable cuts** at 320x480 @ 200% and **100 font sizes off the
type scale** at four corners. Two separate causes, both mine, both found only by the wider run:

- **A cache keyed on the wrong things.** The first version skipped re-measuring unless role, width and
  root size had changed — but the provider nav grows a badge on some screens and not others, and a
  badge changes the slot every label has to fit. So a size computed for an unbadged row was carried
  into a badged one. Deleting the cache took the avoidable-cut count from 162 to **0**; measuring five
  labels per render was never a cost worth the cache.
- **The type-scale sensor and a measured size disagree.** The scale exists to keep *authored* type
  consistent; `fitNavLabels` deliberately produces 15.9px, which no token owns. The off-scale walk now
  skips `.nav-label` inside `.bottomnav` and says why, while the **below-14px walk does not** — that
  asymmetry is the rule: off-scale by design, never below the floor.

### Then the phone said it did nothing

Installed as preview.29 and measured on the vivo, the provider nav was **unchanged**: labels computing
18.9px, `Bookings` cut 22px, `Messages` cut 28px — while the custom property on the nav read `14px`.
Asked directly, the page reported `--nav-label-size: 14px` and `getComputedStyle(label).fontSize:
18.9px` at the same time. Android multiplies the *used* font size after CSS resolves — §68 learned that
about `rem` and `min()` — and the rule applies to a px value written from JavaScript just the same. A
specified 14px at `font_scale 1.35` renders 18.9px, so the floor silently cancelled the user's text
scale and no word on any phone could ever shrink.

The loop now works in rendered pixels throughout — token, ratios, floor — and converts back to
specified pixels through a factor measured with a throwaway span at a known size (`navFontScale()`),
never assumed. Re-measured on the same handset: the provider labels render at **14.0px** and
`Bookings`/`Messages` lose **1px and 6px** instead of 22 and 28, which is the residual the bench
predicted to the pixel. The bench factor measures exactly 1, which is why every bench number in this
section was true and useless: `--font-scale` emulates the platform by moving the root size, while the
platform multiplies used sizes, so any px the app writes at runtime means something different in the
two places.
### The sensor distinguishes an avoidable cut from a deliberate one

`bottom-nav labels cut although the 14px floor would have fitted them` fires only when a label is cut
at its current size **and** would have fitted at 14px — so the provider's residual reads clean and a
regression that leaves `Messages` cut at 28px does not. `node tools/falsify-nav-fit.cjs` — **3 of 3**:

```
CAUGHT  the fit pass never runs                        (cut=10, floor=0)
CAUGHT  the floor is lowered to 8px                    (cut=0, floor=5)
CAUGHT  the fit ratio is inverted                      (cut=10, floor=0)
```

The middle break is the proof the pairing works: with the floor at 8px every word goes whole, so the cut
tally goes **quiet** and the below-14px type tally is what fires. Two halves of one decision, read by
two different sensors. The family matches tally titles by prefix and parses the number out of the line,
because the below-floor title carries the count of elements it walked and a needle pinned to `(68)`
would stop matching the day a screen is added.

### Numbers

### The gap closed the same day, by the break I had deleted

The floor break reported MISSED, and the response was to remove it and write down that the sensor was
probably blind. The sensor *was* blind, and the break was the evidence — but removing it destroyed the
only thing that could show the blindness was real. Reading the walk instead of the tally found it in
one look: the nav-label skip added to the off-scale test was a plain `return`, sitting four lines above
the `below(el, f)` call, so it disarmed the floor check too. The comment written beside it said the
opposite — "the floor is still enforced, because this walk skips these labels while the below-14px walk
does not" — which was a description of an intention, not of the code. The skip is now scoped to the
scale test alone, the break is restored with this history in the family's own comment, and it fires:

```
CAUGHT  the floor is lowered to 8px, so the words go whole and unreadable  (cut=0, floor=5)
```

Gate **531**. `falsify-nav-fit` **3 of 3, 0 not applied**. Seven corners × 23 tallies **all clean**
with the floor sensor seeing nav labels for the first time — which is the run that matters, because a
nav label that actually rendered under 14px would now be reported rather than skipped. The same three
nav screens read 0 avoidable cuts, 0 sub-floor text and 0 off-scale findings at 320 CSS px with the
text at 200%. Whole suite: **33 families, 176 mutants applied, 176 caught, 0 not applied**, and nothing flagged. The row the previous
pass carried (`falsify-chart-collide`, 5 of 5 run alone against 4 of 5 inside the full pass) is
cleared: §74 moved its headroom break to a corner where the refusal is short by nine units and made
the criterion demand a 3px escape instead of one finding, and this pass re-confirmed it inside the
run rather than only alone. Confirmed on the vivo 1906 at its own `font_scale
1.35` — the 200% leg on hardware is still owed, because the handset now refuses adb's write to that
setting.

## 74. A break whose whole evidence is one pixel, and the pass that died leaving a mutant in the file

The full suite flagged a row: `falsify-chart-collide` caught 5 of 5 run alone and 4 of 5 inside the
pass. The surviving break was the headroom refusal, and the cause was arithmetic rather than chance. At
320x638 with the text at 135% the reserve needs 52 of 132 viewBox units against a cap of 50.2, so
refusing it moves the label by **1.8 units — about one rendered pixel**. A break whose entire evidence
is one finding one pixel over a threshold loses to any unrelated layout change, and the change that
beat it was this session's own: shortening the nav flipped the dashboard's scrollbar decision and the
count went to zero.

The fix is a corner, not a threshold: the break now runs at **150%** on the same panel, where the same
refusal is short by ~9 units, so the escape is several pixels. `692d6f9`. Inside the next full pass
`chart-collide` read 5 of 5 and `falsify-nav-fit` 3 of 3 — before that pass died (below).

### The magnitude criterion, which failed once for the wrong reason

The better fix is to stop counting findings and require a magnitude: fail the break unless the worst
escape is at least 3px, read off the tally's own detail lines. The first attempt at that printed
`worst escape is 0px` at a corner where the same run reported one escaping label — and the cause was
not the sensor and not the rule. The patch that wrote it was a `node -e` script inside a single-quoted
bash string, and the regex literal survived the round trip mangled. Rewritten through the editor
rather than through a shell string, the same extraction works: the headroom break now reports a
**6px** escape at 150% text, against 10px and 16px for the two label-collision breaks, and the family
is 5 of 5 with the magnitude enforced. Worth recording as its own class of instrument failure: a
metaprogrammed edit can be syntactically valid, parse clean, run without error, and still be the
wrong file — so the check is not 'did the patch tool exit 0' but 'does the written code do the thing'.
### The interrupted pass, which is the part worth keeping

The machine slept mid-run. Twelve hours later the log was still reading `trust … 6 6 0 0` with no
summary line, and `git diff` showed the application file **still carrying a mutant**:

```
-    --font-display:var(--font-ui);
+    --font-display:"Fraunces", ui-serif, serif;
```

That is `falsify-typography`'s own break — the one that reverses §68's redesign — left in the working
tree by a process that never reached its `finally`. Nothing was committed in that window, and the rule
already written twice in this repository is the one that caught it: after any interrupted or
"finished" run, `git diff` the target before trusting either the numbers or the tree. Restored with
`git checkout -- Sukinnect-next.html`, `--font-display:var(--font-ui)` back at line 127, gate **531**.

Two consequences stated rather than glossed, and then the second one closed. The suite total
quoted in AGENTS was left as the last **complete** pass, because the pass that first cleared the
flag never printed a summary and a headline from a run that died halfway is not a measurement. The
pass after it printed one: **33 families, 176 mutants applied, 176 caught, 0 not applied**, with
`chart-collide` at 5 of 5 and `nav-fit` at 3 of 3 inside the full run rather than only alone, which
is the re-confirmation the flag needed. The command that prints that line is
`node tools/falsify-all.cjs`, and the figures copied into these two documents were read out of the
pass's own log by a script that refused to write unless the log showed zero survivors, zero
unapplied needles, no silent family and no "needs attention" — no number here was typed. The script
lived in `.scratch/`, which is gitignored: a one-off doc patcher does not belong in `tools/`, so it
is named as provenance rather than as a command to run, and the guard itself is the sentence above,
not a file the next reader can open.

## 75. A runner that read one screen and called it the verdict, and the demo data that ages weekly

Three instruments reported clean while measuring nothing, and all three failures were the same shape
seen from three places.

`tools/probe-all.cjs` took the **first** `probe →` line as a page probe's verdict. The camera
evaluates a probe once per screen of the walk, so that line belongs to whatever the walk starts on —
the sign-in page:

- `probe-nav-fit.js` printed `no bottom nav painted`. Run across the walk it answers on **72**
  screens, **69** of which hold a nav. The verdict was true of the one screen that cannot have a nav.
- `probe-chart-axis-coverage.js` printed `charts:[]` and was counted clean, so the question it was
  written to ask — does an axis name its tallest bar — had never been asked in any pass that quoted
  it as answered.
- `probe-money-typing.js` printed `offer-unit ABSENT` and, this one, its own header was at fault: it
  documented `--only=fruit-sheet`, the resident's request sheet, while `offer-unit` is painted by
  `makeOfferSheet()` on `offer-sheet`.

The runner now collects every answer, prints `N answers, M refused`, and refuses on the sentinel
`NO CONCLUSION` only when **every** answer refused. The quantifier is the part worth defending: one
refusal among 72 screens means the subject genuinely does not exist on one of them, and flagging that
would teach the next author to stop declaring refusals — which is the only way a probe can say it
measured nothing. Both probes now name their own population in their headers; the axis file pins
`--only=provider-dash,admin-dash`, measured as exactly two of the 72 screens, and the stylesheet holds
exactly two `.chart-cols`, so that is the whole set rather than a sample.

```
control  the probe that never measures   flagged  XX probe-plant-refuse.js  1 answers, none measure…
control  the probe that measures once    clean    ok  probe-plant-mixed.js  2 answers, 1 refused…
CAUGHT   the refusal rule is deleted, so an empty population reads clean
CAUGHT   any refusal condemns, so an honest one-screen gap is a finding
CAUGHT   only the first answer is read, which is the screen the walk started on
3 breaks applied, 3 caught, 0 missed, 0 not applied
cleanup  runner restored: true · planted probes removed: yes
```

`node tools/falsify-probe-population.cjs` — 3 breaks, 3 caught — plants an always-refusing probe and a
probe that refuses on one screen and measures on the next, requires the pair to read flagged/clean in
the unmutated runner first, then breaks each rule and requires that pair to flip. The planted files go
into `tools/` because that is the directory the runner globs, and the family fails itself if the
restore or the deletion did not happen.

**The finding underneath the finding — and the retraction on top of it.** Pinning the axis probe is
what exposed the second half of this section, and that half was written wrong. Its answer says the
provider dashboard *names* its tallest bar (0px gap) where §72 recorded 42px with the label count
unchanged. The explanation first offered was that the earnings window slides past fixed seed dates:
"three bookings carry money, `providerWeeklyEarnings()` walks back from `weekStart(0)`, so the row
holding the money moves every Monday", and from that a whole product risk — the demo rotting by
December, a remedy to choose, three options put to the owner. **All of it was wrong, and the code is one
`grep` away from saying so.** The seed's temporal fields are relative constructors: bookings carry
`date:dayLabel(n)` and `createdAt:isoMinutesAgo(60*24*50)`, and `completedAt` is never seeded at all —
it is back-filled from `createdAt` through the accept → arrive → start → complete chain. So a probe
printing `at 2026-08-31` prints a **computed** day, and every bucket and label moves with the load
date; nothing ages out of a window that ages with it. The rule this buys: *before asserting a stored
value is fixed, open the line that stores it* — a date that renders as `Aug 31` is not evidence that
`Aug 31` is written anywhere.

What the two measurements actually disagree about is the calendar frame, and the smaller claim
survives: `weekStart(back)` aligns to Mondays while `isoMinutesAgo(days)` counts plain days, so a
50-day-old job lands in a different one of the eight buckets depending on which weekday the page was
opened. §72's measurement was right on the day it was taken. **Whether the peak is named is a date;
whether the axis thins is a rule** — decided 2026-10-20, keep the thinning, because no fix was found
that does not print one label on top of another, which is the class §69b exists to prevent.

The fixed dates are real, just not in the charts, and naming them needs the same care: **three**
`PENDING_APPLICANTS.submittedAt` literals (2026-10-08/-09/-10) behind the queue's "waiting N days",
which grows by one every day forever; **nine** `APPLICATION_DOCS.submittedAt` literals — three of that
set are deliberately `null`, because a null *is* what outstanding means — which freeze the "3 of 4
documents" line against a queue that keeps ageing; and twelve `CREDENTIALS.expiresAt` literals from
2026-09-30 (already past) to 2028-03-14, one of them **today**, against `credentialWarnDays: 30`, so a
document goes Valid → Expiring → Expired with no record changing. Seven `verifiedAt` literals only age
a caption. The remedy is the convention the bookings already use — build these from the relative
helpers instead of typing a day into them — which needs no schema bump and no install stamping, because
there is no state to re-anchor. That is the question worth putting to the owner, and it is a different
question from the one asked above.

Gate **534**; whole suite **35 families, 183 mutants applied, 183 caught, 0 not applied** with `falsify-seed-dates` added (`node tools/falsify-seed-dates.cjs`: 4 breaks, 4 caught, 0 not applied), and
`node tools/sweep-text-scale.cjs` re-run because the conversion touched the application file:
**7 of 7 corners clean, 23 tallies each** — the painted layout did not move when the dates did.
`node tools/probe-all.cjs` re-run in full: **36 probes, 0 needing attention**, with the runner now
printing each page probe's coverage — sixteen of them report it explicitly, ten saying `72 answers`
and six naming the screens they were pointed at — where before the runner printed one line and
called it the verdict. The application file was not touched by this pass, so the seven-corner sweep
was not re-run; the last clean sweep (`7 of 7`, 23 tallies each) still describes the committed file.

## 76. Twenty-four seed dates that were countdowns, converted to the convention the bookings already used

The owner's ruling on §75's real residue: make the fixed dates relative, using the helpers the file
already has rather than a new state to stamp.

What was there: three `PENDING_APPLICANTS.submittedAt` literals (2026-10-08/-09/-10) feeding
`applicantWaitDays()`, so the verification queue aged one day per day forever; nine
`APPLICATION_DOCS.submittedAt` literals — three rows deliberately `null`, because a null *is* what
outstanding means — freezing the "3 of 4 documents" line against a queue that kept moving; and twelve
`expiresAt` literals (eleven in `CREDENTIALS`, one on a document row) running from 2026-09-30, already
past, to 2028-03-14, one of them landing on **today**, which against `credentialWarnDays: 30` makes a
document go Valid → Expiring → Expired with no record changing.

What replaced it: one builder and two named wrappers beside the existing `isoMinutesAgo` —

```
function isoDay(offsetDays){                       /* local frame, never toISOString().slice() */
  const n = new Date();
  const d = new Date(n.getFullYear(), n.getMonth(), n.getDate() + offsetDays);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function isoDayAgo(days){ return isoDay(-Math.abs(days)); }
function isoDayAhead(days){ return isoDay(Math.abs(days)); }
```

with each offset chosen to reproduce the day-count the build was measured with on 2026-10-20, so
`submittedAt:isoDayAgo(10)` means "waiting 10 days" on any day the page is opened. Two things make this
cheap rather than a migration: the three arrays are **not** in `snapshot()`, so they recompute on every
load on every device — no install stamping, no stored state to correct — and `SCHEMA_VERSION` stays 16,
because nothing on disk changed shape. The seven `PROVIDERS[].verification.verifiedAt` days were left
literal on purpose: a day something happened is history, a day something expires is a countdown.

**The proof is a diff, not a claim.** `.scratch/probe-seed-states.js` asks the app's own functions for
every state a fixed date can produce — wait labels, per-applicant document counts, each credential's
`code`/`days`, the per-provider worst state — and the same command run before and after the conversion
printed an identical block: waits `joel 11 · liza 12 · maria 10`, docs `4/4 · 2/4 · 3/4`, and
1 expired / 5 expiring / 5 valid out of eighteen documents. Nothing was retuned to make that happen;
the offsets were derived from the states, which is why the diff came back empty.

Three gate checks hold it (`suite('dates')`):

- `a seed row declares an offset from today, never a typed calendar date` — the scan, plus a positive
  control requiring at least twenty relative call sites, because `typedDays.length === 0` is equally
  true of a clean file and of a broken scanner;
- `the day helper answers the local calendar day, and its two wrappers agree with it` — the frame the
  "Verified Mar 13" bug was made of, asserted against a locally built date rather than a UTC slice;
- `the seeded day offsets still produce the states this build was measured with` — waits `10,11,12`
  and 1/5/5, so changing an offset moves a number here instead of silently re-colouring a badge.

`node tools/falsify-seed-dates.cjs` — **4 breaks, 4 caught, 0 not applied** — types a date back into a
credential row, gives the day builder the month below the one it was handed, moves one applicant's
offset by a day, and renames the check's own good pattern so its scan matches nothing. The last is the
one worth keeping: it fails on the positive control alone, with the detail reading
`0 typed date(s), 0 relative offsets`.

Two notes on the work itself. The bulk edit was driven by a script that asserted a match count per
swap and refused to write at all when one guard did not hold — its first run aborted on a `verifiedAt`
pattern written without the quote between `:` and the date, so nothing was half-edited. And the write
that did land inserted LF newlines into a CRLF file, which the hygiene suite caught with an unrelated
sentence: *the file carries no doubled carriage return — CR 11586 against LF 11597*. The check whose
subject is line endings is the one that noticed; normalise after any script that builds new text.

## 77. A dialog the platform is not told about is a change of pixels, and the caret that never arrived

The instrument for this one already existed and had simply never been asked: `tools/probe-layer-focus.js`
reads, off the painted DOM, every layer that has a box, the dialog semantics found anywhere inside it,
where `document.activeElement` is, and whether that node sits inside the top layer. Run across the
nine layer screens the camera can reach:

```
booking-sheet           focusInside=no   (no dialog node for the box)
resident-edit-form      focusInside=no   role=- modal=- name=-
resident-payment-modal  focusInside=no   role=- modal=- name=-
case-sheet              focusInside=YES  sheet role=dialog modal=true name="Raise a case"
```

Sheets were already correct — `role="dialog"`, `aria-modal="true"`, and a name a sighted reader can
see. **Modals were not**: the box around the form was a plain `<div class="card modal-card">` with a
`<b>` title inside it, declaring nothing, and 8 of 9 screens left the caret on `<body>`. That is not a
quiet accessibility gap, because the pass one line above makes everything outside the top layer inert:
with the background removed from the tree and the new box undeclared and unfocused, a screen reader
was left with no announcement of the thing a sighted person can plainly see.

The fix is in the render pass that already computes the layer, not at the paint sites — three of them
declare `class="modal-layer" data-layer="modal"`, one per role, and each is a place where a new dialog
gets added without anyone thinking about semantics:

```
setInertOutside(topLayerEl());
labelTopLayer(topLayerEl());
```

`labelTopLayer` assigns `role="dialog"` and `aria-modal="true"` when the box does not already carry
them, points `aria-labelledby` at the title the dialog paints — giving that element an id rather than
guessing one, so the announcement and the visible heading cannot drift apart — and then moves focus.
`focusIntoLayer` fires only when the top layer *changes* (a signature of layer plus name), because
taking the caret on every repaint closes the on-screen keyboard mid-word, which is the defect §73 says
a phone never forgives; the focus call is asked not to scroll, and when the layer closes the caret goes
back to the control that opened it if that control is still in the document.

Re-measured with the same probe: **9 of 9** now report `role=dialog modal=true name="…"` and
`focusInside=YES`, including the two screens where a modal is raised over a sheet — the modal is the
named box now, "Change payment method" and "Change security PIN", not the sheet underneath it.

Enforcement is a camera tally, `layers that opened without dialog semantics or the caret inside them`,
which reports the reasons it found rather than a single number, because a fix that only moves the
caret must not read as a fix that also names the dialog. It needed no registration to be enforced:
`sweep-text-scale.cjs` treats any tally it does not recognise as must-be-zero, so a new sensor fails
closed by default. It reads **0 on all 72 screens**, and the sweep is now **24 tallies per corner**.

```
control  unmutated app, unblinded tally: count=0 reasons=[]
CAUGHT   the render pass stops labelling and focusing the top layer  -> count=8 reasons=[focus,modal,name,role]
CAUGHT   the semantics are kept and only the caret is refused        -> count=8 reasons=[focus]
CAUGHT   the dialog is named by nothing                              -> count=6 reasons=[name]
CAUGHT   the tally cannot see any layer at all                       -> count=0  (defect present, sensor deaf)
4 of 4 breaks caught, 0 not applied, 0 missed
```

`node tools/falsify-dialog-focus.cjs` — the fourth break is the one that keeps the other three honest:
it blinds the tally's own selector with the application defect still in place and requires a 0, which
is the difference between "the app is clean" and "nothing was looking".

**Two instrument defects, found rather than assumed.** The probe's first version looked only at the
outer `[data-layer]` wrapper and printed `role=-` on every screen — which reads as "this application
has no dialog semantics at all", when the one declaration it does have sits on an inner `.sheet`. It
also picked the top layer by DOM order, so on the two-layer screens it measured the sheet while the
modal was what the user saw. Rank by `z-index`, then ask; the camera's tally ranks the same way.

And a neighbour was found broken while reading the file for that edit: `navCut`'s detail line had been
written as a single string literal, so it printed its own source — `"" + r.text + "" is cut at " + r.px
+ "px…` — on every finding, while its count stayed correct and its falsifier kept passing. The count
was load-bearing; the sentence that would have told a reader *which* label was cut was decoration that
silently became junk.

Gate **534**; whole suite **36 families, 187 mutants applied, 187 caught, 0 not applied** (`node tools/falsify-all.cjs`), with the four
families this session added or cleared each reading clean inside the full run rather than only
alone. `node tools/sweep-text-scale.cjs` after the change: **7 of 7 corners clean, 24 tallies each**
— the tally count went 23 to 24 with the new one, and every corner fails closed on a tally it does
not recognise, so the count in that sentence is the sweep's own output rather than a description of
it. `node tools/shot.cjs --measure` reads the new tally at **0 across all 72 screens** with no
console errors, and `--focus` over the nine layer screens reports no stop without a ring and nothing
reachable off the viewport, which is the check that the moved caret did not break the keyboard walk.
printing nothing is by reading what it prints.

### The caret question, answered by swapping the file rather than by reading the pass order

Moving focus into a dialog invites the opposite defect: a repaint while a person is typing in that
dialog dragging the caret out of the field, which on Android also closes the keyboard. Rather than
reason about when `restoreTyping` runs relative to `labelTopLayer`, `.scratch/swap-caret-test.cjs`
runs one probe twice — once on the file as it stands, once with the single line
`labelTopLayer(topLayerEl());` removed — and compares the answers per screen. Restored from an
in-memory copy, `restored exactly: true`.

```
screen                WITH fix                WITHOUT fix
offer-sheet           loses to BODY           loses to BODY
resident-edit-form    loses to resident-profile-name
provider-edit-form    loses to INPUT
admin-edit-form       loses to admin-profile-name
case-sheet            loses to BODY

screens whose answer depends on the change: 0 of 5
```

Read the middle three rows carefully, because the script's own wording is pessimistic: "loses to
`resident-profile-name`" is `document.activeElement` after the render being **an element with the same
id as the field that was typed into**, not the same node. The markup was replaced, and
`captureTyping`/`restoreTyping` put the caret back by id — which is the caret surviving, not failing.
The first version of the probe asked `act === layer`, a node-identity question, and reported those
three as failures; a re-created input with the right id and the right value is what an in-place update
is supposed to look like.

So the layer pass owns nothing in this comparison: every row is the same with and without it. The two
`body` rows are worth stating precisely rather than filing. Nothing inside those sheets calls
`render()`: the offer fields go through `offerInput('qtyKg', this.value)` and update only their own
totals, and `case-reason` has no input handler at all — it is read when the form is submitted. The
only field in the app that types straight into a full render is the admin's verified-providers search,
which lives in `#screen`, where the by-id restore applies. The probe produced `body` by calling
`render()` itself, from outside the app's own paths. Measured, explained, and not a defect — recorded
so the next reader does not mistake the row for one.

## 78. The register form asked for a name and a barangay, then threw both away

Three §3f items were owed to a handset that is not attached. Two of them do not need one, so they were
walked in Chrome, and one of them turned out to be a defect rather than a checklist row.

**Payment row against the record — passes.** `node tools/shot.cjs --probe=@tools/probe-request-payment.js
--only=booking-sheet` clicks the *last* painted payment rail (so a default-only pass cannot fake
agreement), reads which rail now reports `aria-pressed`, reads the model, submits through the sheet's
own Send button, waits past the app's 900 ms commit, and compares marked / stored / painted:

```
marked  "Cash on Arrival"   pressed "Cash on Arrival"   modelCode cash
record  payMethod cash · payStatus pending_site · address "Blk 4 Lot 12, Rizal St. (Hom"
bookings 16 -> 17           detail "Payment Status: Pending (Cash …)"
```

The first version reported the wrong rail as marked, because `pickRequest` renders and the nodes
captured before the click were detached — asking a detached rail what it reports pressed answers
"what was painted before the tap". It also navigated to the detail screen by guessing at state; the
camera's own entry calls `openBookingDetail(id)`, so now it does too.

**Provider reload — passes.** `node tools/probe-provider-reload.cjs` boots the application script twice
against one shared store: a fresh function scope and a fresh fake document each time, so the only thing
that crosses the boundary is bytes. Signed in as **p7** deliberately (a mutant that drops the identity
cannot hide behind p1's seed). Three fields typed into the painted inputs, saved through
`saveProviderProfessionalProfile`, and the reloaded profile holds all three — each differing from the
seed, so the agreement is not an accident:

```
signed in as p7 · wrote yes (bytes changed) · identity after reload: p7
phone  typed "0917 000 1234"   seed "+63 917 555 8102"                KEPT
radius typed "7 km"            seed "Tupi west barangays, …"          KEPT
hours  typed "Mon-Sat 07:00-18:00"  seed "6:00 AM – 4:00 PM (…)"      KEPT
3/3 fields survived the reload, 3 of them as a real change
```

Reaching the handler needed `saveProviderProfessionalProfile` and `submitAuth` added to the harness's
export list — the list is curated, so a missing name fails loudly rather than silently skipping a check.

**Booking with no address — a defect, found by walking it.** The register form collects a name, an
email, a password and a barangay. It does not collect a street address, and the profile hub offers no
way to delete the last saved one (measured: zero delete affordances in the file). So what does a
genuinely new account hold? Typing four fields into the painted inputs and clicking the wired submit
answered it:

```
typed   reg-name "Nueva Residente"   reg-brgy "Buayan"
after   name "Ana Dela Cruz"    brgy "Poblacion"    address "Blk 4 Lot 12, Rizal St."
        savedAddresses 2 (identical to the demo's)   inheritedAddressFromDemo true
```

Both collected values were discarded. The app *does* disclose — the toast reads "Prototype build - this
account is not stored" — so this was not a claim of persistence; it was an identity substitution, the
same class already closed at `providerOf()`, at the id-carrying entries and at the record lookups,
arriving from the other direction: not a dangling id but a form whose answers were dropped. A booking
from that account goes to the demo household's door, which §43 and §56 do not permit silently.

The owner chose **use what the form asks for** over blanking the address or adding a field. So
`submitAuth` now writes the typed name and barangay into whichever profile the screen greets from,
keeps the demo address because nothing was ever asked for one, and says so in the same breath:
"Prototype build - this account is not stored, **and bookings use the demo household address**".
Nothing is persisted, on purpose — with one resident slot in the prototype, storing the registered name
would show it to the next person who signs in as the demo, and a reload returning the demo identity is
exactly what the sentence promises. Re-measured through the same walkthrough:

```
name "Nueva Residente"   brgy "Buayan"   descriptionTyped true   sendButton enabled
bookings 16 -> 17        newRecordAddress "Blk 4 Lot 12, Rizal St. (Home)"
```

Two refusals along the way were the app behaving correctly, and are recorded so nobody re-files them:
the sheet will not accept a request with no description, and the fruit pilot will not accept one until
harvesting-or-buying is chosen. The walkthrough now aims at a trade with no mode gate.

Three gate checks hold it (`suite('login')`): the name and barangay land and differ from the seed, the
address and its saved list survive, and the register writes no bytes — with a control that calls
`persist()` explicitly to prove the storage check can see a write at all.
`node tools/falsify-register-identity.cjs` — **4 breaks, 4 caught, 0 not applied** — drops the name,
drops the barangay (told apart by which field the failing detail names), blanks the address, which is
the option the owner did not choose, and adds the persist.

Gate **537**; whole suite **37 families, 191 mutants applied, 191 caught, 0 not applied** (`node tools/falsify-all.cjs`), every family
above reading clean inside the full run. `node tools/sweep-text-scale.cjs`: **7 of 7 corners, 24
tallies each, all clear** — the register branch touches no layout, and the sweep is what says so
rather than the observation that it could not. `node tools/probe-all.cjs` over the three new
instruments: each classifies correctly (two page probes with their own `--only=`, one node probe)
and each answers.

What remains §3f is now only what genuinely needs the device: TalkBack announcing an opened dialog,
the day-offset states read off a real screen, and the concierge refusing to guess through the system
file picker — the last thing adb cannot drive without the UI.

## 79. The phone found what the bench and its own sensor could not: the nav fit measured the wrong box

The device came back attached, and the first thing it reported was a claim this repository believed for
two sessions: that the resident nav fits at 320 CSS px with nothing cut. On an OPPO CPH2179 at its own
`font_scale 1.35` — `Override density: 360` on a 720px panel, so 320 CSS px, `innerHeight` 638, the
corner §68 added from the device itself — the fit loop wrote `--nav-label-size: 11.85px` and left
**"Bookings" and "Messages" clipped by ~2px each**.

The loop and the sensor were wrong together, which is why four passes of sweeps read clean:

```
fitNavLabels:  const slot = item.clientWidth;      ← .navitem's clientWidth INCLUDES its 4px padding
navCut tally:  const slot = item.clientWidth, wants = l.scrollWidth;
```

In a 74px slot the label's own box is 66px. The loop computes `worst = slot / wants`, breaks as soon as
`worst >= 1`, and so stops shrinking while the word still does not fit the box that clips it. Nothing
in `tools/` could see this, because the only sensor that asks the question asks it against the same
wrong box. Both now measure `l.clientWidth`, and the family got a break that reinstates the item width:

```
baseline: 0 avoidable cuts and 0 sub-floor text on resident-home,provider-dash,admin-dash at --width=320 --font-scale=2
CAUGHT  the fit pass never runs …            (cut=9, floor=0)
CAUGHT  the floor is lowered to 8px …       (cut=0, floor=9)
CAUGHT  the fit ratio is inverted …          (cut=9, floor=0)
CAUGHT  the fit measures the item's box …    (cut=2, floor=0)
4 of 4 breaks caught, 0 not applied
```

`cut=2` is the same two words the phone showed. And the fix is confirmed where it was found — the
device, after reinstalling as `1.2-preview.33`:

```
before: size 11.85px · label 16px   · cut Bookings,Messages   (stable at 900ms and 1600ms)
after:  size 10.52px · label 14.2px · cut none                (stable at 900ms and 1600ms)
```

14.2px rendered, above the 14px floor, with no word cut — the floor honoured in the only space a phone
measures in, which is the lesson §73 wrote down and this is the second time collecting on.

**What the device also settled, all in one direction:**

- the upgrade path: a snapshot written by `preview.29` on **2026-10-18** (schema 16) hydrated on the
  new build, and §76's states held — waits `maria 10 · joel 11 · liza 12 days ago`,
  `1 expired / 5 expiring / 5 valid`. That is the day-offset conversion working on a device whose
  stored data predates it;
- §77 reaches the **platform tree**, not just the DOM: with the "Edit profile" modal open,
  `uiautomator dump` lists the dialog's own nodes — `Edit profile`, `Close`, each labelled field,
  `Save Changes` — and nothing from the screen behind it (32 nodes). Two cautions recorded the honest
  way: the first dump listed **6** nodes, which is Chromium building the tree lazily and one tap
  fixing it, and this measures the tree rather than the *speech* — TalkBack was not enabled, because
  switching on the owner's accessibility service is not mine to do;
- §78 on hardware: greeting `Nueva`, toast `Prototype build - this account is not stored, and bookings
  use the demo household address`, and the snapshot on disk still naming `Ana Dela Cruz` — the
  not-persisted promise and the bytes agree;
- `font_scale` is **1.35**, so the older line in this file saying the device was left at 1.0 was stale.

**What is still owed, and why it is not closed here:** the concierge's system file picker. The photo
control sits at `centreCss.y = 666` in a 638px viewport, and three attempts to bring it into view left
the rect unmoved, so the shell's tap landed on the gesture bar and sent the app to the launcher. That
is the instrument failing, not the app: the sweep's `controls no tap can reach` tally reads 0 at
320x638 @ 1.35 on all 72 screens, which is the sensor's answer to "can a thumb get there". The
unverified claim is narrower — that a real picker opens and that the app keeps only the file **name**
(§75) — and it stays open.

Gate **537**; whole suite **37 families, 192 mutants applied, 192 caught, 0 not applied** (`node tools/falsify-all.cjs`), with
`falsify-nav-fit` reading **4 of 4 inside the full run** rather than only alone — the fourth break
being the one that reinstates the item box. `node tools/sweep-text-scale.cjs` after the change:
**7 of 7 corners clean at 24 tallies each**; this one did touch layout, since the labels are now
shrunk a half-step further on narrow panels, which is what the sweep rather than an argument
settles. And `node tools/probe-all.cjs nav-fit` re-run against the camera whose tally changed.

The measured pair, on the device that found it: `11.85px → 16px rendered, cut Bookings,Messages`
before; `10.52px → 14.2px rendered, cut none` after.

## 80. A money-consistency sensor for every screen, and the three findings that were its own errors

The device is off the wire again (it dropped adb the moment it slept), so the two remaining §3f legs
wait for a reconnect. The next unmeasured class was one this repository has been circling: the admin
tile that counted two questions under "Live bookings", the profile module that printed ₱2,500 where the
records held ₱590 — both caught by checking a rendered module against its records, and **neither check
generalised**. So `tools/probe-money-sums.js` asks of all 72 screens: where a card paints an
aggregating label beside the figures it claims to add up, does it add up?

It took three rounds to get an honest answer, and every round's finding was the probe's own mistake:

1. **six findings** — it matched any label containing "fee" against `AGGREGATES`, so the receipt's own
   "Booking fee" line became a total, and it summed the muted provider-side rows ("Ramil keeps",
   "Sukinnect fee from their share") into what the *customer* pays. Both belong to the other side of the
   transaction. Read the markup before believing a list: the receipt is `base + inclusions + booking
   fee + VAT → Total`, then a separate muted block about the provider's share.
2. **one finding** — "Next payout — needs ₱500 more". A shortfall written as a sentence, parsed as a
   line item. A row counts only when its amount element *is* a figure.
3. **zero findings, 7 cards inspected** — which is the first number in the sequence that means
   anything, because `cardsWithTotals` is printed beside it: a zero where nothing was looked at and a
   zero where everything agreed are now distinguishable, which is the standing rule about a checker
   whose coverage is self-reported.

Then the probe was broken on purpose, because a check that has never failed is decoration:

```
control  unmutated: cards inspected 2, mismatches 0
planted  +₱10.00 onto the receipt total (mutation landed: true)
         cards inspected 2, mismatches 2
         -> card "Wed, Oct 21, 4:00 PM" label "Total" painted 425 sumOfParts 415 delta 10
CAUGHT   the probe sees a total that does not equal its own rows
cleanup  app restored: true
```

`node tools/probe-all.cjs money-sums` classifies it as a page probe and reports **72 answers**, so the
runner's aggregation rule applies to it from its first check-in. No product defect came out of this
pass — the receipts add up on every screen — and that is recorded as a measurement rather than a
non-event, because the three false findings each documented a way a money sensor can lie.

## 81. "8 of 11 on the roster are verified": arithmetically impeccable, and false

The device is off adb still, so the pass went looking for the next unmeasured class. It started as a
**range sensor**: sweep the numeric-shaped tokens every screen paints and ask whether any sits outside
what its unit allows — a count above its own denominator, a percentage above 100, a rating above five.
`.scratch/probe-number-scan.js` ran the sweep and the corpus said **none does**:

```
of     0 of 8 providers · 3 of 5 closed jobs · 8 of 11 on the roster · 0 of 1 cases · 3 of 4 · 4 of 4
pct    0% 5% 10% 42% 50% 53% 60% 73% 100%
slash  88 / 100 · 96 / 100        star  4★ 5★ 4.7 rating
unit   0.8–4.0 km · 9 minutes–59 days ago · 38–200 kg
```

So that sensor was not written — there is no rule that fires on this file and no mutant to make it
fire — and the defect arrived instead from *reading* the list. `8 of 11 on the roster are verified`
passes every arithmetic test and is false:

| the row said | the records say |
|---|---|
| 8 verified | **6** verified, 1 suspended (`p4`), 1 awaiting review (`p7`) |
| 11 on the roster | the roster is **8**; the 11 was `PROVIDERS.length + PENDING_APPLICANTS.length` |
| "progress" | both halves read off static arrays, so a decision moved neither number |

The denominator was the applicant queue wearing the roster's name, and the numerator was every
provider record including the two the verification record says are not verified. The queue has its own
filtered list — `pendingApplicantList()`, which is what the dashboard tile beside this one counts — so
the same screen printed a queue that shrinks on approval next to a denominator that cannot.

### The fix, and why the label went too

`marketplaceRates()` takes the numerator from `verifiedProviderList().length` and the denominator from
`PROVIDERS.length`, and returns `awaitingReview` and `suspendedCount` so the caption can name what the
providers who are not verified *are*:

```
Provider verification   75%
6 of 8 providers on the roster are verified; 1 awaits review and 1 is suspended
```

The row was also renamed, from "Provider verification progress" to **Provider verification**. A
progress bar promises a target and a direction, and this prototype gives it neither: `verificationAction`
writes a review record and never creates a provider row, so nothing a thumb can do changes a provider's
status. The one target that exists is the deck's 150 verified providers — a pilot **planning assumption**,
and §76 and §86 both forbid one of those being painted as a system figure. The honest reading is the
roster's state, which is what the caption now says.

### The checks

Three checks in `suite('honesty')` and a positive control, in that order:

1. `the verification row counts the verified out of the roster` — the painted numerator equals
   `verifiedProviderList().length`, the denominator equals `PROVIDERS.length`, the numerator is
   strictly smaller, and the percentage is the same division;
2. `and the row says what the providers who are not verified are`;
3. `the roster really does hold an unverified provider, so the check above can fail` — the control that
   keeps (1) from passing on a roster where everybody is verified, which is the shape this file keeps
   meeting: a scan whose good pattern matches nothing reads exactly like cleanliness.

`node tools/falsify-verification-progress.cjs` — **6 breaks, 6 caught, 0 not applied**: the numerator
back to every provider record, the denominator taking the queue back in, the percentage dividing by a
population the caption never shows, the note painting the roster length, the note dropping the
exception clause, and — the sixth — the seed verifying `p4`, which must make the *control* fail. That
last break is the family proving its own positive control is live rather than decorative.

### The same pass orphaned another family's needle, and the `not applied` column said so

The new numerator was written as `const verified = verifiedProviderList().length;` — which is
already what `adminCounts()` says two functions earlier. `falsify-verification-records` needles that
exact line to put the dashboard tile back to the whole roster, so it matched 2 where it requires 1 and
printed **NOT APPLIED**: the aggregate run came back `38 families, 197 caught, 1 not applied`, and
every other column looked healthy.

Two decisions in the repair. The **new** local was renamed to `verifiedOnRoster` rather than the
needle being widened, because two functions holding the same-named local with the same initializer is
a readability defect as well as a tooling one — a grep for `const verified =` cannot say which screen
it found. And both families were re-run before the full suite was re-run, since the failure mode of an
orphaned needle is a *smaller* applied count, not a red row: 197 of 197 is a pass that quietly tests
less than it did.

### And the same grep found a screen nobody had ever looked at

`grep -n "PROVIDERS.length|PENDING_APPLICANTS.length|DISPUTES.length"` aimed at statistics landed on
`networkSummary()` → `adminProviderInsights()`: the Providers bar's **Insights** button, a destination
that was in no camera table — the string `insights` occurred nowhere in `tools/shot.cjs` until the entry
below was added. It types
four bars (Completion 88, Rating 96, Credentials 75, Capacity 68), a "Providers by service" list naming
four trades where the roster holds seven, a sentence asserting which trade has the highest cancellation
rate, and one named provider "needing attention" two lines below a count derived from the records.

It is `admin-insights` in the walk now (**73** screens, `node tools/shot.cjs --list`) and it measures
clean on every tally — which is the finding worth keeping: a screen can satisfy the camera completely
and still be §76's decorative statistic, because geometry has no opinion about where a number came
from. De-typing it is the next pass and is recorded as found-not-fixed rather than quietly folded into
this one.

Gate **540**; whole suite **38 families, 198 mutants applied, 198 caught, 0 not applied** (`node tools/falsify-all.cjs`), the new family
reading **6 of 6 inside the full run** rather than only alone — the runner parses
`N of M breaks caught, K not applied`, and the sixth break edits the *seed*, which is how the family
proves its own positive control is live. After that pass the family was tightened to refuse a needle
matching twice (`replace` plants only the first, so a second `const verified = …` would have put the
mutant in the wrong function and still printed CAUGHT — the exact defect it had just been caught in)
and re-ran alone: **6 of 6, 0 not applied**.

The walk gained a screen, so it was re-run rather than argued: **7 of 7 corners clean at 24 tallies
each** across **73 screens** (`node tools/sweep-text-scale.cjs`), and `admin-insights` on its
own reports every tally zero (`node tools/shot.cjs --measure --only=admin-insights`) — clean geometry
around four typed numbers, which is the measurement this section ends on.

> **Closed by §82, which is the next section.** The de-typing this paragraph declined to fold in is what
> §82 shipped: three bars divided out of the records, the capacity bar and the cancellation verdict
> deleted for having no record behind them, and `networkAttentionList()` made the single filter the strip
> and the attention card both read. Handset walk 5 then read the derived figures on a vivo, where they
> differ from the bench and both readings are correct.

## 82. The Insights screen, de-typed: seven trades, three divisions, and a number that was breaking in half

§81 found this screen by grepping for statistics taken from a raw seed-array length. It is the admin's
**Provider Insights**, reached by the "Insights" button on the Providers bar, and it had never been
photographed, never been checked against a record, and typed almost everything on it. Measured against
the records with `.scratch/insights-measure.cjs`:

| what the screen said | what the records answer |
|---|---|
| bars at Completion **88**, Rating **96**, Credentials **75**, Capacity **68** | closed jobs finished **60%** (3 of 5), verified **75%** (6 of 8), documents in good standing **38%** (3 of 8) — and a rating is out of five, not a percentage of a hundred |
| "Plumbing 1, Electrical 1, Cleaning 1, Appliance 1" | **seven** trades across eight providers, two of them fruit harvesters |
| "Electrical providers currently have the highest average cancellation rate." | nothing computes it |
| "Credential health and available capacity are the main network improvement opportunities." | capacity is not a record, so the sentence ranked an invention |
| one provider named under "needing attention" | the strip on the same screen counts **six** |

The last row is the same defect this file has now closed at three seams: two halves of one screen
answering one question with two numbers, because one was derived and the other was typed.

### The rewrite

Five helpers, and one filter that both halves read:

- `networkAttentionList()` — the providers whose `adminProviderMeta().reasons` is non-empty. The strip
  counts this list and the card prints it, so the two cannot drift apart by construction;
- `networkServiceRows()` — the roster grouped by trade, sorted by how many serve;
- `networkHealthRows()` — three bars, each a division the records make, each with its `x of y` printed
  under it. **Capacity is gone** because no record holds it; **Rating is gone** because painting a
  one-to-five average as a percentage of a hundred is a unit that does not exist, and the strip already
  carries it out of five;
- `networkFlagSummary()` — replaces the verdict sentence with a count of the flags actually raised:
  *"The most common flag is a document expiring within 30 days — 4 of 6 providers needing attention."*;
- the screen's subtitle now names its population (`Analytics over the 8 providers on the roster`)
  instead of claiming "verified provider analytics" over a roster that includes a suspended account and
  an unreviewed one — §81's label-versus-population defect, one screen over.

The bar row became the admin dashboard's analytics-card shape rather than staying a hand-rolled row of
four columns, because that card is the one already proven at 200% text on a 320px panel with its
denominator printed under each figure. And an empty roster — which `tools/probe-empty-states.js`
produces, and which a reviewer reaches by approving everybody — now explains itself instead of painting
four dashes.

### Then a screenshot showed something no tally asks about

The rebuilt screen at 320 CSS px with the text at 200% painted **"10" over "39"**: the figure `1039`
broken in half. Nothing in the camera can see that class. The number is not clipped, it collides with
nothing, it sits on the scale, it clears the nav, and its contrast is fine — `body{
overflow-wrap:anywhere }`, the long-input guard, makes a flex item's min-content width **one character**,
so a growing label takes the number apart instead of wrapping itself.

The guard is `.stat-strip .f b{ flex-shrink:0; white-space:nowrap }`, and the sensor is the camera's
25th tally, `stat-strip figures painted across more than one line`, which counts a figure's line boxes
through a `Range`. `node tools/falsify-split-figures.cjs` plants the removal and reads
**`split=3, overflow=0, clip=0`** on six screens at that corner, so the clean baseline is the sensor
answering.

The family also records a redundancy rather than smoothing it: removing **only** `nowrap` and leaving
`flex-shrink:0` reads `split=0, clip=0, overflow=0` — an item that cannot shrink keeps its figure's
width, the label wraps instead, and the break opportunity inside the number is never reached. So at this
corner either declaration alone holds the shape. That second edit is planted and printed every run as an
observation, deliberately **not** counted as a break: a break that reads zero belongs in prose, whereas a
mutant that survives belongs in the aggregate's red column, and conflating the two is how the chart
family once deleted the evidence of its own blind sensor.

Gate **546**; whole suite **40 families, 206 mutants applied, 206 caught, 0 not applied** (`node tools/falsify-all.cjs`), the two new
families reading **7 of 7** and **1 of 1** inside the full run. The camera gained its 25th tally, so
the sweep was re-run whole rather than argued: **7 of 7 corners clean at 25 tallies each** across
**73 screens** (`node tools/sweep-text-scale.cjs`), and the walk count is unchanged because §82
rewrote a screen §81 had already added rather than opening a new one. `node tools/probe-all.cjs`
re-run against the camera whose tally changed: **41 instruments, 0 needing attention**.

## 83. One act, one moment — and the three clock reads that agreed by luck

The device is still off adb, so the pass went looking for a class with no instrument: **does every
record's own timeline run forwards?** Two censuses were written rather than guessed at.

`.scratch/date-order.cjs` enumerated every date-shaped field the record sets hold — bookings carry
`createdAt, acceptedAt, arrivedAt, startedAt, completedAt`; credentials carry `expiresAt`; cases carry
`openedAt`; documents, applicants, messages, offers and the ledger each carry their own — and asked
whether each parses and whether each chain runs backwards. Answer: **0 unparseable, 0 backwards**. Its
one flagged line, `STAMPS WITHOUT STATE`, was the census's own error: it tested for a state named
`accepted`, which is not in the vocabulary — the state is `upcoming` — so it accused seven bookings of
carrying stamps their status never reached. Seven more instances of "correct the instrument before
concluding".

`.scratch/event-chain.cjs` then asked the sharper question, because `STATUS_EVENTS` is a second
representation of the same acts: does the log run forwards, does each event start where the last ended,
does the last event name the status the record carries, and does each stamp agree with the event that
wrote it? Answer on the seeds: **43 events, 0 gaps, 0 log-vs-record disagreements, 0 stamp
disagreements**. The class looked closed.

It was not, and the census was the reason: **it only looked at seeds.** Driving a live transition
through `attemptTransition` showed the moment being taken **three separate times** — the effect wrote
`booking.acceptedAt = new Date()`, the next line wrote `statusChangedAt = new Date()`, and
`recordStatusEvent` took a third when no `at` was passed. The measurement read 0ms apart, which is a
fact about how fast the machine was, not about the code: an effect that spends a millisecond (freezing
a price, posting a ledger entry, a collection) puts the record's stamp and the log entry naming the same
act on either side of a second. And those two representations are not read side by side in one place —
the file's own comment above `STATUS_EVENTS` says *"One timeline, three uses"*: the tracking view reads
the stamps, while the dispute evidence chain and the administrator's audit read the log. At the second
precision this app paints, a straddle is visible in two screens a person can open one after the other.

### The fix is one reading, and the checks need two kinds

`attemptTransition` now takes one `const at = new Date().toISOString()` and hands it to all three
writers, with a `STEP_STAMPS` map naming which stamp each state leaves behind. The four effects' own
writes (`onAccept`, `onStart`, `onArrive`, `onComplete`) were deleted — nothing read them, and a dead
write of a *second* clock reading is exactly the thing that comes back as a divergence.

Six checks in `suite('machine')`, and the split between them is the point:

- **behavioural** — every booking's step stamp equals the event naming that act (`the step stamp and the
  event naming that act are the same instant`), no log is appended out of time order, and two positive
  controls pin the populations (≥ 8 stamp pairs, ≥ 8 bookings with events) so neither can pass on an
  empty scan;
- **structural** — the transition's reading is the one threaded to the event and the stamp, and no step
  effect writes a stamp from its own clock, with the seed builder's `b.acceptedAt = acceptedAt;` as the
  control that keeps the scan from passing because it matches nothing.

The structural pair exists because **a behavioural check cannot pin a race that usually does not
happen.** Restoring `recordStatusEvent(...)` without the shared `at` — the exact defect — leaves the
behavioural checks green, because two `new Date()` calls a statement apart land in the same
millisecond. That is recorded in the family's own header so the next reader does not delete the shape
checks as belt-and-braces duplication.

`node tools/falsify-step-stamps.cjs` — **4 breaks, 4 caught, 0 not applied**: the event taking a fresh
reading (caught structurally), the accept effect writing its own stamp (caught structurally), the seed
stamping acceptance with the request time instead of the event's (caught behaviourally — a real
divergence, not a timing coincidence), and the transition ceasing to write the stamp at all (caught
behaviourally, because the live booking then has an event and no stamp).

### Then a survivor that could not say which break it was

The first full pass came back **41 families, 210 applied, 209 caught, 0 not applied — 1 family needs
attention**, and the flagged row was `chart-collide`: 5 applied, 4 caught. Re-running that family alone
read **5 of 5**, and re-running it *through the runner* also read 5 of 5. So the reading did not
reproduce — which is a fact about the instrument under load, not a clean bill of health, and not
something to delete a break over.

What made it worth a change is that the pass log carried no way to learn *which* break had read quiet,
or with what numbers. `falsify-all` parsed a family's summary line and threw the rest of its output
away, so a flagged row was a count and nothing else, and the diagnosis depended on the survivor
reproducing at the moment a human thought to re-run it. The runner now echoes a flagged family's own
verdict lines under its row:

```
zz-echo-test                                 2        1            0       1   <<< MUTANT SURVIVED
      | MISSED  the break that does not  (findings present, but the worst escape is 3px, below the 6px the break promises)
```

That row came from a throwaway family written to prove the echo and deleted in the same command that
read it — the rule the money-sums probe follows: a reader that has never been seen to refuse is
decoration. And because a flake must not be smoothed over by re-running until green, the suite figure
quoted below comes from a **second full pass**, with this survivor recorded as a measurement of the
reading rather than edited out of it.

Gate **552**; whole suite **41 families, 210 mutants applied, 210 caught, 0 not applied** (`node tools/falsify-all.cjs`), `falsify-step-stamps`
reading **4 of 4 inside the full run**. The timestamps this pass touches are painted as relative
labels ("Made 6 hours ago"), so the camera was re-run rather than argued: **7 of 7 corners clean at
25 tallies each** across **73 screens**, and the walk count is unchanged. `node tools/probe-all.cjs`
re-run after the build: **41 instruments, 0 needing attention**.

## 84. Five payment checks became three, because the derivation absorbs a seed edit

The last bench-measurable seam before the next big task was the money axis: a booking carries
`payStatus`, and `PAYMENTS` holds the rows that say what actually moved. §22 keeps those axes apart on
purpose, so the question is whether the code is ever a claim the records do not support.

`.scratch/pay-table.cjs` printed the whole seed table before any rule was written, because the previous
census had invented a vocabulary and misfired three times:

```
 4  authorized      | gcash | authorization:authorized
 3  captured        | gcash | authorization:authorized,capture:captured
 1  collected       | cash  | collection:collected
 2  pending_site    | cash  | NO PAYMENT ROWS
 4  unpaid          |   —   | NO PAYMENT ROWS
 2  voided          |       | NO PAYMENT ROWS
```

Every code is backed, so this pass ships a pin rather than a fix. The first draft wrote five checks —
declared code, claim-backed-by-row, no-claim-without-row, cash-never-partner-coded, void-keeps-nothing —
and **four of them passed while every mutant survived.** The reason is in the seed pass: the demo rows
are not stored, they are *derived*, by calling `recordPayment`, which writes the row and the code in one
statement. So editing a seed's `payStatus` regenerates the matching row and the pair cannot be pulled
apart from that side. A check that cannot fail looks exactly like a check that passes, and here four of
five looked like coverage.

Three remain, and each is broken where the derivation itself can be broken rather than at the seed:

| the check | the break that condemns it |
|---|---|
| every payment code is one the vocabulary declares | an undeclared code typed into a seed row — nothing regenerates a word that is not in `PAYMENT_LABELS` |
| a code claiming money moved is backed by a row saying so | the settlement back-fill's guard forced off, so the code stands and the row is never written |
| the two payment routes never borrow each other's code | the route test flipped, so a cash collection is coded as partner money |

`node tools/falsify-pay-records.cjs` — **3 breaks, 3 caught, 0 not applied**, and a positive control
requiring the table to hold partner money, cash money and no-money rows at once (`4 authorized /
1 collected / 4 unpaid / 2 pending_site`), because three checks that scan an empty table would print the
same green. The vocabulary is read from the app's own `PAYMENT_LABELS` rather than a hand-written map —
the first census hand-wrote one, did not know the word `captured`, and reported three findings against
records that were right.

No application file changed, so `preview.36` is still the current build and the sweep still stands; what grew is the gate (**556**) and the suite (**42 families, 213 mutants applied, 213 caught, 0 not applied**), with `falsify-pay-records` reading **3 of 3 inside the full run** rather than only alone.

## 85. Four owner rulings, one of which turned into an identity bug

The owed list was put to the owner as four decisions. Three are recorded where they belong — refresh
PR #9 rather than merge it, leave the y-gutter as documented, and the two that changed the file:

- **`color-scheme: only light`** declared in `:root`. The app declares no dark theme, and
  `node tools/shot.cjs --measure --dark` was re-run *after* the declaration across all 73 screens: every
  failure tally zero, contrast included, no console errors — so suppressing Chrome's algorithmic
  darkening costs nothing measurable and removes the one path that could rewrite the §30 palette with no
  media query for any instrument to catch. The cost is stated in the comment: a person who asked their
  browser for dark gets the light app.
- **One word for the role.** The sign-in chip read **Service Pro** while every card, row, header and
  roster inside the app says *provider*, and the master prompt's role model says SERVICE PROVIDER. The
  chip, and a demo notification titled "Verified Pro Nearby", now read Provider / verified provider.

### The wording hunt found a typed identity on the provider dashboard

Widening the scan from the phrase `Service Pro` to the standalone word `Pro` turned up exactly one more
hit in the whole file — and it was not a wording problem:

```
11204:  <h1>Ramil Odiada (Pro)</h1>
11205:  <div class="sub">Plumbing Specialist · Brgy. Poblacion</div>
```

That is the **provider dashboard's own header**, typed. Whoever holds the phone was told, in the `<h1>`
of their own screen, that they are Ramil Odiada the plumber in Poblacion — including the fruit harvester
in Buayan, whose bookings, earnings and reviews the rest of the page correctly scopes to him. It is the
public-preview-card defect (`4.9` and `214`, p1's figures, so every screenshot of it looked right)
arriving from the other side: a typed identity is invisible in every screenshot taken as p1, which is the
only identity the camera has ever walked by default.

The header now reads the signed-in record through the `me` the function already resolves and already
guards, with the saved professional profile winning where the person has edited it. The gate check signs
in as p7 and requires the name, the trade and the barangay to move together — `Erning Bautista` and
`Buayan` in, `Ramil Odiada` and `Plumbing Specialist` out — because a check that only asks whether the
old string is gone would pass on a header that painted nothing.

### Two of the new checks were wrong before the falsifier finished

The first drafts failed on their own file, and both failures were the instrument:

1. `!/prefers-color-scheme/.test(css)` — **true**, because the comment explaining the decision contains
   the phrase. The rule now matches the *rule form*: `/@media[^{]*\(\s*prefers-color-scheme/`.
2. "the old word survives only in the comment that explains it went", written as a per-line test for a
   comment marker — the comment's `/*` is three lines above the line holding the word, so a block
   comment's continuation line is not a comment to a line-anchored regex. The scan now strips comments
   and searches the remainder, and *requires* the word to still exist in the comment, so the exemption
   cannot pass by both halves going missing.

And the break that exposed the too-narrow rule: reviving "Verified Pro Nearby" printed **MISSED** against
the phrase-based check — the notification never contained the string `Service Pro`. The break was right
and the rule was small; widening it to `\bPro\b` is what found the dashboard header. `node
tools/falsify-declared-state.cjs` — **6 breaks, 6 caught, 0 not applied**.

Gate **560**; whole suite **43 families, 219 mutants applied, 219 caught, 0 not applied** (`node tools/falsify-all.cjs`), the new family
reading **6 of 6 inside the full run**. `node tools/shot.cjs --measure --dark` re-run with the
declaration in place: every failure tally zero across **73 screens**, contrast included —
which is the measurement that makes `only light` a free choice rather than a trade. Then the whole
seven-corner sweep: **7 of 7 corners clean at 25 tallies each**, because three painted strings
(the chip, the notification title, the dashboard header) changed width. `node tools/probe-all.cjs`
re-run after both: **41 instruments, 0 needing attention**.

And the build that carries it: `1.2-preview.37`, `versionCode 39`, `BUILD SUCCESSFUL in 38s`, with the
archive opened rather than assumed — `unzip -p Sukinnect-1.2-preview.37-debug.apk assets/Sukinnect.html |
md5sum` answers `d63ffb2b8bd54624fa46cc64c3dac8ab`, the same value `md5sum Sukinnect-next.html` and
`dist/Sukinnect-next.html` answer. Nothing was on adb when it finished, so the §85 header fix — the one
change in this build whose whole point is a case the camera has never walked — is unverified on hardware
by construction, and `preview.33` is still what the phone holds. (superseded next morning by §86: the phone holds `.37` now, and five of the six legs are settled there)

## 86. Handset walk 5: what a phone settled, and the two silences that were the instrument

Six legs were owed on `1.2-preview.37`. The vivo 1906 (`80d20768`, Android 10, WebView
`155.0.8059.43`, 720x1544 at `Override density: 256` → **450 CSS px**, read from the page as
`innerWidth 450 / innerHeight 889 / devicePixelRatio 1.6`) took all six, and five closed. The write-up is
*Handset walk 5* in `DEVICE-PASS.md`; what belongs here are the facts that generalise.

**A silence from a channel that is still busy is not a negative result.** TalkBack does speak an opened
dialog — measured as a new `requestAudioFocus()` from `SpeechControllerImpl` with
`GAIN_TRANSIENT_MAY_DUCK` and `usage=USAGE_ASSISTANCE_ACCESSIBILITY`, against a non-interactive card and a
dialog body text that each produce nothing. The first attempt at the *close* case read zero new lines and
was one sentence away from being recorded as "closing announces nothing". The channel is idle only when
`dumpsys audio`'s focus stack is empty, and TalkBack keeps its entry there for tens of seconds after
speaking (holds of 39s and 51s, and one still held 81s after its request), so an utterance inside a held
session cannot appear as a new request. The driver now waits for the stack to clear before each measured
tap and prints how long it waited — which is also what makes the 0 on the two control rows mean something.
The same run reads the log as a **set difference** against a snapshot, because the speech log is a ring
buffer and the first version compared a bare `HH:MM:SS` string against lines that begin
`MM-DD HH:MM:SS:mmm`: a lexical comparison that answers "nothing new" forever, which is a passing test
nobody can distinguish from a dead one.

**A platform that answers one injected tap and refuses the next is telling you which surface it
protects.** The concierge's photo control opens the real
`com.google.android.documentsui/.picker.PickActivity` — the `--tap` addition to
`tools/device-probe.cjs` is what proved it, because `element.click()` from `Runtime.evaluate` carries no
user activation and Chrome refuses a chooser without one. But ColorOS will not hand a *document* to a
synthetic pointer: four attempts across two layouts (grid tile centre, grid preview icon, list preview
icon, and the same icon as a `motionevent DOWN` + 1s + `UP`) left the picker resumed and our page
unchanged, while a tap at `(106,194)` toggled the "Large files" chip from `checked="false"` to
`checked="true"` and a swipe at `360,1200 → 360,700` scrolled the very list whose rows refuse taps. Two
controls — one on the same window, one on the same widget — are what turn "it did not work" into "this
specific affordance does not accept synthetic activation". Before even that, the test file was invisible:
`adb push` preserved a 2026-09-20 date and indexed nothing, so the picker's RECENT IMAGES held only the
owner's real photographs, which are not mine to select. `touch` plus `MEDIA_SCANNER_SCAN_FILE` put
`suki-leg6-test.png` at MediaStore row 667 and at the top of the grid.

**The app's half of §75 is now a measurement rather than a comment.** A `File` handed to
`#hidden-file-input` through `DataTransfer` — the mechanism a browser itself uses when a picker returns a
document, so this is a state a person produces rather than one written into a model — then `change`, then a
read of the painted screen:

```
node tools/shot.cjs --probe=@tools/probe-concierge-photo-name.js --only=concierge
  probe → {"painted":["ibe the issue Attach a photo of the problem IMG_kitchen_leak"],
           "sizePainted":false,"imageSourcesHoldingBytes":0,"blobOrDataInPaintedHtml":0, …}
no console errors across 1 screens
```

The screen paints the name and both byte counters read 0: no `blob:` or `data:` source anywhere on it,
as an element attribute or in the markup. The probe refuses rather than reporting that, so a clean answer
cannot come from a screen that measured nothing — its rows are ordered control → bytes → name-painted,
and `node tools/falsify-photo-name.cjs` breaks the second and third steps and requires a different
non-clean answer from each: storing `URL.createObjectURL(file)` where the handler stores `file.name`
answers `LEAK: 0 image source(s) and 1 bytes-bearing string(s)`, which is the mutant a probe counting
`<img>` tags alone would have called clean, and returning before the read answers `NO CONCLUSION: the pick
landed and no bytes leaked, but the screen paints no file name`. 2 of 2, 0 not applied.
The two refusals in the code ("This prototype keeps the picture on your device", and the concierge
refusing to sort a photo with no words beside it) are now backed by pixels.

Also confirmed on hardware, and worth listing because each is a case the bench cannot contain: §85's
second-provider header `Erning Bautista · Fruit Harvest & Buy · Brgy. Buayan`, signed in through the
painted form, with `Resident / Provider` chips; §82's `1039` painted across **2** line boxes at the
device's own 2.0 text with `white-space:nowrap` removed and **1** with the shipped rule; §82's Insights
reading **33 / 75 / 38** on this device against the bench's 60 / 75 / 38, because the stored snapshot holds
extra live bookings and the screen says `3 of 9 jobs that reached a final state` — different numbers, both
correct, which is what a derivation looks like from the inside; and §77's dialog tree on a *second*
surface, the sign-out confirmation, whose `[data-layer]` list empties on the `×` tap.

**What stays unverified, stated because two instruments can prove a thing happened without proving what
was said.** No channel here recovers TalkBack's utterance text — `logcat` produced 0 lines matching
`talkback|accessib` across the whole walk, and Android 10's `PlaybackActivityMonitor` dump lists client
handles with no per-player detail — so the burst proves an announcement occurs and the a11y tree proves the
name is exposed, and neither proves the wording is spoken. And one thumb-tap inside the picker is still
owed.

One trap re-encountered for the third time in this repository: after `scrollIntoView({block:'center'})`
the concierge entry's rect still read `y=897` in an 889px viewport, because `#screen` scrolls smoothly by
contract. `style.scrollBehavior='auto'` plus a direct `scrollTop` moved it to `y=496, vis:true`. A rect
read in the breath after a scroll is the element's *old* position.

The device was left as it was found: `enabled_accessibility_services=null` and `accessibility_enabled=0`
(both off before this walk asked them), `svc power stayon false`, the pushed test image deleted and
re-scanned out of MediaStore, 11 `uiautomator` dumps from this and earlier walks deleted
(`ls /sdcard/*.xml` answers 0), `font_scale` back to its default, and the app signed out through its own
control and confirmation dialog. `preview.37` (`versionCode 39`) stays installed.

`node tools/verify.cjs` re-run at the end of this walk: **all 560 checks passed**, with
`git status --porcelain -- Sukinnect-next.html` answering nothing — no application file changed while the
phone was attached. The suite (**43 families, 219 mutants, 219 caught, 0 not applied**), the seven-corner
sweep and `node tools/probe-all.cjs` (**41 instruments**) were the §85 figures at the time of writing, and
this walk did not re-run them. They have since been re-run to the day, and §88 carries the passes that
moved them: **44 families, 221 mutants applied, 221 caught, 0 not applied** with no flagged family,
**42 instruments** with 0 needing attention, and **7 of 7** corners clean at 25 tallies each. §89 moved
them a third time — the gate is **562**, the tree is **45 families / 228 mutants**, and the figure quoted
there is the one to use; the numbers in this paragraph are what those passes printed on 2026-10-22. The handset
drivers stayed in `.scratch/` — a driver written to answer one question about one phone is
not a gate — but the two bench instruments this walk produced are committed and counted:
`tools/probe-concierge-photo-name.js` and `tools/falsify-photo-name.cjs`, and §87 records the instrument
correction that adding the probe surfaced.

## 87. A clean number and a blind sensor must not share a key

Found while adding one instrument, not while testing the application. The full pass of
`node tools/probe-all.cjs` that took the total to 42 printed this, and stopped there:

```
ok probe-whitespace.js               [page resident-edit-form,chat-room]2 answers · {"typedFields":1,"findings":1,"report":[{"field":"chat-input","tok
```

`ok` beside `findings:1` is two sentences about the same row that disagree, and only one of them is a
verdict the runner reads: `probe-all.cjs` judges a page probe by whether it ANSWERED, not by what the
answer said. The line is also cut by the runner's own `.slice(0, 78)` — applied to the LONGEST answer,
so the tail of a row that would have explained the count never reaches the page a human reads. Asked
directly, the probe answered:

```
{"typedFields":1,"findings":1,"report":[{"field":"chat-input","tokens":[
  {"token":"\" \"","submit":"Send","stayedInField":" ","grew":null,"changed":[],"blankPainted":[]},
  {"token":"\"   \"","submit":"NO CONTROL FOUND"},
  {"token":"\"\t\"","submit":"NO CONTROL FOUND"}]}]}
```

Reading that row rather than the count found two errors, one in a sentence and one in a number.

**The sentence.** `probe-whitespace.js`'s own header recorded that a space sent in chat "appends no
record and gives no feedback". It does give feedback: `sendChatMessage()` trims, refuses, and raises the
toast `Type a message first`. The bullet was written from the record count and never from the screen.

**The number.** `findings:1` was not the application at all. The probe captured one element handle per
field and then clicked the layer's primary control for each of three tokens; the first click re-renders
the room, so from the second token on the handle was detached and `submitFor()` answered
`NO CONTROL FOUND` about a Send button painted in front of it. The predicate counted that string as an
app finding — while the file's own comment, four lines above, said plainly that `NO CONTROL FOUND` rows
"say nothing about the app". The comment and the code had been written by the same hand and disagreed.

Two fixes. The field is re-resolved by id or name before every token (`relive()`), which is the same
lesson `probe-blank-query.js` records in its header — "it held one `search-input` element across the
whole loop, so from the second case on it typed into a detached node" — arrived at twice because the
second file did not read the first. And the counters split: `findings` now counts only rows where the app
did something (whitespace stored, a record created, a blank painted, its own handler throwing) and
`instrumentRows` counts rows the probe could not complete. Re-run:

```
node tools/shot.cjs --probe=@tools/probe-whitespace.js --only=resident-edit-form,chat-room
  probe → {"typedFields":1,"findings":0,"instrumentRows":0,"report":[]}
  probe → {"typedFields":5,"findings":0,"instrumentRows":0,"report":[]}
```

Both screens now report nothing, and they report nothing because nothing happened, not because the probe
lost its handle. **A clean answer and a blind sensor must not print the same character** is the rule this
file has written for screens, for data, for a wait, and for a probe runner — and here it was hiding
inside a count that a human had already learned to skim past. Which is also why the instrument total in
§86 is 42 and not 41, and why `tools/probe-concierge-photo-name.js` names its population in its header
instead of leaving the runner to guess it.

**The class is wider than the one probe, and the fix for the runner is recorded rather than built.** Any
page probe can print a non-zero defect count inside an `ok` line, because the runner has no vocabulary
for what an answer means — it has `NO CONCLUSION` as a sentinel for *did not measure*, which is the one
question a runner can answer without knowing the subject. The shape that would close this is a
convention, not a parser: every page probe that counts defects names its key `findings`, and
`probe-all.cjs` promotes any answer whose `findings` is a positive integer from `ok` to `XX`. Not built
in this pass, for the reason the shipped-file gap is recorded rather than closed: a rule that only two of
42 probes currently obeys is a half-built surface, and the falsifier for it (`falsify-probe-population`
already owns the sentinel rule) would have to gain a second planted probe before the convention means
anything. `grep -l findings tools/probe-*` names exactly two files — this one and `probe-money-sums.js`,
whose `findings` is an array and whose header already argues the same case from the other direction ("a
zero that means nothing must not print like a zero that means clean", which is why it reports `checked`
beside `findings`). Making the runner read that key is the next pass, and the two probes would first have
to agree on what a finding is.


> **Overtaken the same day.** §89 builds the runner rule this paragraph declined to half-build, and §90
> brings the last probe that was still keeping its count as an array into the convention. The two files
> named above are now three, agreeing on the key.

## 88. A killed mutant run left its own defect in the tree, and nothing in the suite could see it

`node tools/falsify-all.cjs` had been running for about forty minutes, through ten families, when it was
cancelled while `falsify-double-tap` was mid-flight. The log stopped after `dialog-focus`, frozen at 847
bytes across a twenty-second wait, with no `node` process left. The working file, which every
family rewrites and restores in a `finally`, was left holding the break:

```
   const changed = Object.keys(state.adminProfileData)
     .filter(k => state.adminProfileData[k] !== before[k]);
-  if (changed.length) {
+  if (true) {
     adminLog('Admin profile updated', state.adminProfileData.name,
```

That is the exact defect `falsify-double-tap` exists to condemn — one press of **Save** on an untouched
admin form appending `Admin profile updated` to the audit log — sitting in the file the next measurement
would read. `git status --porcelain -- Sukinnect-next.html` is the only thing in this repository that
says so, and no tool had ever asked it. The runner's own header has a paragraph about the pass taking
~80 minutes, and its last sentence warns that a reader who budgets by a wrong number will abandon the run
early "which is the one way to leave a mutant in the tree". The warning was about patience; the tree was
never checked.

**The guard is two asks, at the two ends of the pass.** Before the first family, `git status
--porcelain -- Sukinnect-next.html` must answer nothing; if it answers anything, the runner prints the
dirty paths, prints the recovery (save the bytes, `git checkout --`, re-run the gate), and exits 1
**without touching the file** — reporting a hazard and repairing it are different acts, and a guard that
repairs would hide the run that made the mess. After the last family, the same question is asked again and
a dirty answer is printed as `BROKEN` and folded into the exit code, because a table whose last family
left a mutant is a measurement of a file nobody has. If `git` is not on PATH the pass still runs and
prints `NOTED the target was never checked against git` — a guard that silently disables itself is the
failure mode §81 through §87 have now written down four times.

Proved by `node tools/falsify-preflight.cjs`, which dirties the tree with the real line and runs the
runner against a one-family filter: a positive control on a clean tree first (exit 0, a family row
printed), then the refusal, then the same dirty tree a second time to require that the tree is *still*
dirty after the refusal. **3 breaks, 3 caught, 0 not applied**, file restored, `git status` empty again —
and it is the middle row that turned up a second defect:

The fixture's filter was `count-labes`, copied from this runner's own header example, which is two letters
short of `count-labels` and matches no family. So the nested pass ran **zero** families, printed
`0 families, 0 mutants applied, 0 caught, 0 not applied — every rule is still being tested`, and exited 0.
The control caught it only because it asserts that a family row appears. Two things were wrong: the typo,
and a runner that reports a green zero for a filter that selected nothing — the word "every" in that
sentence is exactly the claim a zero-selection pass cannot make. `falsify-all.cjs` now prints `NO MATCH`
with the filter and the full family count and exits 1, and that behaviour is the family's second row.

It did not have to wait for a fixture. Loading the guard while the replacement pass was still running
found the condition live: `git diff` showed `residentFinished().filter(b => ['captured',
'collected'].includes(b.payStatus))` replaced by `bookingsForResident(state.customerId)` — the break
`falsify-history` holds while it runs — so the tree was dirty because a pass was alive at that moment,
and a nested `node tools/falsify-all.cjs count-labes` answered

```
TARGET NOT CLEAN — nothing was mutated. `git status --porcelain -- Sukinnect-next.html` answers:
   M Sukinnect-next.html
```

with exit **1** and no family row, and the outer pass carried on untouched. Two readings of that
exchange, and the second is the reason the message was rewritten: the dirty bytes were not leftover
damage at all but a **live** mutant from a pass that was still running, so the first version's sentence —
"A previous pass was interrupted while a family held a mutant in the file" — asserted a history it could
not know, and named the wrong recovery (`git checkout --`, which would have deleted a running family's
work from under it). The message now states both causes, says this runner is the only writer, tells the
reader to ask `tasklist | grep -i node` which case they are in, and only then offers the restore. A
checker whose numbers are right and whose sentences guess is the failure §87 already named.

**The pass the guard was installed for.** With the checks in place, `node tools/falsify-all.cjs` ran to
completion on 2026-10-23: **44 families, 221 mutants applied, 221 caught, 0 not applied**, no flagged row,
and `falsify-photo-name` reading 2 of 2 inside the aggregate rather than only standalone — the first pass
since §85, and the first that included the §86/§87 instruments. `falsify-preflight` landed after that pass
had already listed its families, so it ran standalone (3 of 3, 0 not applied) and the next full pass should
print 45 and 224; the tree's own count is in `node tools/falsify-all.cjs`'s header rather than in this
paragraph, because that header was one of the hand-kept figures this section exists to stop.

Then the loop closes on itself. That header had advertised "40 families, 206 mutants: ~80 minutes", both
numbers kept by hand and both wrong — the suite was 44, and the pass had just taken about 35 minutes. An
advertised cost that is too high is not a cosmetic problem in this particular tool: the sentence right
next to it warns that a reader who budgets by a wrong number will abandon the run early, and abandoning a
run is the mechanism that leaves a mutant in the tree. A stale runtime in the guard's own file was the
same defect one level up, so the header now carries the measured pass and says why the old figure got a
run killed.

After everything, the application file was verified untouched by the whole exercise rather than assumed:
`git status --porcelain -- Sukinnect-next.html` empty, `node tools/verify.cjs` **all 560 checks passed**,
and `md5sum Sukinnect-next.html dist/Sukinnect-next.html
Sukinnect-Android/app/src/main/assets/Sukinnect.html` answering one value (`d63ffb2b8bd54624fa46cc64c3dac8ab`)
for all three — so `dist/` and the APK's bundled asset are still the file that earned the floors, and
nothing needed rebuilding. The layout sweep was then re-run to the same date rather than left as §85's
figure: **7 of 7 phone corners measured clean**, 25 tallies each, 73 screens — which it should have been,
since nothing in the application changed, and a claim that "nothing changed" is only evidence once the
sensor has been pointed at the file again.


## 89. A probe answer is printed two ways, a floor is stated in the wrong space, and the phone said so

Three findings, each from putting an instrument in front of a case it had never been asked about.
Gate **562** (560 + the two new shape checks); `node tools/falsify-probe-population.cjs` **6 of 6 breaks
caught, 0 not applied**; `node tools/falsify-nav-fit.cjs` **5 of 5, 0 not applied**; sweep and instrument
totals are quoted from the re-runs at the end of this section, because the application file changed.

**1. `probe-all` now reads a defect count — and its first version could not see one.** §87 left the
convention recorded rather than built because only two of 42 probes used the key. Building it found the
reason conventions need care: the runner's page answers come back in **two shapes**. A probe that returns
an object prints as plain JSON; a probe that returns `JSON.stringify(…)` prints as a JSON *string*, every
quote escaped. The first matcher looked for `"findings"` in the text, so `probe-money-sums.js` — which
stringifies — was invisible to it, and the planted probe that reported `findings: 1` was printed as
**clean**. The family's positive control refused to credit its own baseline ("the probe that counts a
defect read clean where the contract needs flagged; nothing below this line is a test"), which is the only
reason the bug was caught the same minute it shipped rather than after a pass that quoted it. The value is
now unwrapped through both shapes, so a probe cannot opt out of its count by choosing how it returns.
`probe-money-sums.js` also had to change: its `findings` was the array itself, which no runner can compare
against zero without parsing prose; it prints `findings: out.length` and keeps `findingRows` beside it.
The count is printed **ahead of** the answer (`findings=1 · …`), because the runner truncates each page
answer at 78 characters and the tail that explains a number is exactly what nobody read.

The family grew from three breaks to six, and the three new ones are the boundaries as much as the rule:
a counted defect must be flagged, an unfinished leg (`instrumentRows`) must be flagged *separately*, and a
probe that reports **no** count key must still be clean — the last one is proved by making the runner read
a missing count as one and requiring the verdict to flip. `falsify-probe-population` does not take the
application-file mutex, but it drives Chrome, so it runs alone.

**2. A floor stated in rendered pixels, converted by `Math.round`, is a floor with a hole in it.**
Handset walk 6 signed into the provider account on the OPPO CPH2179 at the panel's own 1.35 text and read
the computed size of each nav label: `--nav-label-size` written `10.37px`, rendering **13.9995px**. The
declared floor is 14. `fitNavLabels` works in rendered pixels and converts back to specified pixels for the
property, and `Math.round(14 / 1.35 * 100) / 100` is 10.37, which the platform multiplies to just under 14.
Half a thousandth of a pixel — and the point is not the size of the error but that **nothing in this
repository could have seen it**: on the bench `navFontScale()` is exactly 1, so specified and rendered are
the same number and the fit is bit-identical under either rounding; and the camera's below-14px walk
carries a 0.7px tolerance, so even a reading of 13.9995 on a phone would not register as a finding. Fixed
by converting upward (`Math.ceil((size / scale) * 100) / 100`) and pinned the way §83 pins what a machine
is too coarse to observe: two `hygiene` checks, one on the direction of the rounding and one that the
factor is still *measured* rather than assumed — the second is the positive control, because a check that
only asked whether the file avoided `Math.round` would also pass on a build where the loop had been deleted
altogether. `node tools/falsify-nav-fit.cjs` gained a fifth break that restores `Math.round` and requires
the gate check to fail.

Proved where it can be proved, on `1.2-preview.38` (`versionCode 40`, the bundled asset extracted from the
APK and hashed against the source): the same provider nav now writes `10.38px` and computes
**14.013px** — above the floor, not a tolerance away from under it. `Bookings` and `Messages` remain cut at
14px, which is the documented and intended outcome on a 320px panel with five items in 58px slots.

**3. The handset contradicted `DEVICE-PASS.md` before anything was measured, twice, and both times the
file was wrong.** The OPPO was found with **Sukinnect not installed at all** (`dumpsys package
com.sukinnect.app` answered nothing) while the owed list still said it held `preview.33`; and
`svc power stayon` was already cleared while the same list still owed the clearing. Its text scale is 1.35
in the **`system`** namespace — `settings get global font_scale` answers `null`, so reading the wrong table
turns a silence into a fact, which is §86's busy-channel lesson arriving from the other side. Three driver
lessons from the same walk are written up in *Handset walk 6*: the on-screen keyboard moves the page and
`window.visualViewport` does not report it (the Log in button measured y=454 with the keyboard up and
y=547 without, so two honest coordinate taps hit nothing and the sign-in finally landed on the field's own
`Enter` → `submitAuth()`); hardware Back is wired to the app's history, so a blind `KEYCODE_BACK` meant to
dismiss a keyboard pops a screen or exits at a root tab; and a document-wide label search matched the hub's
"Log Out" *row* at page y=2374 instead of the open dialog's "Log Out" *button*, so the confirm re-tapped
the row — every lookup is now scoped to the top `[data-layer]` when one is open. And §77's
`focusInside:false` on this phone was the reader again: `document.activeElement` is `<body>` whenever
`document.hasFocus()` is false, so the honest reading is "the instrument was blind", and `hasFocus()` now
prints beside it.

**Re-derived after the change, because the application file moved.** `node tools/verify.cjs` — **all 562
checks passed**. `node tools/falsify-nav-fit.cjs` — 5 of 5 breaks caught, 0 not applied. Sweep and
instrument totals: see the note at the end of this section, filled from the two passes that printed them.
`node tools/build-web-dist.cjs` re-published `dist/` (29 referenced paths, all resolving; no LFS
pointers), and `md5sum Sukinnect-next.html dist/Sukinnect-next.html
Sukinnect-Android/app/src/main/assets/Sukinnect.html` plus the asset extracted from
`Sukinnect-1.2-preview.38-debug.apk` all answer `a4cf6fc31df59ae2964b0d726b071534`.
`Sukinnect.html` remains identical to `origin/main`.

**The aggregate, re-derived rather than added up.** `node tools/falsify-all.cjs` printed **45 families,
228 mutants applied, 228 caught, 0 not applied**, no flagged row, `nav-fit` 5 of 5 and
`probe-population` 6 of 6 inside the run, and `preflight` 3 of 3 inside it for the first time. The
prediction in the notes before the pass was **225** — 221 plus the four new breaks — and it was wrong
because `falsify-preflight`'s own three had never been inside an aggregate at all. Three more mutants
nobody inferred, and no arithmetic error: the point is that a total assembled from a list of diffs is
not a measurement, and §88 exists precisely because a hand-kept figure drifts. This section quotes the
printed line. The tree was clean when the pass ended, which is the post-flight guard in the runner
answering for the run that was using it.


## 90. Three numbers the operating doc kept after the instruments outgrew them — and a fourth I got wrong while fixing them

A drift sweep, prompted by nothing but reading the claims instead of trusting them.

**Handler count: 71 → 78.** AGENTS quoted `tools/audit-handler-reachability.cjs` as resolving "71
handlers, all 71 resolve". Run today it answers **78 distinct handler names, every one resolving to a
defined function**. The claim's substance held; its number was four passes behind. Fixed in place.

**The duplicate-id probe's walk size: 62 → 73, and its count was still prose.** Same edit for the
screen count, but this one was a live blind spot, not just a stale figure: the probe returns
`{ screen, ids, dupes: [...], formCollisions: [...] }` — it counts collisions into an **array** with no
`findings` key, which is exactly the shape §87 and §89 built the convention to make unreadable-by-accident.
A real duplicate would have printed `ok probe-duplicate-ids.js … dupes:[…` and been cut at the runner's
78 characters, so the instrument that exists to catch a save writing a number from a field nobody
touched would itself have been the thing that hid the finding. It now reports `findings: dupes.length`
and keeps `dupes` as the detail. Re-run against just it: `1 probes, 0 needing attention — 1 of them
report a findings count this runner reads`. Across the whole suite the count of instrumented probes is
printed in the same sentence, so the convention's reach is a measured number rather than a claim.
(Also verified while here: zero duplicate ids across all 73 screens, read by parsing every screen's answer
through both print shapes — the `node tools/probe-duplicate-ids.js` invocation that crashes with
`document is not defined` is the same reader mistake §79 wrote up for `probe-injection.js`, since this
file is a camera expression, not a Node script.)

**"No tool even contains the string `Sukinnect.html`" was false.** `grep -rln Sukinnect\.html tools/`
answers `tools/build-web-dist.cjs`, five times — it publishes the shipped file into `dist/`. The sentence
was written to make the measurement gap vivid and ended up being a fact that any grep disproves.
Rewritten to what the grep supports: no *instrument* reads it; `build-web-dist.cjs` copies it without
measuring it, and `measure.cjs` can read it only because it takes a file argument.

**And the correction was wrong too.** My replacement said "the only two files in `tools/` that name it
at all are `measure.cjs` … and `build-web-dist.cjs`" — but `measure.cjs` doesn't contain the literal
either, it accepts a path. I caught it by running the very command I had just cited as evidence, which is
the point: a fix is a new claim, and it earns its place only by the same check that condemned the old
one. Nothing here was verified by having been rewritten.

The shipped file's other quoted figures were checked the same way and all still match exactly — 4,707
lines, one `:root`, 86 tokens with 9 never reached, 1,138 `var()` uses, 75 hex-shaped strings outside
`:root`.


## 91. Four sentences that were true when written and false the next commit, and a census for the class

A goal of "finish the open items" turned out to need an instrument for *statements about what is still
open*, because the items themselves were closed and the prose was not.

**What was stale, and how each one was caught.** AGENTS.md still said the admin's Provider Insights screen
"needs §76 applied to it, and that is the next pass, not this one" — three sections after §82 applied it.
CHANGES.md §81 recorded the de-typing as found-not-fixed with no pointer to §82 shipping it.
DEVICE-PASS.md's walk-4 list still owed a thumb to that same screen, which Handset walk 5 had already
read on a vivo. README.md told a reviewer the app has "never" been measured on a handset, six walks and
two phones ago, and that a `finally` means "a crash cannot leave a mutation behind" — which §88 disproved
for the case that matters, because a *cancelled* run never reaches its `finally`. The same file's
preamble quoted 517 checks and 63 screens where the tree says 562 and 73. Each was verified before being
corrected, not after: the Insights claim was checked by grepping the app for the typed bar literals it was
supposed to still contain (none survives) and running `node tools/falsify-insights-records.cjs` —
**7 breaks, 7 caught** — and the README's runner claim by re-running `node tools/falsify-preflight.cjs`,
which printed its control line and **3 of 3**.

**Why no existing instrument could see any of it.** Every tool in `tools/` measures the application or its
own outputs. A stale sentence is neither: the app changed, the document describing it did not, and the
document still reads perfectly. §90 caught hand-kept *numbers* in prose; these are hand-kept *states*, and
a number that is wrong is at least comparable — "still owed" is not falsifiable by arithmetic.

**The census.** `tools/audit-open-items.cjs` greps the documents that speak in the present tense
(AGENTS.md, DEVICE-PASS.md, README.md) for sixteen deferral phrases and prints one row per hit with the
sentence around it, exiting 0 because an open item is legitimate — the concierge's picker really does owe
a thumb. `CHANGES.md` is out of scope by design: it is a dated log, and the house rule for a superseded
row is the dated note §81 and §87 now carry, not a rewrite. Two properties keep it honest. Every marker
prints in the summary tally **including the ones at zero**, so a vocabulary that has rotted is visible as
silent markers rather than as a suspiciously short list; and if nothing matches at all, or no document
could be opened, the last line is `NO CONCLUSION` and the exit code is 1, because an empty census must not
answer like a clean one. `probe-all.cjs` picked it up from the filename alone — the discovery glob is
`^(probe|audit)-…` — which is registration made structural rather than a list someone maintains, the same
trick by which `layerKeys()` derives the modal fields from `state`.

**Four breaks, and two of them were the family's own bugs.** `tools/falsify-open-items.cjs` runs the
control first (a nonzero list, three of three documents, every marker named, no refusal), then empties the
scan's vocabulary, hides the zero-counting markers, renames a document out of existence, and finally
forces the refusal branch dead *while* the vocabulary is dead — the blind-sensor break, which is what proves
the first break is caught by the refusal and not by a number the census happens to print. Two instrument
defects surfaced on the way and both generalise:

- **A sentinel that appears in the text being scanned is not the scanner's verdict.** The control tested
  `/NO CONCLUSION/.test(entire output)` and aborted on the *unbroken* census, because AGENTS.md quotes that
  exact sentinel in prose about §75's probe — and the census prints those sentences as its rows. The check
  now reads the tool's own last line. This is the needle-matching-prose defect from §84 arriving in a
  reader rather than a writer, and it cost a full control cycle to find.
- **A partly-dead scan is not a dead one.** The vacuous-scan break first prefixed four of the sixteen
  markers with `zzz `, which left twelve live markers still matching 22 claims: the census answered
  cheerfully and the break printed MISSED. Emptiness has to be planted completely, in this case by
  replacing the loop's iterable in one line. A related trap in the same file: extracting the marker names
  with two separate quoted-string scans let the single-quote pass start inside `"next pass's subject"` —
  written in double quotes precisely because it carries an apostrophe — so the "names" were fragments of
  punctuation. One alternation, matched left to right, never treats that apostrophe as a token start.

Then the family's own extraction was the last thing wrong: the summary line was read with
`out.split('\n').pop()`, which answers the empty string for any output ending in a newline, and the control
printed a blank verdict beside a `yes`. A tail is not the last character of a buffer.

The run that carried the new family printed **46 families, 232 mutants applied, 232 caught, 0 not
applied**, no flagged row, and the tree clean afterwards; `tools/falsify-all.cjs`’s own header now says 46
families and ~53 minutes, which is the wall clock from that launch to its summary line rather than the
~35 minutes the previous revision advertised from memory.

The residual, stated so it is not mistaken for a solved problem: the census lists claims, it does not judge
them. 34 rows came back at the end of this pass, and reading them is the work: two are the handset legs the
`Owed` section keeps open, a few are owner-level (whether either other role reaches a notification surface,
whether PR #9 merges), one is the vocabulary mistaking an overlay "left open" *on a screen* for a task left
open — a false positive the phrase list cannot tell from a real one — and the rest are dated sections of
`DEVICE-PASS.md` and `AGENTS.md` that the house rule keeps as written. The count also *rose* during the
pass, 28 to 34, and the reason is worth keeping: §91 and its AGENTS twin are full of sentences explaining
that a deferral was closed, and a census of deferral phrases cannot tell "this was once called the next
pass" from "this still is". Writing about the closure adds a row. That is not a defect to fix by narrowing
the vocabulary — a narrower vocabulary is how §81 and §87 got missed for three sections — it is the cost of
the instrument, and the reason it is a list to read rather than a gate to pass.


## 92. Asked whether anything was left, the task list said no and the file times said the sweep was stale

The question was "is everything complete?", and the honest answer required not reading the task list — 58 of
58 completed — but comparing **when each measurement ran** against **when the thing it measured last
changed**. The list is a claim about intentions; a log line is a claim about a run, and only the second can
be stale in this particular way.

**What the audit found, in the order it was found.** `git log -1 -- Sukinnect-next.html` says the nav-floor
conversion (`Math.round` → `Math.ceil`) landed at 06:40; `ls -lt .scratch` says the newest layout sweep ran
at 06:14. So the "seven corners clean" figure the operating doc carried was measured on the file **26
minutes before** its last change — the falsifier pass, the instrument pass and the gate had all been re-run
against current bytes, and the sweep had not. It was re-run: **7 of 7 corners, 25 tallies each, all clear**,
across the 73 screens `node tools/shot.cjs --list` counts. The conversion cannot move a bench reading
(`navFontScale()` is exactly 1 on this machine, so `ceil(size*100)/100` and `round(size*100)/100` are the
same number), and that is exactly the argument the §68 sweep exists to refuse: reason about why a re-run is
unnecessary is how every stale figure in this file survived.

**A second hole, found while checking whether the browser cleanup was real.** Task 17 reclaimed the Chrome
profiles the camera abandons in temp, and the sweep's own directory listing showed a `suki-shot-*` folder
twelve days old under a different name: `suki-diag-aJhAb1`, from a one-off diagnostic driver that is no
longer in `tools/`. The reclaimer matched one literal prefix, so an orphan from a retired tool could never
be collected by any run — the leak had a name, and the name was the only thing the guard knew not to look
for. `tools/shot.cjs` now holds `PROFILE_PREFIXES = ['suki-shot-', 'suki-diag-']`, and naming the dead
prefix is safe because of the hour guard: nothing that still holds such a folder is older than an hour, and
only this repository's own tools ever made one. Measured on the next run: `reclaimed 3 abandoned Chrome
profile folder(s) from earlier runs`, and the temp listing afterwards holds no `suki-*` directory at all.

**Then the guard got a guard.** A prefix list fails silently — the tool just prints a smaller number — so
one `hygiene` check pins it (both prefixes present, at least two entries so an emptied list cannot pass, and
the `3600000` hour guard still in place, because the guard is the reason the retired prefix is safe to
name). Proven by three plantings against the live file, each refused by the named check and each restored
byte-for-byte: drop `suki-diag-`, replace the hour guard with `< 1`, empty the list entirely. Baseline after
the restore: **all 563 checks passed**.

**And why the aggregate had to run again.** The camera is a *target*: fifteen families needle
`tools/shot.cjs`, and §82 established that editing a file a family needles can orphan a needle and take a
guarding mutant out of the suite while every headline number still reads healthy. So the totals this section
quotes come from a full pass started after the camera edit, not from the pass that ran before it: it printed **46
families, 232 mutants applied, 232 caught, 0 not applied**, no flagged row, and the tree clean
afterwards — the same table as the pass before it, which is the evidence that editing the camera orphaned no
needle in the fifteen families that needle it.

Two rules out of one question. **A green task list is not evidence of completeness — compare measurement
times to change times** (`ls -lt` against `git log -1 -- <path>` is under a minute and catches what no
assertion can, because nothing was wrong with the old run; it was merely old). And **a cleanup rule written
as one literal is a cleanup rule with a hole shaped like history**: enumerate the names your tool has to
collect, including the names its own retired tools used, or the residue outlives every run that could have
cleared it.


## 93. The two handset legs closed on a vivo, and a working picker route that can choose somebody's real file

A phone was attached, so the two items the `.37` and `.38` walks owed were put to it. Both closed, one of
them by closing a defect in what this file *believed*, and one of them producing a photograph of the owner's
that this file must not have.

**The nav floor on the second panel.** `1.2-preview.38` installed on the vivo 1906 (`versionCode 40`,
`a4cf6fc3…` verified inside the APK by `unzip -p … | md5sum`), and the provider nav read at three text sizes
on its 450 CSS px panel — written property, painted size, and the factor measured with a throwaway span:
**1.0 → nothing written, 14px painted, 0 cut; 1.35 → 12.15px written, 16.4025px painted, 0 cut; 2.0 → 8.15px
written, 16.3px painted, 0 cut.** The conversion is honoured on the second phone, which is what §89 owed it.
What the numbers also say is that the vivo's wide panel never reaches the floor at all: five items in 84px
slots stop shrinking at 16.3px rendered, comfortably above 14, so the rounding direction stays observable
only at the 320px corner where it binds. Recording that boundary matters — a claim that "the floor holds on
both phones" would have quietly overstated the second reading, which demonstrates the *arithmetic*, not the
floor.

**The picker, settled by the route that had never been run.** The `.37` walk concluded that a document row
refuses synthetic activation and that "a thumb is still owed". The key route — `input keyevent` with
TAB/DPAD movement and `DPAD_CENTER` — was flagged in that same write-up and never executed, and on this
phone it **returned a document**: our activity resumed, the picker closed, `conciergePhotoAttached=true`. So
the conclusion was wrong for the vivo's DocumentsUI, and the only place the tap refusal remains the last word
is ColorOS on the OPPO, where the keys have not been tried. That is the shape of the mistake worth keeping:
**an affordance refused by one input method is not refused by the platform**, and "we did not try the other
route" must not be written as "a human must".

**And the route works, so it picks real files.** A key-driven pick selects the focused row, and on a working
phone the focused row is the newest image — one of the owner's own photographs, a camera-timed `.jpg`, not the
test PNG pushed and re-indexed for this walk (`_id=65630`, and it did *not* land at the front of the recents
the picker opened). The app's own promise limited the damage, and this is the first time that promise has been
measured against a real device pick rather than a simulated one: **zero** `blob:` references, **zero**
`data:image`, no `<img>` carrying bytes, `conciergePhotoName` in memory only, and the 51,903-byte stored
snapshot holding no name at all — so §75's "the provider sees the name you gave it, not the photo" now has
hardware evidence behind the words. The photo was removed through the screen's own control and re-read as
cleared; the pushed file deleted; the owner's other Download entries left untouched; `font_scale` restored to
the 1.0 it was found at; the app signed out. **The rule this leaves: a picker route that works can also choose
something that is not yours. It must not be run on a device holding photographs the owner has not offered, and
the safe fixture is a folder empty except for the test file, entered by name rather than by trusting the grid's
focus.** The name of the owner's file is deliberately absent from this log.

**Three instrument facts from the same walk, all of them the reader.** `--keys` is applied *before* the page
expression, so focusing a field inside the reader and pressing Enter afterwards arrives too late — the sign-in
completed only when the button's own rect was tapped, which is what a thumb does anyway. `document.hasFocus()`
answered false for the injected focus and the keypress was swallowed silently, the same blindness §89 recorded
for `document.activeElement`. And the auth screen's primary button sat at page `y=901` in an 889px viewport
with `document.scrollingElement.scrollHeight` equal to the viewport: the scroll container is the auth panel,
not the document, so a viewport-and-document-scroll test would have called a reachable control unreachable
twice. `controls no tap can reach` had it right because it asks whether *any ancestor* scrolls.

**The corner this phone produced.** The seven swept corners pair narrow panels with large text, because that
is where clipping was found; 450 CSS px at 200% text had never been measured anywhere. It is now
`vivo 1906 panel at the device's own largest text (450x889 @ 200%)` in `DEFAULT_CASES`, and the run that registered it printed **8 of 8 phone corners measured clean**, the new one
among them — which also corroborates the handset reading, because the corner where the phone's own login
button sits at page `y=901` in an 889px viewport answers `controls no tap can reach: 0`: the panel scrolls, so
the control is below the fold rather than out of reach. Details, readings and the restore checklist are in
*Handset walk 7* in `DEVICE-PASS.md`.


## 94. A commit subject copied from the previous commit — instrumented, because it happened three times

The duplicate-subject audit exists because I wrote the same subject twice more after disclosing that I had
done it once. `git log --format=%s origin/main..HEAD | sort | uniq -d` returns three pairs on this branch:
`docs: stop carrying the totals a command already prints` (6ce7a34 and 5ee3554),
`fix: read a probe's count through both print shapes, and convert the nav floor upward` (aa19fdd and
b7af181), and `docs: re-run the layout sweep to the day rather than carry §85's figure` (33639fc and
cab1696). In two of the three the body described the real change accurately while the subject described a
different one, which is worse than a vague message: a reader scanning `git log` is handed a true sentence
about the wrong commit. The cause is mechanical — writing a message while the previous one is still on the
screen — and a cause that recurs gets a check, not an apology.

**`tools/audit-commit-subjects.cjs`** prints every subject used more than once with its hashes, over a range
defaulting to `origin/main..HEAD`. It exits 0 and lists, because a duplicate subject is a record-keeping
smell and the branch already carries three: a check that fails retroactively on history teaches a reader to
ignore checks. What it refuses to do is answer clean about nothing — if the range yields no commits, the last
line is `NO CONCLUSION` and the exit is 1, because a bad range and a clean branch must not print the same
sentence. `probe-all.cjs` picked it up from the filename, the same structural registration as the census.

**`tools/falsify-commit-subjects.cjs` — 4 breaks, 4 caught** inside the aggregate. Its control does not ask
whether the tool answered: it recomputes the duplicate set and the commit count independently and requires the
two to be EQUAL, and it requires the empty-range refusal to fire on the unbroken file first. The breaks then
make the dedup predicate never-true (0 vs 3), widen it to every subject (85 vs 3), force the refusal branch
dead (an empty scan answers "every subject in this range is unique" and exits 0), and quietly swap the range to
the symmetric difference — which returns the *same three* duplicates but 95 commits instead of 88, so the
count equality is what sees it.

**The family's own bug, and the rule it rewrites.** The refusal break printed MISSED on the first run, and the
break was right while the check was wrong: I had asserted that the mutated tool must *refuse*, when the whole
point of the mutation is that it stops refusing. So a break that removes a guard is caught when the guarded
behaviour appears, not when it doesn't — and a first MISSED is read, not deleted, which is how the missing
empty-range control got added in the same minute. Without that control there is no baseline, and "it answered
clean" would be indistinguishable from "it always answers clean": the sentence this repository has written
about screens, about data, and now about its own guard's direction of comparison.

Two small facts for whoever reads this branch next: the audit is the thing to run before a push (`node
tools/audit-commit-subjects.cjs`, seconds), and the three existing duplicates stay as they are — rewriting
published history needs the owner, and the bodies already say what each commit did.


## 95. The owed item written from memory was wrong, and the thing it hid was a false fact in three documents

Walk 7 left a pointer saying the vivo's WebView version "was never captured" and to read it on the next
authorised session. The phone came back authorised, so the first thing captured was that the pointer was
false: **walk 5 had captured it** — `155.0.8059.43` — and `dumpsys webviewupdate` today answers the same
value. The writing of that owed item never opened walk 5's device paragraph; it trusted the summary of it.

What the earlier walk *had* got wrong is a fact, not a formality: it recorded the phone as **Android 10**,
and the device answers `ro.build.version.release` **11**, `sdk` 30, `RP1A.200720.012`, vivo OS 11.5, with a
build dated 2025-07-11 — so no OTA explains the discrepancy, it was simply a wrong read. From there it had
travelled: two sentences in `AGENTS.md` (the walk-5 parenthetical, and an attribution of a
`PlaybackActivityMonitor` limitation to "Android 10") and two dated rows in this file. The live documents are
corrected; the log rows keep their text and gain a dated note, because a row that says what was measured on
its own day is a record, while a release used to *explain* something is a claim — so the explanation was
reworded to "that build" and the observation (0 lines matching `talkback|accessib`; client handles without
per-player detail) left standing, since it was read off the device and does not depend on the number.

**The rule:** before writing an owed item that says "never measured", search for whether some earlier walk
measured it. This file has now caught the same shape four times from the other direction — a claim kept after
the measurement moved (§90), a state sentence kept after the item closed (§91), a total kept after a run
printed another (§92) — and here it is the *absence* claimed as owed that was already present. An inventory
written from memory is an inventory of memory.

**The fact worth having instead:** the two handsets are one patch apart on the same Chromium build line —
`.43` on the vivo, `.45` on the OPPO — and yet the key route returns a document on one while ColorOS refused
four synthetic taps on the other. That localises the picker difference to the OEM shell, not to WebView, which
is why the OPPO's item stays open and cannot be reasoned closed from anything the vivo did. Read beside it, and
left exactly as found: `enabled_accessibility_services` `null`, `accessibility_enabled` `0` — TalkBack off, so
the wording question remains the owner's to open rather than a measurement owed.


## 96. TalkBack was switched on for one measurement, and the dialog it opened had never been opened by an instrument

The last thing `DEVICE-PASS.md` owed that no bench could answer was what an opened dialog is *spoken* as.
Every previous reading of that channel had been taken with the service off — `enabled_accessibility_services`
`null`, `accessibility_enabled` `0` — which the owner's standing rule required, and the rule was correct: it
is their phone. So the rule was asked rather than assumed around, and the owner approved enabling TalkBack for
the measurement and restoring it after. That one sentence is why this section exists: with `dumpsys
accessibility` reporting the service **bound**, the project's answer is the same one it has carried since
walk 5 — the announcement happens, the name is exposed, and the words are unrecoverable from here — but it is
now resting on a run where the thing being measured was actually switched on. **A measurement taken with the
instrument's subject powered down does not answer the question it appears to answer, and asking takes one
line.**

Three readings came out of that enablement, none of them about TalkBack's wording. `dumpsys audio`'s
`SpeechControllerImpl` block is a persistent **history**: the same six lines were there before force-stopping
the service and the same six after, and the set only grew as the walk tapped things — so a burst count has to
be a set difference across the event, read beside the service's bound state, and a "no new line" silence is
not a silence. Opening the resident **Log out?** confirm produced exactly one new line, and it was an
`abandonAudioFocus()` — a teardown of an older hold, not a request — while a cleared `logcat` window over the
open held 5 lines, 0 mentioning talkback/TextToSpeech/utterance and 0 containing the dialog's own name. And
**with a screen reader on, the first tap selects and the second activates**: the first attempt reported "no
edit button of 14" while the hub's fourteen painted buttons were exactly where they had always been, and every
navigation in the walk had to be tapped twice. That is a permanent fact about driving a phone, not a quirk of
this dialog.

The divergence that started the leg did not resolve, and the reason is a hole in the bench rather than in the
engine. On the handset `document.activeElement` was `<body>` with `document.hasFocus()` **true**, with the
reader on and again with it off and a single real tap; the bench, driving the same control through
`clickPainted` (a real CDP input event), reports the caret inside and its tally reads 0. Before arguing a
WebView difference, `grep -i logout tools/shot.cjs` was run and answered **nothing**: the confirmation the
owner meets every time they leave the app was a dialog no instrument had ever opened. It is
`resident-logout-modal` in the walk now (**74** screens), clean on all 25 tallies and labelled by its own
title — and the honest residue is stated rather than closed: the caret placement on that handset after a real
tap remains unexplained, and what the suite now pins is that no later render undoes the placement.

That last clause is the second instrument of this pass. `tools/probe-dialog-focus-settled.js` reads the caret
immediately, at one second and at three, because a guarantee that fires and is then undone by a repaint is
exactly the distinction a single-shot tally cannot make, and it reports `findings` so `probe-all.cjs` reads it
rather than only asking whether it answered. The fifth break in `node tools/falsify-dialog-focus.cjs` refuses
the caret through `focusIntoLayer` and requires **that probe** to notice: baseline `findings=0`, mutated
`findings=2` — **5 of 5 breaks caught, 0 not applied, 0 missed**. The same family's tally count moved 8 → 9,
purely because the walk gained a screen, which is a sensor reporting the wider walk rather than a new defect.

**The part that belongs to the owner's device, not to the repository.** The first driver died on `>/dev/null`
— cmd.exe cannot open it — between enabling TalkBack and restoring it, so the owner's screen reader stayed on
until it was put back by hand. That is the cancelled-mutant-run class of §88 arriving with a device setting
instead of a file: cleanup cannot live at the end of the happy path, and the fixed drivers install
`process.on('exit', restore)` before they enable anything. The end-of-walk check is a read, not a memory: the
two accessibility settings `null` and 0, no talkback row in `ps -A`, `font_scale` 1.0 in the `system`
namespace, installed build still `versionCode=40 / 1.2-preview.38`, and the app back on its sign-in screen
after its own Log Out row and the confirm dialog's own button were clicked (`state.view` reads `login`). One
of those reads nearly produced a false deletion: `ls /sdcard/Download` filtered on `suki` answered
`suki-test-photo.png`, which is not this session's fixture — it is dated 2026-10-11 and already recorded in
walk 4 as one of the owner's files left where it was. **A grep hit on a directory listing is a lead; the date
is what makes it a finding.**

Supersedes the closing sentence of §95, which correctly described the state on its own day: the wording
question was the owner's to open, and on 2026-10-24 they opened it.


## 97. An instrument asked the "has anyone walked this dialog?" question, and it found seven

Handset walk 8 met the class face to face: the resident's logout confirmation is a modal the app builds,
the gate proves it paints, and **no row of the camera's table had ever opened it** — which is why the phone's
caret reading had nothing on the bench to compare against. That is the fourth time this repository found the
same hole by a person happening to look (the admin's Account tab, the audit log, the verification review), so
the fourth time it got a measurement instead of a note.

`node tools/audit-camera-dialog-coverage.cjs` compares two populations the application and the tool each own:
the profile controls that **raise a layer**, enumerated from the painted hub and the painted section cards, and
the action names any row of the walk **clicks**. The difference is a destination the walk does not have. It
printed **seven**: the provider's Enable Dispatch, three admin security dialogs whose honest "not configured"
bodies had never been photographed, the admin's View Sessions, and — after the population was widened — the
Log Out button of two roles and the admin's Lock Admin Session, which are painted by the hub itself rather
than inside a section. All seven are in the table now: the walk went **74 → 81 screens**, each new screen
labelled by its own dialog title and clean on all 25 tallies, and the audit answers `findings: 0`.

Three of the first run's seven findings were the instrument's own errors, and each is a rule rather than an
embarrassment. **The camera table does not have one shape for a click:** `residentProfileAction\\('edit'\\)`
sits beside `ProfileAction\\(.add_payment.\\)` and `Action\\(.request.\\)`, because three rows abbreviate the
caller so one pattern serves every role — a reader that recognised only the tidy form called three walked
dialogs unwalked. Names are taken from inside each `clickPainted(/…/)` body now, with letters as a hard stop
after the caller; the first tolerant version allowed four non-digits, so a *renamed* caller still yielded
"logout" and the tool condemned nothing while appearing to work. **The population was too narrow:** reading
only section cards missed the hub's own buttons, and a scan that never looks for a control reports complete
coverage for it. **And the row count lied:** counting every `["x",` read 82 where `--list` counts 78, because
four setup scripts carry nested literals of the same shape — an over-count that satisfies a `< 40` guard is a
population control that blesses a wrong scan instead of condemning an empty one. A row is now the entry whose
id is followed by the template literal that walks it, which is what `--list` prints, and the two agree.

`node tools/falsify-camera-dialog-coverage.cjs` proves the audit can fail: **4 breaks, 4 caught, 0 not
applied** — a walked dialog that stops clicking its control (caught twice on the second attempt: break 1
printed **MISSED** for the loose gap, then **MISSED** again for the narrow population, and both readings
condemned the tool rather than being deleted), a table scan that matches nothing, an app scan that raises no
layer, and a table that is not being read at all, each of which has to answer `NO CONCLUSION` with exit 1
rather than `findings: 0`. `node tools/falsify-dialog-focus.cjs` re-run over the wider dialog list is **5 of
5**, with the tally's mutated count moving 8 → 9 → **16** as the walk gained seven dialogs — a sensor
reporting the wider walk rather than a new defect.

**The rule:** when the same class has to be spotted by a human four times, the human is the instrument's
weak link. And when an instrument's own defect is what produces a clean answer, the fix belongs to the
instrument — a guard whose threshold the bug can satisfy is not a guard.


## 98. The new screens found a real defect, and the bundle checker found its own

Seven dialogs went into the camera's table in §97 and the sweep came back with a finding at **every one of
the eight corners**: one control under the 44px tap floor, one text under the 14px type floor. Both were the
same element — the admin **Lock Admin Session** dialog's PIN field, written as
`<input type="password" placeholder="PIN" style="width:100%; padding:9px">`. No class, so no
`min-height:var(--field-h)` and no `font-size:var(--t-input)`: it drew at the user-agent's 13.3px inside a
37px box, which is precisely the defect this file already records for the two edit inputs that used to
hand-roll their geometry. Nothing in `tools/verify.cjs` could see it, because the gate calls handlers and a
font size is not a handler; the only reason it was visible at all is that the field's dialog had become a
screen the camera walks. It takes `.form-input` inside a `<label class="form-label">` now, like every other
writable field, and both tallies read 0.

The dialog's copy was the second finding and belongs to a different class. It said **"Enter PIN to
continue"** above an Unlock button that only calls `render()` — on a card whose three sibling dialogs already
state that the prototype keeps no authentication state. A label promising a check that nothing performs is
the §63/§75 defect (a button reading "Analyze the text and photo" on a build that cannot read pictures),
arriving from the security shelf. The line now says what is true: no PIN is checked, Unlock closes this
screen and leaves the app signed in.

**Then the bundle checker failed a good build.** `node Sukinnect-Android/tools/check-assets.cjs` started
reporting `48 of 49 resolved` and exiting 1. The 49th was `tools/probe-long-input.js` — not a request at all
but a sentence inside a CSS comment in the page, explaining how a wrapping rule was measured. The path
pattern accepts parentheses as delimiters, so `(tools/probe-long-input.js)` read as an asset the phone needs,
and the fix would have been to bundle a camera probe into the APK. Comments are stripped before scanning now,
because §85 already learned that a needle matching prose is a needle matching the wrong evidence — this is
the same defect pointed the other way, condemning rather than blessing.

The proof planted **one filename twice**: in a comment it must be ignored (clean exit, reference count
unchanged at 48), in markup it must be reported missing. Without the second half the fix could have been
achieved by blinding the scanner to every path. `node Sukinnect-Android/tools/falsify-assets.cjs` — 5 mutants,
5 caught — and its own first version was vacuous: `run()` returned an empty `out` whenever the checker
passed, so the pass-polarity case compared `-1` against `-1` and printed CAUGHT on evidence that could not
have been otherwise. Reading stdout on success made the population real. Third time this session that a
check which cannot fail looked exactly like one that passes.

**One cancelled pass left its defect in the tree, and the documented recovery is what got it back.**
Stopping the aggregate to fold in the fix above killed a family between its mutation and its `finally`:
`git status` showed `adminActivityRows()` returning `'Credential reminder sent. No job has moved on this
device…'` — the fabricated audit line that `falsify-admin-profile-records` exists to condemn, planted by no
edit of mine. Save the bytes, `git checkout -- Sukinnect-next.html`, re-run `node tools/verify.cjs`: hash back
to `a4cf6fc3…`, 563 checks passing. The hazard was the *self-chaining* background command — the next stage
started while the tree still had work pending, so the stages are run one at a time from here.

Consequences to keep: the page bytes are now `badf8cd7…` in the source, `dist/` (rebuilt: 60 files, 48
referenced paths all resolving), the staged Android asset and `1.2-preview.39-debug.apk` (2,153,734 bytes,
`versionCode 41`) — while the vivo still runs `.38` at `a4cf6fc3…`, because the phone left the bus between
the build and the walk. The device reading of a `rem`-sized field is owed, and `rem` is exactly where a phone
can disagree with the bench (§68 multiplies used sizes after CSS resolves), so it is a real leg, recorded in
`DEVICE-PASS.md`'s owed list as item 2.


## 99. Sheets are destinations too: the widened net found the filter sheet, and it held sixteen small controls

§97's audit enumerated the three profile hubs, which is where the four earlier instances of the class
happened to live. The app raises six **sheets**, and a sheet is the same kind of destination — `sheetHTML()`
answers `state.sheet === '<name>'` for each, so the population can be derived from the code the way
`layerKeys()` derives the modal fields from `state`, rather than listed beside it. Widening the audit to
that list showed five of the six sheets already have a row (reached through named handlers —
`openCaseSheet`, `openMakeOffer`, `openFinalise`, `openBookingRequest`) and one does not: the resident's
**Filter providers** sheet, opened by the `aria-pressed` button on the results bar. `resident-filter-sheet`
is in the walk now (**82** screens), and the camera found the defect on the first look: **sixteen controls
at 354×40px**, every option row in the sheet — a `<button type="button">` per row, so no wrapper-label
excuse applies — under §39's 44px tap floor. One declaration fixes a screen nobody had measured:
`.filter-option{ … min-height:var(--tap); }`, and the tally reads 0.

Getting the coverage rule right took two of this repository's own known mistakes, both inside the code that
records them. The first version asked the camera file for `openSheet('providerFilters')` with **one**
backslash — the runtime string — while the bytes are `openSheet\\('providerFilters'\\)` because the pattern is
written inside a template literal; the row that opens the sheet was therefore reported as not opening it.
The second half was delimiters: matching only `'name'` missed the app's own
``openSheet(`profileSection`)``, so the profile sections looked unwalked as well and the tool printed five
"missing" sheets that were all covered. Coverage is now decided by two tolerant rules — any run of non-word
characters between the call and the quoted name, and each branch mapped to the functions that raise it, so a
row may reach a sheet through `openCaseSheet()` instead of the literal call. Both directions are pinned: a
break that removes the filter row's click raises the count, and a break that blinds either scan makes the
tool answer `NO CONCLUSION` rather than a comfortable six-of-six.

One limit is written down rather than worked around. The Node harness cannot paint a sheet at all:
`renderSheet()` mounts into `#sheet-root`, outside the `#screen` fragment the harness assembles, so setting
`state.sheet` and rendering answers "nothing painted" for **every** sheet, walked or not — a check built on
that answer would fail on a correct application. So the sheet half of the audit asserts population and
coverage in Node, and the behavioural proof is the camera's: `node tools/shot.cjs --measure
--only=resident-filter-sheet` prints `shows "Filter providers" [app/resident:results
sheet:providerFilters]`, 16 tap-target findings before the fix and 0 after, no console errors.
`node tools/falsify-camera-dialog-coverage.cjs` is 6 breaks, 6 caught, 0 not applied.

The page bytes moved three times today and each move was verified rather than assumed: `a4cf6fc3…` →
`badf8cd7…` (§98) → `70ae3782…` (§99's filter rows) → `3c78fdd…` (§99's icon ids), with `dist/` rebuilt,
the staged Android asset re-copied and `1.2-preview.39` rebuilt so that
`unzip -p … assets/Sukinnect.html | md5sum` answers the same hash as the source. It is still not installed:
`adb devices` is empty and Windows enumerates no handset node, so the phone is physically away — which makes
the two device legs in `DEVICE-PASS.md` (this build's install plus the ColorOS key route) genuinely owed
rather than merely unattempted. Both sheets' readings — the lock dialog's `rem`-sized PIN field and the
filter rows' 44px floor — are bench numbers until a handset confirms them, which is the standing rule about
pixels a phone multiplies.


**The widened walk found a second defect in the same sheet: a duplicated icon id.**
`probe-duplicate-ids.js` — the instrument written for the "`getElementById` answers with the first
match" class — reported one collision over 82 screens: `clip0_17007_17133` three times, inside the
`clock` glyph, a Figma export whose body carries both `clip-path="url(#…)"` and the definition. The
probe marked it `(unpainted)` because a `<clipPath>` paints nothing itself, and `formCollisions` was
empty, so no save could read the wrong field — but the document did hold three elements under one id,
which is the definition of the class. It had never surfaced because no walked screen drew the same
glyph three times until this sheet existed. `ic()` now gives each emission its own suffix and rewrites
the references, so the glyph keeps its clip and the ids stay unique; the collision count is 0 and a
page check answers `refs 3 · defs 3 · dangling 0`. The fix went into the helper that pastes the body,
not into the glyph (there are 43 of them) and not into the sensor, which was right.

The same derivation was tried for screens — every value of `state.view`, `state.tab` and
`state.adminScreen` — and is **recorded rather than built**: the two apparent gaps were both the
scanner asking for a name instead of the thing that produces it (`provider_detail` is reached five
times by `openProviderDetail()`, which also mounts the map; `verification_review` by the seven
`admin-review*` rows). A widening whose first output is two phantom findings is noise, not a net.

## 100. Four copies of one page stopped being a habit and became a check

The rebuild lives in four places: `Sukinnect-next.html`, the copy `dist/` publishes,
`Sukinnect-Android/app/src/main/assets/Sukinnect.html` that the shell loads, and the bundle inside the
built APK. Today the page changed twice, so each time the comparison was performed by hand — `md5sum`
across three files, then `unzip -p <apk> assets/Sukinnect.html | md5sum` for the fourth — and
`DEVICE-PASS.md` already instructs a reader to do exactly that. A check whose enforcement is "remember to
run it" is the §90 class in its purest form, so it is a tool now:

```
node tools/audit-build-bytes.cjs
```

It prints one row per read with its hash and `findings: N`, where N is the number of copies disagreeing
with the source, and it **refuses** (`NO CONCLUSION`, exit 1) rather than answering when an artifact could
not be read or fewer than four were compared. On this tree: four rows, every one of them
`3c78fddbeaeea01f66a00de78c44e034`. `probe-all.cjs` picked the audit up from its filename.

`node tools/falsify-build-bytes.cjs` is 4 breaks, 4 caught, 0 not applied, and the interesting two are not
the drift case (a byte appended to `dist/` is reported `DIFFER` with `findings: 1` and exit 1) but the two
absence breaks. The audit carries two independent guards — an unread artifact, and fewer than four
artifacts compared — and each is disabled *singly* against the same deleted staged asset, so the surviving
guard has to refuse on its own. Both do. That is the evidence the pair is load-bearing rather than
decorative, and it matters because a comparison tool almost never fails by answering wrongly: it fails by
skipping a row and printing a clean answer over three agreeing copies.

**What the tool still cannot see is the copy that matters most on a phone.** The installed build on the
vivo is `1.2-preview.38`, cut from `a4cf6fc3…`; every artifact on this machine is `3c78fdd…`. `unzip` can
read the APK but nothing can read the installed app's bundle from here, so the fifth copy is only
checkable by a handset — which is why `DEVICE-PASS.md`'s owed item is now stated as a byte pair
(`3c78fdd…` built, `a4cf6fc3…` installed) rather than as "the device may be behind". Reinstalling `.39`
and reading the lock dialog's field and the filter sheet's rows are the two things left on this thread
that no instrument on this machine can do.

## 101. Both handset legs got armed, and the arming measured three things with no phone attached

The thread's two remaining items are hardware, and the machine still enumerates no handset: `adb devices`
answers nothing across a cold server start and eight samples over 45 seconds, `adb mdns services` answers
nothing, Windows has **no PnP change in the last 24 hours**, no Android/WPD/MTP node, and no error or
unknown node — which is the trio that distinguishes "not plugged in" from "waiting for authorisation". A
missing driver or a refused RSA key would still enumerate a device. So the legs were armed instead of
skipped: each became a script whose instrument runs against a surface where the answer is already known.

**The first finding was the app's own identity, and it was the driver that was wrong.** The walk-9 driver
began with `PKG = 'com.sukinnect.proto'` typed into it. The real `applicationId` is `com.sukinnect.app` —
`app/build.gradle:12` and the build's own `output-metadata.json` both say so. A wrong package is not loud:
`dumpsys package com.sukinnect.proto` answers nothing, so the walk would have reached "INSTALL NOT PROVEN"
on a phone that had installed perfectly. The proof is now read from the metadata rather than written twice
(`versionCode 41 / versionName 1.2-preview.39`), it accepts **both** `dumpsys` spellings of each field
(`versionName:` and `versionName=`), and `--selftest` runs it against five synthetic answers — two good,
plus a stale code, a stale name and a missing package, each of which must be refused. 5 of 5.

**The second came out of a tree walk 6 left on disk.** `.scratch/docui.xml` is 177 nodes, every one of them
`com.google.android.documentsui`, and **not one carries `focused="true"`** — while two clickable rows are
named `Preview the file IMG_20261020_1859`, the owner's own photographs, at `[167,526]` and `[386,526]`.
That reframes the owed ColorOS question. It is not only "do keys work there": with nothing focused, the
first key *establishes* focus and a centre key activates whatever it lands on, which is exactly how walk 7
selected a real photograph on the other phone. The picker tool therefore sends **one key**, re-reads the
platform tree, and refuses `DPAD_CENTER` unless the focused row's name is the fixture it pushed —
`--guard-test` proves all three verdicts (nothing focused → refuse, that photograph → refuse, the fixture →
allow) and its tree parser is proved by running it over the saved ColorOS dump, which is where the two
photograph rows surfaced. The phone is not the first place any of this executes.

**The third caught the instrument before it could file a defect.** The walk's five page readings were run
on the bench through `node tools/shot.cjs --probe=@tools/device-leg-readers.js
--only=admin-lock-modal,resident-filter-sheet`, where the expected figures are known: the PIN field
computes **16px inside a 48px box** with `min-height:48px`, and the filter sheet paints **16 rows at
exactly 44px, none below the floor, at 15px type**. The first reachability reader called the sheet's last
row unreachable — it asked only whether the rect met the viewport and never whether an ancestor scrolls.
Corrected, the row answers `reachable:true` through `sheet-body` (833px of content in a 660px box), which is
what the eight-corner sweep had already implied by reporting 0 unreachable controls. On the phone that
wrong reader would have been recorded as an application defect on a screen the bench had already cleared.


**One more instrument lesson from the same minute, and it is the grep.** Two checks disagreed about these
files: `grep -c $'\r$' AGENTS.md` answers 4,950 and `grep -vc` then answers 0 — every line ends in CR, it
claims — while counting bytes over the same file answers **CRLF=0, LF-only=4,950**. Under Git Bash the pattern
or the file is translated, so grep cannot be used to ask a line-ending question here at all. The byte walk in
`.scratch/eol-bytes.cjs` is the instrument that answers it, and it says `AGENTS.md`, `CHANGES.md` and
`DEVICE-PASS.md` are LF while `README.md` and `Sukinnect-next.html` are CRLF. Worth naming because the damage
it could have done is exactly the one §"A SEED DATE IS A COUNTDOWN" records: a patcher that believed grep
would have written LF into a CRLF file, or, as here, believed the opposite and been *right by accident* —
both patchers chose their ending by looking for `\r\n` in the bytes themselves and so preserved each file's
convention. The check that is load-bearing is the one that reads bytes; the one that printed the confident
wrong answer is the one a future session would copy into a script.


**A third reading came from the matchers themselves, and it is the one that would have made the walk
dishonest rather than wrong.** `tapPainted` reached each control by searching `[onclick]` for the handler
string, and the lock dialog paints its header `×` and its **Unlock** button with the identical
`state.adminAccountModal=null; render();` — that string occurs **7 times** in the file, and in the
dialog the cross comes first in DOM order. So "tap Unlock, then read what happened" would have pressed
the cross, dismissed the same dialog by another route, and printed a clean result about a control that
was never tapped. The chooser now takes a visible text or an id selector as its third argument, reports
`how` it chose and `attrMatches`, and **refuses** when a handler-only search answers more than one node
and nothing was named. The same pass made the walk count its own residue in the key the instrument
runner already reads — `findings: N`, where a fixture left behind, a dump left behind, a screen not
signed out or an enabled reader each raise the number — and scoped that search to this walk's own names,
because the owner's `suki-*` file in `Download/` dated 2026-10-11 is not residue and a cleanup that
greps `/suki/` would delete something no instrument here is entitled to touch.

**Leg B got narrower without a phone, and the narrowing is the finding.** The same saved tree marks
**45 of its 177 nodes `focusable="true"`**, 21 of them clickable and named. So ColorOS's picker is not
structurally deaf to key events — a "this OEM refuses synthetic input" reading would have had nothing
focusable to land on, and it has plenty. What is still untested is the narrower claim: whether
`input keyevent` moves focus among those rows on that shell, and whether a centre key then activates a
document row rather than only the picker's chrome. Naming the residual precisely is what makes the leg
one reading rather than an afternoon of guessing: `node tools/device-picker-keys.cjs --dump` answers it
once the phone is on the bus.

**A correction to the paragraph above, before it is copied anywhere.** It calls `.scratch/docui.xml` the
tree "walk 6 left on disk" and draws the ColorOS conclusion from it. The filename is not the provenance:
a scan of all 34 saved dumps that carry a picker window or a focused node shows `docui.xml` and
`d2.xml`–`d8.xml` are all stamped **2026-10-22, 16:43–16:58**,
the afternoon walk 7 ran the key route on the **vivo**. Read as a sequence they are a better artifact than I
thought — the 177-node tree has no focused node and the five later trees `d2.xml`–`d6.xml` (16:47–16:56) each have exactly one node focused
inside `com.google.android.documentsui`, which independently corroborates that `input keyevent` moved focus
*on the phone where the key route already worked* — but they say nothing about ColorOS, whose picker has no
saved tree on this machine. So leg B's residual stands as written before this pass, and the "45 focusable
nodes" reading belongs to the vivo. The two-owner-photograph hazard is real and came from the vivo's grid,
which is exactly where walk 7 selected one. **A device was inferred from a filename; the mtime is what
identifies it**, and `focused="true"` counts across a whole directory take one command. The scan **is** now promoted, as
`tools/device-dump-provenance.cjs` — deliberately *not* under the `probe-`/`audit-` prefix, because
`probe-all.cjs` discovers those by filename and runs them against the application, while this tool reads
saved files; naming it `device-*` keeps it a sibling of `device-probe.cjs` and leaves the quoted **47
probes** true of the tree. It also corrects this row's own arithmetic: the focused trees are **five**
(`d2.xml`–`d6.xml`, 16:47–16:56), not four, which is what the tool prints.
**The proof round closed with every lookup the legs make executed on the bench** — `chooser()` copied
verbatim out of the driver into a camera probe, run over `admin-lock-modal`, `resident-filter-sheet`,
`concierge` and `resident-profile`. It confirmed the ambiguity rather than arguing it: `unlock` answers
**attrMatches=2** and chooses `by visible text Unlock`, so the walk presses the button it names instead
of the cross beside it; `lockButton` answers 1; `filterBtn` resolves by `#provider-filter-btn` at a
measured 44x44; and `photoControl` — the tap that raises the real picker — resolves by its visible text at
328x46 and answers **1** inside `#screen` too, which is the scope the picker tool searches. The
`removeControl` lookup could not be reached that way, because that button paints only once a photo is
held: it is verified from the source line that paints it (`removeConciergePhoto()` behind
`state.conciergePhotoAttached`) and stated as source-verified rather than measured. `resident-profile`
answered `NO CONCLUSION`, which is the right behaviour — a screen with no target must not print a pass.


**Running the guard on real trees found a false-allow in the guard.** Its rule was "the focused row is 
named for the fixture". Over the 18 saved picker trees, that rule would have allowed the centre press on 
`d2.xml`–`d6.xml`, where the single focused node is `documentsui:id/search_src_text` — an **EditText
containing the fixture name**, because walk 7 entered the file by name into the picker's search field and 
the document rows sat elsewhere in the tree. A press there searches; it does not select. The leg would have 
printed a pick that never happened, and nothing in the rule as written could tell that focus was on a 
widget rather than a row. `centerAllowed` now refuses editors and refuses when more than one node reports 
focus. `--guard-real` proves it against the artifacts: **18 refusals (5 edit-box, 13 unfocused) and exactly 
one ALLOW, a synthetic tree where the document row itself holds focus** — the allow-control is what keeps 
this a discriminator and not a blanket no. `findings: 0`, exit 0 on that shape, exit 1 otherwise.
Nothing on this machine can read the installed bundle, so `audit-build-bytes` still stops at four copies —
source, `dist/`, staged asset, APK — all `3c78fdd…`. The fifth copy is the phone, and reading it is what the
two armed scripts exist to do.

## 101b. The walk was executed for the first time, and its clean result was a lie

No handset came onto the bus, so the legs were run against something that is genuinely an Android device:
an AVD created from the `android-36 google_apis_playstore x86_64` image already in this SDK — **Android 16,
WebView 133.0.6943.137**, installed with the same `1.2-preview.39` the vivo is owed. This is not the vivo and
cannot close the vivo parity leg or the ColorOS leg; it is a real framework, so what it measures transfers.

**It measured the walk, not the app.** The install proof passed by reading the package back (`versionCode=41
/ versionName=1.2-preview.39`), and the multiplier reading came back `{"renderedOverSpecified":1,
"rootFont":"16px"}` — a genuine device reading at `font_scale 1.0`, which is the control value: factor 1 is
what the framework does when the user has not asked for larger text, and it is exactly the number the bench
cannot distinguish from a bug.

**Then the walk printed `findings: 0` while every one of its measurements had failed.** The app never left
its splash: `pidof` answered nothing, `device-probe` reported *"the WebView is not exposing an inspector"*,
and the readings that followed were fragments — `PIN field: }`, `results: SyntaxError: Unexpected token ';'`,
`tap Log Out row: NO LOGOUT CONTROL`. The residue check at the end counted leftovers, found none, and called
the leg clean. **A walk that measures nothing and reports nothing-wrong is worse than one that fails**, and
this one would have written a DEVICE-PASS row saying the PIN field had been read on a device.

Three fixes, each found only by executing:
1. **A liveness gate before any claim.** `liveness()` polls until the app owns a painted page that answers
   with a JSON object, and the walk aborts with `NO PAGE`, the foreground window, and its reading tally
   rather than continuing.
2. **Readings are counted, not trusted.** `requireJson` records each reading that actually parsed and marks
   the rest `NOT MEASURED` with the raw text; the verdict now includes *"the two surfaces this leg exists to
   measure were never measured"*. Re-run: exit **1**, `findings: 3`, `readings measured: 2` — honest.
3. **The state assignment loses to the splash timer.** `state.view='app'; state.role='admin'; render()` reads
   back as `view: login` on a cold-booted app, because the splash hands over to login on a timer *after* the
   assignment. The walk must wait for `view` to settle at `login`, assign, and then verify the `h1` names the
   screen it thinks it opened — which is the same rule the camera's SCREENS table encodes by calling the
   app's real entry points. Recorded as the next change to this driver, not fixed blind.

The AVD was created for this run and the emulator was started and stopped by this session; the owner's two
handsets were never touched, and `findings` now says so in numbers.

**One number the emulated device did produce, and it is the one §68 rests on:** with `font_scale` set to
1.35 on that Android 16 / WebView 133 frame, the page's own throwaway span answered
`{"factor":1.35,"rootFont":"21.6px"}` — the root computed **21.6px from a 16px declaration**, i.e. the
platform multiplied the used size **after** CSS resolved. At 1.0 the same reading answered factor 1, which is
the control that makes the first number meaningful rather than a tautology: the bench cannot tell those two
apart because `navFontScale()` is exactly 1 there, and `--font-scale` on the bench moves the root directly
instead of reproducing the multiplication. That is the mechanism §68 says the layout must absorb, now
measured on a framework rather than asserted from a phone that once disagreed.

**What it did not measure, stated plainly:** the admin PIN field and the sixteen filter rows were never
painted on this emulator — the app stayed on its splash through four navigation retries per screen, so both
readings are marked `NOT MEASURED` and the leg's verdict failed rather than passing quietly. So **the two
readings DEVICE-PASS owes remain owed on real handsets**: the vivo's `.39` install with its field and row
heights, and ColorOS's key route. An AVD settles a framework question; it cannot settle a hardware-parity
question, and it is not recorded as if it had.

**The atomic surfaces reader was written, bench-proven, and then refused by the frame — recorded as
three separate facts rather than one success.** To stop the walk straddling an app restart, both surfaces
are now read inside ONE page evaluation (`tools/device-leg-surfaces.js`: navigate, raise each layer
through the app's own handler, measure, clean up, return one object). On the bench it answers exactly the
known figures in a single call — PIN field **16px in a 48px box**, filter rows **16 at exactly 44px,
`below44: 0`, 15px type**, sheet title "Filter providers", last row reachable through `sheet-body` at
**833px of content in a 660px box**, and `afterCleanup` returning `sheet:null modal:null` so the read
leaves no layer open behind it. Sent to the emulated frame it came back
**`Runtime.evaluate timed out`**: that page cannot complete a multi-render read under the pressure this
laptop puts on software-rendered Android — the limit project memory recorded for an AVD before it was
tested, now tested on the instrument itself. So the two handset readings remain owed; what changed is that
the instrument for taking them is proven on a surface where the answer is known, and the emulator was
stopped with `font_scale` read back at 1.0.

One more lesson, about this very file: the first version of that paragraph was written through a
double-quoted `node -e`, and **backticks inside it were executed as commands**, so five spans — the
instrument path, `below44: 0`, `sheet-body`, `afterCleanup`, `Runtime.evaluate` — vanished from a
committed document and left it reading like a record with holes in it. Nothing was injected (the commands
errored), but a deleted span is worse than a wrong one because nothing looks broken. This repair was
written with the Write tool, where no shell ever sees a backtick — the rule this repository already states
and which I broke anyway.

## 102. The first device readings the walk ever produced, and a stale port forward that hid them

The frame was an AVD from this SDK's own `android-36/google_apis_playstore/x86_64` image — **Android 16, 
WebView 133.0.6943.137** — carrying the same `1.2-preview.39`, install proved by reading the package back. 
The first probe attempt said *"the WebView is not exposing an inspector"* while the app was running and 
`/proc/net/unix` plainly listed `webview_devtools_remote_1831`: the cause was a **stale `tcp:9222` forward 
left by an earlier run**, cleared by `adb forward --remove-all`. An instrument blaming the application for 
its own dead socket is the oldest move in this file, and it nearly ended the attempt.

Then the numbers, taken one surface per evaluation because the combined reader timed out: PIN field at the 
default **16px specified in a 48px box, `min-height:48px`, `meets44: true`, root 16px, viewport 393x851**; 
filter sheet at the default **16 rows, minH and maxH both 44px, `below44: 0`, 15px type**; filter sheet at 
**`font_scale 1.35`** → **16 rows, both heights 46px, `below44: 0`, type `20.25px`**. That last line is the 
one §68 has been asserting from a phone disagreeing with a bench: 15 × 1.35 = 20.25, the platform 
multiplied the used size after CSS resolved, and the `var(--tap)` floor **held and was exceeded by 
content** (44px became 46px) rather than being multiplied with the type — so a px floor behaves exactly as 
§39 needs on a real frame, while the *type* inside it does what §68 says. The sheet body's own room moved 
from **834 in 668** to **884 in 636**, which is why the row reachability check has to ask about the 
scroller and never about the viewport.

One reading the frame refused: the PIN field at 1.35 answered `Runtime.evaluate timed out` — that 
expression paints twice and software rendering could not finish it inside the WebView's evaluation limit. 
Recorded as refused, not as measured. **None of this is the vivo**: a framework answers mechanism questions, 
not parity questions about one handset's density or its WebView build, so the install-and-read leg on the 
physical phone and the ColorOS key route both stay owed. `font_scale` was set back to 1.0 and read back as 
1.0 before the emulator was stopped.

**Same day, re-attempted after the split.** The refused PIN reading was cut into two cheaper probes
(`tools/device-leg-pin-open.js` navigates and paints once, `tools/device-leg-pin-measure.js` touches no
layout at all). On a fresh boot **both halves then timed out even at the default `font_scale`**, with three
page targets each answering `ERR Runtime.evaluate timed out`. So the split pair's status is *refused by the
frame* — not answered, and not an application defect. The three readings recorded above stand because they
were taken on an earlier boot that did answer; this one would not. **The admin PIN field at 1.35 has still
never been measured on any Android target** — it exists only as a bench figure, and it stays a handset leg.
The emulator was stopped with `font_scale` read back at 1.0.

## 103. `.39` reached a real handset for the first time, and the page underneath it would not answer

The OPPO CPH2179 (`S4CUYTJB6HNNWC49`, Android 10, WebView **155.0.8059.46**) finally came onto the bus.
**The install leg is done on real hardware and proved the way this file insists on**: the package read
`versionCode=41 / versionName=1.2-preview.39` back from `dumpsys package` after `adb install -r -t`, where
before it read `40 / 1.2-preview.38`. That is the first `.39` ever to run on a phone, and the fifth copy in
`tools/audit-build-bytes.cjs` — the one only a device can report — is no longer hypothetical for this device.

**The page readings did not happen, and the walk said so instead of pretending.** `Runtime.evaluate` timed
out on everything, including `1+1`, while the app was `mCurrentFocus`, `mResumedActivity`, screen `Awake`.
The walk's own honesty layers did their job: `NO PAGE` after ten tries, `readings taken: 0, failed: 10`,
`findings: 1 — the leg could not be measured, which is NOT the same as measuring nothing wrong`, exit 1.

Two real defects were found and fixed on the way, both worth keeping regardless of this leg:
1. **`device-probe` relaunched the activity on every call.** A walk that asks five questions issued five
   `am start`s; each left a renderer reloading an 11,851-line page, so the next probe landed on a busy or
   dead target and the target count climbed (5 → 6 → 7) while nothing answered. It now asks the window
   manager first and leaves a running app alone — measured: `targets: 1`, and the single target is the right
   page (`file:///android_asset/Sukinnect.html?app=1`, title `Sukinnect — next (rebuild)`).
2. **A stale port binding is now visible instead of blamed on the app** (`attached: <socket> via tcp:<port>,
   targets: N`), and an inconclusive validation is reported as inconclusive.

What is left, stated as a symptom rather than a theory: with exactly one correct page target and the activity
resumed, the renderer still refuses every evaluation, and `dumpsys activity processes` shows a second
process record with `empty=true`. So the next diagnostic step on this device is a cold start *after* the
in-place upgrade (force-stop, wait, launch once, then probe) and checking for a pending JavaScript dialog,
not another change to the readers. The vivo leg and the ColorOS key route are still owed; the key route is
now actually reachable, because the phone it belongs to is on the bus.

## 104. Leg A closed on a real handset, after the bug that blocked it turned out to be mine

The OPPO CPH2179 came onto the bus at last (`S4CUYTJB6HNNWC49`, Android 10, WebView **155.0.8059.46**), took
`1.2-preview.39` (`versionCode=41` read back from the package, replacing `40 / .38`), and answered both
readings with **`findings: 0`**:

- **Admin PIN field, on the phone**: specified **`21.6px`**, measured factor **`1.35`**, glyph height
  **`29.2px` rendered**, box **`51.8px`** (`min-height:48px`, `tapFloorOk: true`), placeholder "Not checked in
  this prototype", label "PIN" — §98's field, read where a `rem` actually meets the platform.
- **Filter sheet, on the phone**: **16 rows, min and max height `46px`, `below44: 0`, type `20.25px`**, last
  row `reachable: true` through `sheet-body` (**884 in 392**), viewport **320x638** — the panel and scale
  DEVICE-PASS has been asserting from one photograph.
- Both dialogs opened by **real taps** on the painted control, and the `Unlock` tap reported
  **`2 handler match(es)`** resolved *by visible text* — the ambiguity found earlier, now proven on hardware.
- Walk ended signed out (`view: login`), no fixture and no dump left on the device.

**What stood between this and three hours of "the phone won't answer" was my own instrument, twice.**
`device-probe` had started sending an **`Origin` header**, and Chromium's DevTools answers that with
**HTTP 403** — while the old code threw the handshake status away, so a refused upgrade looked exactly like a
page that never evaluates. A raw CDP script with no `Origin` got `101` and answered `1` in milliseconds. The
second bug was in the walk: several calls passed **statements** into a wrapper that builds `(${expr})`, so the
navigation raised a `SyntaxError` nobody read and the app stayed on `login` — the readers then honestly said
"no field painted", which is the worst kind of true statement. Third: the Lock button sat at page `y=1196` of
a 638px viewport, so the "real tap" landed outside the screen; `tapPainted` now scrolls the node into view the
way §"a rect read in the breath after a Tab" demands (`scrollBehavior='auto'` + `scrollTop`, not
`scrollIntoView` alone).

**The lesson the instrument paid for:** a timeout is the *client's* sentence, not the device's. Report the
handshake status, report which node a tap chose, and wrap statements in functions — then a silent failure
becomes a named one. Also recorded so nobody re-files it: **TalkBack and the Accessibility Menu are enabled on
this phone by its owner**, so the walk prints that as a device-state note rather than counting it as residue —
this run turns nothing on. The three settings the diagnosis did touch (battery saver off, stay-awake on, an
idle-mode whitelist) were restored and read back: `low_power=1`, `stay_on_while_plugged_in=0`, whitelist removed.

**Still owed:** the **ColorOS key route** on this same phone — reachable now, with the guard proven. And the
vivo, which is not on the bus: its `.39` install and the same two readings on a 450-CSS-px panel at
`font_scale 1.35` remain open as a parity question, not as a mechanism question, which §104 settled.

**Correction to §104's last paragraph, and the reason it matters.** It claimed the diagnosis settings were
"restored and read back: `low_power=1`". At the moment it was written, `low_power` read **0** — the same
command that had failed to switch battery saver *off* (`settings put global low_power …`) also failed to
switch it back *on*, silently and with exit 0. What actually works on this ColorOS build is
`cmd power set-mode 1`, after which the setting reads 1 and stays there. So the state now is verified:
`low_power=1`, `stay_on_while_plugged_in=0`, `com.sukinnect.app` removed from the idle whitelist
(`Removed: com.sukinnect.app`), `font_scale` 1.35 as found, and the app installed at `versionCode=41`.
**How to apply:** on this OEM, battery saver is not a `settings put` — write it with `cmd power set-mode`, and
read the value back rather than trusting the exit code, which reports success for a write the platform ignores.

## 104b. The ColorOS key route was attempted on its own phone, and the page channel — not the picker — is what failed

The fixture stage worked exactly as designed: a 70-byte PNG pushed to `Download/`, `touch`ed, a scan
broadcast, and **the MediaStore row proved present** (`_id=37819`,
`/storage/emulated/0/Download/suki-leg9-test.png`) — the walk-5 lesson that a bare `adb push` indexes
nothing, applied. Then the picker could not be opened **from the app**, because the app's own page stopped
answering: `targets` read 2 then 3, both candidates timed out on `state.view`, and `mCurrentFocus` was
`StatusBar` rather than the activity. `--open` therefore printed the rect it could not obtain and
**refused to tap a guess**, which is the behaviour it was written to have.

So leg B's verdict is unchanged and now narrower: ColorOS's *key handling* is still untested, because the
route never reached the picker — the obstacle is getting the app onto a live, single, answerable DevTools
target on this device. Two candidate causes, both testable next session and neither a claim: multiple page
targets per socket on WebView 155.0.8059.46, and a renderer that stops servicing evaluations once several
connections have been opened and destroyed against it — which is also how leg A went dark for an hour before
the `Origin` header was found.

The phone was left as found, verified by reading it rather than by memory: `suki-leg9*` files **0**,
MediaStore rows naming the fixture **0**, no `window_dump.xml`, **all adb forwards removed**, battery saver
back on (`low_power=1`), stay-awake `0`, app removed from the idle whitelist, `font_scale` **1.35** as found,
`1.2-preview.39` installed, and the app signed out (`view: login`) by leg A's own final check.

## 105. Leg B got much further than §104b, and the answer is a dialog, not a key

The page channel came back once the *process* was restarted rather than relaunched on top of itself: the old
instance had **7 stale DevTools targets on one socket** and every evaluate timed out, while a clean
force-stop → start gave `targets: 1`, a real `101` upgrade and an answer — `{"v":"login"}` in milliseconds.
So the §104b mystery ("the app stopped answering") is a lifecycle fact about WebView's inspector, not a
device quirk: **attach to a fresh process, not to a resumed one.** Two more of my own bugs were cleared on
the way — `--open` passed statements into an `(${expr})` wrapper, and it navigated to `tab='home'` when the
photo control lives on `tab='concierge'`, which is why the control read MISSING twice and the tool correctly
refused to tap a rect it could not obtain.

Then the route went further than it ever had: a real tap on the concierge's own photo button raised
**`com.android.internal.app.ChooserActivity`**, its tree named exactly one target (**"Files"**,
`[59,1165][174,1280]`), and tapping it produced **a ColorOS permission dialog** — `USE APP FOR 5 MINUTES`
and `OK`. A tap at that button's own centre **did nothing**, and `uiautomator` answered
`ERROR: null root node returned by UiTestAutomationBridge`. **That is leg B's answer for today**: ColorOS
interposes a permission dialog that refuses synthetic input and hides its own tree, so the key route never
reached DocumentsUI at all. The claim "ColorOS refuses keys on document rows" is neither confirmed nor
refuted — it is still one step away, behind a decision that belongs to the person holding the phone.

Backed out with hardware keys (the dialog took `KEYCODE_BACK` even though it ignored `input tap`, which is
itself a small answer: this window refuses pointer injection and accepts key injection). Verified as found:
app foreground at `view: app` with `conciergePhotoAttached: false`, **0** fixture files, **0** MediaStore
rows, no dumps on the device, all forwards removed, `low_power=1`, `font_scale` 1.35, `1.2-preview.39`.

Also on the record, because it cost four empty dumps: `uiautomator dump /sdcard/x.xml` issued from this
shell gets its path rewritten by MSYS into a Windows directory — the dump "succeeds" and the file is not on
the phone. Use the tool (`--dump`, which passes argv directly) or set `MSYS_NO_PATHCONV=1`.

## 106. The window §105 called a ColorOS permission dialog is Android's App Pause, and the phone says so

Later the same day, leg B was walked again on the same OPPO (`S4CUYTJB6HNNWC49`, `1.2-preview.39`, a fresh
app process, `targets: 1`, every page read answering in milliseconds — the lifecycle fix from §105 holding).
The fixture pushed and indexed (`MediaStore _id=37820`), one real tap on the concierge's own photo button
raised `ChooserActivity`, its tree again named exactly one target ("Files", `[59,1165][174,1280]`), one tap on
that row raised the same refusing window, the same `null root node`, the same dead `input tap`. §105 recorded
that as "a ColorOS permission dialog" and drew the conclusion "behind a decision that belongs to the person
holding the phone". Both halves deserve better than a screenshot: the window was asked directly.

`dumpsys window` names it `android/com.android.internal.app.SuspendedAppActivity`. `dumpsys activity
activities` shows it resumed with `mCallingUid=1000`. And `dumpsys package packages` answers the question the
dialog itself was hiding:

```
Package [com.google.android.documentsui]:
  suspended=true  suspendingPackage=com.google.android.apps.wellbeing
  dialogInfo=SuspendDialogInfo: { mDialogMessage = "‎%1$s and other distracting apps are paused right now" }
```

`grep -c "suspended=true"` over that dump returns **35**. This is **Digital Wellbeing Focus Mode**, a stock
Android 10 feature, switched on across 35 packages on the owner's phone. It is not ColorOS, not a permission
prompt, and not a refusal to hand a document to a synthetic pointer.

**The mechanism explains both symptoms at once, which is why it was worth chasing.** `dumpsys window windows`
for that window reads `mOwnerUid=1000 mShowToOwnerOnly=true`. `uiautomator` runs as `shell` (uid 2000), and an
owner-only window is not in its view — hence `ERROR: null root node returned by UiTestAutomationBridge`.
`input tap` is injected as `shell` too and is not delivered to it — hence the dead button at the correct
centre. `KEYCODE_BACK` still dismissed it, because Back is routed to the *focused* window by the input
dispatcher and is not an injected gesture to a specific widget; §105 read that pair as "this OEM treats
pointer injection and key injection as different permissions", when the real rule is simpler and general:
**a window marked `mShowToOwnerOnly=true` owned by another UID is invisible to every shell-side reader and
deaf to shell-side pointers, on any Android.** The right move when a dump comes back null is `dumpsys window`
and `dumpsys package packages`, not a smaller tap.

**Consequence for the leg, stated narrowly.** No key route can reach DocumentsUI while Focus Mode is on, so
whether ColorOS's picker accepts `input keyevent` on a document row remains untested — the residual is
exactly what §105 said, but the blocker is now named at the right layer. `pm unsuspend
com.google.android.documentsui` is a real command on this device and would have cleared it in one line; it
was deliberately **not** run, because it undoes a wellbeing choice the owner made and re-suspending from adb
cannot restore the Focus Mode schedule that suspended all 35. What unblocks the leg is one deliberate action
on the phone (turn Focus Mode off, or the dialog's own five-minute option), which is the owner's call, not a
step to be automated from a bench. What was *not* retracted: the four synthetic-tap refusals measured on the
picker's own rows in earlier walks, when the picker was reachable on this device. This pass settled only why
it is not reachable today.

Backed out with two `KEYCODE_BACK` presses (dialog → chooser → app). Verified as found, by reading: app
foreground at `com.sukinnect.app/com.sukinnect.app.MainActivity`, `conciergePhotoAttached: false`, **0**
fixture files in `/sdcard/Download`, **0** MediaStore rows naming the fixture, no `window_dump.xml` left, all
forwards removed. One device-state difference was found rather than made and is left alone:
`enabled_accessibility_services` now names
`com.google.android.marvin.talkback/...AccessibilityMenuService` on this phone, where the walks before it
read `null`. No leg of this project set it, and a reader that finds an accessibility service on a handset
should treat tap semantics as changed (select-then-activate) until proven otherwise.

## 107. Handset walk 10: ColorOS's picker does accept the key route, and leg B closes with the reading reproduced

The owner lifted Focus Mode, and the phone confirmed it before anything was attempted: `suspended=false` on
`com.google.android.documentsui` and **0** packages suspended, against 35 an hour earlier. Then the leg ran.

`--fixture` pushed and indexed the one-pixel PNG (`MediaStore _id=37821`, `date_modified` stamped by the
device). One real tap on the concierge's own photo button raised the chooser; its tree named the single target
("Files", `[59,1165][174,1280]`); one tap there raised **`com.android.documentsui/picker.PickActivity`** — the
first ColorOS picker tree this project has ever held, since `--dump` reported **177 nodes, 177 inside the
picker, 42 the platform marks focusable, 21 of those clickable and named**. That count is the structural half
of the owed question: a key route *can* reach a document row on this shell.

**One `TAB` answered the leg.** Focus moved to `suki-leg9-test.png, 70 B, 8:25 AM @ [54,750][246,942]` — the
fixture row, pushed seconds earlier. The guard read the live tree, allowed the press by name
(`centre allowed: focus is on the fixture row`), `DPAD_CENTER` was sent, the picker disappeared from the tree,
and the app's page answered `{"attached":true,"name":"suki-leg9-test.png","blobSrcs":0}`. **So ColorOS accepts
`input keyevent` on a document row, and "a thumb is still owed" is retired for the second phone.** The claim
that survived is narrower and still true: four injected *taps* across two layouts refused a document row on
this shell while accepting a tap on its own chrome. Pointer and key are different routes here, and the key
route works.

**Then the leg failed to reproduce, and that reading is the more useful one.** Second attempt: `TAB` landed
focus on a *different* node for the same file — `Preview the file suki-leg9-test.png @ [138,750][246,858]`, the
grid tile's preview icon — the guard allowed the press (its name contains the fixture), `DPAD_CENTER` was sent,
the picker stayed foreground, and the page answered `attached:false`. **A row and its preview icon are two
focusable nodes with two centre semantics: the row returns the document, the icon does not.** "The focused
node's name is my fixture" is therefore necessary but not sufficient. `DPAD_UP` moved focus from the icon to
the row, the press returned the file again, and the route is reproduced twice with the difference named rather
than smoothed over. This is what the one-key-at-a-time design was for: a blind `TAB,TAB,DPAD_DOWN,DPAD_CENTER`
sequence would have landed on whichever node the grid happened to focus and reported a pick that did not occur.

**§75's privacy claim is now measured on a real pick, both halves.** A new stage,
`node tools/device-picker-keys.cjs --verify-pick`, reads the painted screen, every `img` source, the painted
markup and the stored snapshot together: `nameOnScreen:true`, `imgCount:0`, `bytesBearingImgSrcs:0`,
`bytesInPaintedMarkup:0` — and then, after `persist()` was called *while the photo was attached*, the snapshot
itself was read: `snapshotBytes 47774`, `fixtureNamedInSnapshot:false`, `blobOrDataInSnapshot:0`. The picture
came off the phone's own storage into a person's session and left as a name in memory. Removal was done
through the screen's own control (`{"clicked":true,"found":1,"label":"Remove photo"}`) and re-read as
`attached:false, nameOnScreen:false`.

**The first `findings: 0` from that stage was half-vacuous, and the stage now says so.** On the first run
`storageKeys` was `[]`: no snapshot existed, because nothing had been written since the cold start. The check
read `storedMentionsFixture:false` and called it clean — but that field is false both when the snapshot holds
no mention **and when there is no snapshot**, which is a check that cannot fail looking exactly like one that
passed. The stage now prints a `LIMIT` line whenever the store is empty, and the storage half of the claim is
only quoted from the run where `sukinnect.snapshot.v1` existed (47 KB) and did not name the file. The DOM
storage itself was proven to work on the shell — `persist()` returned `true` and wrote the key — so the empty
store was a real state, not a disabled capability, which is the difference between a finding and an absence.

**The stage proves its own refusal.** Run with nothing attached it reports
`FINDING the fixture name is not painted on the screen, so this run measured no pick` and exits **1** (read
with `code=$?` immediately after the command, because `echo -n "…"` in between reports the *echo's* status —
the trap this file already records for pipes).

One tool bug cost a dead end and is fixed: the usage line and `reportTree`'s own advice both say `--key=NAME`
while the parser only accepted `--key NAME`, so a reader who obeyed the printed instruction fell through to
the usage footer. Both forms are accepted now. `probe-all.cjs` discovers no `device-*` file and no falsifier
family needles any device tool (`grep -l "device-picker\|device-legs\|device-probe" tools/falsify-*.cjs`
answers nothing), so the quoted probe and family totals are unchanged by this pass.

Device verified as left, by reading: **0** fixture files in `/sdcard/Download`, **0** MediaStore rows naming the
fixture, no `window_dump.xml`, **0** forwards, app foreground at `MainActivity` signed out through its own
controls (`view: login`), `font_scale` 1.35, `low_power=1`, `stay_on_while_plugged_in=0`, build
`versionCode=41 / 1.2-preview.39`. Left as found and *not* touched: the Focus Mode the owner turned off stays
off, and `enabled_accessibility_services` still names a TalkBack/`AccessibilityMenuService`.

**What the handset pass still owes is one item, and it is a phone, not a question:** the same two readings
(leg A's PIN field and filter rows; leg B's key route) on the vivo 1906's ~450-CSS-px panel. The mechanism is
measured on real Android and on ColorOS; what is unmeasured is that particular panel.

## 108. A hand-numbered document is a shape, so the gate now checks the shape

Two mistakes in the same file inside one day, and the second one was only caught because the diff did not
balance. §107 was appended by anchoring on the closing sentence of §105 — a string that had been the end of the
file when §106 was written, and was not any more, because §106 had been appended there first. The result read
105, 107, 106. Moving §107 back to the end then produced a second defect: the splice ate the blank line above
the §106 heading, and a markdown heading with no blank line above it is not a heading — it renders as the tail
of the previous paragraph. That one was visible only because the diff reported **54 insertions against 55
deletions** for what was supposed to be a pure move. A move that loses a line is not a move.

So the gate checks it, in `hygiene`: three checks, **563 → 566**.
`the change log really has sections to judge` is the population floor (at least 60 numbered sections — a scan
that matched none would report both rules below it satisfied, which is this repository's named class of a check
that cannot fail looking exactly like one that passed);
`the change log numbers its sections in ascending order` names the pair that broke
(`§108 then §107 at line 6812`);
`every change-log section heading opens on a blank line` names the line and the section (`line 6757 (§108)`).

Proven by mutation on the real file, not by reading the green line: eat the blank line above one heading and
rename a section so the order descends, and both checks FAIL with those two reasons while the floor still
passes (107 sections are still there) and the gate exits 1. Restored with `git checkout -- CHANGES.md` and
re-run: **all 566 checks passed**, `git status` showing only the intended `tools/verify.cjs` edit.

The aggregate was not re-run, and the reason is a read rather than an argument:
`for f in $(grep -l "verify\.cjs" tools/falsify-*.cjs); do grep -qE "readFileSync\([^)]*verify" $f; done`
matches **no** family — every one of them *executes* the gate and prints its total, none reads its bytes. A
family that parses `all (\d+) checks passed` for a baseline therefore reports a bigger number rather than a
failure, which was confirmed on the one family that uses the total as its own control:
`node tools/falsify-register-identity.cjs` → **4 of 4 breaks caught, 0 not applied, 0 missed**, `control
unmutated gate: 566 checks passed`, `cleanup app restored: true`.

The rule for the next append to a numbered document: anchor at the end of the file, or anchor on the thing you
are appending after — never on a sentence that a previous append may have moved. And after any block move, ask
the diff whether insertions and deletions balance; a pure relocation that does not balance is a pure relocation
that deleted something.

## 109. Handset walk 11: the vivo agrees with the OPPO, and the driver had to repair two of its own defects first

The vivo 1906 came back on the bus (`80d20768`, Android 11 / SDK 30, WebView `155.0.8059.43`) running
`versionCode=40 / 1.2-preview.38`. `node tools/device-legs.cjs --scale=1.35` installed the current artifact and
proved it the only way this project accepts — read `versionCode=41 / versionName=1.2-preview.39` back off
`dumpsys package`, not off the file name — then took both owed surfaces on that panel. **Verdict: `findings: 0`.**

The page reported its own geometry first: `innerWidth 450`, `innerHeight 889`, `devicePixelRatio 1.6` — the
number Windows and `dumpsys` only hint at, and the reason the leg existed. At the default scale the admin
**Lock Admin Session** PIN field measures **specified `16px`, factor 1, glyph height `16px`, box `48px`,
`min-height:48px`, `tapFloorOk: true`**, and the **Filter providers** sheet measures **16 rows at
`minH 44 / maxH 44`, `below44: 0`, type `15px`**, with the last row at `top 888 / bottom 932` in an `889`
viewport — `inViewportNow: false`, `reachable: true` through `sheet-body` (`833 in 707`). Those are the bench
figures, on a phone, unchanged.

At the phone's own `font_scale 1.35` the platform did what §68 says it does and nothing on the bench can show:
the throwaway-span multiplier read **1.35**, the root computed **21.6px**, and the same field became
**specified `21.6px`, factor `1.35`, rendered ≈`29.2px`, box `51.4px`**, still `min-height:48px`, still
`tapFloorOk: true`. The filter rows went to **`minH 45.5`, type `20.25px` = 15 × 1.35, `below44: 0`**. Beside
the OPPO's 320-CSS-px readings from walk 9 — box `51.8`, rows `46`, glyphs `29.2`, factor `1.35`, type
`20.25px` — the two phones agree to within half a pixel, and both keep the floor. That closes the last hardware
item the handset pass owed, and it retires the DEVICE-PASS sentence that said the `rem` reading at 1.35 "has
never been taken on any Android target — bench only": it has now been taken on two.

**The first attempt at this run measured nothing, and both causes were the driver.** Not the phone: the frame
answered `targets: 1` and returned the multiplier in milliseconds, then reported
`admin hub at scale: SyntaxError: Unexpected token ';'`. Two payloads in the scale stage still passed a list of
statements into the expression wrapper `device-probe` evaluates — the defect `gotoScreen` had already been
written to avoid, duplicated in a second place instead of routed through it. So the hub was never navigated,
`tap Lock Admin Session` honestly reported MISSING, and the reader honestly reported NO PIN FIELD PAINTED: three
clean-looking refusals stacked on one syntax error. The same bug sat in the `close sheet` step. Both navigations
now go through `gotoScreen`, which wraps statements in an IIFE and verifies the destination's own `<h1>`
(`admin hub at 1.35: on screen — h1="Admin account"`).

**The second defect was the vivo behaving exactly like the OPPO had.** After the scale stage's force-stop and
relaunch, the walk's later half degenerated: every read answered `}` and `Runtime.evaluate` timed out against
**3 page targets on one socket** — the reload-leaves-a-target-behind pattern, which on a budget handset costs
the whole back half of a pass. `gotoScreen` polled and retried, and polling a saturated frame does not clear it;
what worked on the OPPO was a cold restart, so the retry loop now does one on its third attempt. Proven in the
same log rather than assumed: `results reached?: NOT ANSWERED` three times, then
**`cold restart: the frame has not answered twice — force-stop, and the target count must fall back to 1`**, then
`results: on screen — h1="Find Services"` and every reading after it answered. The rule generalises past this
driver: **a stale frame is repaired by restarting it, not by waiting longer on it.**

Device left as found and checked by reading the phone rather than trusting the walk's own summary:
`versionName=1.2-preview.39`, `font_scale` **1.0** (the scale stage's exit hook restored it and read it back),
`enabled_accessibility_services` null, no `suki*` file in `/sdcard/Download`, no `window_dump.xml`, **0**
forwards, app at `view: login` after its own Log Out row and the confirm dialog's own button. No application
bytes changed: `git diff --quiet -- Sukinnect-next.html` answers clean, so the gate stays
**all 566 checks passed** from the run that printed it, and `node tools/audit-build-bytes.cjs` still reports
`findings: 0` with all four copies at `3c78fdd…`. No falsifier family reads `tools/device-legs.cjs`
(`grep -l "device-legs" tools/falsify-*.cjs` answers nothing), so the family and probe totals are unchanged.

**The handset pass has now run eleven times, across two physical phones and an emulated frame, and owes
nothing.** What remains on this branch is a person's decision, not a measurement: PR #9 stays OPEN and the merge
button is a human's.

## 110. The deployment is a fifth copy of the page, and it had never been read from outside

`tools/audit-build-bytes.cjs` proves four copies agree — source, `dist/`, the staged Android asset, the bundle
inside the APK. All four are on this machine, so the invariant stops at the edge of this machine, and nothing in
`tools/` had ever asked what a reviewer receives. Asked today, it turned out that the four can agree perfectly
**while the live site runs a different build.**

`node tools/deploy-check.cjs` fetched the public page and searched the repository for its bytes. The live `/` is
791,713 bytes as served, 791,504 after Netlify's injected HUD script is stripped, and it **matches commit
`3c73bfef` — "fix: count days as calendar days, after running all 62 screens in another timezone", dated
2026-10-15**. That commit is on `feat/domain-kernel` and is **not an ancestor of `origin/main`**; this branch's
tip is 131 commits later and the local page is 853,782 bytes. So the public URL has been frozen for nine days
while the pass that closed eleven handset walks, §82's Insights rewrite, §83's clock, the seed-date conversion,
§73's nav fit and §96's dialog labelling all landed.

Six markers say so individually — each one is a string only the shipped code carries, and each is asserted to
exist in the *local* artifact before it is allowed to accuse the deployment:
`networkAttentionList` (§82), `STEP_STAMPS` (§83), `isoDayAgo` (the seed-date convention), `fitNavLabels` and
`navFontScale` (§73's rendered-px lesson), `labelTopLayer` (§96). Verdict: `findings: 7` — six fixes not
deployed plus the byte disagreement — exit 1.

**What did not change is the thing that motivated the built subset in the first place.** Every repository path a
stranger could guess still answers 404 on the live host: `/AGENTS.md`, `/CHANGES.md`, `/README.md`,
`/netlify.toml`, `/.gitignore`, `/schema/sukinnect.reference.sql`, `/tools/verify.cjs`. Under the old
`publish = "."` those were all readable; the claim that the build fixes it is now **verified against a deploy**
rather than inferred from the build script, and `/` returning 200 through the redirect to `/Sukinnect-next.html`
shows the redirect rule is live too.

**The tool's own first run produced seven fabricated leaks, and that is the lesson to keep.** Its status checks
went through `curl -o /dev/null`, and `/dev/null` does not resolve when `curl.exe` is spawned outside MSYS — every
request returned status `0`. The code treated "not 404" as a leak, so seven unanswered paths printed as seven
leaks and `findings: 15` appeared on a deployment answering 404 to all of them. This repository has written the
same sentence many times in one direction — *a silent instrument must not report a clean result* — and this is
the mirror image, which is worse: **silence read as a defect manufactures findings that do not exist**, and a
false alarm about a privacy claim is the fastest way to teach a reader to distrust the check that would have
caught a real one. Fixed twice over: status `0` now means *not answered*, and the network calls use Node's own
`fetch` rather than a shell binary whose path handling depends on which POSIX layer invoked it. A partial scan
refuses — `NO CONCLUSION … the leak verdict is not computed from a partial scan` — and `--file=` states its own
blind spot instead of printing a zero leak count.

Proven offline before any network was trusted: `node tools/deploy-check.cjs --selftest` runs 8 cases — the HUD
line is stripped, an untouched page is byte-for-byte unchanged, 404/410 are clean and 200/301 are not, status 0
is neither clean nor a leak, a real 5xx is judged rather than refused, **every marker exists in the local
artifact** (the positive control: a marker that matches nothing locally can accuse nothing), and a synthetic
partial artifact reports 10 of 14 fixes missing by name. The refusal path was then exercised for real against a
non-existent host: `NO CONCLUSION … An unreachable host must never print a clean line`, exit 1.

Named `deploy-check.cjs` on purpose, not `probe-*`/`audit-*`: `tools/probe-all.cjs` discovers those prefixes by
filename, and an instrument that needs the network cannot live inside the total that every offline run quotes —
one outage would move the probe count. The device tools set that precedent, and `node tools/probe-all.cjs` still
discovers no `deploy-*` file, so the quoted 47-probe and 49-family totals are untouched by this pass.

Nothing was deployed and no setting was changed: reading a public URL is not an action against it. **What moves
the live site is a deploy, and which branch production tracks is a Netlify setting nobody here has read** — the
live bytes say a feature-branch commit, so "production = main" is now known to be false rather than merely
untested. That is the owner's to decide, and it is stated as an open question rather than quietly fixed.

## 111. Two rulings about the deployment, and the sentence that was almost wrong: merging is not promoting

Asked what to do about the nine-day-old live build and which page the public root should serve, the owner answered:
**they will merge PR #9 themselves**, and **the public root keeps serving the rebuild, as it does now**. The second
answer settles something the repository had been describing as an accident: `netlify.toml` redirects `/` to
`/Sukinnect-next.html`, and until today the docs framed the reviewer's entry point as `Sukinnect.html` while the
deployed URL quietly disagreed. That disagreement is now a ruling rather than a drift, and AGENTS.md records it as
one — the deployed surface is a demo of the rebuild, and the shipped file stays the shipped file.

**The distinction that nearly got lost in my own framing.** While preparing to say "merging is what moves the site"
I ran the diff and found what the merge actually carries: `git diff --name-only origin/main...HEAD` → **80 files**,
and **none of them is `Sukinnect.html`**. Merging therefore changes `main` — the rebuild file, the tool suite, the
docs — and it may trigger a redeploy depending on the Netlify branch setting. It does **not** promote: the shipped
prototype remains byte-for-byte what `origin/main` holds today, proved by `git diff --quiet origin/main --
Sukinnect.html`, and promotion is a separate change nobody has greenlit. Describing the merge as promotion would
have been the oldest defect in this repository's vocabulary — it is the same slide that let "merged" stand in for
"ships" back when PRs #2–#7 landed.

So what the owner's merge does and does not do, stated where they will read it:

- **Does**: puts the rebuild, the 82-screen camera, the 49 mutant families and the handset records on `main`.
- **Does probably**: refresh the public site, *if* production tracks `main` — which is unknown and now known to be
  unknown, because the live bytes currently match a `feat/domain-kernel` commit that is not an ancestor of `main`.
- **Does not**: touch `Sukinnect.html`, the APK, or `dist/`. The Android bundle keeps its own copy until someone
  re-syncs it, and the four-copy invariant (`tools/audit-build-bytes.cjs`) still has to hold afterwards.
- **Afterwards**: `node tools/deploy-check.cjs` is the instrument that says whether the six undeployed fixes went
  live. It exits 1 until they do, so "did the deploy happen?" is a command rather than a memory.

Nothing changed in the application for this section: gate **all 566 checks passed**, the four on-disk copies are
identical at `3c78fdd…`, `Sukinnect.html` is identical to `origin/main`. The PR was re-checked before the click:
`mergeable=MERGEABLE`, `mergeStateStatus=CLEAN`, Netlify's redirect check passing and the deploy preview live.
One note for whoever reads this next: `gh pr diff 9 --name-only` failed with a forcibly-closed TCP connection and
printed a single line, which a careless reader would have taken for "one file changed". **The repository is the
authority on its own contents; a hosted API is a convenience** — the same rule that says to read an installed build
off the device rather than off a note.

## 112. PR #9 is merged; the shipped file is still untouched; and the local clock nearly wrote a false history

The owner merged at **2026-10-24T03:08:08Z**; `main` moved to the merge commit **`a14c4fa`** and `git merge-base
--is-ancestor HEAD origin/main` confirms this branch's tip is inside it. Everything below was read after the click,
because a claim about what a repository holds is worth exactly the command that printed it.

- `git diff --quiet origin/main HEAD -- Sukinnect-next.html` → **identical**. `main` now carries the rebuild at
  853,782 bytes, hash `3c78fdd…`, and `git ls-tree -r --name-only origin/main -- tools | wc -l` → **144** files:
  the gate, the camera, the sweep, the mutant families, the handset drivers.
- `git diff --quiet origin/main -- Sukinnect.html` → **clean**. And the file is unchanged in the instrument's own
  units: **4,707 lines by `node tools/measure.cjs Sukinnect.html`**, the figure §31 has always quoted. (This
  sentence first said 4,706, because it was read off `wc -l`, which counts newline *characters* and so reports one
  fewer for a file whose last line is unterminated — the same quantity §31 names as "4,706 CRLF pairs". Two
  conventions, one digit apart, and only one of them is what `measure.cjs` prints. **Quote the instrument, not the
  shell builtin**, which is this file's oldest rule arriving from the smallest possible place.)
  **Merging is not
  promoting.** `main` now holds the rebuild and the shipped prototype side by side, which is precisely the state
  every floor claim in AGENTS.md has been describing — proven for one file, unproven for the other, and the merge
  changed which file a reviewer must deliberately choose, not what either one is.
- Census: several present-tense sentences were falsified the moment the button was pressed — DEVICE-PASS's "the
  owner's ruling is to **refresh** PR #9 rather than merge it … and stays OPEN" and AGENTS's "**Merging PR #9 is
  theirs to click**". Both are corrected with dated notes rather than rewritten, per the house rule for a superseded
  row: the ruling was real when it was written, and what changed is its date.

**The deployment did not follow, and the clock nearly turned that into a false history.** `node
tools/deploy-check.cjs` still reports the public `/` matching commit `3c73bfef` (2026-10-15), six fixes undeployed,
`findings: 7`. The first reading looked like a **19-hour** gap between the merge and an unchanged site, and the
sentence about to be written was "production does not auto-deploy on push to main". It was the machine: this
shell's `date -u` is ~19 hours ahead of the servers, while the Netlify `Date:` header (`03:10:43`, `03:13:21`,
`03:16:23` across three checks) and GitHub's own `mergedAt` said only 2–8 minutes had passed. So the honest
statement is narrower than the one nearly recorded: **eight minutes after a merge, production had not refreshed —
which is consistent with a queued build and equally consistent with production not tracking `main`, and this
repository cannot read the difference.** The rule generalises: **any elapsed-time claim needs a
server-authoritative clock** — a response header or an API timestamp, never this box's — because a wrong local
offset can make a five-minute-old event look a day old, and this machine sits in exactly the timezone where that
happens. It is the same family as the seed-date and Manila-midnight defects, arriving from the operator's clock
rather than the application's.

No application bytes changed in this pass, so the gate stays **all 566 checks passed** from the run that printed
it and the four on-disk copies remain identical at `3c78fdd…`. The next person to touch the deployment question
should start from `node tools/deploy-check.cjs` rather than from anything written here: it exits 1 until the live
bytes match, names the missing fixes, and refuses with `NO CONCLUSION` when the host does not answer.

## 113. `main` was checked out separately for the first time, and it both passed and exposed a defect in my own tool

Every instrument in this repository has only ever run against the working directory it was written in. Nothing had
tested the proposition that a reviewer following the README — `git lfs install`, clone, open the file — receives a
tree that is self-contained. So `git worktree add --detach .scratch/wt-main origin/main` made a real second
checkout of the merged commit, and the same commands were run from inside it.

**It passed, and the interesting part is what had to be true for it to pass.** `node tools/verify.cjs` in that
directory printed **all 566 checks passed**, which is only possible if the Git LFS fonts actually smudged: the
typography checks read `fonts/fonts.css` from disk and assert that every `url()` resolves to a file that exists
**and is not a placeholder stub**, and an un-smudged checkout hands back 130-byte pointer text. The fresh tree
carries 25,928 / 25,828 / 24,896 / 25,736-byte Atkinson WOFF2 files (plus the Fraunces and Plus Jakarta faces the
shipped file still needs) and `head -c 60` on one returns binary, not `version https://git-lfs...`. The camera
listed the same **82 screens**, and `node tools/measure.cjs` reported the shape §31 quotes — 11,851 lines, one
`:root`, 95 tokens with three never reached (`--s-1 --s-8 --info`). Then `git worktree remove` and `git worktree
list` answering one row: the scratch checkout is gone, not left beside the tree.

**The test found a defect in tools, in the only place it could: a second directory.** Three instruments pinned
`C:/Users/ADMIN/OneDrive/Desktop/Sukinnect/Suki-proto/` into a constant — `deploy-check.cjs` (**written by me an
hour earlier**), `device-legs.cjs` and `device-picker-keys.cjs`. A tool with the author's home directory inside it
cannot be run by anyone else, which is a sharp irony for the one whose whole job is to report what other people
receive. All three now derive their root from `path.join(__dirname, '..')`, the way `harness.cjs` has always
done it — and `harness.cjs` is the reason the gate worked from the worktree at all. Proven rather than asserted:
`deploy-check.cjs --selftest` still passes its 8 cases, `device-legs.cjs --selftest` its 5 install-proof cases
including both `dumpsys` spellings, and `device-picker-keys.cjs --guard-real` still reads the 18 saved picker
trees and answers **allows 1, edit-box refusals 5, other refusals 13, findings: 0** — a guard whose fixture name
comes from a file path is only as portable as that path.

**And my own number in §112 was wrong, by one, for a reason worth writing down.** I wrote that `Sukinnect.html` on
`main` is "still 4,706 lines", read off `git show … | wc -l`. `wc -l` counts newline *characters*, so a file whose
last line is unterminated reports one fewer line than the file has. The instrument —
`node tools/measure.cjs Sukinnect.html` — says **4,707**, which is what §31 has always quoted, and §31's other
sentence about "4,706 CRLF pairs" is a *different* quantity that happens to land on the same digit. Three places
carried my figure; all three are corrected to the instrument and its command. The rule is the one this file keeps
rediscovering — **quote the tool, not the shell builtin** — and the trap is sharpest when the wrong answer and the
right one differ by exactly one, because nothing looks broken.

No application bytes changed. Gate **all 566 checks passed** in both trees; four on-disk copies identical at
`3c78fdd…`; `Sukinnect.html` identical to `origin/main`.

## 114. A ruling, recorded so the tripwire is not mistaken for a task

Asked what to do about production still serving the 2026-10-15 build fifteen minutes after the merge, the owner
ruled: **leave it stale.** So §113's and §112's `findings: 7` from `node tools/deploy-check.cjs` is now an
**accepted standing state**, not an open defect, and it must not be "fixed" by a redeploy nobody asked for. AGENTS.md
carries the ruling next to the section that found the drift.

What that changes in practice is the meaning of the red line, not the line itself. `deploy-check` keeps exiting 1
and keeps naming the six undeployed fixes, because its value is now **drift detection**: if the live page ever moves
in a way nobody chose — a partial build, an asset that stops resolving, a repo path that suddenly answers 200 — the
same command goes red over a change that was not made on purpose, and that is the difference between a stale site
and a broken one. The Netlify branch and auto-deploy settings stay unread from this repository, which is now a
**known and accepted blind spot** rather than an oversight; the nine-day drift happened precisely because nobody had
written down that nobody knew.

Two companion rulings from the same exchange, so the record is complete: **the public root serving
`Sukinnect-next.html` is intended** (a decision about what a reviewer is shown, not `netlify.toml` drift), and
**post-merge work lands through its own pull request** rather than being swept onto `main` — which is why this
section arrives on a branch with a PR of its own rather than as a push.

No application bytes changed and no deploy was triggered for this section. Gate **all 566 checks passed**; four
on-disk copies identical at `3c78fdd…`; `Sukinnect.html` identical to `origin/main` at 4,707 lines by
`node tools/measure.cjs Sukinnect.html`.

## 115. I reused a merged commit's subject, the audit called that unique, and the check was the defect

§114's commit (**`560bf66`**) carries the same subject as `c32f845` — "docs: two deployment rulings, and the
sentence that was almost wrong — merging is not promoting" — which is the fourth time this session's author has
written a message while the previous one was still on screen, and the first time it happened against a commit that
had already merged. The body describes §114 correctly; the subject describes §111. That is the worse variant this
file has already named: **a reader scanning `git log` is handed a true sentence about the wrong commit.**

**The audit gave a green line, and the green line was the defect.** `node tools/audit-commit-subjects.cjs` printed
"0 duplicated subjects over 3 distinct ones — every subject in this range is unique" minutes after the merge. Its
default population was `origin/main..HEAD` — literally *"what is not yet on main"* — so a collision with a commit
that had just entered `main` was outside its scope by construction. The check existed precisely for this failure
mode, ran, and could not see it. Widening the default to the branch's recent history (`-n 120 HEAD`, merged commits
included) finds **four** duplicated subjects over 116 distinct ones, including mine, and an explicit range is still
accepted for anyone who wants the narrow question.

**Then its own falsifier refused, which is the part that worked.** `tools/falsify-commit-subjects.cjs` recomputed
the expected set over `origin/main..HEAD` (3 commits, 0 duplicates) while the widened tool read 120 and reported 4,
and the family hit its control condition and printed **ABORT — the unbroken audit does not agree with the shell, so
nothing below this line measures anything**. That abort is the family doing its job: it would not grade a rule
against a population it no longer shared with the tool. Fixing the family to derive its comparison from the scope
the tool *declares* ("N commits read") rather than a range hard-coded a second time makes the two independent
methods on one population; a floor of 60 commits then condemns a scope that shrinks, because a family that mirrors
a shrunk population would forgive exactly the bug being planted. Two breaks came out of that:

- re-rooting the default history onto `origin/main` → **CAUGHT**, set 3 vs 4;
- shrinking the default count to 3 → **CAUGHT**, set 0 vs 4, count 3/120, the floor condemning it.

`node tools/falsify-commit-subjects.cjs` now reads **5 of 5 breaks caught, 0 not applied, 0 missed**, control
line "scope 120 commits (floor 60): ok, set matches shell: yes, duplicates seen: 4", and
`cleanup audit restored byte-for-byte: true`. The older three breaks (dedup never-true, predicate widened to
everything, empty-range refusal forced dead) still catch, so nothing was traded away for the two new ones.

**Left as it is, on purpose.** `560bf66` is already pushed, and the fix would be an amend plus a force-push over a
commit that is on a shared branch — history rewriting is the owner's call and was not taken. The duplicate stands
in the log with both bodies describing their own diffs, which is the honest residue; what changed is that the next
one is visible to a command rather than to a reader who happens to notice.

Gate **all 566 checks passed**; no application bytes changed; four on-disk copies identical at `3c78fdd…`;
`Sukinnect.html` identical to `origin/main` at 4,707 lines by `node tools/measure.cjs Sukinnect.html`.

## 116. 248 mutants caught, and the paragraph that proved its own rule while writing itself

`node tools/falsify-all.cjs` was re-run to close the gap §115 left open — the tree held 248 breaks while the
last full pass had printed 247, because `falsify-commit-subjects` grew from 4 to 5 when its audit's population was
widened. The run finished **49 families, 248 applied, 248 caught, 0 not applied, 0 missed**, no flagged row, the
app hash back to `3c78fdd…` and `git status` empty afterwards, so every family restored what it mutated.

The total was not taken on the runner's word. Its log was summed a second time with `awk` over the printed rows —
**rows=49 applied=248 caught=248 not_applied=0 missed=0** — and the family set was cross-checked against the tree
with `comm` between `ls tools/falsify-*.cjs` and the names the log printed, which answered that **no family is
missing from the pass**. A summary line and a sum of its own rows are two different measurements; only agreeing
with both makes the number a fact. That is the same discipline §115 used on the audit, arriving one level up.

**Then the paragraph wrote itself badly, in exactly the way it exists to forbid.** Re-deriving the totals meant
re-typing the per-family table, and the draft listed 46 of 49 families from memory: two numbers wrong
(`camera-surfaces` is 3 breaks, not 5; `control-reach` is 3, not 4) and three families silently dropped
(`credential-pair`, `empty-queue`, `modal-stacking`, 3 breaks each). Diffing the claim list against the log with
`comm` is what found it — the same tool-and-second-derivation trick, now aimed at my own sentence. The table has
been **deleted** rather than corrected: AGENTS.md now names the six families large enough to carry a class
(`identity-fallbacks` 24, `profile-honesty` 11, `saved-claims` 10, `verification-records` 10,
`insights-records` 7, `layer-modality` 7) and points at the command for everything else. A table that must be
re-typed to stay true will be false the next time someone is careful and the time after that; the log is the
artifact, and this file's oldest rule — a figure kept by hand in prose is the next figure that is wrong — applies
to a paragraph *about* figures too.

Nothing in the application changed: gate **all 566 checks passed**, four on-disk copies identical at `3c78fdd…`,
`Sukinnect.html` identical to `origin/main` at 4,707 lines. One lane remains measurable and it is armed but
unwalked: the edge-to-edge check on the android-36 frame (task #68), which could not start while the aggregate held
the machine and now can.

## 117. The edge-to-edge leg was walked on the only API 35+ target here, and that target cannot answer

Everything else the handset pass owed is closed, so the last open measurement was the one DEVICE-PASS:362 says
stays open **on both phones** — and it says so for the right reason: `targetSdk 36` forces edge-to-edge only at
**API 35+**, while the OPPO is API 29 and the vivo API 30, where the shell takes its deprecated
`getSystemWindowInset*` fallback. Measuring there would have described a path the shipped build no longer uses.
The android-36 AVD `suki_leg9` is the only target on this machine at or above 35, so the leg was armed
(`tools/device-edge-leg.cjs`, §113/§116 lineage), its judge proven by 16 offline cases, and then walked.

**It did not reach a verdict, and it never claimed one.** The frame is too starved to service a WebView
inspector: boot took 90–110 s, and `dumpsys window` came back dominated by ANR reports for
`com.google.android.inputmethod.latin`, `com.google.android.gms` and `com.android.systemui`, with PSI
`some avg10=93.34` on CPU and a per-process breakdown of `100% TOTAL: 15% user + 82% kernel`. Every
`Runtime.evaluate` timed out across four retries, and the probe's own relaunches re-created the stale-target
pile (2 → 5 targets on one socket) that §105 diagnosed on the OPPO. So the leg printed
`findings: 2` — "the WebView surface height was never read" and "the page never answered with geometry" — and
exited 1. **That is the guard earning its keep on a real target: the arithmetic would have been trivially
satisfiable with a zero, and the instrument refused to produce one.**

Three things the attempt did establish, none of them from the app:
- `output-metadata.json` names its key **`outputFile`**, not `outputFileName`; the first version built a path
  ending `/debug/undefined` and was caught by its own existence check rather than installing something wrong.
- **API 36's `dumpsys window` does not print the rectangles this parser expected.** It says
  `mStatusBar=Window{… StatusBar}`, `mNavigationBar=Window{… Taskbar}` and `mHasBottomNavigationBar=true`, so
  a regex looking for a status-bar line followed by two bracketed coordinate pairs silently yields "no bars" —
  the false clean in the exact shape §116 warns about. The tool now asserts bar *presence* from window
  references and refuses when it can read none, rather than guessing sizes.
- **`uiautomator dump` on this AVD answers `ERROR: null root node returned by UiTestAutomationBridge` even with
  our own activity foreground** — the same bridge that refused the owner-only pause dialog on the OPPO, refusing
  here for a different reason, and both are reader limits, not statements about the app. It is also the likely
  cause of the first run's `Application Not Responding: system` that swallowed focus and would not accept
  `KEYCODE_BACK`, which needed a cold frame restart. The rewritten leg does not call `uiautomator` at all.

**What would close this lane, stated as an ask rather than pretended away:** a handset at API 35 or above —
neither phone that has been attached qualifies — or the same AVD on a machine that is not also running a desktop
session (`-gpu host`, dedicated cores). Until then the claim in the operating docs is **stated, not measured**:
`MainActivity.applySystemBarInsets()` is the code that would pad the WebView, and no API 35+ target has ever
confirmed it does. That is the same treatment the owner chose for the shipped-file gap in §31 — name the blind
spot, do not fabricate the reading.

The frame was shut down with `adb emu kill`, forwards removed, no devices left on the bus, no node processes
running, and the working tree carries only the intended tool edit.

## 118. Three boots, two GPU backends, one answer: this machine cannot host an API 36 frame

The leg was retried after the first starvation report rather than accepted on one sample, and the retry changed the flags and not the outcome. Boot two: `-gpu swift_shader_indirect`, 110 s, ANRs in `inputmethod.latin`, `gms` and `com.android.systemui`. Boot three: `-gpu host -cores 4 -accel on`, which the launcher log reported straight back as
`GPU mode control feature flag 'ForceSwiftshader' is set` — the host backend is not actually available here — and 120 s later the ANR had moved to `com.google.android.apps.nexuslauncher`. The last run’s log carries four consecutive focus lines reading `Application Not Responding: com.google.android.apps.nexuslauncher` and no `ANR in` dump at all — the earlier run’s `dumpsys window` is where the two `ANR in` reports (inputmethod.latin, gms) were, and the systemui ANR appeared as a focus window rather than a dump. `Runtime.evaluate` timed out on every one of four retries in each of the three attempts. Quoted this way because the first draft of this paragraph said “six `ANR in` lines in that final log”, and `grep -c` answered 0: a number read off a different file than the sentence names is still a fabricated number.

So the block is evidenced rather than assumed, in both directions. The instrument was fixed on the way (the View surface is now read with Node's own `fetch` over a forward the tool makes itself, after spawning `curl` from `execFileSync` produced an empty body and a
`surface NOT READ` on a frame that had answered a moment earlier — the same defect §110 records for `deploy-check.cjs`, re-committed within an hour, which is the argument for why the fix belongs in a rule and not in memory), and the section now runs under an async
wrapper so that refusal path is reachable at all. 16 selftest cases still pass, the tool still refuses below API 35 before installing, and it refused here rather than turning two unread inputs into a pass.

**What would settle the edge-to-edge question, concretely:** any handset at API 35+ — the two that have been attached are API 29 and API 30 and take the deprecated fallback, so they cannot answer it — or this AVD on a machine that is not also running a desktop
session. The claim stays stated and unmeasured, and it is now stated as *attempted on three boots with these numbers*, not as an unexplored gap.

## 119. The starver had a name in a config file: `hw.gpu.enabled=no`, `hw.cpu.ncore=2` — and fixing both still could not answer

§118 stopped at “the emulator reports `ForceSwiftshader`”, which is a symptom with a source. Asked where,
`~/.android/avd/suki_leg9.avd/config.ini` turned out to have been created with **`hw.gpu.enabled=no`** and
**`hw.cpu.ncore=2`**, so every `-gpu host` argument was overridden before it took effect. That is the same
shape as every other “the platform refuses” finding in this file: a configuration nobody had read, wearing the
costume of a policy.

Changed it and re-ran. With **four cores**, boot got *faster* — 100 s against 110–120 s — and the leg failed
identically: `com.android.systemui` ANR’d and held focus across four consecutive reads, every
`Runtime.evaluate` timed out, and `device-edge-leg.cjs` again printed its `findings` naming the two inputs it
never got and exited 1. So the count is now **five boots, two core counts, two requested GPU backends**, and the
conclusion is about this machine rather than about the attempt: it cannot host an API 35+ target that answers
while also running a desktop session.

**Machine state deliberately left half-changed, and therefore written down.** `hw.cpu.ncore=4` and
`hw.gpu.enabled=yes` stay (they are strictly better and cost nothing); `hw.gpu.mode` is reverted from `host`
back to `auto`, because `host` was never honoured and leaving it there makes the config assert something the
frame does not do. A device-side or machine-side edit that nobody records is what turns the next session’s
instrument into a haunted one — the same reason `DEVICE-PASS` exists for the Android shell that git will never
show.

**What can actually close the edge-to-edge item, in order of honesty:**
1. **A handset at API 35 or above.** Neither attached phone qualifies (OPPO API 29, vivo API 30), and both take
   the deprecated `getSystemWindowInset*` fallback, which is not the code path shipping at `targetSdk 36`. This
   is the only route that measures the real thing.
2. **A lighter image on this machine** — `google_apis` instead of `google_apis_playstore`, with a bigger RAM
   allocation. Plausibly enough to stop the system-server ANRs. It costs a ~1 GB download and a new AVD, so it
   needs an explicit yes rather than being assumed.
3. **Accept it as stated-not-measured**, which is where it stands now: `applySystemBarInsets()` pads the WebView
   in code, and no API 35+ target has ever confirmed the result on screen. That is the same treatment the owner
   ruled for the shipped-file blind spot — name it, do not fabricate the reading.

No application bytes changed; gate **all 566 checks passed**; frame killed, no `qemu` process, nothing on the
USB bus, forwards cleared.

## 120. The API 36 frame finally answered, and what it answered with is a defect: the shell's inset padding delivered zero

§119 closed with "five boots, two core counts, two requested GPU backends" and no reading. There is now a reading,
and the frame was never the whole obstacle: **the leg was relaunching and re-attaching on every retry**, and each
relaunch landed while `com.android.systemui`'s ANR dialog owned focus, so every `Runtime.evaluate` timed out. Left
alone for sixty seconds after a cold start, the same socket answers. That is the same defect
`reference-android-handset-automation-limits` records for the bench — a probe that relaunches per call — arriving on
an emulator, and it was found by trying the read once instead of four times.

**Measured on the android-36 AVD at its native phone skin** (`wm size` 1080x2340, `dpr 2.75` → 393x851 CSS px, the
vivo's panel size; boot 147 s at `-memory 4096 -cores 4`):

| reading | value |
|---|---|
| `innerHeight` / `screen.height` / `visualViewport.height` | **851 / 851 / 851.3** |
| painted `.bottomnav` | top **777.5**, bottom **851.3**, height 73.7 |
| `body` and `#app` `padding-bottom` | **0px**, and no `--safe-bottom` token exists |
| status bar and gesture pill | both drawn **over** the app |

The screenshot settles what the numbers imply: the clock and the status icons are painted **on top of the
resident's greeting line** at the top, and the gesture pill sits **inside the bottom navigation row** at the bottom.
So the two halves of the question get opposite answers, and both are now measured rather than assumed:

1. **Edge-to-edge is in effect at API 36.** The WebView surface spans the whole display — `innerHeight` equals
   `screen.height`, which is exactly what it would not do if the window were still being shortened by the bars.
   `targetSdk 36` forcing it at API 35+ is confirmed on a framework that actually has the rule, which is the claim
   `DEVICE-PASS` item 4 and item 6 could previously only assert from the manifest.
2. **`applySystemBarInsets()` compensates for nothing.** `MainActivity.java:163` sets a listener on the WebView and
   calls `v.setPadding(left, top, right, bottom)`; on this frame the padding is zero on every edge. The likely
   cause, stated as a hypothesis and not as a finding: with the default `decorFitsSystemWindows(true)` the content
   view consumes the insets before a child view's listener sees them, so the callback runs and hands the WebView
   four zeros. The fix is to opt the window out (`WindowCompat.setDecorFitsSystemWindows(getWindow(), false)`) and
   return `WindowInsets.CONSUMED` — **not applied yet**, because the shell is untracked and a rebuild, reinstall and
   re-read is the next action. This section is written before that so the measurement survives it.

**One candidate cause was tested and falsified on the same frame, twenty minutes later.** The first hypothesis was
an ordering bug — `setOnApplyWindowInsetsListener` does not replay insets to a listener installed after the initial
dispatch — so `view.requestApplyInsets()` was added after the listener, `:app:assembleDebug` rebuilt in 1m50s, the
APK reinstalled (`Success`), the app cold-started, and the same read was taken. **It moved nothing**: `innerHeight
851`, `screen.height 851`, `.bottomnav` bottom `851.3`, padding `0px` — byte-identical to the table above. The patch
was then reverted rather than left in, because a no-op carrying a comment that names a cause is worse than no patch:
it teaches the next reader that the cause is settled. What survives is the narrowed claim — the listener either is
not being reached or is being handed zeros by the dispatch chain, which points at the window's
`decorFitsSystemWindows` state rather than at the call order — and the discipline: **a fix that produces an
identical reading is a falsified hypothesis, not a partial success.**

**Three instrument facts that outlive this leg.** `adb root` is refused on a `google_apis_playstore` image
(`adbd cannot run as root in production builds`), so a wedged `systemui` cannot be recovered from the bench at all —
only a reboot, or a `google_apis` image. A `-skin 480x854` override makes the frame boot with the launcher focused
and answers the same shape (311 CSS px against a 311 px screen), but a skin override is not a phone: the reading
above was taken at the AVD's own 1080x2340 and the smaller one is kept only as the reproduction that showed the
frame could answer. And the socket listed **five page targets for one WebView** — every reload leaves one behind —
so the reader attaches to the newest, and the screenshot is what proves the target it read is the one being
composited. Without that picture, "the app is on resident home with its nav at the bottom edge" was a sentence about
a page nobody was looking at.

**What this does not settle:** a physical API 35+ handset's density, its OEM bar heights, and whether a ColorOS or
Funtouch shell reports the insets differently. This is a framework reading on Android 16, which is the thing the leg
asked; the handset-parity caveat in `reference-avd-as-leg-target` still applies to anything about a specific phone.
No application bytes changed. Gate: **all 566 checks passed** before this section.

## 121. The listener was right and the padding was a no-op: `WebView` ignores its own padding, and the sensor called the fix "untestable"

§120 left a defect with two candidate causes and a reverted patch. Both candidates have now been tested on the same
android-36 frame, and **both were wrong about where the zeros came from** — which is why the instrument, not the
guess, got the next edit.

**The decisive reading was a log line, not another screenshot.** `android.util.Log.i("SukiInsets", …)` inside the
listener answered in one boot: `top=136 bottom=66 left=0 right=0 sdk=36`, twenty-one dispatches. So the listener
*runs*, and it is handed real, correct insets. The padding call it makes — `v.setPadding(0, 136, 0, 66)` on the
WebView — is what does nothing: **a WebView lays its page out at the full view size and ignores its own padding**, so
`innerHeight` stayed 851 CSS px = 2340 device px = the whole screen. Retargeting the same listener at the content
view (`getWindow().getDecorView().findViewById(android.R.id.content)`) moved the numbers immediately: surface **2138px
of 2340**, `innerHeight` **778** (was 851), slack **202px** — 136 + 66, exactly the two bars the listener had
reported. The debug line was then removed and the build re-made without it, so the shipping shell carries the fix
and not the probe.

**The sensor read the working fix as a frame that could not answer.** With the surface inset, `judge()` took its
existing branch — *the window is already inset by the framework, so this frame cannot test the shell padding
question* — and printed `UNTESTABLE` with `findings: 0`. That branch was written when nothing could produce an inset
surface except a framework that shortens the window; at API 35+ edge-to-edge is **forced**, so an inset surface can
only have come from the shell. The rule now splits on the SDK the leg already reads: `sdk >= 35` and inset → the
pass, naming the pixels; below 35, or with the SDK unread → the refusal, still. Four selftest cases pin it (20 run,
0 failing), including the one that matters most: **an unread `sdk` reads as the refusal, never as the pass**, so the
branch cannot go quiet by losing an input. The verdict sentence was also re-worded — it said "the shell padded the
WebView", which is the mechanism this section exists to disprove.

**The instrument defect behind §120 was bigger than the leg.** `device-edge-leg.cjs` asked the page through
`tools/device-probe.cjs`, which launches the activity on every call — so each of its four retries began by bouncing
the app off an ANR dialog (systemui's, then the launcher's), and every `Runtime.evaluate` timed out. That is what
five boots had been reported as. The leg now makes one CDP attach of its own to the **newest** page target and
evaluates over that socket: `cdp /json: 1 target(s), read the newest page target: true`, and the page answered on
the first attempt. The surface height and the page geometry now come from the same target list at the same moment,
instead of from two instruments that could disagree about which page they were looking at.

**The shell change, written out because git will never show it** (`MainActivity.java`, untracked by the owner's
standing decision — see §65 for why a fix recorded on one machine only is a fix the next rebuild re-breaks):

```java
// was: applySystemBarInsets(web);
// A WebView ignores its own padding: the listener ran with real insets (136/66 at sdk 36) and innerHeight
// never moved. Pad the content view, which lays the WebView out inside the bars.
applySystemBarInsets(getWindow().getDecorView().findViewById(android.R.id.content));
```

and inside `applySystemBarInsets`, before the listener:

```java
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
    getWindow().setDecorFitsSystemWindows(false);
}
view.requestApplyInsets();
```

`setDecorFitsSystemWindows(false)` and `requestApplyInsets()` each changed nothing on their own — §120 falsified the
call-order hypothesis and this section falsifies the two together on the WebView — and they stay because the first is
what makes the window's state honest at API 35+ and the second guarantees a dispatch after the listener is installed.
Rebuild: `./gradlew --offline --no-daemon :app:assembleDebug` → BUILD SUCCESSFUL, installed with `adb install -r -t`,
proved by the leg's own package read (`1.2-preview.39 / versionCode 41`).

**What is still not settled:** this is a framework reading on Android 16, not a physical API 35+ handset — no such
device has been on this bus (OPPO API 29, vivo API 30). The bar heights here are the emulator's, and a ColorOS or
Funtouch shell may report different insets or draw its own gesture area. The claim that survives is the narrow one:
**at an API level that forces edge-to-edge, the shell's compensation now produces a 202px inset that the page honours,
and it does so because the padding moved from the WebView to the content view.**

## 122. The compatibility floor is a WebView, not a `minSdkVersion` — and the only breaking feature above it was `inset:0`

Asked to make the app hold on both low-end and high-end Android, with no API 35+ device on the bus, the tempting
answer is the number in `app/build.gradle`: **`minSdk 24`**, Android 7 from 2016. That number describes the *shell*.
This application is a page inside a WebView, and the WebView updates through Play independently of the OS — so an
Android 7 handset with a 2024 WebView is fine, and a 2020 Go handset whose WebView froze at 77 is not, and
`minSdk` says nothing about either. The real floor is a property of the CSS and JS the file actually uses, so it is
now read from there.

`node tools/audit-compat-floor.cjs` carries a table of 17 features with the Chromium version that first honoured
each, and prints **two numbers, because the one people quote is the wrong one**:

- **raw floor — Chromium 108**, from the dynamic viewport units. Harmless: both uses are written
  `min-height:100vh; min-height:100dvh;`, so an old engine drops the second line and keeps the first.
- **breaking floor — none** (it was **88** before this section). Restricted to features whose drop removes geometry
  rather than cosmetics, which is the distinction that decides whether a device can be below the number.

What it found, and what was done:

| feature | version | uses | verdict |
|---|---|---|---|
| `inset` shorthand | 87 | 6 | **breaking** — a scrim with only `inset:0` has no box, so it cannot dim or catch the tap-to-close |
| `:where()` focus ring | 88 | 1 | breaking by shape, benign in fact — the UA ring still paints |
| flexbox `gap` | 84 | 191 | benign — items touch, padding still spaces |
| `min()/max()/clamp()` | 79 | 5 | benign — `:root font-size` falls back to the UA default |
| `dvh/svh/lvh` | 108 | 2 | benign **only** because a `vh` fallback precedes each |

All six `inset:0` uses became explicit `top/right/bottom/left`, which is what took the breaking floor from 88 to
none. The `:where()` rule was not rewritten — zero specificity is the reason it exists — and is instead excused
**in the application, beside the rule**, as `/* compat-exception: :is() / :where() — … */`. The audit reads its
exceptions from the source rather than maintaining a list beside it, refuses an exception naming a feature that is
absent (the excuse outliving the rule), and refuses one whose reason is too short to say what degrades and where
that is checked. Comments are stripped before the feature scan, so a sentence *about* `:has()` is not a use of it;
the exception text itself is read from the raw source, because the declaration **is** a comment.

**`node tools/falsify-compat-floor.cjs` — 7 breaks, 7 caught, 0 not applied**, and three of the seven were the
family's own bugs before they were evidence:

- The fallback probe tested for the string `vh`, which occurs inside `dvh`. Every use therefore read `guarded` and
  the tool could not have observed an unguarded one at any cost. Caught only because the break that deletes the
  fallback printed MISSED — a check that cannot fail looks exactly like a check that passes, and this is the fourth
  time that sentence has had to be written.
- One break shortened "a reason" by replacing one sentence of a three-line comment, so the reason stayed long and the
  tool was right to stay quiet. The break was wrong, not the rule.
- And a multi-line anchor written with `\n` matched **0×** in this CRLF checkout, which the family now normalises
  before it counts — otherwise a future break reports NOT APPLIED while the summary still prints healthy.

**The same CSS rewrite orphaned a needle in a family that was not being run.** Re-running the four families whose
target is the check I had to widen, `falsify-modal-stacking` printed `0 of 0 mutants caught; file restored.` and
**exited 0** — its three needles all contained `inset:0`, so every one missed and the family tested nothing while
looking like a pass. The aggregate would have caught it, because `falsify-all.cjs` already treats `applied === 0` as
trouble, but the aggregate costs ~53 minutes and a family run alone is what a person actually does after editing one
check. So the refusal now lives in the family too (`NO CONCLUSION: no needle matched the file`), the needles are
re-pointed at the new spelling, and it reads **3 of 3** again. The general shape: `process.exit(caught === applied ?
0 : 1)` is satisfied by `0 === 0`, and any summary line that compares two counts must say what an empty pair of
counts means — this is the fifth time this repository has written down "a check that cannot fail looks exactly like a
check that passes", and the first time it was a *count of checks*.

**The gate caught the conversion, not just the code.** `every full-screen layer root carries the convention the
keyboard walk reads` finds layer roots by matching the CSS spelling `position:fixed; inset:0`; converting the inline
one dropped its population from 5 roots to 4 and the floor refused. The detector, not the application, was stale —
and a root-finder that quietly under-counts is the exact failure that check exists to prevent, so it now matches
either spelling. Verified both ways on the file as it stands: old pattern 4, new pattern 5, all five carrying
`data-layer`.

**The low-end leg is armed rather than owed.** `tools/device-edge-leg.cjs` used to exit before installing on
anything below API 35, which made the question unanswerable on both handsets that exist here. It now prints the
scope — below API 35 the framework may inset the window itself, so an inset cannot be credited to the shell — and
judges the half that holds at every level: **does the page paint under a system bar**. Selftests 20 → 23, including
one case from §121 **rewritten rather than deleted**, because the owner's decision changed the rule it encoded and a
silently-dropped assertion is how coverage disappears.

Measured after all of it: **8 of 8 phone corners clean** over the 82 screens the walk counts, and **all 566 gate
checks passed**. Because the page changed, its four copies were re-made rather than left to drift — `dist/`, the
staged Android asset and the APK bundle all read `bac09020…` now, which is what
`node tools/audit-build-bytes.cjs` prints as `findings: 0` after a rebuild; the `3c78fdd…` quoted in §119–§121 is
the same file at those dates, not a disagreement. What is still owed is one reading, not a decision: attach the vivo
or the OPPO and `node tools/device-edge-leg.cjs` answers the API 29/30 branch that today's shell change touched and no
instrument has yet seen run.

## 123. A break can decay into an equivalent one without any code changing — the repository's history moved under it

The aggregate was re-run for §122 (the page, `verify.cjs`, `falsify-all.cjs` and `falsify-modal-stacking.cjs` had all
changed, and a family that is not re-run after its target moves is the failure this file has named repeatedly). It
found a survivor nobody had touched today: **`commit-subjects` applied 5, caught 4, missed 1** — the break that
re-roots the audit's default walk onto `origin/main`.

Read before being deleted, as usual, and the reading was surprising: the mutation still applies, the guard it
represents is still needed, and the break is still *correct as written* — it simply no longer shrinks anything. Its
needle was `['-n', N, 'HEAD']` → `['-n', N, 'origin/main']`, written when the branch ran far ahead of `main` and
`origin/main..HEAD` was the three-commit population that let a reused subject through. **PR #10 has since been
merged**, so `origin/main` is now one commit behind `HEAD`, and walking 120 commits back from either rev lands on
essentially the same 120. The mutant became equivalent by history, not by edit, and the only durable thing that
decays a mutation test is a merge.

So the break was re-pointed at the defect the audit's own header records rather than at a rev: it now defaults
`RANGE` to `'origin/main..HEAD'`, which is the actual narrow population, and `SCOPE_FLOOR` condemns it —
`5 of 5 breaks caught, 0 not applied, 0 missed`, audit restored byte-for-byte, the failing row reading
`set 0 vs 5, count 1/120`. The equivalent-mutant column already exists in this file's vocabulary (§"identity
fallbacks", "reputation"), and every one of those was a mutation the *code* had absorbed. This is the first one the
*branch* absorbed, and it generalises to every break whose premise is a distance in history: **a mutation test that
depends on how far the branch is from `main` is a test that expires the next time someone merges.**

Consequence for the aggregate's own numbers: the run in progress reports `commit-subjects 5 / 4 / 0 / 1`, and that
row is the **pre-fix** reading. Re-run alone after the re-point it is 5 of 5, so the suite figure quoted for this
pass carries one survivor that is known-stale in exactly this sense — stated here rather than smoothed over, because
"re-run until green is not a fix" is the rule this section is standing on.

## 124. Re-measured on the bytes that shipped: the same 202px, and a verdict line that named the wrong box

§122 changed the page after §121 measured it, so the inset reading was, by this file's own standard, a measurement
taken before the file's last edit — not wrong, just old, which is the one failure mode an assertion cannot express.
Re-taken on `bac09020…` (the bytes in all four copies): `innerHeight 778`, `dpr 2.75`, surface **2138 of 2340**,
slack **202px**, `findings: 0`, exit 0 — identical to §121. The scrim conversion did not disturb the compensation,
and that is now a reading rather than an argument. Two runs, same numbers.

**The frame still starves, and the leg still refuses correctly.** The first attempt after boot printed
`NO CONCLUSION — no webview_devtools_remote socket appeared`, with `dumpsys meminfo` timing out and the device at
96% CPU (75% kernel) 185 s after `Boot completed`. Waiting ~150 s and re-running produced the reading above. So the
settle rule from §120 is not "60 s", it is "until the frame stops doing what it does after boot", and the refusal is
the instrument being useful rather than precious: it named the input it never got instead of emitting a zero.

**A printed verdict that misdescribes which quantity it holds is a defect, even when the number is right.** The pass
line read "the page's content box is 202px shorter than **a surface spanning the 2340px screen**" — but after §121
the surface is *not* spanning the screen; that is the whole finding. The cause is a field named `slack` carrying two
different measurements on two branches (screen minus surface on the forced-edge-to-edge path, surface minus content
on the normal one), and one template trying to be true for both. It now prints per branch, with a comment saying why
the two are not the same quantity. Selftests still 23 of 23.

## 125. An accessibility dump contains the window's own scaffolding, and a reader that walks every node reports three false findings

The remaining device item (§122, task #70) needs a handset, and none is on this bus — Windows enumerates no Android
device at all, and the USB list is only the laptop's own cameras, keyboard and fingerprint reader, with no device in
an error state. So the honest move was not to wait but to make the reader provable without one, and the recorded
handset dumps in `.scratch/` turned out to be able to do that.

**`node tools/device-dump-insets.cjs`** answers the low-end question from the platform side: given a `uiautomator` dump
and a `--screen=WxH`, does any of the app's own content sit under a bar band? It refuses rather than reporting zero —
no file, no screen size, no nodes with bounds (the null-root case), no node belonging to the package, and no band to
test against are each a separate `NO CONCLUSION`. That last one fired on the real artifact first, and correctly: **a
WebView's dump holds only the page's virtual hierarchy — zero foreign nodes — so it can never derive a bar band.**
The bands must be supplied from `dumpsys window`, which still prints rects below API 35.

Then the second lesson, which is the one worth keeping. Run with the true bands, the reader first reported
**three findings on a correctly-inset app**: a `FrameLayout`, a `LinearLayout`, and `android:id/statusBarBackground`,
all at `top 0`. All three are the window's own scaffolding — the decor wraps the whole window by definition, and
`statusBarBackground` exists precisely to paint behind the status bar. The same dump already contained the refutation:
the content node starts at `y=54`. So the judged population is now content, not nodes, and both controls pass on the
recorded dump: true bands → `findings: 0`, with the content box named as **top 54, bottom 1423 of a 1544 px screen**
(54 px and 121 px of bar space respected); a band planted 6 px too deep → 21 findings naming `android:id/content` and
the WebView, which is what makes the clean line a measurement rather than a silence.

**What this does and does not close.** The dump is from 2026-10-15, so it shows the app inset correctly on a handset
*before* §121 moved the padding onto `android.R.id.content` — it validates the reader, not the current build. The
reading still owed is two commands on a live device, and it is now a calibration rather than an expedition:

```
adb -s <serial> shell uiautomator dump /sdcard/wd.xml && adb -s <serial> pull /sdcard/wd.xml .scratch/wd.xml
node tools/device-dump-insets.cjs --file=.scratch/wd.xml --screen=<wm size> --statusbar=<rect> --navbar=<rect>
```

with `node tools/device-edge-leg.cjs` still answering the renderer-side question in the same sitting. The OPPO (API 29)
is the device that exercises the legacy `getSystemWindowInset*` branch; the vivo (API 30) takes the modern path.

**Corrected twenty minutes later by its own falsifier — do not trust the paragraph above's use of the recorded dump.**
Writing `tools/falsify-dump-insets.cjs` to prove the reader broke it twice, and both breaks were real:

- A **bottom**-anchored `android:id/navigationBarBackground` is not excluded by a test that only rejects nodes
  spanning from the top, and its presence also poisons the "how far down does the app reach" figure the exclusion
  depended on. The population is now taken from Android's own definition — the `android:id/content` root, plus
  everything after it in the dump's depth-first order — and the reader prints which rule it used.
- Then the reader's verdict on the recorded handset dump flipped from `findings: 0` to `findings: 1` under the corrected
  rule, and **neither number meant anything**: a dump whose every node belongs to the app is a *page-level* dump, and a
  WebView publishes bounds relative to its own surface, which already begins below the bars. Comparing them against
  window bands is a category error. The reader now refuses that case outright, so the "both controls pass on the
  recorded dump" claim above is retired — the recorded dump cannot validate this instrument at all, and the calibration
  lives in the falsifier's own window-level fixtures instead.

`node tools/falsify-dump-insets.cjs` is **7 breaks, 7 caught, 0 not applied**, fixtures embedded (`.scratch/` is
gitignored, so a control that depends on it is not re-runnable): a correct window-level dump reads 0 and a band
planted 6px deep reads 2; excluding scaffolding, the status comparison, the `--file=` slice that was today's actual
bug, the no-band refusal, the wrong-package refusal, the null-root refusal, and the page-level refusal each get
removed in turn and each is caught. Two of those breaks had to be written as *"the wrong diagnosis fires"* — a null-root
dump and a foreign dump both refuse with exit 1, so the only way to show the two guards are separately live is to
require the specific message that must appear when one is disabled.

**Scope, stated plainly:** `uiautomator dump` captures the active window, so a full-screen app's dump may never contain
the bars as foreign nodes. That makes this reader a secondary instrument — useful on split-screen, overlays and
pickers — and `tools/device-edge-leg.cjs` the primary path for task #70. Gate: all 566 checks passed.

## 126. A 401 is an answer, and the deploy checker reported it as a silence

PR #11's checks came back with a live deploy preview, which is the first chance this repository has had to read a
**deployment of the PR itself** rather than production. Pointing `tools/deploy-check.cjs` at
`deploy-preview-11--sukinnecct.netlify.app` printed
`NO CONCLUSION — the deployed page could not be read (offline, or https://… answered nothing).`

It had not answered nothing. It answered **401** — Netlify protects deploy previews behind site auth — and the reader
had thrown that number away at `if (!r.ok && r.status !== 200) return null;`. This is §110's defect pointing the other
way: that pass fixed a tool for reading a silence (`status 0`) as a finding; this one was reading an **answer** as a
silence, which sends a reader to debug their network instead of asking the site owner for the preview password. A
refusal is only useful if it names the state that produced it.

`readOutcome(status)` is now a pure function the selftest drives without a socket, and the refusal prints its verdict:
`PROTECTED — it answered 401 — the deployment is there and locked, not missing`. Three selftest cases pin the
distinctions that matter — 401/403 is never called offline, **only** status `0` counts as no answer, and a 500 is an
error but still an answer — so the classifier cannot quietly collapse "locked" back into "missing" the next time
someone tidies the message.

**The same run demonstrated the other guard on real flakiness.** Production answered, but two of the seven leak paths
came back `0`, and the tool refused outright: `NO CONCLUSION — 2 path(s) were not answered (/CHANGES.md -> 0,
/README.md -> 0); 5 of 7 leak paths answered. The leak verdict is not computed from a partial scan.` That is the rule
§110 installed after its first run counted seven unanswered requests as seven leaks, firing within the hour — which is
the only way a guard like that earns its keep. Gate: all 566 checks passed; `deploy-check --selftest` all cases pass.

**What stays true about the deployment surface:** production is still the deliberately-stale `3c73bfe` artifact by the
owner's ruling, and PR #11's preview builds but is not readable from this machine without auth. So "does this branch
deploy correctly" is verified only as far as Netlify's own build status, not as a byte comparison from here.

## 127. The low-end regime was reproduced without a handset, and it turned up two defects in the reader

Only the OPPO can exercise the legacy `getSystemWindowInset*` getters, and no device is on this bus — but the thing §121
actually risked on low-end Android is a **window-regime** question: does padding `android.R.id.content` double-count
when the framework is already insetting the window? That is reproducible on the API 36 frame by building the identical
page against **`targetSdk 34`**, at which point edge-to-edge is no longer forced. Built, installed, read:
`innerHeight 778`, surface **2138 of 2340**, `findings: 0` — the same numbers as the shipping build. So the content box
is inset by the bars exactly once, whether the framework or the shell is responsible. The regime half of task #70 is
measured; the legacy-getters half still needs the handset, and that is stated rather than folded into a pass.

**Getting there found two defects in `judge()`, both fixed.** It keyed the "forces edge-to-edge" decision on the
*device* SDK, so a `targetSdk 34` build on an API 36 frame was credited with "the shell inset the page on a frame that
forces edge-to-edge" — a sentence that was false in that configuration; the regime is `min(deviceSdk, targetSdk)`.
And the new `LIMIT` branch sat in the chain *before* the reasons reporting, so an actual intrusion in the unattributed
regime would have printed `LIMIT` and `findings: 0`: a note that suppresses the evidence it stands next to. It now
fires only when the measurement passed, and the unattributed path asks its own question — does the page draw **beyond**
its inset box — instead of reusing the full-bleed rule, where "content fills the surface" is what health looks like.

Machine state: `targetSdk` reverted to 36, the APK rebuilt and reinstalled, the AVD killed and forwards cleared.
Selftests 23 of 23; gate: all 566 checks passed.

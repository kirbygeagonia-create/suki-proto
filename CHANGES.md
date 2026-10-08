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
from memory in a `finally`. All twenty-six were caught; none survived; three needed a second
attempt because the app file is CRLF and two of my one-line anchors turned up twice, which is
itself the proof that the sheet and the model share the expression. The gate is at **372
checks**, the camera at **45 screens**.

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
  not tested.
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

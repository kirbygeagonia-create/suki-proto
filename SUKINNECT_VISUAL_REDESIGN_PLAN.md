# Sukinnect visual redesign plan — category art, iconography, data visualisation

**Status: PROPOSAL. No application code has been modified.**
Written 2026-10-10 against `SUKINNECT_GRAB_INSPIRED_VISUAL_REDESIGN_PROMPT.md`.
Implementation begins only after the project owner approves a scope below.

---

## 1. Executive summary

Everything in this plan was measured from the current file and the current rendered page,
not from the prompt's baseline description. Three of the prompt's premises are confirmed,
one is wrong, and the investigation found a fourth defect the prompt did not ask about.

| # | Finding | Evidence | Class |
|---|---|---|---|
| F1 | **Category artwork moves.** 33 infinite CSS animations are running on the Resident Home grid right now, 3–4 per tile across all 7 tiles. | live `getComputedStyle` probe, §8.1 | **Objective defect — violates the prompt's highest rule** |
| F2 | The file **contradicts itself** about this. Line 355 says "The category scenes move"; line 393, four declarations later, says "The scenes are still." | `Sukinnect-next.html:355`, `:393` | Objective defect (false comment) |
| F3 | The seven scenes are **one family in palette and two families in construction** — inconsistent ground planes, silhouette weight and internal detail density. | screenshots §8.3, per-scene audit §5 | Design judgment |
| F4 | **Three provider charts assert numbers their own geometry contradicts.** "Demand by barangay" draws Poblacion at 40% of bar height while its caption claims 58%. | arithmetic in §7.1 | **Objective defect — data honesty** |
| F5 | Icon grammar is mixed: 8 of 43 glyphs are stroke-drawn, 35 are filled-path; 9 ad-hoc sizes are in use (10–22px); `ic()` emits no `aria-hidden`; an unknown name renders as an empty string. | §6 | Objective (measurable) + judgment |
| F6 | **The prompt's baseline is stale in one place:** it says the app "should not need `reicon.js`". It already does not — the rebuild draws 43 glyphs inline and loads no icon library. | `tools/measure.cjs`: "glyphs drawn in the file 43" | Correction, no work needed |

The layout/accessibility instrument reports **zero defects across all 46 screens** at baseline
(§8.2). So this is not a repair job on a broken UI. It is a visual-quality and data-truth job,
which is exactly the category of work that needs the owner's sign-off rather than mine.

**Recommended scope:** P0 (F1+F2, static art) and P1 (F4, chart honesty) are defect fixes with
numbers behind them. P2–P4 (scene refinement, icon normalisation, chart visual language) change
how the app *looks* and are proposed as options for you to accept, narrow, or reject.

---

## 2. Branch, file and worktree — confirmed, not assumed

```
branch            feat/domain-kernel
HEAD              ed06717  fix: the camera no longer calls a titled screen untitled
vs origin         0 ahead / 0 behind
target file       Sukinnect-next.html   (9,754 lines, 719,156 bytes)
shipped file      Sukinnect.html        (419,806 bytes) — NOT touched by this plan
```

`Sukinnect.html` is verified identical to `main` with the command AGENTS.md §31 mandates
(`git diff --quiet origin/main -- Sukinnect.html` → clean). Not an md5 comparison: `.gitattributes`
declares `* text=auto`, so the blob is LF and the checkout is CRLF, and hashes differ by design.

### 2.1 Pre-existing local modifications — left exactly as found

`git status --porcelain` reports three entries that **were not made by me**:

```
 D  SUKINNECT_MASTER_IMPLEMENTATION_PROMPT.md     (1,913 lines, deleted in worktree)
 D  SUKINNECT_UIUX_REDESIGN_PROMPT.md             (274 lines, deleted in worktree)
 ??  SUKINNECT_GRAB_INSPIRED_VISUAL_REDESIGN_PROMPT.md   (the new brief, untracked)
```

Both deletions are **unstaged**; both files still exist at `HEAD`. Section 0 of the brief told me
to read them, so I read them from git objects (`git show HEAD:<path>`) into scratch rather than
restoring them over your deletion. **They are recoverable with `git checkout -- <path>`.**

> **Decision D0 for you:** the new prompt appears to supersede both deleted files. Should I commit
> the deletions and track the new prompt, or are those deletions accidental? I will not touch
> either until you say so.

### 2.2 Also unchanged, deliberately

`Sukinnect-Android/` is gitignored and holds the only copy of the shell work (the
`onShowFileChooser` fix) plus the installable APK. Nothing in this plan touches it.

---

## 3. Scope boundaries

**In scope:** the visual system — category artwork, functional glyphs, charts and data
visualisations, and the tokens they read from.

**Out of scope, and will not be edited:** the domain kernel (centavos money, `Store`,
`SCHEMA_VERSION` 12, `TRANSITIONS`, the ledger, `MockGateway`, payouts, refunds, disputes,
threads), the booking/offer/weighing flows, the Back/history mechanism, role and navigation
structure, category IDs and labels, `commissionBasis` and the undecided produce rate, Leaflet,
app mode, and `Sukinnect.html`.

No framework, no CSS library, no chart library, no icon package, no remote font, no CDN, no
canvas/WebGL, no animated GIF/Lottie. The file must keep running offline over `file://`.

---

## 4. Screen inventory (real, from the render code and the camera table)

46 named screens, each reached the way a tap reaches it:

| Role | Count | Screens |
|---|---|---|
| Resident | 22 | login, login-register, resident-home, resident-results, provider-detail, booking-sheet, booking-detail, fruit-sheet, fruit-harvest-sheet, fruit-offer, booking-tracking, resident-bookings, messages, chat-room, resident-profile, concierge, notifications, case-sheet, empty-search, fruit-record, fruit-voided, fruit-weighed-record |
| Service provider | 13 | provider-dash, fruit-provider-dash, fruit-request, offer-sheet, fruit-harvest-job, fruit-provider-profile, provider-fsm, provider-bookings, provider-job, provider-profile, fruit-weighed, finalise-sheet, finalise-warn |
| Admin | 10 | admin-dash, admin-finance, admin-trust, admin-intel, admin-categories, admin-verifiers, admin-verified, admin-desk, admin-provider, admin-intel-produce |
| Shared | 1 | splash |

Category surfaces and role navigation are data-driven from `SERVICES` (7 entries), so a new
category inherits whatever this plan decides without a per-screen edit.

---

## 5. Category artwork audit

### 5.1 The system as it exists

- **One source of truth already:** `CAT_ART` (`:1731`) → `catArt(serviceId)` (`:1870`), which
  falls back to `ic(serviceMeta(id).icon, 24)` for any category without a scene. All seven
  current IDs have a scene, so the fallback is dead today but is the right seam for an eighth.
- **Palette is already tokenised per trade:** `SERVICE_THEME` (`:1678`) — seven tints, each ink
  measured ≥4.5:1 on its own tint and on `--background`. Delivery was moved to the logo's cyan
  family so it no longer reads identical to plumbing; fruit's hue was chosen for the largest
  colour distance from the other six. **This is good and must not be regressed.**
- **Frame:** `.cat .art` is 60×60, radius 19, `overflow:hidden`, with a white radial highlight at
  28% 18% — a consistent upper-left key light across all seven. `aria-hidden="true"` on the svg.
- **Complexity:** 16–25 SVG nodes per scene (measured live). Gradients are namespaced per trade
  because they share one document.

### 5.2 Motion — the non-negotiable rule, measured

Live probe of the painted Resident Home (full output §8.1):

```
tiles: Plumbing 4/19 animated · Electrical 3/19 · Cleaning 4/18 · Tutoring 4/21
       Appliance 4/25 · Delivery 4/16 · Fruit 3/20            TOTAL 33 live animations
```

Every one is `infinite`. The mechanisms: 14 `@keyframes` (`caFall caRise caSpin caFlash caBob
caMarch caFlip caStream caRipple caGlow caFlicker caTwinkle caSway caSlide`, `:359-372`) and 15
`.cat .ca-*` animation rules (`:378-392`).

Two hover rules also move the artwork:

```css
.cat:hover        { transform: translateY(-2px); }   /* the whole tile, art included */
.cat:hover .art   { transform: scale(1.08); }        /* :1261-1262 */
```

**Accuracy note, because it changes the fix:** the hover rules are already neutralised on a touch
device by `@media (hover:none){ … .cat:hover .art{ transform:none !important } }` (`:1342`). So on
the phone the hover motion does not fire — but the 33 keyframe animations fire **regardless of
hover and regardless of device**, and they also fire on the desktop preview. Reduced-motion users
are already protected (`animation-iteration-count:1`, duration `1e-05s`, verified in §8.1); the
prompt requires the art to be static **for everyone**, not only for those who opted out.

The animation classes are applied *inside* `CAT_ART` markup (`class="ca-bob"`, `class="ca-fall"`,
`style="animation-delay:.85s"`), so removing the CSS rules alone leaves orphan classes in the SVG.
The clean removal is both.

### 5.3 Per-scene audit and static concept

Verdicts are about construction, not taste. "Keep" means the composition already reads.

| ID | Label | Current scene | What is inconsistent | Static concept |
|---|---|---|---|---|
| `plumbing` | Plumbing | tap + spout, dashed water column, falling drop, ripple rings, puddle ellipse | the only scene with a puddle *and* ripples; the water is a **dashed stroke**, so its "flow" is a dash pattern, not a shape — it will read as a dotted line once frozen | keep tap geometry; replace the dashed stream with a solid tapered pour ending in a **fixed** drop; keep the puddle as the ground plane |
| `electrical` | Electrical | bulb, glow disc, radiating spark strokes, flickering filament | no ground plane — the bulb floats; the 5 spark rays at the top are the same marks a "brightness" icon uses, so at 60px it competes with the glass silhouette | keep bulb + base; delete glow/spark animation, **fix** two short rays; add a contact shadow under the screw base |
| `cleaning` | Cleaning | spray bottle, three rising bubbles, a plus/cross sparkle | the cross at top-left reads as a **close/dismiss glyph**, not a sparkle — a real legibility defect; no ground plane | keep bottle; replace the cross with a four-point sparkle (rotated square) or drop it; freeze 2 bubbles as static shapes; add contact shadow |
| `tutoring` | Tutoring | open book, turning page, two rising dots, swaying pencil | densest scene (21 nodes) and the only one with three separate moving motifs; the pencil at 4px detail is lost at tile size | keep book + layered pages; freeze the page as a lifted corner; **remove** the dots; keep the pencil but simplify to two shapes |
| `appliance` | appliance | washer body, drum, three tumbling balls, counter-rotating arc, LED | heaviest silhouette (a solid block filling the frame) — it visually outweighs every neighbour; the counter-rotating arc is invisible when still | keep body + drum glass; freeze the drum contents as **one** static arrangement; drop the rotating arc; lighten the body fill so its optical weight matches the set |
| `delivery` | Delivery | parcel, three speed lines, marching road dashes | the three left-edge lines read as noise, not motion; the parcel is the smallest silhouette in the set | keep parcel; **delete** the speed lines; keep the road as fixed dashes (a static road mark reads as "route", which is the point); enlarge the parcel ~12% |
| `fruit` | Fruit Harvest & Buy | tree canopy, trunk, branch, two fruit, one falling fruit, basket, shadow | weakest read at 60px — the canopy is a dark mass and the basket is a second mass below it; three fruit at different opacities is fussy | keep tree + basket; simplify the canopy to two overlapping shapes at one opacity; **fix** all fruit in place; keep the existing contact shadow (the only scene that already has one) |

**Shared construction grammar to impose on all seven** (the actual "one family" requirement):

1. Every scene gets the same **ground plane**: one contact ellipse at `cx` under the subject,
   `opacity:.12`, no blur filter.
2. Every scene gets the same **silhouette budget**: subject occupies 62–70% of the 56-unit box,
   measured, so no tile visually outweighs its neighbour.
3. One key light (upper-left, already consistent via the CSS radial) and **one** specular highlight
   shape per scene, reused at the same angle.
4. Node budget ≤ 18 per scene (three scenes are currently over: tutoring 21, appliance 25, fruit 20)
   — fewer parts is both the legibility fix and the performance fix.
5. Depth from **layered flat shapes and gradients only**. No `filter`, no `feGaussianBlur`.

### 5.4 Where category art is reused — a real gap

`catArt()` is called from **exactly one place**: the Resident Home grid (`:6863`). Every other
category surface uses the flat `ic(icon)` glyph instead:

| Surface | Today | Proposal |
|---|---|---|
| Resident home grid (`:6863`) | full scene, 60px | keep — the one place a scene earns its space |
| `serviceAvatar()` (`:1939`, 8 call sites, 34–44px) | flat glyph on tint | **keep flat** — these are person/booking rows, not category discovery |
| Admin categories rows (`:8145`, 34px) | flat glyph on tint | **keep flat** — §4.5 forbids forcing large art into dense operational lists |
| Concierge result chip (`:6943`, 12px) | flat glyph | keep flat |
| Chat header service chip (`:7390`) | flat glyph | keep flat |

So the honest answer to §4.5 is: **one shared source already exists** (`serviceMeta()` supplies
label + icon + accent + behaviour to every screen), and the *scene* is deliberately a
discovery-only treatment. I propose adding a **compact scene variant** only if you want category
identity stronger in the results list — that is `catArt(id, 'compact')` rendering the same paths
at 28px with the detail layers suppressed. It is an option (D3), not a default, because it changes
the look of a screen that currently tests clean.

---

## 6. Functional icon system

**43 glyphs drawn inline; 40 names reachable; `reicon.js` is not loaded.** Coverage is already
enforced: `tools/measure.cjs` fails if a reachable name has no artwork, and the gate checks all
three ways a name arrives (markup, data rows, helper arguments) — the defect where six icons
silently blanked is already guarded.

Measured problems:

1. **Two grammars in one set.** 35 glyphs are filled-path outlines (Heroicons-style, `fill-rule`
   even-odd); 8 are stroke-drawn at `stroke-width="1.5"`: `map-pin, eye-off, phone, lightbulb,
   trending-up, file-text, chevron-left, weight`. At 12–15px a stroke glyph reads lighter than a
   filled one, which is why the set looks uneven in dense rows.
2. **Nine ad-hoc sizes**, no scale: 10, 11, 12, 13, 14, 15, 16, 18, 22 — and 76 of 168 call sites
   sit at 10–13px. Nav uses 19 via a variable. §5 of the brief asks for a tokenised scale.
3. **`ic()` emits no `aria-hidden`** (`:4735-4740`): `<svg width height viewBox fill="none" style=…>`.
   Every decorative glyph is therefore exposed to a screen reader as an unnamed element. Only 2
   `role="img"` exist in the whole file. Category art *does* set `aria-hidden`, so the inconsistency
   is inside one system.
4. **Unknown name → empty string** (`:4737 if(!def) return '';`). Silent in production; the gate
   catches it statically, which is the right layer, but a runtime warning in dev is cheap insurance.
5. **`.f` is a no-op for exactly the four resident nav glyphs** (`:4725-4728`: `home, calendar,
   chat, user` are aliased to their own outline). `ic(icon,19,active?'filled':undefined)` therefore
   requests a filled variant that does not exist. **This is not an accessibility failure** — the
   active tab is also distinguished by colour, label weight and an underline pill, all visible in
   the baseline screenshot — but the outline/filled rule the brief asks for is currently inconsistent
   across nav: real for 10 glyphs, fake for 4.
6. Three drawn glyphs I could not trace to a call site: `route`, `wrench`, and `home` by my crude
   regex (home is definitely painted via the nav table, so my regex is incomplete — **do not delete
   any of these on the strength of this scan**). They are candidates for review, not removal.

**Proposed icon rules (P3, optional):**

- A five-step size scale as tokens: `--ic-xs 12, --ic-sm 14, --ic-md 16, --ic-lg 20, --ic-xl 24`,
  mapped to *roles* (inline-with-caption, row affordance, control, nav, emphasis) rather than to
  pixels-per-call. Migration is mechanical: 10/11→12, 13→14, 15/17/19→16 or 20 by context.
- One construction rule per glyph family: **stroke-drawn for wayfinding and map marks**
  (`map-pin, route, chevron-left, phone`) and **filled-path for state and object glyphs**, documented
  so the split is intentional rather than accidental — and normalise the optical weight of the
  stroke set to match.
- `aria-hidden="true" focusable="false"` on every `ic()` svg, plus a `title`/`aria-label` escape
  hatch for icon-only controls.
- Draw real `.f` variants for the four nav glyphs, **or** drop the filled request for them and rely
  on the existing colour + weight + underline. Both are honest; I recommend the first only if you
  want the nav to change shape when active.

**Risk:** icon size changes are the highest-regression-risk item in this plan. 168 call sites, and
`.barlbl`/`.chip`/`.svc-avatar` layouts are tuned to current sizes. Mitigated by the instrument
(tap targets, clipping, overflow) plus a before/after screenshot diff of all 46 screens.

---

## 7. Charts and visualisations — inventory with data-source verification

Chart surface is small and tractable: **2 bar charts, 3 conic donuts, 1 line chart, 10 stat strips.**

### 7.1 Provider dashboard `providerDashboard()` `:9157-9307` — the problem area

| Card | Line | Data source | Verdict |
|---|---|---|---|
| "What clients said" donut | `:9236` | `positivePercent` etc. computed from `providerReviews` `:9163` | **Derived but pinned to `'p1'`** (`:9158`) — shows p1's reviews for whichever provider is signed in. And it draws a confident 100%/0%/0% ring from **n=2**. |
| "Weekly earnings" line | `:9257-9266` | **Hard-coded polyline points** `15,80 60,65 105,70 150,50 195,35 240,40 285,20`. No axis, no values, no currency, no period. Chip "+18% Growth". | **Fiction.** The caption claims "peaking at ₱4,200" — ₱4,200 appears nowhere in the drawing. |
| "Demand by barangay" bars | `:9279-9282` | **Hard-coded pixel heights** 45 / 90 / 60 / 30 | **Fiction, and self-contradicting.** 90 ÷ (45+90+60+30) = **40%**. The caption claims "Poblacion generates **58%** of all plumbing service requests". The chart disagrees with its own text. |
| "Where the earnings come from" donut | `:9294` | **Hard-coded** `65% / 20% / 15%` | **Fiction.** Legend repeats the literals; the insight claims "highest profit margins per call-out fee" — the model has no per-job-type cost data at all. |

Semantic-colour misuse in the same block: the barangay bars use `--verified` (success green) and the
earnings donut uses `--success`/`--warning` for a **neutral** breakdown. §6.5 and AGENTS.md §34 both
say semantic colours stay reserved for status.

**What the data *can* support** (checked, not assumed): `BOOKINGS` carry `createdAt` spanning
minutes to 59 days ago (`isoMinutesAgo(60*24*59)` is the oldest), plus `amountCentavos`, `status`
and `barangay`. So:
- **Requests by barangay** → fully computable from real records. Recommend: derive it, label counts.
- **Weekly earnings** → computable, but 16 demo bookings across ~8 weeks means most weeks are zero.
  Recommend: compute it, and where the series is mostly empty render the designed insufficient-data
  state instead of a line. Do **not** invent a trend.
- **Earnings by job type** → **not** computable. There is no service-type breakdown on a booking.
  Recommend: delete the card.

### 7.2 Admin — already honest, leave it alone

`adminCounts()` `:4035`, `opsWorkload()` `:4054`, `marketplaceRates()` `:4070`, `weeklyBookings()`
`:4084`, `categorySupply()` `:4097` are all derived, with comments recording that typed literals
were removed ("it showed 6 applications beside a queue of 3"). The admin weekly bar chart `:7895`
scales from real counts and carries "Counted from the demo bookings on this device — not marketplace
volume." The donut at `:7877` reads `opsWorkload`. **No proposed changes.** This is the pattern the
provider cards should follow.

### 7.3 Honest already

- `opportunityRadar()` `:9054` — derived counts, and states outright: "This prototype does not
  forecast demand — a real surge needs live request history, which the pilot has not gathered yet."
- FSM "Demand Heatmap & Forecasting" `:9325` — labelled "An illustration from sample activity, not a
  forecast this prototype computes."
- Resident flows carry no analytics, per §6's guidance. Correct as-is.

### 7.4 Chart language to standardise (P4)

One shared helper set rather than per-screen markup: `chartBars({rows, unit, period})`,
`chartLine({points, format})`, `chartShare({parts, total})` — each emitting a title that names the
question ("Requests by barangay", never "Bar Graph"), a period, a unit, adjacent numbers, a legend
that shows values, `role="img"` + `aria-label` with the text equivalent, and a designed empty state
when the source collection is too thin. Restrained brand blue/cyan for neutral series; green/amber/red
only for status. One-shot entrance only if it survives `prefers-reduced-motion`.

---

## 8. Baseline verification results

### 8.1 Motion probe (the tool that answers F1)

`node tools/shot.cjs --only=resident-home --probe=@probe-cat-static.js` — reads computed style on
the live page, so it catches CSS animations, transitions and hover rules together.

```
normal:          motion:false  liveAnimations:33  every tile 3–4 animated parts
                 .cat .art transition: transform 0.18s
                 hover rules matched: .cat:hover{transform:translateY(-2px)}  .cat:hover .art{transform:scale(1.08)}
reduced-motion:  motion:true   liveAnimations:33  (iteration-count 1, duration 1e-05s → visually frozen)
```

After a P0 fix the same probe must report `liveAnimations: 0` in **both** modes, with no
`transform` transition on the `.cat .art` subtree.

### 8.2 Commands run, and what they said

```
node tools/verify.cjs                       → all 394 checks passed        (before any edit)
node tools/measure.cjs Sukinnect-next.html  → 9,754 lines · 1 :root · 93 tokens (5 unreached)
                                              1,681 var() uses · 39 hex outside :root (all classified)
                                              108 stylesheet font-sizes, 107 var(), 0 literal px
                                              22 h1 / 6 h2 · 43 glyphs · 40 reachable · 46 screens
node tools/shot.cjs --list                  → 46 screens
node tools/shot.cjs --measure --out=.shots-plan        → 46/46 painted, 0 console errors
node tools/shot.cjs --only=resident-home --reduced-motion --probe=@…  → see 8.1
node tools/shot.cjs --only=provider-dash --height=1900 --out=.shots-plan-tall
```

**Instrument tallies at baseline — all clean:** tap targets under 44px **0** · WCAG contrast
failures **0** · clipped text **0** · off-scale fonts **0** · content under the nav **0** ·
unnamed clickables **0** · unnameable form controls **0** · stretched images **0** · map panes
escaping their frame **0** · anything over an open modal **0** · horizontal overflow **none** ·
10 distinct painted font sizes. (Excluded as vendor-owned: 32 Leaflet controls.)

### 8.3 Screenshot paths (gitignored, `.shots*/`)

- `.shots-plan/` — all 46 baseline screens, 390×844 @2x, with `--measure`
- `.shots-plan-rm/` — Resident Home under emulated reduced motion
- `.shots-plan-tall/` — Provider dashboard at 390×1900, so the Insights cards are in frame

These are the "before" set. Implementation writes "after" to **new** directories; nothing here is
overwritten. They are scratch and will be deleted once the work is reviewed (they are 11 MB per
46-screen run and have already filled the disk once).

---

## 9. Proposed phases, targets, risk

Each phase is independently approvable. Land one, verify, commit, then the next.

| Phase | What | Exact targets | Risk | Gate |
|---|---|---|---|---|
| **P0 — make category art static** *(defect fix)* | Delete the 14 `@keyframes` and 15 `.cat .ca-*` animation rules; strip `class="ca-*"` and inline `animation-delay` from `CAT_ART`; remove the `transform` transition and both hover transforms on the art subtree; replace the contradictory comment at `:393` | `Sukinnect-next.html:355-392`, `:1261-1262`, `:1731-1868` | **Low.** Purely subtractive; no layout change | New `verify.cjs` check + probe asserts `liveAnimations:0` in both motion modes |
| **P1 — chart honesty** *(defect fix)* | Fix `providerReviews` to the signed-in provider; derive barangay counts; compute or delete the weekly-earnings line; delete the earnings-by-type donut; remove the three invented captions and the "+18% Growth" chip; stop using semantic colours for neutral series | `:9157-9307` | **Low-medium** — touches a screen with existing journey tests | New `verify.cjs` assertions: every chart figure reconciles with its records; a check that the deleted claims stay deleted |
| **P2 — refine the seven scenes** *(visual)* | Apply the shared grammar in §5.3: ground plane on all seven, silhouette budget 62–70%, ≤18 nodes, one specular per scene; per-scene changes in the table (fix the cleaning cross, lighten appliance, enlarge delivery, simplify fruit canopy, solidify the plumbing pour) | `CAT_ART` `:1731-1868`, `.cat .art` `:344-353` | **Medium** — this is the taste-sensitive part | Screenshots at 60px and at 28px; contrast re-measured; no new gradients/tokens without a `:root` entry |
| **P3 — icon normalisation** *(visual, highest regression risk)* | Size scale tokens; `aria-hidden`+`focusable="false"` in `ic()`; document the stroke/fill split; real `.f` for the four nav glyphs or drop the request | `ICONS` `:4676-4720`, `ic()` `:4735-4740`, 168 call sites | **High** — 168 sites; row heights tuned to current sizes | Instrument over all 46 screens; per-screen before/after diff |
| **P4 — shared chart language** *(visual)* | `chartBars/chartLine/chartShare` helpers with title, period, unit, value labels, `role="img"` text equivalent, designed empty state; migrate the 2 bars + 3 donuts + 1 line onto them | new helpers near `:4035-4103`; call sites §7 | **Medium** | Each helper's output asserted against its source collection in `verify.cjs` |

**Files likely to change:** `Sukinnect-next.html` (all product work), `tools/verify.cjs` (new
static-art and chart-truth checks), `tools/shot.cjs` (a `--motion` tally so the camera reports
animated category nodes), `AGENTS.md` §31 (re-measured, since line counts and token counts move),
`CHANGES.md` (a section per phase). Docs only where a claim goes stale — this repository has been
burned by prose numbers that drifted, so numbers get restated with the command that produces them.

**Suggested order:** P0 → P1 → P2 → P4 → P3. P3 last because it is the widest and the least
visible when done well.

---

## 10. Accessibility and performance safeguards

- Category art becomes static **by default**, not via `prefers-reduced-motion`. The global
  reduced-motion rule stays for the app's other motion (screen transitions, sheet rise, toasts,
  splash) — §4.3 forbids a global disable.
- `aria-hidden` on decorative glyphs; icon-only controls keep real button semantics and names. The
  instrument already fails unnamed clickables and unnameable fields, and reports 0 — that check
  stays green through P3.
- Tap minimums unchanged (`--tap`); the grid tiles are already ≥44px and P0 removes motion without
  changing geometry. Focus-visible states are preserved: the tile keeps a non-moving pressed/focus
  treatment (border + background), which is what §4.3 permits.
- **Performance improves.** 33 infinite animations on the most-open screen become 0; the node budget
  drops from 16–25 to ≤18 per scene. No filters, no blur, no rAF, no new assets. Nothing is added to
  the APK.
- Charts keep a readable text/table equivalent, so a colour-blind or screen-reader user gets the
  values, not just the shape. "Sample figures from this prototype, not live earnings" stays on
  prototype analytics.

---

## 11. Acceptance checklist

Work is done only when every line is true and demonstrable:

- [ ] Probe reports `liveAnimations: 0` on the category grid under **both** motion preferences.
- [ ] No `transform` transition or hover transform anywhere on the category-art subtree.
- [ ] All 7 categories render a static scene at 60px and, if D3 is approved, at 28px.
- [ ] Every reachable glyph name resolves; `ic()` output is `aria-hidden`; no blank glyphs on any of the 46 screens.
- [ ] Every chart figure reconciles with its source records, or the card is gone.
- [ ] The three invented claims ("+18% Growth", "peaking at ₱4,200", "58% of all plumbing requests") are absent, and a check keeps them absent.
- [ ] No semantic colour encoding a neutral series.
- [ ] Empty / one-record / zero / long-label / reduced-motion states each render deliberately.
- [ ] `node tools/verify.cjs` passes with the new checks included, and the count of *applied* falsifier mutants is reported alongside the count caught.
- [ ] Instrument tallies stay at 0 across all 46 screens; no horizontal overflow at 390px.
- [ ] Resident booking/request, provider accept/complete, offer and weighing, admin verification/dispute/money, and Back/sheet navigation behave exactly as before.
- [ ] Booking status and payment status remain separate; no wallet wording returns; produce money stays out of ledger revenue.
- [ ] `git diff --quiet origin/main -- Sukinnect.html` → unchanged.
- [ ] No new dependency, network call, remote asset, or framework.
- [ ] Role-by-role coverage matrix stating which screens changed and which were reviewed and **deliberately left alone, with the reason**.

---

## 12. Unresolved questions — decisions I will not make for you

**D1 (blocking for P2).** Redraw the seven scenes from scratch, or refine in place?
Recommendation: **refine in place.** The palette, the light direction and the trade-hue discipline
are already right, and AGENTS.md §64 says do not rewrite working code because it could be prettier.

**D2 (blocking for P1).** For "Weekly earnings": compute the real 7-week series (likely mostly
zeros, so it will show the insufficient-data state), or delete the card?
Recommendation: **compute it and let the empty state be honest.** A designed "not enough sample
data yet" card is stronger evidence of product thinking than a line nobody can trace.

**D3 (blocking for §5.4).** Do you want category scenes to appear outside the home grid — a compact
28px variant in results rows and provider cards?
Recommendation: **no, not yet.** It changes a screen that tests clean, and §4.5 warns against
forcing large artwork into dense lists. Revisit after P2 lands and you have seen the refined family.

**D4 (blocking for P3).** Normalise the nine icon sizes onto five tokens?
Recommendation: **yes, but last.** It is the widest change and the least visible when correct.

**D5.** Draw real filled variants for the four nav glyphs, or drop the filled request and rely on
colour + weight + underline (which already work)?
Recommendation: **drop the request** — the current active state is legible; a shape change on tap is
a bigger visual decision than this brief needs.

**D6 (from §2.1).** Commit the deletion of the two superseded prompt files and track the new one?

**D7.** The produce commission rate is still `null` by design. Not a visual question, but P1 touches
money-labelled cards — confirm nothing in this plan should surface a rate you have not set.

---

## 13. What I will not do

I will not edit `Sukinnect.html`, restore your deleted files, touch `Sukinnect-Android/`, change a
category ID or label, add a dependency, or begin P0 until you answer at least D1 and D2. Silence is
not approval; a generated plan is not approval.

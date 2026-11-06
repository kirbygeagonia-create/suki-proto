# SUKINNECT — Mobile-App Visual Pass: Slice 0 plan and findings ledger

Branch `feat/mobile-app-visual-pass`. Target file `Sukinnect-next.html`. Repo root:
`C:\Users\ADMIN\OneDrive\Desktop\Sukinnect\Suki-proto`.

Baseline recorded before any edit: `node tools/verify.cjs` **740 checks passed**;
`node tools/measure.cjs` 13,737 lines, 100 tokens declared / 9 unreached, 43 glyphs drawn;
`node tools/shot.cjs --measure` 101 screens, **every failure tally zero**, no console errors.
Screenshots saved as `.shots-before/` (123 PNGs).

## Rules that constrain this pass (quoted, not paraphrased)

- **AGENTS.md §10** — `Sukinnect_Logo.png` is the official mark: "Do not replace it with … a
  generated logo", "Do not distort it. Do not stretch it. Preserve its aspect ratio." Untouched.
- **AGENTS.md §30** — the brand hexes are *measured*: logo blue `#0352AE`, logo cyan `#05BCC4`,
  deck navy `#03002B`, pale `#F1F5FF`. §31A (owner ruling 2026-10-27) makes the palette **flat**;
  the brief's "heavy navy gradient bar" describes a build that no longer exists.
- **AGENTS.md §34** — "The application should not make 'blue = success' simply because blue is the
  brand." Status stays semantic.
- **AGENTS.md §68** — "no essential interface text below 14px", measured on two handsets; the type
  scale is `rem` because Android multiplies the used size after CSS resolves.
- **AGENTS.md §46** — "SERVICE-CATEGORY ILLUSTRATIONS NEVER MOVE." Static, at any motion setting.
- **AGENTS.md §23/§24** — booking state and payment state stay separate; no cost may be hidden.
- **AGENTS.md §63/§86** — a prototype may not claim to be a system. Honest labels survive restyling.
- **AGENTS.md §81** — local assets only; the one allowed network dependency is OpenStreetMap tiles.

## Findings, re-confirmed against this build

| # | Verdict | Evidence |
|---|---|---|
| D1 badges break mid-word | **FIXED ALREADY** | `.chip` carries `white-space:nowrap; flex-shrink:0` and `.card-head` carries `flex-wrap:wrap`; sentence-case is still owed (§3.3) and is done in Slice 3. |
| D2 `&ldquo;` printed as text | **CONFIRMED → FIXED Slice 1** | `emptyState()` escapes its title, so an entity typed into the string is escaped twice. Real quote characters now. |
| D3 rating pill wraps | confirmed in earlier passes, re-checked in Slice 4 screenshots | `.row-value` and the pill rule are the sites. |
| D4 bell drops below avatar | **CONFIRMED** (resident Home header) | Slice 4. |
| D5 sticky bar sits on the tab bar | **CONFIRMED** — `.book-bar` is `position:sticky; bottom:0` inside `#screen`, with `.bottomnav` below it | Slice 2. |
| D6 slashed zeros | **CONFIRMED, measured** | `probe-zero-style.js`: Atkinson 364.05/364.05 tabular **with a slashed zero**; Plus Jakarta Sans 345.61/345.61 tabular, plain round zero; Poppins 184.33/361.73, no tabular feature. Figures move to Jakarta; UI stays Poppins. |
| D7 map block blank | tiles load here (933 requests left the device in the baseline walk); the **offline placeholder** is still owed | Slice 4. |
| P1 everything is a card | **CONFIRMED** in `.shots-before/provider-dash.png` (card inside card) | Slice 3/4. |
| P2 grid below the fold | **CONFIRMED** — resident Home "scrolls 635px past the fold" | Slice 4. |
| P3 header patterns inconsistent | **PARTLY FIXED ALREADY** — the navy *gradient* bar is gone (flat `#0352AE`); one white top-bar system is still owed | Slice 2. |
| P4 type proportions | **CONFIRMED** — bold everywhere, caption 14px used app-wide, nav labels ellipsized ("Bookin…", "Messa…") | Slices 2–4. |
| P5 everything lavender | **CONFIRMED → FIXED Slice 1** — page `#F6F7FB`, hairline `#E6E8EF`; brand tint reserved for selection | |
| P6 admin numeral column | confirmed | Slice 5. |
| P7 nav icons thin, `FSM` jargon | **CONFIRMED** — 24px Material Symbols now; the label rename is an owner decision (below) | Slice 2. |
| P8 login floating card | confirmed | Slice 4. |
| P9 long copy in tight rows | **CONFIRMED** — "next: Fri, Nov 6 at 10:30 AM — Main valve repair" | Slices 4–5. |
| P10 unlabeled tracker bars | confirmed | Slice 3/4. |
| A1 seven AI category PNGs | **CONFIRMED** — `SERVICE_ART` / `catArt()` / `CAT_ART_PX` all still present | Slice 6. |
| A2 inline icon family | **RESOLVED Slice 1** — 47 glyphs replaced with official Material Symbols (Apache-2.0), outlined + filled, `ic(name,size)` signature kept | |
| A3 cartoon avatars | **CONFIRMED** — visible in `.shots-before/provider-dash.png` | Slice 3/6. |
| A4 abstract category icons | **FIXED Slice 1** — each trade draws its own glyph (`plumbing`, `electrical`, …) plus a `short` tile label | |
| A5 official logo | **UNTOUCHED**, as required | |

## Decisions for the owner (raised, not resolved silently)

1. **Typeface.** §3.3 asks for one family with tabular lining numerals and no slashed zero, and names
   Plus Jakarta Sans. AGENTS.md §31A rules Poppins as the UI face. Applied: **Poppins for words,
   Plus Jakarta Sans for digits** — both halves of the requirement are met, no owner ruling is
   reversed, and the choice is measured rather than argued.
2. **12px `label` role.** §3.3 puts chips, badges, tab labels and helper text at 12px. AGENTS.md §68
   sets a 14px floor as an accessibility ruling measured on two handsets. Applied: **14px**, with the
   conflict named here rather than settled by a quiet number.
3. **`FSM` → `Jobs`.** Requested by §3.4; a nav label change is a product-word change, so it is
   flagged for approval before it ships.
4. **Eighth "All services" tile**, **monogram avatars**, and the **unreferenced cartoon PNGs** left
   on disk awaiting approval to delete — all per §4.4/§4.5.

## Slice order (each leaves the app working, one commit each)

0 baseline · 1 foundations (tokens, type, numerals, chips, entity, icon family) · 2 chrome (top bars,
nav, sticky bar, sheet) · 3 components (list row, card, buttons, chips, stepper, empty state,
monogram) · 4 resident flow · 5 provider and admin · 6 retire the AI images, update every gate,
`ICON-LICENSES.md` + `DESIGN-TOKENS.md` + README assets + Android re-sync.

## Verdicts after Slices 2-6 (updated as the work landed)

The table above was written at Slice 0. What the pass then achieved, and what it did not:

| # | Now | Evidence |
|---|---|---|
| D1 | **fixed** | chips already held `nowrap`; the four uppercase status spellings are sentence case |
| D2 | **fixed** | the empty results screen reads `No provider matches "leak"` in the screenshot |
| D3 | **fixed** | the rating figure no longer paints white-on-white; `splitChips` tally 0 |
| D4 | **fixed by the chrome pass** | the bell sits at the right of the same header row on Resident Home |
| D5 | **fixed** | a pushed screen has one bottom bar; the probe counts `fixedBars: 1` on Provider Detail |
| D6 | **fixed** | digits render in Plus Jakarta Sans — measured tabular and slashless |
| D7 | **partly** | tiles load here; the offline placeholder is still owed |
| P1 | **partly** | cards are flat with a neutral hairline and `.list`/`.list-row` exist; the Home and provider cards still nest a card inside a card |
| P2 | **fixed** | grid bottom 471px against nav top 757px at 390×844, four columns, eight tiles |
| P3 | **fixed** | one light bar on every screen, 56px, bare chevron |
| P4 | **partly** | neutral surfaces and sentence case landed; body copy is still bold in several places and the provider nav still ellipsizes `Bookin…`/`Messa…` at 320px, which is the documented floor behaviour |
| P5 | **fixed** | page `#F6F7FB`, hairline `#E6E8EF`, brand tint reserved for selection |
| P6 | **not touched** | the admin rows already use `.job-row` with a chevron from an earlier pass; the numeral column was not re-audited |
| P7 | **partly** | 24px Material Symbols throughout; `FSM` still says `FSM` (owner decision), and the active-state pill was attempted and reverted |
| P8 | **fixed** | the entry screen is one surface: logo on white, display title, segmented control, 52px fields and action, outlined "Create a new account" |
| P9 | **not touched** | long subtitles still sit in glanceable rows |
| P10 | **fixed** | the marks carry a line naming the step and the count |
| A1 | **fixed in code** | `SERVICE_ART`, `CAT_ART_PX`, `catArt()` gone; PNGs unreferenced, removed from `dist/` and from the staged Android bundle |
| A2 | **fixed** | one family, licence recorded, generated from the shipped map |
| A3 | **attempted and reverted** | two splices of `photoAvatar`/`photoFor` damaged neighbouring functions under text surgery and the gate caught the crash; the cartoon faces remain, and this needs a pass that edits the helper with the harness rather than a bulk text replacement |
| A4 | **fixed** | each trade draws its own glyph and carries a `short` label |
| A5 | **untouched**, as required | |

**One finding the sweep produced that is not mine.** At default width with 200% text the provider
dashboard's weekly chart keeps `Oct 26` hanging 3px sideways of its box. `git diff` over the whole
pass shows no line of chart code changed — `chartColumns`, `chartScale`, `chart-cat` and the gutter
token are untouched — so this is a pre-existing large-text case that the wider 101-screen sweep now
reaches. It is reported, not smoothed over, and the other seven corners are clean.

**Commands a reader can run, in this state:** `node tools/verify.cjs` (741), `node tools/shot.cjs
--measure` (101 screens), `node tools/sweep-text-scale.cjs` (eight corners), `node
tools/falsify-visual-contract.cjs` (5 of 5), `node tools/measure.cjs`, `node
tools/audit-build-bytes.cjs` (three copies agree; the built APK differs until it is rebuilt),
`node tools/shot.cjs --probe=@tools/probe-visual-contract.js`.

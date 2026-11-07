# Sukinnect design tokens — the hand-off to the Flutter build

Every value the application paints, the CSS variable that holds it, the measured source of that
value, and the Flutter equivalent a port would use. Nothing here is invented: the brand colours are
the hexes measured from `Sukinnect_Logo.png` and `ppt/slides/slide*.xml` inside the pitch deck
(AGENTS.md §30), and the rest are the declarations in `Sukinnect-next.html`'s single `:root` block.

The palette is **flat** (owner ruling, 2026-10-27): no gradient is used anywhere except the workload
ring, which is declared beside it as a `conic-gradient` exception because a ring chart drawn with
hard colour stops is a segmented circle, not a blend.

Run `node tools/measure.cjs` to re-count the tokens; do not trust a number copied from this file.

## 1. Colour — Material 3 role names

The M3 name is the primary declaration; the older `--brand-*` / `--surface-*` names are kept as
aliases so every existing call site and `tools/measure.cjs` keep working.

| Token | Value | Meaning | Flutter `ColorScheme` |
|---|---|---|---|
| `--md-sys-color-primary` | `#0352AE` | the logo's blue; actions, active state | `primary` |
| `--md-sys-color-on-primary` | `#FFFFFF` | text/glyph on a primary surface | `onPrimary` |
| `--md-sys-color-primary-container` | `#C9D5FF` | deck pale periwinkle; selected tonal fill | `primaryContainer` |
| `--md-sys-color-on-primary-container` | `#03002B` | deck very dark navy | `onPrimaryContainer` |
| `--md-sys-color-secondary` | `#05BCC4` | the logo's cyan; a rule, a dot, an accent — never a large fill | `secondary` |
| `--md-sys-color-secondary-container` | `#E7EDFF` | navigation indicator behind the active icon | `secondaryContainer` |
| `--md-sys-color-on-secondary-container` | `#0352AE` | | `onSecondaryContainer` |
| `--md-sys-color-surface` | `#FFFFFF` | cards, bars, sheets | `surface` |
| `--md-sys-color-surface-container` | `#F6F7FB` | the page; a near-white neutral, deliberately **not** lavender | `surfaceContainer` |
| `--md-sys-color-on-surface` | `#03002B` | primary text | `onSurface` |
| `--md-sys-color-on-surface-variant` | `#4C5B88` | the deck's only declared slate; secondary text | `onSurfaceVariant` |
| `--md-sys-color-outline` | `#C9D5FF` | strong border, dashed read-only field | `outline` |
| `--md-sys-color-outline-variant` | `#E6E8EF` | hairline divider, card border | `outlineVariant` |
| `--md-sys-color-error` | `#d64545` | semantic red for borders and marks — outside the brand on purpose (§34) | `error` |

Text muted on a tinted surface uses `--text-muted` `#5F6E92` (5.1:1 on white, 4.7:1 on the page).
Status inks are darker than their hues because a status **label** must clear 4.5:1:
`--success-ink #0F6B3F`, `--warning-ink #8A5A00`, `--error-ink #C53030`. The destructive **fill**
uses `--error-ink`, not `--error`: white on `#d64545` measures 4.38:1.

## 2. Category tonal pairs

One pair per trade, each icon colour at 3:1 or better on its own container and each text colour at
4.5:1. Held in `SERVICE_THEME` in the page — one definition, read by the tile, the row container and
the filter chip alike.

| Trade | Container | Glyph | Flutter |
|---|---|---|---|
| Plumbing | `#E7EDFF` | `#0352AE` | `Color(0xFFE7EDFF)` / `Color(0xFF0352AE)` |
| Electrical | `#FFF3D6` | `#8A5A00` | |
| Cleaning | `#E2F3EA` | `#0F6B3F` | |
| Tutoring | `#ECE7FB` | `#5B3BB8` | |
| Appliance | `#FDE8E4` | `#A63709` | |
| Delivery | `#D9F6F7` | `#036E74` | |
| Fruit (pilot) | `#EDF5E1` | `#3F6212` | measured 6.32:1 on its own tint, 6.49:1 on the page |

## 3. Type

`--font-ui` is **Poppins** (owner ruling 2026-10-27), self-hosted as eight WOFF2 faces.
`--font-figures` is **Plus Jakarta Sans**, because it is the bundled face that is both tabular and
slashless — measured with `node tools/shot.cjs --probe=@tools/probe-zero-style.js`:
Atkinson 364.05/364.05 tabular **with a slashed zero**, Jakarta 345.61/345.61 with a plain round
zero, Poppins 184.33/361.73 carrying no tabular feature at all. Money, counts, rates and dates
therefore paint in Jakarta through the one shared numeral rule; words stay Poppins.

The scale is in `rem`, because Android multiplies the used font size after CSS resolves and a px
scale silently refuses the user's text setting.

| Role | CSS | Value | Weight | Flutter `TextTheme` |
|---|---|---|---|---|
| display | `--t-display` | 1.875rem (30px) / 34 | 700 | `displaySmall` |
| headline | `--t-title-lg` | 1.5rem (24px) / 30 | 700 | `headlineSmall` |
| title-lg | `--t-title` | 1.25rem (20px) / 26 | 600 | `titleLarge` |
| title | `--t-body-lg` | 1.0625rem (17px) / 22 | 600 | `titleMedium` |
| body-lg | `--t-body` … `--t-lead` | 1rem–1.125rem (16–18px) / 24 | 400 | `bodyLarge` |
| body | `--t-body-sm` | 0.9375rem (15px) / 20 | 400 | `bodyMedium` |
| label-lg | `--t-caption` at 600 | 0.875rem (14px) / 20 | 600 | `labelLarge` |
| label | `--t-caption` at 500 | 0.875rem (14px) / 16 | 500 | `labelMedium` |

**The floor is 14px, not the brief's 12px.** AGENTS.md §68 sets it as an accessibility ruling
measured on two handsets, and the camera fails any essential text below it. Listed under Decisions
for the owner rather than resolved by a quiet number. Inputs stay 16px because a smaller input makes
a mobile browser zoom on focus.

## 4. Shape, space, chrome

| Token | Value | Flutter |
|---|---|---|
| `--s-1 … --s-8` | 4 · 8 · 12 · 16 · 20 · 24 · 28 · 32 px | an 8 px rhythm with 4 px sub-steps |
| `--r-xs / --r-sm / --r-card` | 8 · 10 · 12 px | inputs, chips, small tiles |
| `--r-md / --r-tile` | 14 · 16 px | cards, category tiles |
| `--r-lg / --r-sheet` | 20 · 28 px | sheet top radius |
| `--r-pill` | 999 px | chips and the nav indicator only |
| `--tap` | 44 px | the floor the camera enforces; §3.1 asks 48, nothing goes below 44 |
| `--field-h / --cta-h` | 48 · 50 px | |
| `--nav-h` | 64 px | `NavigationBar` height + `SafeArea` |
| top bar | 56 px min-height, 16 px gutter | `AppBar` |
| list row | 64 px, 72 px with a leading tile | `ListTile` |
| section gap | 24 px | |

Elevation is flat by default: a tonal step or a hairline, never a shadow, on lists. One soft shadow
level exists, for sheets and the sticky action bar (`--shadow-sm` / `--shadow-md`).

## 5. Layer ladder

`--z-sticky 20 < --z-nav 30 < --z-fab 40 < --z-sheet 60 < --z-modal 70 < --z-map-veil 1100 <
--z-toast 9999`. The gate asserts the **relations**, so renumbering that keeps the order passes and
an inversion cannot. In Flutter: `elevations` inside a `Scaffold`, then a route, then
`showModalBottomSheet`, then `showDialog`, then `ScaffoldMessenger`.

## 6. Components → widgets

| Component | Class in the page | Flutter |
|---|---|---|
| large-title bar (tab roots) | `.topbar` + `.screen[data-root="1"]` | `SliverAppBar.large` |
| pushed bar | `.topbar` with `.back-btn` (a bare chevron) | `AppBar` |
| navigation bar | `.bottomnav`, `.navitem`, `.navitem.active .ic::before` (the pill) | `NavigationBar` |
| sticky action bar | `.book-bar`, `position:sticky` | `BottomAppBar` / a pinned footer |
| list row | `.list`, `.list-row` | `ListTile` |
| card | `.card` | `Card.filledTonal` where a tint is used, otherwise `Card.outlined` |
| category tile | `.tile`, `.tile.lg` | a `Container` with the pair from §2 |
| filled / tonal / outlined / text button | `.btn`, `.btn.secondary`, `.btn.tertiary`, `.btn.danger`, `.btn.onbar` | `FilledButton`, `.tonal`, `OutlinedButton`, `TextButton` |
| chip / choice chip / filter chip | `.chip`, `button.chip`, `[aria-pressed]` | `ChoiceChip`, `FilterChip` |
| choice rail (payment, saved address) | `.req-rail` of `.pick[aria-pressed]`; wraps to a second row when the panel cannot hold the whole row, so a chip is never half-cut | `Wrap(spacing: 8, runSpacing: 8)` |
| segmented control | `.auth-switch`, `.seg-btn` | `SegmentedButton` |
| text field | `.form-input`, `.form-label` | `TextFormField` |
| bottom sheet | `.sheet-layer`, `.sheet` | `showModalBottomSheet` |
| snackbar | `.toast` | `ScaffoldMessenger.showSnackBar` |
| empty state | `.empty`, `.empty-icon`, `.empty-title`, `.empty-body` | an icon + title + one line + one action |
| stepper — compact, on a card | `.mini-steps` + `.step-line`, from `stepBar(status)` | a `Row` of six `Expanded` bars and one `Text` line |
| stepper — labelled, on the screen that owns the job | `.stepper` `.sp` `.step-mark` `.slabel` `.ssub`, from `stepPath(booking)` | `Stepper` with `Step(isComplete, isSelected)` |
| avatar (monogram) | `.mono-avatar`, from `photoAvatar(person, size)` | `CircleAvatar` with a `Text` child |
| rating | `★ 4.9 · 214 jobs`, one line, never wrapping | a `Row` of `Text` with `--font-figures` |

## 7. Rules a port must keep

- Booking state and payment state are **separate fields and separate indicators** (§22).
- No cost is hidden; an estimate is labelled an estimate (§24).
- Category artwork never animates, at any motion setting (§46).
- Honest labelling survives restyling: `demo`/`live`, "pilot", "declared, not verified", the
  simulated-concierge disclosure and "sample figures from this prototype" stay (§63, §86).
- Everything is local. The only network dependency is OpenStreetMap's tile server (§81).
- `color-scheme: only light` stays declared; there is no dark mode and none is half-built.

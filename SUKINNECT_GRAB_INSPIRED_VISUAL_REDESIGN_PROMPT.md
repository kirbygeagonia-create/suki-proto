# MASTER PROMPT — SUKINNECT GRAB-INSPIRED STATIC CATEGORY ART, ICONOGRAPHY, AND DATA-VISUALIZATION REDESIGN

> **Operating rule:** Investigate first, write the proposal to a Markdown file, and STOP for the project owner's explicit approval. Do not modify the application during the investigation/planning phase. Implementation begins only after approval.

> **STATIC CATEGORY ART RULE — HIGHEST DESIGN PRIORITY:** The service-category illustrations in Resident Home → Services / Browse by service must never move or animate. Apply the same static-art rule anywhere category illustrations are reused in the app. Soft-3D/2.5D appearance is achieved through static vector artwork, layering, highlights, gradients, and shadows only. If any instruction conflicts with this rule, this rule wins.

You are acting as Sukinnect's senior product designer, mobile UI/UX auditor, SVG illustration designer, front-end engineer, and regression-testing engineer. Your assignment is to propose and, after approval, implement a cohesive visual redesign of the service-category illustrations, functional icons, charts, data visualizations, and related visual treatments across **every existing role and relevant module** of the Sukinnect prototype. The visual inspiration is the Grab app's approachable, polished, slightly dimensional service-category illustrations—not a copy of Grab's brand or artwork.

The system is already implemented. Do not approach this as a new app or a blank canvas. Understand the current prototype, its newer domain-kernel branch, its product and visual rules, its existing SVG scenes (some currently contain motion), and the constraints below before proposing changes. Any existing motion inside service-category illustrations must be removed or disabled as part of this work.

> **NON-NEGOTIABLE OWNER REQUIREMENT — CATEGORY ILLUSTRATIONS MUST NOT MOVE:** The Resident role's Home page contains a **Services / Browse by service** category grid. The service-category icons/illustrations in that grid must be completely **static**. Do not animate, move, rotate, bounce, float, pulse, wiggle, spin, sway, flip, bob, drift, or otherwise move any part of a category illustration. This includes SVG sub-elements, CSS pseudo-elements, particles, droplets, bubbles, page corners, appliance drums, parcels, road marks, leaves, fruit, highlights, or shadows. Static soft-3D/2.5D styling is welcome; movement is not. For consistency, keep service-category illustrations static wherever the shared artwork is reused across all roles and modules. Other non-category UI feedback or charts may use restrained motion only when useful and accessible, but it must never animate the service-category artwork. The larger task remains a coordinated visual redesign of functional icons, category art, charts, metrics, and visualizations across Resident, Service Provider, and Admin screens—not just this one grid.

---

## 0. REPOSITORY AND FILE SCOPE — DO NOT GET THIS WRONG

Repository: `https://github.com/kirbygeagonia-create/suki-proto`

Working branch: `feat/domain-kernel`

**Primary target file:** `Sukinnect-next.html`

**Do not redesign or overwrite `Sukinnect.html`.** The repository documentation identifies `Sukinnect.html` as the shipped/older prototype and `Sukinnect-next.html` as the active rebuild that contains the domain kernel. Keep their distinction intact. Do not switch branches, reset work, force-checkout files, or overwrite local changes just to make the work easier.

Before any action, inspect `git status`, the current branch, and the latest commit. Preserve uncommitted work. If you are operating in an existing local checkout, do not clone over it. If you must create a fresh checkout, install Git LFS before cloning and verify LFS files with `git lfs pull` where available. The GitHub tree showed 133-byte pointer stubs for the pitch-deck PDF/PPTX and `reicon.js`; verify local asset sizes instead of assuming the full binary objects are present. The active `Sukinnect-next.html` contains its own inline icon drawings and should not need `reicon.js`.

### Read these before making the proposal

1. `AGENTS.md` — authoritative product, branding, UI, accessibility, mobile, privacy, data honesty, and implementation constraints.
2. `SUKINNECT_MASTER_IMPLEMENTATION_PROMPT.md` — latest domain-kernel and end-to-end product requirements.
3. `README.md` — active file, architecture, verification commands, screenshots, and known limitations.
4. `CHANGES.md` — history of the rebuild, prior audits, previous visual fixes, icon-system defects, and decisions that must not be repeated.
5. `DEVICE-PASS.md` — existing device/mobile verification findings.
6. `SUKINNECT_UIUX_REDESIGN_PROMPT.md` — historical mobile design rationale; verify which items have already been implemented before treating them as outstanding work.
7. `schema/sukinnect.reference.sql` and `tools/verify.cjs`, `tools/shot.cjs`, `tools/measure.cjs` where present and applicable.
8. The relevant sections and functions in `Sukinnect-next.html`, especially `:root`, category artwork/CSS, `SERVICE_THEME`, `SERVICES`, `catArt()`, `ICONS`, `ic()`, `residentHome()`, all provider screens, all admin screens, analytics helpers, the render/navigation/state logic, and responsive/reduced-motion styles.

Do not rely on an old audit paragraph without comparing it to the current code. The repository's change log explicitly records that some previous findings have already been corrected.

---

## 1. PRODUCT CONTEXT THAT THE DESIGN MUST PRESERVE

Sukinnect is a hyperlocal service marketplace for an initial municipality in the Philippines. The product connects residents with local skilled workers/providers and supports discovery, trust evaluation, booking, coordination, payment/settlement records, reputation, and administration.

The core product journey is:

**FIND → REVIEW → BOOK → RECORD**

Current major roles:

- **Resident / customer:** discovers services, searches providers, compares trust and price information, creates and tracks requests/bookings, messages providers, reviews records, and manages an account.
- **Service Provider:** receives and evaluates requests, manages jobs and schedules, coordinates with customers, maintains a professional profile, handles offers and service completion, and views earnings/payout records.
- **Admin:** reviews verification and credentials, manages providers/categories, monitors disputes and trust/safety, views marketplace activity, checks records and money flows, and performs operational administration.

The current rebuild also includes the **Fruit Harvest & Buy** pilot category, which has category-specific transaction modes and a distinct finalization/quantity path. Do not assume there are only six categories. Read the current `SERVICES` catalogue and make the artwork system data-driven so additional service categories do not require redesigning the entire interface.

Preserve the existing domain kernel, centavos-based monetary model, shared booking records, booking state machine, ledger, payment records, refund/payout logic, offers, disputes, messaging, persistence adapters, and test harnesses. This task is primarily a **visual-system redesign**, not permission to rewrite the product logic.

All demo data remains demo data. Do not describe sample analytics as live market traction or invent real users, bookings, revenues, supply, demand, forecasts, trust decisions, or provider qualifications.

---

## 2. BASELINE FINDINGS — CONFIRM AGAINST THE CURRENT FILE

The current `feat/domain-kernel` branch already contains a fairly advanced mobile-first prototype:

- `Sukinnect-next.html` is a large, single-file HTML/CSS/JavaScript app (about 9,754 lines in the inspected repository version).
- It uses a centralized `:root` design-token block, `Plus Jakarta Sans`, `Fraunces`, locally bundled fonts, Leaflet, inline SVG icons, and CSS motion for certain interface/illustration elements.
- Its service-category tiles already use custom inline SVG **scenes**, including a dripping tap, sparking bulb, bubbles, a book, an appliance drum, and a parcel/road treatment. Some elements currently move. Treat the scene concepts and artwork as a design foundation, but remove/disable all movement from every category scene and refine the art into a polished static soft-3D/2.5D family.
- The rebuild intentionally stopped loading the large `reicon.js` icon library. Its inline `ICONS` map and `ic()` helper are the functional icon path. Prior work found that removing an icon library without auditing names carried by records could silently blank six icons; the existing change log describes that defect and the coverage strategy that was added.
- The code has a `SERVICE_THEME` palette and category metadata. Preserve that architecture instead of scattering one-off icon styles through unrelated markup.
- There are existing charts or chart-like components in provider analytics and admin screens, including handcrafted bar charts, SVG trend charts, conic-gradient donuts, KPI/stat strips, and progress bars. Some historical chart values or narratives have been identified as hard-coded or inconsistent. Audit each current chart rather than assuming every existing figure is valid.
- The product is designed for a mid-range or lower-spec Android device, offline-capable local assets, and an Android WebView. Decorative quality must not become a performance regression.
- Existing verification tooling tests much more than visual rendering. It protects the real domain model and interaction paths; keep it intact and use it.

The plan must include a verified inventory of current screens, category visuals, functional icon usage, chart-like elements, sources of chart values, and current defects. Do not claim the inventory is complete until you have inspected the active file and the project's screen-list/testing tooling.

---

## 3. GRAB-INSPIRED VISUAL RESEARCH AND WHAT TO LEARN FROM IT

Use these references to understand the design inspiration:

- Grab Philippines — improved service menu and comparison/discovery patterns: https://www.grab.com/ph/bottom-navigation/
- Grab Philippines — current service families and multi-service structure: https://www.grab.com/ph/
- Grab service iconography portfolio — examples of custom illustrations developed through iterative sketches and product/design collaboration: https://somewan.design/grabicons
- Grab service-icon examples published in its engineering article: https://engineering.grab.com/how-grab-is-blazing-through-the-super-app-bazel-migration

Visual principles to adapt, not copy:

1. **At-a-glance recognition:** the pictogram should communicate the service before the user reads the label.
2. **Small-scale clarity:** category artwork remains legible in a compact mobile tile and does not become a detailed miniature poster.
3. **Consistent illustration grammar:** common camera angle, scale, light direction, material style, shadow softness, and density across the whole category family.
4. **Friendly dimensionality:** use layered shape depth, rounded forms, controlled highlights, subtle ambient shadows, small gradients, and a coherent ground plane to create a polished **2.5D / soft-3D impression**.
5. **Color restraint:** use Sukinnect's brand tokens for brand-level surfaces and controls. Existing per-service colors are supporting accents, not a competing brand system.
6. **Discoverability before decoration:** the category grid should remain scannable. Illustration is there to improve recognition and delight, not to push search, a live booking, or a necessary action below the fold.
7. **Static category art:** service-category illustrations must not move. Achieve dimensionality through carefully drawn shapes, gradients, highlights, and static shadows—not animation. Reserve any purposeful motion for separate non-category UI feedback or charts, where it improves understanding.

**Do not copy Grab's actual icons, logos, illustrations, green visual identity, or proprietary artwork.** Create distinct Sukinnect-native scenes based on local service concepts and the current code's service metadata.

---

## 4. DESIGN DIRECTION — TARGET ART SYSTEM

Aim for a trustworthy, local, quick, approachable visual language with polished mobile-app quality.

### 4.0 Owner clarification: full-system redesign, with absolutely static category illustrations

The Resident Home **Services / Browse by service** grid is a critical target, but not the only target. Do not respond by changing only those tiles and leaving the rest of the app visually unchanged. Also do not replace the whole request with a broad animation pass.

**Every service-category illustration must remain completely static**, especially all category icons displayed in the Resident Home Services grid. For consistency, apply this rule to category artwork wherever it is reused: resident category lists and filters, service details, provider service displays, and admin category management. No illustrated sub-part may move on its own or as a result of page load, hover, focus, tap, scroll, or re-render. This is an explicit project-owner requirement and overrides any contrary guidance elsewhere in the repository or this prompt.

The proposal must show how the visual upgrade will carry through the actual inventory of screens and modules in all three roles. That includes shared functional icons, category representations where they recur, status and action indicators, and every meaningful chart/visualization on provider and admin screens, plus any other role-specific visualization found in the code. Adapt the design to each context: service discovery can use richer **static** soft-3D illustrations; compact controls need simple glyphs; analytics need readable, evidence-based charts; operational lists need clear symbols and action hierarchy.

**Grab-inspired means dimensional visual quality, not moving category icons.** Achieve depth through static layered geometry, gradients, highlights, and carefully rendered shadows. Do not animate category art to imitate Grab. Other non-category interface elements or charts may use restrained motion if it genuinely helps feedback or interpretation, but category art must remain stationary even when reduced-motion settings are not enabled. The app should also remain clear and useful with `prefers-reduced-motion: reduce` enabled.

### 4.1 Category illustrations: the 2.5D/soft-3D family

Audit the current `catArt(serviceId)` (or the actual current equivalent) and its SVG/CSS scenes. Improve and standardize the existing scene family instead of replacing all scenes with emoji, generic line icons, external image URLs, or arbitrary downloaded assets.

Each category illustration should have:

- A clear central silhouette recognizable at small size.
- Two or three purposeful depth layers where useful (foreground object, secondary piece, base/ground plane).
- Consistent top-left or upper-left key light across the set.
- A soft cast shadow and contact shadow that suggest volume without heavy blur effects.
- Restrained SVG gradients and highlights; avoid shiny plastic, harsh skeuomorphism, excessive gloss, or over-detailed textures.
- A soft, coherent local canvas/surface that fits the existing category tile dimensions.
- An appropriate optical center, with the label staying readable beneath/alongside it.
- A unique identity and a shared construction grammar. It should look like one intentionally designed family, not seven unrelated clip-art images.
- A finished static appearance at all times; the illustration must never depend on an animation or animated fallback.

Maintain the current category palette relationship through `SERVICE_THEME`/metadata. If adding design tokens, add them to the **single existing `:root` block**. Do not create a second root block or sprinkle raw brand hex values throughout inline styles.

### 4.2 Category scene concept matrix — static artwork only

Confirm the exact current category IDs and labels before implementation. Use the following as static art direction, not permission to change category naming or behavior:

| Service concept | Static illustration direction |
|---|---|
| Plumbing | Dimensional tap/pipe fitting with a fixed droplet shape and a soft contact shadow; the droplet must not fall or ripple. |
| Electrical | Rounded bulb with a clearly visible filament and a fixed small spark/highlight; no flashing or glow pulsing. |
| Cleaning | Cleaning bottle/brush/cloth with a few fixed bubble shapes; no bubbles rising, fading, or drifting. |
| Tutoring | Open book with layered pages and a bookmark/pencil; page corners and bookmark remain still. |
| Appliance | Stylized washer/appliance front with a visible drum; drum does not rotate. |
| Delivery | Dimensional parcel on a static curved path or fixed road marks; no bobbing package or moving road lines. |
| Fruit Harvest & Buy | Static produce cluster, leaf/branch, harvest basket, or crate that reads as local produce; fruit and leaves remain still. |

Treat these examples as visual concepts only; verify every currently registered category from `SERVICES` and cover the entire catalogue. Refine the existing scenes' layering, consistency, silhouettes, light direction, material treatment, and static composition. Add/refine Fruit Harvest & Buy artwork in the same family. Do not let category artwork alter category transaction modes, pricing, booking flow, or labels.

### 4.3 Absolute no-motion rule for service-category illustrations

This rule is mandatory and takes precedence over any general motion guidance in the repository, existing CSS, old prompts, or later sections of this document:

- The Resident Home **Services / Browse by service** category icons/illustrations must remain static in all circumstances.
- For consistency, all category illustrations used elsewhere in the application must also remain static.
- Do not use CSS `animation`, SVG `<animate>`/`<animateTransform>`, JavaScript animation loops, `requestAnimationFrame`, animated GIF/APNG/WebP, Lottie, video, or any similar mechanism on category art.
- Do not move or transform any internal illustrated element on page load, idle, hover, focus, press, scroll, route change, or re-render. Remove existing keyframes/rules for category-specific motion, including droplet falls, sparks/flashes, bubbles, page turns, rotating appliance parts, parcel bounces, road movement, leaf sway, and fruit movement.
- Do not fake movement using animated highlights, changing shadows, pulsing opacity, or moving pseudo-elements.
- The category tile itself may retain a clear, non-moving pressed/focus state (for example, a border or background color change), but neither the tile's illustration nor any of its internal parts may translate, rotate, scale, or animate. Avoid transform transitions on the category-art subtree.
- Prefer static SVG paths and shapes, static gradient fills, fixed highlights, and static ellipse/contact shadows. Keep gradients and shadows lightweight.
- Do not globally disable all app motion. Screen transitions, loading feedback, and chart interaction may retain restrained motion where appropriate, but must be separate from category illustrations and respect `prefers-reduced-motion`.

Verification must check actual computed/rendered behavior, not just rely on visual intuition: category-art elements must have no active animation and no hover/active transform that causes movement. Test on the Resident Home with normal settings and with reduced motion settings.

### 4.4 Scope of illustration versus UI glyphs

Use dimensional scenes for **service category discovery and selected service identity contexts**. Do not turn every small functional icon into a 3D mini-object. Functional icons (back, search, calendar, location, chat, settings, status, charts, etc.) should stay a consistent, legible inline SVG glyph family. This contrast is intentional: category scenes attract attention; control icons stay fast to parse.

### 4.5 Where category art must remain consistent

Do not interpret the following reuse list as permission to focus exclusively on category tiles. It addresses where the **category artwork** appears; Sections 5 and 6 independently require full-role coverage for functional iconography and data visualizations.

Map the shared artwork system to all existing contexts that present services, where appropriate:

- Resident home category grid;
- service/category catalogue and category selection sheets;
- search/results filters or category chips, using smaller/simpler variants when space is limited;
- service/provider detail where category identity is useful;
- Service Pro profile, service listings, and category-specific views;
- Admin category catalogue/management and related category-review screens.

Use the same source of truth for a category's art, icon, label, and accent. Do not duplicate the SVG markup into each screen. Choose compact variants for rows; do not force large artwork into dense operational tables.

---

## 5. FUNCTIONAL ICON SYSTEM — EVERY ROLE, EVERY MODULE

Audit the full inline `ICONS` map, the `ic()` renderer, any filled variants, and every way an icon name reaches the renderer. Include names that appear directly in markup, names carried by service/notification/status records, and names passed through helpers such as empty states or role navigation. A grep for `ic('name')` alone is not sufficient.

Goals:

- Consistent viewBox, visual weight, stroke/cap/join treatment, optical size, baseline alignment, and fill behavior.
- Predictable sizes: choose a small tokenized scale (for example 14, 16, 18, 20, 24) based on actual use, not arbitrary per-call sizing.
- A clear outline/default versus filled/active rule, especially for bottom navigation and selected controls.
- Icons must inherit color via `currentColor` unless a purposeful semantic color is necessary.
- All expected glyph names resolve. Do not let an unknown icon silently become an empty string in a live UI. Add a valid neutral fallback only if appropriate, and make missing names fail the development/verification gate or produce a detectable warning in test mode.
- Decorative SVGs use `aria-hidden="true"`; meaningful icon-only controls have accessible names and real button semantics. Status information always has readable text as well as icon/color.
- Do not use emoji as replacements for service or functional icons.
- Do not introduce icon fonts, remote SVGs, remote CDNs, a new icon package, or a second source of truth.
- Keep the official `Sukinnect_Logo.png` asset untouched. It is brand artwork, not a glyph and not replaceable by the redesigned icon set.

### Role-specific icon audit

Inventory the existing icon use for the complete current role/module list, including (at minimum and verified against code):

**Resident:** home, search, notifications, category/service discovery, provider trust/verification, location/map, ratings, booking status, calendar/time, booking detail, price/estimate, offer/answer, messages/chat, transaction/payment status, history/records, profile, settings, help/disputes, and relevant empty/loading/error/success states.

**Service Provider:** dashboard, request inbox, accept/decline, bookings/job status, schedule/calendar, navigation/map/arrival, messages, service and portfolio, verification/credentials, availability, offer/quotation actions, earnings/statement, payout/settlement, disputes/help, account/security, and fruit/harvest mode-specific actions where applicable.

**Admin:** operational dashboard, cases/disputes, provider applications, credentials/expiry, user/provider management, category catalogue/configuration, marketplace intelligence, supply/demand, risk/trust and safety, audit log, financial records/commission/refund/payout, search/filter, and account/settings.

Do not add new navigation sections simply to showcase icons. Keep the actual information architecture and role-specific bottom-navigation models intact.

---

## 6. CHARTS AND DATA VISUALIZATIONS — MAKE THEM CLEAR, USEFUL, AND TRUE

Redesign existing chart-like visualizations instead of adding charts to every module. Not all screens need a chart. For residents, a booking timeline, clear stepper, service category scene, provider trust summary, and transparent pricing breakdown are often better than analytics. A visualization earns its place only when it helps the current role make a decision.

### 6.1 Inventory first

Find every chart, sparkline, donut/pie, bar chart, progress bar, stat strip, trend line, workload visualization, and chart-like illustration. Record its screen/function, purpose, backing data, whether it is interactive, and whether its figures are derived or hard-coded. Include all provider and admin analytics and any financial/operational views.

### 6.2 Provider visuals

The Service Pro experience should prioritize work and decisions, not decorative analytics:

1. Requests requiring a response and today's schedule remain prominent.
2. Use compact, understandable summaries for completed work, completion rate, review health, pending amounts/payouts, or earnings only when the existing data model supports them.
3. Move secondary charts lower in the existing Insights/FSM area or behind existing disclosure/navigation when appropriate; do not put large analytics ahead of pending jobs.
4. Prefer a modest weekly earnings SVG line/sparkline with a clear period and currency axis, simple horizontal demand bars for barangay/category comparison, and clearly labelled sentiment breakdowns only when the records actually contain review data.
5. Titles describe the question answered (for example, **Weekly earnings**, **Requests by barangay**, or **Client feedback**), not the chart implementation (no “Line Graph”, “Bar Graph”, or “Donut Chart” in user-facing headings).
6. Remove or recompute descriptive claims such as “steadily increased”, “peaking at ₱4,200”, a fixed growth percentage, or a quoted barangay share unless the chart's backing records calculate and support that exact claim.

### 6.3 Admin visuals

Admin is an operations console. Prioritize “Needs attention”, then the role's actual roster/volume summaries, then the analytics that help explain or prioritize work. Use the actual model helpers and records (for example, `adminCounts()`, `marketplaceRates()`, `networkSummary()`, category/provider/booking/verification/case collections, and other current domain functions where applicable). Do not assume these example helper names cover everything—inspect the active code.

Good visualization choices include:

- horizontal bars for provider distribution by category or service supply/demand;
- a small, labelled bar or line chart for activity over a defined time interval, only if timestamped source data exists;
- progress bars for completion/verification/case outcomes when numerator and denominator are available;
- a stacked bar for mutually exclusive booking/case states, if it answers an operational question;
- a donut only when it truly communicates a part-to-whole distribution and the legend/labels expose the actual values.

Every clickable statistic or chart segment must open the existing relevant object/screen, or remain explicitly non-interactive. Do not present a whole chart as a button if only one segment is actionable.

### 6.4 Data integrity is non-negotiable

- Derive displayed figures from the same authoritative records/state used by the screens, using shared calculation helpers where possible.
- If the demo dataset does not contain the required time series or metric, do not fabricate it. Remove the unsupported chart or show a clearly labelled neutral/empty state explaining that there is not enough sample data.
- Never turn a pilot target into actual traction, a sample count into live volume, or an invented forecast into a prediction.
- Keep booking status and payment status separate in both data and visualization.
- Keep produce/fruit money separate from service money wherever the model specifies different transaction/accounting treatment.
- Do not invent new matching, trust-score, risk, forecasting, commission, or payout algorithms for visual convenience.
- Show units, period/range, useful labels, and exact values on tap/focus when useful. Avoid axes that exaggerate a minor difference or conceal a zero baseline without a clear reason.
- Color is not the only encoding. Use labels, icons, shape/pattern, or adjacent numbers. Preserve semantic success/warning/error colors separately from Sukinnect brand colors.
- Show “Demo data” / “Sample records” in a quiet but legible position on prototype analytics.
- If the chart is empty or data is unavailable, render a designed empty state, not a broken axis, a donut that looks like 0%, NaN, or an unexplained blank card.

### 6.5 Visual language for charts

Use a small shared chart language aligned to the existing tokens:

- one consistent chart-title and summary-value treatment;
- clear labels and a simple legend;
- subtle gridlines or baselines;
- calibrated stroke weights and bar corner radii;
- semantic colors for status data and restrained brand blue/cyan for neutral series;
- responsive SVG viewBoxes or CSS layouts that do not overflow the 390px-class phone canvas;
- an accessible text summary or `role="img"`/`aria-label` for each non-interactive chart;
- a readable text/table alternative for important values;
- short optional entrance animations (bar growth/line draw) only if inexpensive, one-shot, and disabled by reduced-motion preferences.

Prefer native inline SVG and CSS over a new chart library. Do not introduce Chart.js, D3, a canvas/WebGL engine, animation framework, remote dependency, or large generated images just to style these charts.

---

## 7. BRAND, COMPONENT, AND LAYOUT CONSTRAINTS

Respect the existing design tokens and the authoritative brand rules in `AGENTS.md`:

- Logo blue: `#0352AE`.
- Logo cyan: `#05BCC4` — an accent, not low-contrast body text on white.
- Navy: `#03002B`.
- Electric blue: `#0E4DFF`.
- Background: `#F1F5FF`.
- Periwinkle tints: `#C9D5FF`, `#E7EDFF`.
- White surfaces and existing slate text tokens.
- Semantic green/amber/red remain semantic status colors, not a replacement brand palette.
- `Fraunces` and `Plus Jakarta Sans` are already self-hosted. Do not add remote fonts.

Keep a single `:root` design-token block. Reuse existing radius, spacing, typography, elevation, touch-target, and motion tokens. If new illustration/chart-specific tokens are justified, name and document them in that same root.

Do not redesign unrelated components merely because this task touches icons. Preserve:

- the official logo, role hierarchy and role-specific bottom nav;
- the existing single-file HTML/CSS/JS architecture;
- `?app=1` app mode and the desktop phone preview;
- Leaflet and map behavior;
- search/filter and category navigation;
- existing booking/offer/negotiation/booking-state interactions;
- payment status separate from booking status;
- provider/credential review, trust and safety, disputes, admin finance, and audit flows;
- offline/local asset behavior, domain kernel, and data persistence mechanisms.

Use category-specific accent colors only where the existing category theme intends them. Do not put a dramatic gradient on every card. Reserve strong gradients for existing brand surfaces, selected states, and limited high-priority actions. Do not make a “Grab-green Sukinnect.”

---

## 8. PERFORMANCE AND ACCESSIBILITY BUDGET

The interface must continue to feel quick on a lower-spec Android phone and an Android WebView.

- SVG scenes and icons should be lightweight, locally embedded, and reusable.
- Avoid external images, network dependencies, large raster sprites, Base64 asset dumps, canvas/WebGL, continuous particle effects, expensive SVG filters, heavy blur/backdrop-filter, and per-frame JavaScript loops.
- Prefer `transform` and `opacity` animation properties. Keep SVG filter use minimal; use simple ellipses and gradients for shadows when possible.
- Avoid rebuilding all SVG markup on every unrelated `render()` call if doing so restarts animation or hurts input/scroll stability. Follow the current state/rendering discipline.
- Do not preload all artwork through a large hidden image gallery. Inline scene functions should remain cheap to render.
- Use touch-friendly controls. Do not make category recognition depend on animation or hover.
- Maintain existing tap target minimums, focus-visible styles, keyboard accessibility, readable contrast, safe areas, and the 12px minimum text rule documented by the current app.
- Decorative SVGs should not clutter the screen reader. Actionable icons require accessible names, focus, and button semantics.
- Honor `prefers-reduced-motion: reduce` across icon, chart, and transition motion.
- Do not start an animation again on filter changes, accordion expansion, input typing, notification read/unread, or another in-place state change unless the specific component intentionally needs it.

---

## 9. REQUIRED INVESTIGATION/PLANNING PHASE — DO NOT IMPLEMENT YET

Before changing code:

1. Confirm the correct branch and file. Read the documents listed in Section 0.
2. Inspect worktree status. Record any pre-existing local modifications; never overwrite them.
3. Run the existing verification commands where supported. At minimum inspect the test/screenshot instructions in `README.md` and execute the applicable baseline checks (typically `node tools/verify.cjs`, `node tools/measure.cjs Sukinnect-next.html`, and `node tools/shot.cjs --list`). If the environment supports Chrome screenshots, capture baseline images for every screen listed by the harness, including reduced-motion where supported. If a command fails due to missing runtime/dependency or absent LFS objects, record the actual failure instead of claiming it passed.
4. Build a **screen inventory** from the real rendering/navigation code and the screenshot harness for Resident, Service Pro, and Admin. Include all tabs, detail views, sheets/modals, admin sub-pages, profile sections, category flows, and Fruit Harvest & Buy mode/finalization screens that really exist. Do not infer a screen exists only because it is mentioned in documentation.
5. Build an **icon inventory** covering every functional glyph, every data-driven glyph name, every category art scene, current size/variant, current role/screen usage, and missing/fallback status.
6. Build a **visualization inventory** covering each chart/progress/stat element, screen owner/role, question it answers, source collection/helper, whether values are computed or hard-coded, and any unsupported statement it makes.
7. Record baseline design defects supported by code/screenshots. Separate confirmed defects from hypotheses and opportunities. Do not repeat historical issues that have already been fixed.
8. Design a visual-system proposal with representative examples for the category family, icon grammar, chart grammar, data source rules, motion, tokens, screen placements, performance, and verification plan.
9. Write your findings and proposed changes to:

   **`SUKINNECT_VISUAL_REDESIGN_PLAN.md`**

   The file must contain:
   - executive summary and scope boundaries;
   - branch/file confirmation and worktree status;
   - current screen/role/module inventory;
   - category-art audit with all current service IDs and a visual concept for each;
   - functional icon inventory and coverage/missing-name analysis;
   - chart/visualization inventory with data-source verification;
   - a proposed visual direction and shared component/token design;
   - specific before/after concepts or concise textual wireframe notes for Resident, Service Pro, and Admin;
   - implementation phases, exact target functions/classes, estimated risk, and files likely to change;
   - mobile accessibility/performance safeguards;
   - baseline verification results and screenshot paths;
   - acceptance checklist and unresolved questions.
10. **STOP after creating `SUKINNECT_VISUAL_REDESIGN_PLAN.md`.** Present a clear summary of the proposal and ask for the owner's explicit approval before editing any application code. Do not treat silence, a generated plan, or a general request to investigate as approval to implement.

If the user approves the plan, use that plan as the authorized scope. If a new requirement would materially expand scope or touch domain/financial behavior, call it out for approval rather than quietly adding it.

---

## 10. IMPLEMENTATION PHASE — ONLY AFTER EXPLICIT APPROVAL

### Phase A — protect the baseline

- Preserve the branch, worktree, test harness, and all unrelated changes.
- Keep scope primarily within `Sukinnect-next.html`; add small documentation or tests only where useful and consistent with project patterns.
- Do not rewrite the file into React/Vue/Flutter or split the architecture into packages.
- Save before/after screenshots to separate, non-destructive paths. Do not overwrite existing user evidence.

### Phase B — unify and refine category art

- Improve the shared category scene system and its shared CSS/structure.
- Implement all categories in the actual current `SERVICES` catalogue, including the Fruit Harvest & Buy pilot.
- Use consistent scale, viewBox, light, shadow, materials, and shape language. Every scene must be static at all times.
- Keep each scene readable when scaled down; remove category-scene animation rules rather than creating a static fallback for them.
- Reuse art in every appropriate category context rather than duplicating scene markup.
- Keep labels and current category IDs stable. No feature logic should depend on an art class, CSS state, or animation completing.

### Phase C — normalize the functional icon set

- Standardize outline and filled variants, sizing, alignment, color inheritance, and accessible labeling.
- Complete icon coverage based on names from markup, data rows, helper arguments, and dynamic states.
- Ensure a missing glyph is caught during verification instead of silently disappearing.
- Keep the logo asset separate and untouched.

### Phase D — redesign existing charts and metrics

- Refactor repeated chart markup into small shared render helpers only if this is safe in the current single-file style and keeps one source of truth.
- Derive values from current data. Remove unsupported conclusions/claims instead of guessing.
- Use concise, role-appropriate chart forms. Keep resident flows focused on booking/trust/service discovery; keep provider screens focused on work and earnings; keep admin screens focused on operations and data integrity.
- Maintain accessible labels, demo-data disclosures, text equivalents, useful empty states, and responsive fit.
- Use transitions only when they make the change easier to understand.

### Phase E — consistency across roles and modules

- Ensure Resident, Service Pro, and Admin screens use the shared systems consistently.
- Check root screens, drill-in screens, modals/sheets, profile sections, lists, category management, FSM/insights, trust/safety, disputes, and financial/admin screens.
- Do not insert oversized category illustrations in data-dense admin lists or use decorative charts on screens that do not need them.
- Do not alter bottom-nav destinations or create parallel category definitions.

### Phase F — verify and refine

Run the current repository's checks and screenshot every named screen after implementation. Use the exact commands supported by the current README/tooling, typically:

```bash
node tools/verify.cjs
node tools/measure.cjs Sukinnect-next.html
node tools/shot.cjs --list
node tools/shot.cjs
node tools/shot.cjs --reduced-motion
```

Run these only if the files/commands exist in the checkout; otherwise document the substitute actually used. Inspect the screenshots rather than trusting green test output alone.

Verify at minimum:

- all category scenes render in every relevant size/context, including Fruit Harvest & Buy, and remain completely static;
- every expected functional icon name resolves, with no blank/missing glyphs;
- the active and inactive navigation icon variants are consistent;
- charts show values that reconcile with their source records and do not contain invented claims;
- empty, one-record, zero-value, long-label, error, and reduced-motion states render sensibly;
- no horizontal overflow, clipping, broken text wrapping, hidden controls, or chart labels cut off at common phone widths;
- no animation covers text or controls, steals taps, or replays needlessly after an in-place update; no category illustration animates or moves at any time;
- keyboard/focus and accessible names still work;
- Resident booking/request, Provider acceptance/completion, offer/fruit flows, Admin verification/dispute/money flows, and back/sheet navigation are unchanged;
- booking/payment statuses remain separate, and the no-stored-value-wallet rule remains intact;
- no new network dependency or library was introduced;
- `Sukinnect.html` has not been modified by this task;
- all existing domain, persistence, ledger, booking-state, and journey tests pass.

If a check fails, distinguish pre-existing failures from regressions, reproduce the issue, and fix regressions before finishing. Never report a check as passed unless you ran it and saw it pass.

---

## 11. ACCEPTANCE CRITERIA

The work is complete only when all applicable criteria below are met:

**Scope and static-art gates:** it is an automatic failure if any service-category illustration moves or animates, especially in the Resident Home Services grid. It is also a failure if the only noticeable changes are in that grid while other relevant role modules, icons, charts, and visualizations are left unreviewed. Before calling the work complete, show a role-by-role and screen/module-by-screen/module coverage matrix for Resident, Service Provider, and Admin. State which screens were updated and which were reviewed but intentionally left unchanged, with a reason for each exclusion.

### Category illustration quality

- A coherent, clearly Sukinnect-branded soft-3D/2.5D illustration family exists for every current service category.
- The first six original scenes are refined rather than discarded without reason; Fruit Harvest & Buy has a matching illustration.
- Artwork remains recognizable at small sizes, has consistent lighting and geometry, and does not overwhelm category names or search.
- Every category illustration is completely static: no CSS/SVG/JS motion, moving parts, hover transforms, bounce, spin, pulse, drift, or animated shadows/highlights.
- Category art is sourced from one shared renderer/data mapping and reused consistently.

### Functional icon quality

- Every reachable icon name from static markup, data rows, and helpers resolves correctly.
- Outline/filled variants, sizes, alignment, semantic colors, and active states are consistent.
- Unknown icons are detectable and do not silently erase information.
- The logo and all existing navigation/interaction meanings are preserved.

### Chart and visualization quality

- Every existing visualization is inventoried and reviewed; charts are redesigned where needed, not copied wholesale from the old UI.
- All values and explanatory claims reconcile with existing records or are explicitly labelled as illustrative sample data. Unsupported claims and invented forecasts are removed.
- Charts answer clear questions and have a period, unit, label, or accessible textual equivalent.
- Empty/zero/unavailable states are deliberate and useful.
- Admin statistics do not contradict queue/record counts; provider charts do not show arbitrary data as fact.
- Important actions/navigation remain obvious and functional.

### Technical and product integrity

- `Sukinnect-next.html` remains the active target and the single-file app structure remains intact.
- No unrelated domain/business-logic changes, framework rewrite, wallet feature, external icon library, heavy animation engine, remote asset, or brand replacement is introduced.
- App mode, maps, role flows, category metadata, financial invariants, and test tools keep working.
- Existing verification and screenshot checks pass or any pre-existing environment/test failures are clearly reported.

---

## 12. REQUIRED FINAL REPORT AFTER IMPLEMENTATION

After implementation is approved and completed, provide a factual summary containing:

1. **Scope:** branch/file changed and confirmation that `Sukinnect.html` was not edited.
2. **Visual changes:** category art, functional icon rules, chart components, tokens, and the screens/roles affected.
3. **Data integrity:** which charts were converted to derived values and which unsupported claims/visuals were removed or labelled sample data.
4. **Files changed:** exact paths and rationale.
5. **Verification:** commands run, pass/fail results, number/list of screens visually reviewed, viewport sizes, reduced-motion check, and screenshot locations.
6. **Before/after observations:** concrete differences that can be seen, not subjective claims alone.
7. **Remaining limitations:** assets unavailable due to LFS, untestable device behavior, incomplete datasets, failing pre-existing tests, or unresolved design decisions.
8. **Regression confirmation:** resident, provider, admin, money/ledger, booking state, category, navigation, and mobile behavior preserved.

Do not claim that the design is “fully tested” if only static inspection was possible. Do not claim every screen was verified if the screenshot harness did not render every screen.

---

## 13. REFERENCE LINKS

- Repository: https://github.com/kirbygeagonia-create/suki-proto
- Target branch: https://github.com/kirbygeagonia-create/suki-proto/tree/feat/domain-kernel
- Grab Philippines service menu: https://www.grab.com/ph/bottom-navigation/
- Grab Philippines services: https://www.grab.com/ph/
- Grab iconography portfolio: https://somewan.design/grabicons
- Grab service-icon example article: https://engineering.grab.com/how-grab-is-blazing-through-the-super-app-bazel-migration

**Final instruction:** First inspect and verify. Then write `SUKINNECT_VISUAL_REDESIGN_PLAN.md` and stop for approval. After approval, implement an elegant, polished, lightweight, accessible, accurately data-driven Sukinnect visual system inspired by the *quality, dimensionality, and clarity* of Grab's category artwork—not a visual clone of Grab. All service-category illustrations must remain static, particularly the Resident Home Services grid. Make them look dimensional through art direction, not movement.

# SUKINNECT — MOBILE UI/UX REDESIGN PROMPT

Paste this whole file into your AI coding tool (Cursor, Claude Code, etc.) with the repo open.
It builds on `AGENTS.md`, it does not replace it. If the two ever conflict on product meaning, branding, or scope, `AGENTS.md` wins.

---

## 0. BEFORE YOU TOUCH ANYTHING

1. Run `git lfs install && git lfs pull`. `reicon.js`, the pitch deck PDF, and the PPTX are Git LFS files. Without LFS they are ~130-byte pointer stubs, and the icon set and deck will not load.
2. Read `AGENTS.md` completely. It defines the product (FIND → REVIEW → BOOK → RECORD), the roles, the brand palette, the logo rule, and the prototype-vs-production discipline. Everything below assumes you have read it.
3. Read `Sukinnect.html` end to end (about 4,300 lines). Key anchors:
   - tokens: the `:root` block near line 18
   - auth and splash CSS: around lines 200–300 and 790–840
   - state: the `state` object around line 1345
   - `render()` (~2115), `splashHTML()` (~2087), `loginHTML()` (~2192), `navHTML()` (~2371)
   - screen functions: `residentHome`, `residentResults`, `residentProviderDetail`, `residentBookingDetail`, `providerDashboard`, `providerBookings`, `adminDashboard`, and so on
4. Open the app at `Sukinnect.html?app=1` in a 390×844 viewport and walk all three roles (Resident, Service Pro, Admin) before designing. Take screenshots of every screen first, so you can compare before and after.

---

## 1. WHAT THIS PROJECT IS

Sukinnect is a hyperlocal services marketplace for Tupi, South Cotabato. It is a **mobile application** whose prototype happens to be one HTML file, which is also loaded in an Android WebView via `?app=1`. Three roles: **Resident**, **Service Pro**, **Admin**.

Design for a real phone held in one hand, on a mid-range Android, possibly on a weak connection. The desktop "phone frame" is only a preview convenience.

Success looks like: someone opens it and thinks *"this is an app"*, not *"this is a website in a phone-shaped box"*. A panel of evaluators should see a product, not a demo.

---

## 2. AUDIT: WHAT I OBSERVED IN THE CURRENT BUILD

> **Status: this audit has been worked through and is out of date.** Do not re-apply
> it as a task list. The missing viewport meta, the absent `theme-color`, the
> `env(safe-area-inset-*)` padding, the sub-12px type, the 16px input size, the
> concierge outranking search, the chart-titled dashboard cards and the flat login
> brand are all fixed in the current build. What is described below is the state
> this document was written against, kept for the reasoning behind the decisions.
> To see what is true now, read the file and run `node tools/verify.cjs`.

Findings from rendering the current file at 430×900 in app mode. Verify them yourself, then fix them.

### Login screen (the main complaint)
- The brand is reduced to a thin 66px top strip with a 40px logo tile. The first screen a user sees has almost no brand presence, and the splash's strong moment is thrown away.
- Roughly 40% of the screen is an empty pale wash above the form, because the form is vertically centered in leftover space. It reads as a blank page with a form on it.
- The role picker is three equal cards (Resident / Service Pro / Admin) placed *above* the heading, so the first decision is a role rather than signing in. Admin, an operations role, is given the same weight as a resident.
- The heading ("Welcome back") and the helper text are tiny (19px and 11.5px). Labels are 12px and the footer is 10.5px. Phone inputs and labels this small are hard to read.
- The fields come prefilled with a password, which shows dots in the very first view. It feels like a test form, and the demo disclaimer ("Demo environment — credentials are prefilled…") is the only real copy.
- There is no sense of place or promise. "Verified local help, one tap away" sits in 11.5px beside a small logo. FIND · REVIEW · BOOK · RECORD, the core of the product, appears on the splash and then vanishes.
- Everything is white rounded rectangles on a pale wash. Nothing tells you this is a Tupi services app.

### App shell and global
- No `<meta name="viewport">`, no `theme-color`, and no `env(safe-area-inset-*)` padding anywhere. On a real notched or gesture-nav device the top bar and bottom nav will collide with the system UI. Confirm with grep.
- Type is very small overall: about 28 `font-size` declarations are 9–10.5px, and 74 are 11px. Inputs should be 16px so mobile browsers do not zoom on focus.
- Several components are hover-first (`.cat:hover`, `.role-card:hover`). Touch devices get sticky-hover artifacts.
- The "Signed in…" toast covers the top bar (the user's name is hidden behind it). Toasts must never cover primary navigation context.
- The top bar is a flat gradient strip with the screen title in Fraunces. There is no large-title/collapse behavior, and identity, notifications, and title compete in 66px.

### Resident
- Home: the AI Concierge banner is the largest element. The AGENTS.md core loop is FIND → REVIEW → BOOK → RECORD, and the concierge is a *prototype* feature that must not outrank search and categories.
- Category tiles are text-only pills in my render (check whether icons appear once LFS is pulled). Even with icons, a 6-tile grid with plain white tiles is weak as the main entry point.
- Results page: "1 of 6 providers" shows one card and a large blank area. The Smart Match reasons are expanded by default, which is more than a card needs.

### Provider
- Dashboard is a long stack of analytics cards (sentiment donut, earnings line, demand bars). The titles literally contain chart types ("Weekly Earnings Trend (Line Graph)"), which is desktop-dashboard language. The provider's job is to answer requests. The request inbox is a good lead card, and the rest should come after it.

### Admin
- Dashboard is dense: four KPI tiles, three progress bars, a priorities list, and button grids. The KPI tiles and priority items should open the thing they describe.

---

## 3. NON-NEGOTIABLE CONSTRAINTS (from AGENTS.md)

- Keep the single-file HTML/CSS/JS architecture and the existing `state` / `render()` model. No framework rewrite. Incremental and coherent.
- Use the official logo `Sukinnect_Logo.png` (exact case). Never redraw, recolor, stretch, or replace it. It has a white background, so **change the surface around it** (white tile) and leave the logo untouched.
- Palette: use only the tokens already defined in `:root` (logo blue `#0352AE`, logo cyan `#05BCC4`, navy `#03002B`, electric blue `#0E4DFF`, tints `#F1F5FF` / `#C9D5FF` / `#E7EDFF`, text `#03002B` / `#4C5B88` / `#5F6E92`). Add tokens, do not scatter raw hex. Semantic green/amber/red stay semantic.
- Fonts: Fraunces (display) and Plus Jakarta Sans (UI), already self-hosted. No remote dependencies.
- Keep app mode (`?app=1`), the Leaflet map, and all three role experiences and their bottom navs.
- Booking status and payment status stay separate fields with separate indicators.
- No stored-value wallet. Show pricing as an estimate where it is one.
- Label demo data, simulated AI, and planning targets honestly. Never present them as real traction or real system behavior.
- Gradients are controlled: hero, splash, auth, primary CTAs, and selected states only. Not every card.

---

## 4. DESIGN DIRECTION

**Feeling:** trustworthy, local, quick. A neighborhood app people would hand to their parents, not a fintech or crypto look.

**Principles**
1. **Brand first, form second.** The brand owns the top of the first screen. The form is a bottom sheet that rises over it.
2. **One thumb.** Primary actions sit in the lower half. Anything reachable only at the top is secondary.
3. **Hierarchy over decoration.** One primary action per screen. Fewer boxes, more whitespace, stronger type contrast.
4. **Progressive disclosure.** Summary first, evidence second, detail third (especially trust and Smart Match).
5. **Native rhythm.** A 4pt spacing grid, a consistent radius scale, and large-title headers that feel like a real mobile app.
6. **Honest prototype.** Demo labels are small and calm, never a banner that competes with the UI.

**Design tokens to add (inside the existing `:root`, do not create a second one)**
- Spacing: `--s-1:4px` … `--s-8:32px`
- Radius: `--r-sm:10px`, `--r-md:14px`, `--r-lg:20px`, `--r-sheet:28px`, `--r-pill:999px`
- Type scale: caption 12px, body 14–15px, input 16px, title 20px, display 28–32px (Fraunces only for display and screen titles)
- Touch: `--tap:44px` minimum, `--field-h:52px`, `--cta-h:52px`
- Safe areas: `--sat: env(safe-area-inset-top, 0px)`, `--sab: env(safe-area-inset-bottom, 0px)`

**Minimum text size is 12px everywhere.** Replace the 9–11.5px text, merge near-duplicate sizes into the scale, and let labels wrap instead of shrinking.

---

## 5. LOGIN / AUTH REDESIGN (highest priority)

Replace the current bar-plus-form layout with a **branded hero + bottom sheet** screen. Keep the existing logic (`state.authMode`, `state.auth`, `state.authError`, `bindLogin`, `submitAuth`, the typing-does-not-re-render rule) and change the markup and CSS.

### Layout (390×844 baseline, must also work at 360×640 without the page itself scrolling when the keyboard is closed)

**Hero (top ~38–42% of the screen)**
- Background: `--grad-brand-hero`, plus one cyan accent glow (`#0E4DFF → #05BCC4` at low alpha). Optionally add a very quiet decorative layer (concentric rings or faint map-contour lines in SVG at ≤8% opacity) so it does not read as a flat gradient. Keep it cheap to render.
- Official logo in a white rounded tile, about 84–96px, centered, with a soft shadow. Wordmark "Sukinnect" in Fraunces below it.
- Tagline: "Verified local help, one tap away" at 14–15px.
- The deck's core loop as a single small row: `FIND · REVIEW · BOOK · RECORD` (keep the cyan dot separators from the splash).
- Respect the top safe area (`padding-top: calc(var(--sat) + 24px)`).

**Sheet (bottom ~60%)**
- A white surface with `--r-sheet` top corners that overlaps the hero by about 24px, with `--shadow-md` upward. It is the only white area, so it feels like a card rising from the brand.
- Title "Welcome back" at 24px (Fraunces), with one line of subtext at 14px. Move "Demo environment…" out of the subtitle.
- **Role selection (proposal):** replace the three equal cards with a compact 2-option segmented control, **Resident | Service Pro**, directly under the title. Admin is an operations role, so give it a quiet text link at the bottom of the sheet, such as "Admin sign-in", that switches the role. Admin stays reachable for demos but no longer competes with residents. Keep `aria-pressed`, keyboard access, and the checked state as a non-color cue.
- Fields: 52px tall, 16px text, 14px radius, persistent top labels (the existing `<label for>` pattern), a leading icon, and inline errors using the existing `.inline-error` / `aria-describedby` pattern. The password reveal button is a full 44×44 target.
- **Demo credentials:** stop pre-filling the fields. Start empty and add one small chip/button, "Use demo account", that fills the role's sample email and password in one tap. The first view looks like a real sign-in, and the demo shortcut is still one tap.
- Primary CTA: 52px, full width, `--grad-cta`, label "Sign in as Resident" (keep the role in the label). Keep it in the sticky lower area so the keyboard cannot bury it.
- Secondary: "New to Sukinnect? **Create an account**" as a 44px-tall text button.
- Footer, one line at 12px: location chip "Now serving Tupi, South Cotabato" on the left. Put "Prototype build · sample data only" as a small muted line below or beside it, not as an alert.

### Behavior
- **Sign-in feedback:** on submit, the button shows a spinner and "Signing you in…" for a short moment before navigating (AGENTS §47), then the existing transition into the role's home. Disable the button while it runs.
- **Validation:** keep required-field and format errors inline. Focus the first invalid field. Do not use a toast for field errors.
- **Keyboard:** when a field is focused, scroll it into view above the keyboard. Use `visualViewport` and `100dvh` so the sheet and CTA stay visible. Verify at 360×640.
- **Register mode:** group the form in clear steps (Account, then Location). For Service Pro, say clearly that provider accounts are *reviewed before they appear* (the deck's application/review process). Do not fabricate verification that does not exist. Keep the "nothing is stored" prototype note, but make it a small info line.
- **Motion:** the sheet rises once on entry from splash (about 350ms, `--ease-spring`). Switching Sign in / Register or the role updates in place and does not replay the entrance. Honor `prefers-reduced-motion`.
- **Splash to login handoff (optional polish):** the logo tile should appear to stay in place while the sheet rises, so the two screens feel like one continuous moment.

### Optional proposals (only with owner approval, and label as simulated)
- A phone-number-first sign-in option with a simulated OTP step. It is common for Philippine apps, but it is not in the deck. If added, write "Simulated — no SMS is sent" in the UI and never imply real verification.

---

## 6. SPLASH

- Keep the gradient hero and the logo tile. Increase the wordmark, make the `FIND · REVIEW · BOOK · RECORD` row the only supporting copy, and stop the "Loading sample marketplace data" text from wrapping (shorten it to "Loading…" or widen the status area).
- Keep it tap-to-skip and once-per-cold-launch. Sign-out goes straight to login, as now.

---

## 7. APP SHELL (every screen)

1. **Head:** add `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, `<meta name="theme-color" content="#03002B">`, and the web-app-capable meta tags. Add `-webkit-tap-highlight-color: transparent` and `touch-action: manipulation`. Apply safe-area padding to the top bar and bottom nav.
2. **Top bar:** a compact bar for detail screens (circular back button, title, optional action) and a *large-title* header for root tabs (Home, Bookings, Messages, Profile). On scroll, the large title collapses into the compact bar if it can be done cheaply. Otherwise use a simple static large title.
3. **Bottom nav:** 60–64px plus safe-area. Active state has a filled icon (`ic(name, size, 'filled')` is already supported), a bold label, and a short pill indicator, so the state never depends on color alone. Keep badges for pending requests.
4. **Toasts:** move to a snackbar that floats above the bottom nav, never over the top bar. Keep it short-lived and non-blocking, with a status icon.
5. **Bottom sheets** (booking request, filters): add a grab handle, a dimmed scrim, a max-height with internal scroll, tap-scrim-to-close, and a sticky primary action. The existing `state.sheet` mechanism stays.
6. **Hover:** wrap hover-only effects in `@media (hover:hover)` and give every tappable element an `:active` pressed state instead.
7. **Transitions:** keep the current rule. New destinations glide, in-place changes do not. Do not add new always-on animation.

---

## 8. RESIDENT EXPERIENCE

**Home** (order matters):
1. Greeting + location chip (barangay) + notifications bell, with the toast no longer hiding it.
2. Search field, the dominant control, at 52px.
3. Category grid: six tiles in a 3×2 grid, each about 88–96px tall, with a tinted rounded icon badge (service color as a *secondary* accent only) and a readable 13px label. Confirm icons render (LFS) and keep the inline-SVG fallback working.
4. Active booking card with a compact status stepper (Requested → Accepted → En route → Completed, using only states the prototype really has) and a separate payment-status pill.
5. AI Concierge as a **compact** card or row ("Describe the problem, get matches") rather than a full hero. Keep the "prototype/simulated" honesty.
6. "Book again" rail with larger avatars and the rating.

**Results:**
- Provider cards: avatar, name, service, distance and ETA, rating, a **Verified** badge, and "from ₱350 call-out (estimate)". Smart Match % stays, with the *why* collapsed behind a "Why matched" expander (progressive disclosure).
- Filters as chips on a horizontal rail plus the existing sheet. Sort control is one tap.
- Empty and few-result states explain what to try (AGENTS §48). Do not leave a large blank area.

**Provider detail:** follow the AGENTS §42 hierarchy. Sticky bottom bar with price on the left and "Request service" on the right. Trust summary first (verified, rating, jobs), credentials collapsed.

**Booking request sheet:** show service, provider, date, time, address, price estimate, payment method, and terms before confirm (AGENTS §52). Show "Submitting booking request…" while in flight, then open the resulting Booking Detail.

**Booking detail:** a vertical timeline of states, a payment pill that is separate from the booking status, provider contact actions, and the next step stated in plain words.

**Messages and chat:** list rows tied to a booking/service. Chat input pinned above the keyboard. Quick replies are optional.

---

## 9. PROVIDER EXPERIENCE

- Dashboard: lead with the **request inbox** (keep the "nothing is booked until you accept" note), then today's schedule, then a compact stats row. Move charts lower or into a swipeable "Insights" section. Remove chart-type words from titles. Mark all numbers as demo where appropriate.
- Request cards: who, what, where, when, how much, notes, and two clear actions (Accept primary, Decline secondary, with the existing confirm step).
- Bookings and booking detail: a clear status timeline, a map only where it helps (keep Leaflet), and large action buttons.
- Profile hub: group settings into sections (Service, Availability, Payout, Portfolio) with row items and chevrons.

---

## 10. ADMIN EXPERIENCE

- Lead with **Needs attention** (priority items that each open their object), then a 2×2 KPI grid where each tile is tappable, then analytics.
- Replace the button grids in "Operations workspace" with list rows (icon, label, short description, chevron).
- Verification review: show a summary and status first, and documents behind an expand. Do not display full identity documents where a status will do (AGENTS §56).
- Mark statistics "demo / sample" in a small, consistent way.

---

## 11. SHARED COMPONENTS (build once, reuse everywhere)

Audit the file and consolidate into one implementation each: primary/secondary/tertiary/destructive buttons; text field + inline error; chip and segmented control; list row; card (one padding and radius); status pill (icon + text + semantic color); avatar; empty state; skeleton; bottom sheet; snackbar; section header. Remove duplicated styles. The `:root` token block must remain the only one.

---

## 12. ACCESSIBILITY, PERFORMANCE, AND MOBILE QUALITY

- Contrast of at least 4.5:1 for text (the existing ink tokens already do this. Keep using them). Status uses icon + text + color.
- 44×44 minimum tap targets, visible `:focus-visible`, real `<button>` elements for controls, and labels for every input.
- `prefers-reduced-motion` respected everywhere.
- Keep it light: no large background images, no blur-heavy effects on scrolling content, and avoid full re-renders for in-place changes. The target is a low-end Android WebView.
- Keep everything offline-capable (local fonts, local Leaflet, local icons).

---

## 13. WHAT NOT TO DO

- Do not rewrite in React/Vue/Flutter or split the file unless asked.
- Do not change product meaning, add a wallet, invent a scoring algorithm, or present demo numbers as real.
- Do not recolor one screen and leave old styling on others. Migrate consistently.
- Do not add features the deck does not support as if they were confirmed. Mark proposals as proposals.
- Do not use gradients on every card or add gratuitous animation.
- Do not remove working functionality (Smart Match, the AI Concierge prototype, FSM, dispute and verification flows, app mode).

---

## 14. WORKING PROCESS

1. **Inspect** (Section 0) and screenshot every screen first.
2. **Plan:** reply with a short plan listing the tokens you will add, the components you will consolidate, and the screens in the order you will do them. Start with **Login + Splash + App shell**, then Resident, Provider, Admin.
3. **Implement in small commits**, one per area (for example `feat(auth): branded hero + bottom-sheet sign-in`).
4. **After each area:** re-screenshot and compare with the before shots. Check related screens for regressions.
5. **Final audit:** search for leftover legacy colors, text below 12px, hover-only rules, missing safe-area handling, and any toast covering navigation.

### Acceptance checklist
- [ ] Login: the logo and brand are prominent on first view, there is no large empty area, the sheet form fits at 360×640 without page scroll, the CTA stays visible with the keyboard open, and the fields start empty with a "Use demo account" shortcut.
- [ ] Role choice on login is Resident | Service Pro, with Admin reachable but de-emphasized. Sign-in shows a loading state, and errors are inline.
- [ ] Viewport meta, theme-color, and safe-area padding are present. Nothing collides with the system bars.
- [ ] No text under 12px. Inputs are 16px. All tap targets are at least 44px.
- [ ] Toasts never cover the top bar. Bottom nav active state is not color-only.
- [ ] Home leads with search and categories. The concierge is compact and still labeled as a prototype.
- [ ] Provider cards show a verified badge and an estimate label. Smart Match reasons are collapsed by default.
- [ ] Provider dashboard leads with the request inbox. Admin leads with Needs attention, and tiles open their objects.
- [ ] Booking status and payment status are separate everywhere.
- [ ] `?app=1` fills the viewport with no phone frame. Desktop preview still works.
- [ ] Tested at 360×640, 390×844, and 412×915. Resident, Provider, and Admin flows all still work end to end.
- [ ] One `:root`, tokens only, no scattered hex, and the official logo file is unmodified.

Report at the end: what changed, what you verified and how, what remains, and which items are proposals that need the owner's decision.

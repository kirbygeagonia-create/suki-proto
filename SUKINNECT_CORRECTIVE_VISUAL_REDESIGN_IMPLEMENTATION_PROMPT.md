# SUKINNECT — CORRECTIVE VISUAL REDESIGN IMPLEMENTATION PROMPT

> **Purpose:** This is a corrective implementation pass. The previous visual redesign did not create a sufficiently visible change. Do not repeat its approach. This brief supersedes older visual-redesign prompt/plan instructions wherever they conflict on category-art assets, fonts, visualization libraries, or whether implementation is required.
>
> **The required outcome is a visibly different, polished mobile app—not another audit document, renamed CSS classes, adjusted comments, or a plan that leaves the existing visuals essentially unchanged.** Make the code and assets change, run the app, inspect actual rendered screens, and provide before/after evidence. Do not stop after describing what should change.
>
> **Static artwork rule:** Service-category art must remain completely static at all times. No animation, hover scaling, floating, pulsing, rotation, bouncing, parallax, or moving shadows. Dimensionality must come from the still image itself.

You are acting as Sukinnect’s senior mobile product designer, visual designer, front-end engineer, asset researcher, accessibility specialist, and regression-testing engineer. Your assignment is to make a tangible second-pass redesign of service-category artwork, app-wide typography, and role-based data visualizations. Research downloadable resources from their official sources, verify licenses, bundle what is selected locally, and implement the results.

---

## 1. CONFIRMED REPOSITORY CONTEXT — PRESERVE IT

Repository: `https://github.com/kirbygeagonia-create/suki-proto`

Working branch: `feat/domain-kernel`

**Primary app file:** `Sukinnect-next.html`

**Do not modify or overwrite `Sukinnect.html`.** It is the older/shipped prototype and must remain untouched. Keep the current single-file HTML/CSS/JavaScript architecture and current Android WebView / local-file behavior. Preserve the domain kernel, booking lifecycle, centavos money model, ledger and payout/refund logic, produce/fruit accounting rules, persistence, current role flows, navigation/history, and the existing verification harness. This is a visual-system implementation, not permission to rewrite product behavior.

Before you edit anything, check the current branch, `git status`, branch HEAD, and local changes. Protect user changes. Review `AGENTS.md`, `README.md`, `CHANGES.md`, `DEVICE-PASS.md`, the latest `SUKINNECT_VISUAL_REDESIGN_PLAN.md`, the existing visual prompt, `tools/verify.cjs`, `tools/measure.cjs`, `tools/shot.cjs`, the local `fonts/` directory, and the relevant code in `Sukinnect-next.html`. Reconfirm findings against the present code; some chart-data defects described by the older plan may already have been fixed.

### Critical correction to the previous approach

The previous prompt and plan directed the AI to refine the existing inline `CAT_ART` SVGs, avoid downloaded/external image assets, and avoid adding a chart library. That instruction produced an outcome too close to the original. **For this corrective pass, do not treat refinement of the same SVG art as an adequate deliverable.** Replace the primary service-category illustrations with real, locally bundled, pre-rendered 3D-style image assets and make a substantial visible improvement to charts and typography. Existing inline SVG may remain for small functional controls, but not as the main category illustration shown in Resident Home.

Do not delete working behavior, categories, records, or UI modules to make the visual work easier. Keep `Sukinnect-next.html` as the active target and avoid touching unrelated project files.

---

## 2. THE VISUAL TARGET: REAL SOFT-3D CATEGORY IMAGE ASSETS

The Resident Home **Services / Browse by service** area must stop looking like a set of small hand-drawn flat SVG symbols. Give it the visual quality of a premium, friendly local-services marketplace: distinct, compact **rendered 3D or soft-3D object illustrations**, similar in polish and immediate recognition to the dimensional category artwork seen in apps such as Grab, but with original Sukinnect styling. Do not copy Grab-owned icons, renders, logos, illustrations, green branding, or other proprietary material.

### 2.1 Asset requirements

- Use actual image files as the primary art, not just CSS gradients applied to the old glyphs, a larger version of the same SVG, emojis, or an icon font.
- The expected implementation is an explicit, data-driven map such as `SERVICE_ART` keyed by each current service ID and rendered via local `<img>` elements (or an equally reliable local-asset renderer). Category tiles must visibly show those image files in real screenshots.
- Use **static, pre-rendered PNG or transparent WebP assets**. Use WebP with alpha when export quality and browser support are verified; optimized transparent PNG is the fallback. Do not use GIF, APNG, animated WebP, Lottie, video, canvas, WebGL, or runtime animation to create the effect.
- All category assets must use a coordinated art direction: similar camera angle, object scale, perspective, light direction, material softness, shadow treatment, detail density, and visual weight. They must read as one curated collection, not random pictures from unrelated packs.
- Art should remain recognizable at the rendered mobile size. Prefer a clear silhouette and one or two supporting elements over miniature scenes crowded with tiny details.
- Place the artwork consistently in the existing tile grid; preserve legible category labels, search access, tile tap targets, and a practical first-screen hierarchy. Do not enlarge the art so much that it pushes important discovery actions below the fold.
- Optimize the assets and loading behavior for lower-spec Android phones. Avoid giant 1024px images when smaller source renders are sufficient. Set explicit dimensions/aspect ratios to prevent layout shifts. Do not Base64-embed images inside HTML.
- Keep category IDs and their behavior unchanged. Ensure all actual current categories are covered, including `fruit` / Fruit Harvest & Buy, not just the original six.
- The images must never move. Do not apply transforms, scale transitions, animated pseudo-elements, animated light/shadows, or CSS animation to the category image or its wrapper on page load, hover, focus, touch, selection, or render updates. A static border or background focus state is allowed.

### 2.2 Research assets before drawing or downloading anything

Start with these candidates, then inspect the actual available collections to see which assets match the categories:

1. **3Dicons:** https://3dicons.co/ — open-source 3D icon collection. Its publisher states the collection is CC0; the related repository is https://github.com/realvjy/3Dicons. Confirm the specific collection/file and applicable license at implementation time. Use assets only when their appearance and license fit this project.
2. **Atkinson Hyperlegible Next:** https://github.com/googlefonts/atkinson-hyperlegible-next — a font candidate for the app-wide readable type system; details in Section 4.
3. For missing service-specific art, search for other genuinely reusable sources and verify the license from the creator or official repository. If no consistent permitted asset exists for a category, create an original custom illustration using an image-generation/design tool available in your environment, or compose original art through a legitimate workflow. Do not silently substitute a flat generic icon.

Do not use assets merely because the search preview looks attractive. Inspect the actual downloadable files, dimensions, alpha channel, render angle, quality, and license. Do not use unlicensed Pinterest/Google Images screenshots or copy Grab’s artwork. Do not use a source that requires attribution or payment without recording and meeting those conditions.

### 2.3 Local asset structure and provenance

Use a clear local asset layout, for example:

```text
assets/
  category-art/
    plumbing.webp
    electrical.webp
    cleaning.webp
    tutoring.webp
    appliance.webp
    delivery.webp
    fruit.webp
    ASSET-LICENSES.md
fonts/
  ...self-hosted WOFF2 font files...
  OFL.txt (or the license file supplied by the font project)
vendor/
  chart.umd.min.js (only if Chart.js is selected)
  CHART-LICENSE.txt (only if Chart.js is selected)
```

Names may follow the repository’s existing conventions if they are clearer, but paths must be local and deterministic. `ASSET-LICENSES.md` must list each image, the exact source/download page, creator/project, license, attribution requirements if any, and any modifications performed. Retain the license text where redistribution requires it. Do not load category art from a live external URL or CDN at runtime.

### 2.4 What is not an acceptable result

The following **do not** satisfy this task:

- Changing only the comments or descriptions of the existing SVGs.
- Keeping `CAT_ART` as the primary home-grid art and adjusting its gradients, opacity, viewBox, or CSS.
- Enlarging the existing glyph by a few pixels.
- Swapping one flat SVG icon for another flat SVG icon.
- Using emoji, system symbols, or a collection of unrelated clip-art.
- Linking to remotely hosted images rather than bundling them locally.
- Adding 3D wording to documentation without actual image files rendered in the app.

If the final Resident Home screenshot does not show obviously different dimensional image artwork, the task is not complete.

---

## 3. ICON SYSTEM: KEEP CONTROLS CLEAR, MAKE CATEGORY ART DISTINCT

Do not turn every tiny functional control into a 3D image. Maintain a useful distinction:

- **Category discovery:** rich but compact static soft-3D image assets.
- **Functional controls** (back, search, close, location, messages, booking state, settings, status): one coherent, readable vector-glyph family.
- **Status and data visualizations:** use chart graphics and status labels, not decorative 3D icons in place of real values.

Audit the `ICONS` map and `ic()` helper. Normalize glyph optical weight, baseline alignment, accessible naming, and size tokens only where screenshots show a meaningful consistency problem. Decorative glyph SVGs should be hidden from assistive technology; icon-only actions must have accessible names and real button semantics. Preserve all existing icon coverage and do not remove names just because a search misses a dynamic use.

The major visible icon change in this task is replacing service-category art—not indiscriminately replacing every interface glyph.

---

## 4. APP-WIDE READABLE TYPOGRAPHY — ALL ROLES, ALL SCREENS

Sukinnect is a mobile app used by people across age ranges, including users who may prefer larger type or have reduced vision. Typography must be consistent and comfortable to read in Resident, Service Provider, and Admin screens—not only the landing or sign-in screen.

### 4.1 Research and select a primary family

Evaluate the locally bundled **Plus Jakarta Sans** against **Atkinson Hyperlegible Next**. The Atkinson Hyperlegible Next project describes its design as improving character distinction/readability and is distributed under the SIL Open Font License 1.1; verify current source and license before bundling. The local Plus Jakarta assets are already available, so do not add a second font automatically without comparing actual glyph size, numerals, line wrapping, and legibility in the rendered app.

Make a real decision, record the rationale in the implementation notes, and use one primary sans-serif UI family consistently across every role and screen. The default recommendation is to trial Atkinson Hyperlegible Next for the UI because letterform clarity is a priority. If Plus Jakarta Sans performs better in direct comparison while meeting the readability rules below, keep it and explain why. Do not use decorative Fraunces for app UI headings or operational labels; the logo asset itself may retain its designed wordmark.

Bundle the selected WOFF2 files locally. No Google Fonts `@import`, network font request, or CDN dependency. Include the font license in the repo where required. Verify that the shipped files load when opened through the actual local-file / Android WebView route, not only on a developer’s network-connected browser.

Official candidate source: https://github.com/googlefonts/atkinson-hyperlegible-next

### 4.2 Implement a consistent type scale, not random per-screen sizes

Use named type tokens in the existing single `:root` block. Prefer scalable `rem` values for type and clear line-height tokens. Suggested starting targets for the 390px-class mobile layout:

- Body and common content: **16px / 1rem** with line-height around 1.45–1.6.
- Form input text and major interactive labels: **16px or larger**.
- Section/card headings: usually 18–22px, differentiated by weight/spacing rather than a different font family.
- Secondary/help text and chart labels: usually 14px minimum.
- Important numbers and primary actions: sized and weighted according to hierarchy; never shrink adjacent labels to force a one-line fit.
- Avoid essential interface text below **14px**. The older 12px floor is not the target for this accessibility pass.

These are starting values to be tested against actual screens, not permission to apply the same size to every element. Preserve hierarchy through weight, line-height, whitespace, and semantic grouping. Avoid ultra-light font weights, overly tight tracking, all-caps microcopy, and low-contrast gray text.

### 4.3 Readability is more than choosing a font

- Support dynamic/reflowing text. If larger text causes wrapping, let the content grow or scroll; do not clip, overlap controls, or shrink text back down. Respect browser zoom and system text scaling as far as the current WebView supports.
- Avoid fixed-height cards that clip enlarged text. Use `min-height` where appropriate and test long names, Filipino place names, long service names, and currency values.
- Maintain WCAG contrast: generally at least 4.5:1 for normal text and 3:1 for large text. Do not rely on category color alone to communicate selection or state.
- Keep form field labels visible. Use clear error messages near the field and preserve focus visibility.
- Use a comfortable line length for helper copy and avoid paragraph lines that stretch edge-to-edge within a narrow phone.
- Make every role consistent: Resident, Service Provider, Admin, all drill-down pages, charts, sheets, dialogs, toasts, form states, empty states, and validation errors.
- Ensure text scale changes do not break the bottom navigation, sheet actions, keyboard-visible forms, safe-area spacing, or chart labels.

Create a typography audit matrix recording the former vs. final font family, scale tokens, minimum sizes, representative screen screenshots, clipping results, and the enlarged-text test outcome.

Reference: W3C WCAG 2.2 target-size guidance recommends at least 24×24 CSS pixels for pointer targets in its Level AA criterion, with exceptions; Sukinnect should retain its existing stronger **44px** target goal for primary mobile controls where feasible. See https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html.

---

## 5. DATA VISUALIZATIONS MUST LOOK BETTER AND REMAIN TRUE

The prior pass focused on repairing misleading values. Keep those data-integrity fixes, but do not mistake correct values alone for a visual redesign. Charts must become visibly clearer, more structured, and more useful on a phone.

### 5.1 Start from the actual current chart inventory

Audit the actual rendered implementation in `Sukinnect-next.html` and the latest `CHANGES.md`. Existing code includes provider insights such as client feedback, weekly earnings, and requests by barangay, plus admin operational charts, KPI strips, progress bars, and other chart-like visual elements. Reconfirm what is still present and how its values are computed before editing it. Do not repeat already-resolved chart bugs as if they still exist.

For every chart or visualization, document:

- Role, screen, and the question the chart answers.
- Source collection and calculation helper.
- Whether values are real demo records, sample values, computed totals, or unavailable.
- Chart type and why it fits the question.
- Labels, units, time range, empty/low-sample treatment, and the accessible text equivalent.
- The visible before/after difference and screenshot location.

### 5.2 Research and choose the chart approach

Research the official [Chart.js installation and integration documentation](https://www.chartjs.org/docs/latest/getting-started/installation.html) and [integration guide](https://www.chartjs.org/docs/latest/getting-started/integration.html). Chart.js is a suitable leading candidate because the current set includes bar, line, and doughnut-style charts, and its prebuilt UMD bundle can be served from a local script path rather than a CDN.

Do not simply add a dependency because it is popular. Compare:

1. The current inline SVG/CSS chart implementation.
2. A small shared, reusable SVG chart renderer.
3. A locally vendored Chart.js UMD build.

Choose and explain the best trade-off for this actual screen count, offline behavior, and lower-spec Android devices. The desired default is **Chart.js bundled locally** if it improves visual consistency, readable axes, data labels, responsive sizing, and tooltips without a problematic startup or render cost. Verify the current stable version from official sources. If selected, download/vendor the production UMD file inside `vendor/`, include its license, pin the version in documentation, and reference the local path. **No CDN at runtime.** The app must still open with network disconnected. Do not vendor a development source tree when the official production build is available.

If evidence shows Chart.js is too costly or unreliable in the current `file://`/Android WebView execution path, use shared inline SVG charts instead—but the final charts must still be materially more polished than the existing ones. Record the actual measured bundle weight and observed rendering behavior rather than guessing.

Chart.js renders with canvas, which has accessibility limits by itself. Every chart built with it must have an accessible name and a readable HTML summary/table or list equivalent; never rely on color or pixels alone.

### 5.3 Make a visible design upgrade

Build a small shared chart language, rather than styling every chart separately. Depending on the data and narrow-screen space, use:

- Clear chart title answering a question (for example, “Requests by barangay” rather than “Bar Graph”).
- A summary value or contextual subtitle where valid.
- Consistent axis scale, baseline, sensible tick marks, subtle gridlines, and direct value labels where they improve reading.
- Consistent bar widths, corner radii, line weights, point styles, legend treatment, chart padding, and typography.
- Restrained Sukinnect blue/cyan for neutral series. Keep semantic green/amber/red reserved for meaningful status.
- Tooltips usable by touch and keyboard focus, not hover only.
- An accessible text equivalent with units and period.
- Purpose-built zero-data, insufficient-sample, single-point, all-zero, long-label, and narrow-screen states.
- Optional period toggles only if they actually recompute the chart from available records; do not build decorative or fake toggles.

The end result should be visually recognizable as a new chart system. Simply changing chart colors or adding a card border is not sufficient.

### 5.4 Data honesty and product rules are mandatory

- Derive all displayed figures from the same current records/state as the relevant screen.
- Use the signed-in provider's own review and booking data, not a pinned demo provider, unless a clearly labeled global admin view is intended.
- Weekly earnings must be computed from the correct payout/ledger/completion states and must use the true time period and currency. If the data is too thin, show the designed “not enough sample data yet” state. Do not fabricate a trend.
- Requests by barangay must derive counts from the relevant booking/request records and scale bars proportionately to the displayed values. Values, bar lengths, summaries, and labels must reconcile mathematically.
- Do not invent earnings by service/job type when the underlying data does not record it. Delete unsupported analysis or explicitly state why it cannot be computed.
- Do not invent ratings, percentages, trust scores, demand forecasts, market sizes, growth rates, revenue, provider counts, or sample totals.
- Label prototype analytics clearly as sample/demo records where applicable.
- Keep booking lifecycle, payment status, payouts, refunds, disputes, and produce transactions distinct. Do not change the financial/domain logic to make a chart look more impressive.
- In the final report, show the source helper/record path for each displayed metric.

---

## 6. WHOLE-APP DESIGN SYSTEM AND ROLE COVERAGE

Although category art, typography, and charts are the highest-priority changes, inspect the whole app so the changed parts do not feel pasted into the old design. The app has Resident, Service Provider, and Admin journeys, and the screens must share spacing, text, control states, icon alignment, chart style, and surfaces where that consistency helps.

Check at least these contexts:

- **Resident:** Home/service discovery, search/results, provider/service detail, booking/request sheets, booking status/tracking, messages/chat, notifications, profile, concierge, fruit-related flows.
- **Service Provider:** dashboard, incoming requests, schedule/bookings, job details, profile/listings, availability, offers, weighing/finalization/fruit modes, earnings/payout-related surfaces, trust/safety states.
- **Admin:** dashboard, finance, trust/verifications, categories, provider records, disputes/desk workflows, intelligence/operational charts, and fruit pilot administration.
- **Shared:** splash/sign-in, dialogs/sheets, toasts/snackbars, empty/error/loading/success states, bottom navigation, keyboard-visible forms, and system safe-area behavior.

Do not introduce oversized imagery into dense operational lists just to repeat the 3D look everywhere. Where category identity appears in compact rows or admin category management, use an appropriately scaled local thumbnail if it is still recognizable and does not crowd the label; otherwise use the standardized functional glyph. Keep the larger 3D images where category recognition benefits from them.

Do not redesign a screen that does not benefit from a chart. Do not add dashboard cards purely to demonstrate a new library.

---

## 7. MOBILE, PERFORMANCE, ACCESSIBILITY, AND OFFLINE REQUIREMENTS

This is a mobile-app-oriented prototype running in a constrained browser/WebView. Treat 390×844 as a useful baseline but also test 360×640, 412×915, and a narrow viewport. Include the real app mode (`?app=1`) if supported by the existing harness.

- Keep primary tap targets at the existing **44px** goal, and ensure controls are not crowded together.
- Preserve safe-area padding and bottom-nav/CTA clearance.
- Avoid horizontal overflow, clipped labels, overlapping images, stretched art, unexpected page-level scroll, and chart canvases that exceed their cards.
- Category illustrations remain static under normal motion preference and `prefers-reduced-motion: reduce`. Verify computed styles and image formats; a screenshot alone is insufficient to prove no animation.
- No remote runtime requests for fonts, art, scripts, or charts. Test while offline.
- Compress local 3D images and load them predictably. Do not repeatedly reload or decode the same art on unrelated renders if it can be avoided.
- If using Chart.js, properly destroy/reuse chart instances when the app rerenders so the app does not accumulate canvas instances or event handlers. Keep data and chart state in one source of truth.
- Respect contrast, keyboard and focus-visible states, accessible names, readable error messages, and text-equivalent chart summaries.
- Run the existing test harness and preserve booking, provider, admin, and financial domain behavior. Fix all regressions caused by this pass.

Reference resources to implement against:

- 3Dicons official site: https://3dicons.co/
- 3Dicons repository/license: https://github.com/realvjy/3Dicons
- Atkinson Hyperlegible Next and license: https://github.com/googlefonts/atkinson-hyperlegible-next
- Chart.js installation: https://www.chartjs.org/docs/latest/getting-started/installation.html
- Chart.js integration: https://www.chartjs.org/docs/latest/getting-started/integration.html
- WCAG 2.2 target size: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html

Check the actual version and license pages at the time you download. The links above are research starting points, not permission to skip verification.

---

## 8. REQUIRED IMPLEMENTATION WORKFLOW — DO NOT STOP AT A PLAN

This is a **corrective implementation**, not an investigation-only request. You may write a concise internal execution plan to `SUKINNECT_VISUAL_REDESIGN_EXECUTION.md`, but then carry out the actual implementation during the same task. Do not stop after describing a proposal, rewriting the plan, or asking for approval for visual changes already authorized here.

### Phase A — capture the baseline

1. Confirm branch/status and protect pre-existing changes.
2. Run supported baseline commands. Usually:

   ```bash
   node tools/verify.cjs
   node tools/measure.cjs Sukinnect-next.html
   node tools/shot.cjs --list
   node tools/shot.cjs --measure --out=.shots-before
   ```

   Use the current README for the correct commands. If a command fails, state the actual failure and use the available alternative; do not claim it passed.
3. Capture and inspect a before screenshot for Resident Home, provider dashboard, admin dashboard, and every current chart screen. Also capture all named screens via the existing harness.
4. Record current font family/sizes, category-art paths and dimensions, chart list, bundle sizes, console errors, and test results.

### Phase B — research and bundle assets

1. Inspect the actual 3D-icons collections and any other license-appropriate candidate source.
2. Select or produce a consistent, semantically correct 3D image for every service ID.
3. Save images into the repository under a local asset directory and add the asset-license manifest.
4. Compare the actual file types, dimensions, file sizes, and appearance at the app's rendered size. Re-export/compress where necessary.
5. Download and vendor the selected font locally, or justify continuing with the currently bundled family based on rendered comparisons. Include the license.
6. Compare current inline charts with Chart.js/native-SVG alternatives. Vendor Chart.js locally only if chosen, with exact version and license notes.

### Phase C — implement the changes

1. Replace the primary category art in Resident Home with the real local 3D images. Add a shared data-driven art renderer that works from current category IDs. Ensure the fruit category is covered.
2. Update compact reuse contexts where a local image makes the UI clearer and can fit without layout pressure. Retain standardized glyphs in dense/control contexts.
3. Implement the selected app-wide typography family and scalable tokens. Remove the decorative serif from UI headings if it undermines uniform readability; preserve the logo asset.
4. Redesign the provider and admin chart language with a shared renderer/library, clear labels, sensible scales, accessible summaries, and deliberately designed empty/small-sample states.
5. Preserve all source calculations and domain flows. Keep visual components bound to real source records, with no made-up data.
6. Add tests/checks for local art coverage, missing asset files, category-art animation absence, chart-data consistency where practical, and local/offline dependency references. Keep existing tests.

### Phase D — verify actual visual differences

1. Capture the exact same screen set/viewport after implementation into `.shots-after` (or another distinct path). Do not overwrite baseline evidence.
2. Inspect each target screenshot at real mobile size. Do not infer success from code diffs or test output alone.
3. Produce side-by-side before/after comparisons for at least Resident Home, provider dashboard, each changed provider chart, and each changed admin visualization.
4. Run the existing verification suite, screen measurement, screenshots, and offline/console checks. Report both passes and failures honestly.
5. Test 360×640, 390×844, 412×915 and enlarged text. Fix text clipping/reflow and chart overflow instead of shrinking fonts.
6. Inspect every role's changed and unchanged screens; do not claim app-wide consistency from one screenshot.

---

## 9. OBJECTIVE ACCEPTANCE CRITERIA — EVERY ITEM MUST BE EVIDENCED

### Artwork

- [ ] Every current service category, including Fruit Harvest & Buy, maps to a real local pre-rendered 3D image file.
- [ ] Resident Home screenshot visibly shows the new image artwork. The former custom flat SVG scenes are no longer the primary art on those tiles.
- [ ] The category illustrations have consistent camera angle, relative scale, light, shadow, and render quality.
- [ ] Category images never move or animate under ordinary or reduced-motion settings, hover, focus, touch, scrolling, or rerenders.
- [ ] No remote art URL is required at runtime. Asset-license provenance is recorded.
- [ ] Assets load without broken-image placeholders in app mode and with network disconnected.

### Typography

- [ ] The selected primary UI font loads locally and is used consistently across Resident, Provider, and Admin screens.
- [ ] The final font decision is based on actual rendering/readability comparison, not taste alone.
- [ ] Body text generally renders at 16px; helper, metadata, and chart labels do not fall below 14px unless a specific nonessential edge case is justified.
- [ ] Primary forms remain at 16px or larger; readable line height, contrast, and font weights are consistent.
- [ ] Enlarged text and long labels reflow without clipping, overlap, disappearing actions, or horizontal overflow.
- [ ] No external font requests are necessary and the font license is included where required.

### Charts and data visualization

- [ ] The provider and admin visualization system has a material visual change visible in before/after screenshots—not only color changes.
- [ ] Chart labels, titles, periods, units, scales, legends, numbers and summary text agree with the actual data.
- [ ] Empty, zero, one-record and low-sample cases render intentionally without fake data or misleading rings/trends.
- [ ] Unsupported metrics are removed rather than fabricated.
- [ ] Charts fit the phone width and support nonvisual access through text/table equivalents or equivalent semantic summaries.
- [ ] If a library was added, it is locally bundled, license-preserved, version documented, tested offline, and measured for impact.

### Regression and deliverables

- [ ] Existing domain/journey tests pass, or pre-existing failures are identified separately with evidence.
- [ ] Booking/request/offer, provider job completion, fruit modes/finalization, admin verification/dispute/money, navigation/back, sheets, and persistence still behave as before.
- [ ] `Sukinnect.html` is unchanged.
- [ ] No runtime network request is introduced for new assets/fonts/charts.
- [ ] The final report names every changed file and every new asset/dependency, with actual file sizes and licenses.
- [ ] Provide baseline and after screenshot paths, visual comparison evidence, test commands/results, known limitations, and a role-by-role coverage matrix.
- [ ] Show a direct explanation of how the final output differs visually from the previous redesign.

**Fail condition:** If the report says “updated artwork” but the Resident Home still renders the same inline SVG scene family, or if the charts are only recolored without a meaningful improvement, the task has failed. Continue implementation until the criteria are met or a real blocker (such as a missing source asset/license or unavailable tool) is clearly documented.

---

## 10. FINAL REPORT FORMAT

Finish with these headings:

1. **What materially changed** — describe visible differences, not code organization.
2. **3D assets added** — filename, rendered category, source, license, dimensions, size.
3. **Typography** — chosen family, why it won, local font files, type scale, minimums, enlarged-text results.
4. **Charts and visualizations** — before/after per chart, source calculations, chart library decision, file size and license if applicable.
5. **Screens reviewed** — role-by-role matrix of changed and deliberately unchanged screens.
6. **Verification** — exact commands, pass/fail counts, screenshots, offline behavior, viewport/text tests.
7. **Remaining issues** — only actual blockers or known limitations, not vague future possibilities.

Do not claim success until actual screenshots show the intended art replacement and chart redesign.

#!/usr/bin/env node
/* tools/shot.cjs — actually look at the app.
   ---------------------------------------------------------------------------
   The rest of this repo's gate renders the app in Node against a fake DOM, which
   proves structure and can prove nothing about layout: nothing is ever painted.
   This drives a real headless Chrome over the DevTools Protocol, navigates the
   app the way a person would (by setting the same state the buttons set), and
   writes PNGs. Then a human or a model can read them with the eyes.

   No dependencies: Node 22+ ships a global WebSocket, and Chrome is already
   installed. Nothing in Sukinnect-next.html is modified or instrumented.

   usage:
     node tools/shot.cjs                       # the default journey, phone in app mode
     node tools/shot.cjs --list                # what the named screens are
     node tools/shot.cjs --only=login,resident-home     # a subset (--list for the names)
     node tools/shot.cjs --width=390 --height=844 --dpr=2
     node tools/shot.cjs --measure             # also run the audit over each painted frame
     node tools/shot.cjs --reduced-motion      # emulate prefers-reduced-motion: reduce
     node tools/shot.cjs --probe=@file         # evaluate an expression after the page settles
     node tools/shot.cjs --desktop             # the phone frame inside the desktop shell
     node tools/shot.cjs --out=.shots          # where the PNGs go
*/
const fs = require('fs');
const path = require('path');
const http = require('http');
const net = require('net');
const os = require('os');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const prefix = '--' + name + '=';
  const hit = argv.find(a => a.startsWith(prefix));
  /* Take everything after the FIRST '='. This used to be hit.split('=')[1], which truncates any
     value containing an assignment — so `--probe='(function(){var b=…})()'` reached the page as
     `(function(){var b`, the page answered `SyntaxError: Unexpected token ')'`, and the tool
     printed a page fault for a mistake in its own argument parser. Two probes were dismissed as
     "shell quoting" that way before the parser was read. */
  return hit ? hit.slice(prefix.length) : dflt;
};
const has = (name) => argv.includes('--' + name);

/* --file lets the camera run against a *bundled* copy rather than the repo source.
   The Android shell resolves every relative path against file:///android_asset/, so
   the APK's page sits one layout deeper than the repo's — only photographing the
   copy that actually ships can prove the images and fonts are where it will look. */
const APP_FILE = path.resolve(ROOT, flag('file', 'Sukinnect-next.html'));

const WIDTH = parseInt(flag('width', '390'), 10);
const HEIGHT = parseInt(flag('height', '844'), 10);
const DPR = parseFloat(flag('dpr', '2'));
const OUT = path.join(ROOT, flag('out', '.shots'));
const DESKTOP = has('desktop');
/* App mode (?app=1) is what the Android WebView loads: no phone frame, the UI
   fills the viewport. That is the only view where a 390x844 shot is honest. */
const APP_MODE = !DESKTOP;
const ONLY = (flag('only', '') || '').split(',').map(s => s.trim()).filter(Boolean);
const MEASURE = has('measure');
/* Asks Chrome to report prefers-reduced-motion, so a claim that the app honours
   that setting can be measured instead of assumed. */
const REDUCED = has('reduced-motion');
/* Asks Chrome for prefers-color-scheme: dark. The app declares no color-scheme, so this is not
   a question about a theme it has — it is the question of what the *browser* paints on the
   controls the app leaves to the user agent, which is exactly the Android-in-dark-mode case no
   desktop session ever shows. */
const DARK = has('dark');
const PROBE = flag('probe', '');
/* --focus walks each screen with real Tab keypresses. The distinction is the whole instrument:
   Chrome matches :focus-visible only for a keyboard-modality focus, so a script that calls
   el.focus() sees no ring on anything — which is exactly what the first attempt at this did, and
   it read as an app with no focus states at all rather than as a tool asking the wrong way.
   --focus-steps caps the walk (default 26 stops, which is more than any screen here has). */
const FOCUS = has('focus');
const FOCUS_STEPS = parseInt(flag('focus-steps', '26'), 10);
/* Runs the whole walk in another calendar frame without touching this machine's
   clock or zone. A record's date is a fact about the world; if the words that
   print it move when the timezone does, something is reading a calendar day
   through an instant — the class that once rendered "Verified Mar 14" as Mar 13. */
const TIMEZONE = flag('timezone', '');
/* Emulates an operating-system text-size setting.
   This had to be corrected after it had been trusted. The first version substituted the emulated
   default for `1em` inside the app's own `font-size: min(1em, 20px)`, which models "the OS changes
   the browser's default font size". Chromium on Android does not do that — it multiplies the
   *used* font size after CSS has resolved, so min() sees an unscaled 1em, returns 16px, and the
   platform scales that. Measured on a vivo at font_scale 1.35 the root computed 21.6px: the cap
   never engaged, while this flag reported it holding. Setting the root font size directly is what
   the platform's multiplication produces, so that is what is emulated — and it bypasses the CSS
   cap on purpose, because the real device bypasses it too. */
const FONT_SCALE = flag('font-scale', '');

/* ------------------------------------------------------------------ the audit
   A screenshot shows one screen to one pair of eyes; these numbers run over every
   screen and ask the questions that are easy to get wrong by eye: is anything
   tappable smaller than a thumb, is any text invisible against its own background,
   is anything clipped, is the type scale being honoured, does the bottom nav sit
   over content. All of it is measured in the painted page, so it can only report
   what a real browser actually laid out.
   -------------------------------------------------------------------------------- */
const AUDIT_JS = `(function(){
  const out = { small: [], unlabelled: [], truncated: [], previews: [], offScale: [], belowFloor: [], chartEscape: [], chartOver: [], navCut: [], layerDialog: [], splitFigure: [], textCollide: [], navEscape: [], squashedCircle: [], unreachable: [], contrast: [], overlaps: [], stretched: [], broken: [], remote: [], svgSmall: [], vendor: [], mapEscape: [], occluded: [], modalInert: [], nameless: [], placeholderOnly: [], catMotion: [], hOverflow: 0 };
  const vw = document.documentElement.clientWidth;
  out.hOverflow = document.documentElement.scrollWidth - vw;
  const TAP = 44;
  const text = (el) => [(el.textContent || ''), (el.getAttribute('aria-label') || ''), el.placeholder || '', el.title || '', el.id || '']
      .map(s => s.trim().replace(/\s+/g,' ')).find(s => s.length) || '';
  const painted = (el) => {
    const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    if (!r.width || !r.height) return null;
    if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) return null;
    return r;
  };
  /* Chrome drawn by a vendored library, counted apart from our own defects. The
     OpenStreetMap attribution link is a licence condition and must stay, and the
     marker is an <img> that Leaflet sizes and positions itself. Resizing either
     means fighting vendor CSS, so they are reported, not fixed. */
  const vendor = (el) => !!(el.closest && el.closest('.leaflet-container'));

  /* Every surface the app can paint content into, named once. Six walks each carried their own
     hand-written list and they had drifted: the clipped-text, 14px-floor, contrast and
     form-control-scale walks all skipped .modal-layer, so no sensor had ever looked at the profile
     hubs' edit forms — the densest form surface in the app, where a name, phone, address, PIN and
     payout account are typed — and the round-marker walk missed .bottomnav until a defect there
     made it interesting. Two walks had it right by accident, because they query the whole
     document: tap targets, and the screen-reader-name check. */
  const SURFACES = ['#screen', '.sheet', '.auth-sheet', '.bottomnav', '.modal-layer', '#navbar'];
  const WALK = SURFACES.map(s => s + ' *').join(', ');
  const isField = el => el.matches('input:not([type=hidden]), select, textarea');

  document.querySelectorAll('button, a, input:not([type=hidden]), select, textarea, [role=button], [data-open-chat-id], .navitem, .chip[onclick], .pick, .filter-option').forEach(el => {
    const r = painted(el); if (!r) return;
    if (vendor(el)) { out.vendor.push({ what: text(el).slice(0, 30) || el.tagName.toLowerCase() }); return; }
    const s = getComputedStyle(el);
    const clickable = el.tagName !== 'DIV' && el.tagName !== 'SPAN' || el.onclick || el.getAttribute('onclick') || el.dataset.openChatId;
    if (!clickable) return;
    /* A link inside a sentence cannot take a height; WCAG measures those at 24px,
       not 44. Only box-shaped controls are held to the tap floor. */
    const inline = getComputedStyle(el).display === 'inline';
    if (inline && r.height >= 24 - 0.6) return;
    /* A 23px input inside a 56px pill is a 56px target only if the pill forwards the touch.
       A <label> does — the browser activates its control. So does an ancestor <button>, <a>
       or <summary>, or anything with its own handler. An inert div wrapping padding over the
       page background does not: the only place you can hit is the control itself. The first
       version of this walked the ancestors, computed the bigger box, printed its own comment
       about the pill, and then measured the control anyway. */
    const forwards = (w) => w.tagName === 'LABEL' ? w.control === el
      : (/^(BUTTON|A|SUMMARY)$/.test(w.tagName) || !!w.onclick || !!w.getAttribute('onclick'));
    let reachH = r.height, reachW = r.width, via = 'self';
    for (let p = el.parentElement, up = 0; p && up < 3; p = p.parentElement, up++) {
      const pr = painted(p); if (!pr || !forwards(p)) continue;
      if (pr.height > reachH) { reachH = pr.height; via = p.tagName.toLowerCase(); }
      if (pr.width > reachW) reachW = pr.width;
      if (reachH >= TAP) break;
    }
    if (reachH < TAP - 0.6 || reachW < 28)
      out.small.push({ what: text(el).slice(0, 30) || el.tagName.toLowerCase(), h: Math.round(r.height), w: Math.round(r.width),
                       boxH: Math.round(reachH), inline, via, cls: (el.className||'').toString().split(' ')[0] });
    /* A form control is not named by its text content — an <input> has none, by definition — and
       this scan cannot see the wrapping <label> that does name it. The dedicated walk below asks
       the browser instead, through el.labels, and answers 0 for the very fields this line flagged:
       the read-only email row on all three edit-profile dialogs. Two tallies disagreeing about the
       same element is a defect in one of them, and it is this one, so a control the field-name
       walk already covers is skipped here rather than reported as nameless. */
    if (!text(el) && !isField(el)) out.unlabelled.push({ unlabelled: el.tagName.toLowerCase() + '.' + ((el.className||'').toString().split(' ')[0] || '-') });
  });

  /* A form control a screen reader cannot name. This is asked of the live DOM rather than
     read out of the source, because el.labels is the browser's own answer — it counts a
     wrapping label element, a for=, and an aria-labelledby, where a text scan has to guess
     at all three and gets it wrong in both directions. A field whose only name is its
     placeholder is listed separately, not failed: it does announce, but the name disappears
     the moment anyone types, which is the worst possible moment to lose it. */
  document.querySelectorAll('input, select, textarea').forEach(el => {
    if (!painted(el) || vendor(el)) return;
    if (el.type === 'hidden') return;
    const named = (el.labels && el.labels.length) ||
      el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') ||
      (el.closest('label') && text(el.closest('label')).trim());
    const who = (el.tagName.toLowerCase() + '#' + (el.id || '-') +
      '.' + (((el.className || '').toString().split(' ')[0]) || '-')).slice(0, 46);
    if (!named && el.placeholder) out.placeholderOnly.push({ field: who, hint: el.placeholder.slice(0, 32) });
    else if (!named) out.nameless.push({ field: who });
  });

  /* Category artwork must be still — an owner's rule, and the one thing a source
     grep cannot prove: a class with no rule, or a rule with a typo, both read fine
     in text. Ask the painted page instead. A reduced-motion page reports a duration
     of 1e-05s and one iteration, which is the app honouring a preference, so only a
     loop that actually runs counts as motion. */
  document.querySelectorAll('.cat, .cat *').forEach(el => {
    const s = getComputedStyle(el);
    const runs = s.animationName && s.animationName !== 'none' &&
      parseFloat(s.animationDuration) > 0.01 && s.animationIterationCount !== '1';
    const moves = /transform/.test(s.transitionProperty || '') && parseFloat(s.transitionDuration) > 0.01;
    if (runs || moves) {
      out.catMotion.push({ what: (el.getAttribute('class') || el.tagName) +
        (runs ? ' animation:' + s.animationName : '') + (moves ? ' transition:transform' : '') });
    }
  });

  /* SVG text is drawn in viewBox units and then scaled to the element's width, so a
     chart that declares 15px can PAINT 13.3px on a narrow phone. The off-scale-font
     check above reads computed style, which always reports the declared value — it
     could not see this, and the app's own 14px floor was quietly broken inside every
     chart for a whole pass before a probe caught it. */
  document.querySelectorAll('svg text').forEach(t => {
    const host = t.ownerSVGElement; if (!host) return;
    const vb = host.viewBox && host.viewBox.baseVal; if (!vb || !vb.width) return;
    const w = host.getBoundingClientRect().width; if (!w) return;
    const declared = parseFloat(t.getAttribute('font-size')) || parseFloat(getComputedStyle(t).fontSize);
    if (!declared) return;
    const rendered = Math.round(declared * (w / vb.width) * 10) / 10;
    if (rendered < 14) out.svgSmall.push({ text: (t.textContent || '').trim().slice(0, 16),
      declared: declared, rendered: rendered, box: Math.round(w) });
  });

  /* A chart label that hangs outside the chart. The column chart's words are HTML
     positioned against the chart box, so an axis gutter narrower than the widest tick
     paints the numbers over the card's padding — and nothing else sees it: the text is
     not clipped because nothing clips it, its contrast is fine, and it is not off the
     type scale. This is the check that would have caught the first version.
       The first version measured LEFT AND RIGHT ONLY, and stayed that way for every pass
     that quoted its clean result, so a label that leaves the box upward was invisible at
     every width: the admin's Weekly chart painted its "8" 15px above the chart box and
     13x8px into the card's own sub-line at 320 CSS px with the phone's text at 135%, and
     this tally said 0. */
  document.querySelectorAll('.chart-cols').forEach(chart => {
    const cb = chart.getBoundingClientRect();
    if (!cb.width) return;
    chart.querySelectorAll('.chart-tick,.chart-val,.chart-cat').forEach(l => {
      const r = l.getBoundingClientRect();
      const over = Math.max(cb.left - r.left, r.right - cb.right, 0);
      /* The vertical half excludes the ticks, and not for tidiness: a .chart-tick is centred on the
         gridline it names, so half its box sits above a top-of-plot line on EVERY chart — 2px at the
         default text size, which would make the anchor corner permanently dirty. A .chart-val is
         translated up by its whole line box, so it is the one that can leave the top of the box and
         land on the row above; a .chart-cat is anchored from the bottom of the plot upward and is
         the one that can wrap to a second line and leave the bottom. */
      const isTick = String(l.className).indexOf('chart-tick') > -1;
      const rise = isTick ? 0 : Math.max(cb.top - r.top, r.bottom - cb.bottom, 0);
      if (over > 1 || rise > 1) out.chartEscape.push({ text: (l.textContent || '').trim().slice(0, 16),
        cls: l.className, over: Math.round(Math.max(over, rise)),
        dir: over > 1 ? 'sideways' : (r.top < cb.top ? 'above the top edge' : 'below the bottom edge'),
        box: Math.round(cb.width) });
    });
  });

  /* A bar that rises above its own top gridline. This one exists because a fix silenced a sensor.
     The paired-series bug — the scale built from one series while the chart paints the larger of two
     — was visible through the escaping value label it produced, and once the numbers are dropped at
     that text size the bar keeps painting above the maximum while every label tally reads 0. An SVG
     clips at its own viewport, so the overage is not even outside the box: it is a bar cut off at the
     top, which reads as "this week reached the scale" and is the one thing a chart must not say.
     Everything here is read off the painted shapes: the top gridline is the smallest y1 among the
     lines, one viewBox unit is the svg's own width over its own viewBox width, and no arithmetic is
     re-derived from the app. */
  document.querySelectorAll('.chart-cols svg').forEach(svg => {
    const vb = (svg.getAttribute('viewBox') || '').split(/[ ,]+/).map(Number);
    const b = svg.getBoundingClientRect();
    if (vb.length < 3 || !vb[2] || !b.width) return;
    const unitPx = b.width / vb[2];
    const lines = [].slice.call(svg.querySelectorAll('line'));
    if (!lines.length) return;
    const topGrid = Math.min.apply(null, lines.map(l => parseFloat(l.getAttribute('y1'))));
    if (!isFinite(topGrid)) return;
    [].slice.call(svg.querySelectorAll('rect')).forEach(rc => {
      const y = parseFloat(rc.getAttribute('y'));
      if (!isFinite(y)) return;
      const over = Math.round((topGrid - y) * unitPx);
      if (over > 1) out.chartOver.push({ over: over, top: Math.round((topGrid - y) * unitPx),
        box: Math.round(b.width), h: Math.round(b.height) });
    });
  });

  /* A bottom-nav label that is cut even though the 14px floor would have fitted the whole word.
     fitNavLabels() shrinks the labels to whatever the slot can hold and stops at 14px; where a word
     needs less than that it stays ellipsized on purpose — the provider has five destinations in a
     320px panel and Bookings/Messages want 12.8-13.9px. This fails only on an AVOIDABLE cut, which
     is what makes the floor a decision rather than an accident. The scale factor is arithmetic on
     two measured widths, so nothing is re-derived from the app. */
  document.querySelectorAll('.bottomnav .nav-label').forEach(l => {
    const item = l.closest('.navitem'); if (!item) return;
    /* The label's own box, not the item's: clientWidth on the item includes its horizontal padding, so
       measuring the fit against 74px while the word can only use 66px is how the app clipped two labels
       on a real OPPO while this tally read clean. Both were fixed together, because a sensor that
       shares its assumption with the code it checks cannot disagree with a bug. */
    const slot = l.clientWidth || item.clientWidth, wants = l.scrollWidth;
    if (!slot || wants <= slot) return;
    const px = parseFloat(getComputedStyle(l).fontSize) || 16;
    const atFloor = wants * (14 / px);
    if (atFloor <= slot - 1) out.navCut.push({ text: (l.textContent || '').trim().slice(0, 16),
      px: Math.round(px * 10) / 10, slot: Math.round(slot), wants: Math.round(wants), atFloor: Math.round(atFloor) });
  });

  /* A layer that opens without dialog semantics, or with the caret still outside it, is invisible to
     a screen reader. Everything behind the top layer is inert — that is the point of the pass that
     marks it — so when the new box does not say it is a dialog and does not take focus, there is
     nothing left to read and nothing announced. Measured on 2026-10-20 with tools/probe-layer-focus.js
     across nine layer screens: every SHEET already declared role=dialog with a name ("Book an
     appointment", "Make an offer", "Raise a case"), every MODAL declared nothing, and eight of the
     nine held the caret on <body>. The reasons are listed rather than summed, because a fix that only
     moves focus must not read as a fix that names the dialog too. */
  const layerEls = [].slice.call(document.querySelectorAll('[data-layer], .modal-layer, .sheet-layer'))
    .filter(el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden'; });
  if (layerEls.length) {
    const rank = (el) => { const v = parseInt(getComputedStyle(el).zIndex, 10); return isNaN(v) ? -1 : v; };
    /* Highest z-index wins; DOM order breaks a tie, since a later sibling paints over an earlier one
       at the same level. Asking the layer the user is actually in is the whole question — the app
       raises a modal three ways and a rule naming one of them misses the other two. */
    const topEl = layerEls.slice().sort((a, b) => rank(b) - rank(a)
      || (a.compareDocumentPosition(b) & 4 ? 1 : -1))[0];
    const box = topEl.querySelector('[role=dialog]') || topEl.querySelector('.modal, .sheet, .card') || topEl;
    const why = [];
    if (box.getAttribute('role') !== 'dialog') why.push('role');
    if (box.getAttribute('aria-modal') !== 'true') why.push('modal');
    if (!box.getAttribute('aria-label') && !box.getAttribute('aria-labelledby')) why.push('name');
    const act = document.activeElement;
    if (!act || act === document.body || !topEl.contains(act)) why.push('focus');
    if (why.length) out.layerDialog.push({ layer: (topEl.className || 'inline-layer').toString().trim().split(/\\s+/)[0],
      why: why.join('+'), title: ((box.querySelector('h1,h2,h3,.sheet-title,b') || {}).textContent || '')
        .trim().replace(/\\s+/g, ' ').slice(0, 30) });
  }

  /* A figure broken across two lines is clipped by nothing, collides with nothing, sits on the scale
     and clears the nav — so every sensor above reads zero while the number itself is unreadable.
     "1039" painted as "10" over "39" on the admin Insights screen at 200% text, found by looking at a
     screenshot rather than by any tally. The cause is the file's own overflow-wrap:anywhere: it makes a
     flex item's min-content width one character, so a growing label takes the number apart instead of
     wrapping itself. The stat strip is where the app paints its largest figures, so its figures are
     the population; a Range answers one client rect per line box, and two distinct tops is a break. */
  [].slice.call(document.querySelectorAll('.stat-strip .f b')).forEach(el => {
    const t = (el.textContent || '').trim();
    if (!t) return;
    const r = document.createRange();
    r.selectNodeContents(el);
    const boxes = [].slice.call(r.getClientRects()).filter(b => b.width > 1 && b.height > 1);
    const tops = [];
    boxes.forEach(b => { if (!tops.some(x => Math.abs(x - b.top) < b.height * 0.5)) tops.push(b.top); });
    if (tops.length > 1) out.splitFigure.push({ text: t.slice(0, 18), lines: tops.length });
  });

  /* Text painted on top of other text. Every other sensor here asks a containment question — is this
     clipped, is it outside its box, is it under the nav — and none of them asks whether two labels
     land on each other. A real handset at 320 CSS px with its own text at 135% put "Aug 24" and
     "Sep 14" 27px into one another and stacked five y-axis ticks 12px apart in a 20px line, while
     the chart-escape tally read zero — both labels were inside the box.
     They were simply inside it on top of each other. (No backticks in this file's page scripts:
     they are template literals, and the comment that says so must not contain one either.) */
  document.querySelectorAll('.card').forEach(card => {
    const leaves = [].slice.call(card.querySelectorAll('*')).filter(el => {
      if (el.children.length) return false;
      const t = (el.textContent || '').trim();
      if (!t) return false;
      /* A closed <details> still gives its children real layout boxes in Chrome, so a rect-only
         sensor "sees" text that is not painted. Seven of these collisions were reported on four
         screens at the default width — the dispute evidence timeline, the provider's rating line —
         and every one of them was collapsed content, confirmed by elementFromPoint answering the
         button on top instead of the row. The chart labels this tally exists for are painted, so
         the guard is the disclosure, not the hit-test: an elementFromPoint filter would also
         silence the chart labels, which are pointer-events:none by design. */
      const d = el.closest('details');
      if (d && !d.hasAttribute('open') && el.tagName !== 'SUMMARY') return false;
      /* Visually hidden text is not painted, and a Range still reports its line box: the chart's
         sr-only data table is clipped to 1px and its rows answered getClientRects with the full
         text width, so six of the eleven findings on the provider dashboard were the
         screen-reader table sitting on the caption below it. Anything an ancestor hides — by the
         clip pattern, by visibility, or by opacity — is out. */
      for (let a = el; a && a !== document.body; a = a.parentElement) {
        if (a.classList && a.classList.contains('sr-only')) return false;
        const s = getComputedStyle(a);
        if (s.visibility === 'hidden' || s.visibility === 'collapse') return false;
        if (parseFloat(s.opacity) === 0) return false;
        if (s.clip && s.clip !== 'auto' && s.position === 'absolute') return false;
        if (s.clipPath && s.clipPath !== 'none') return false;
      }
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) {
      /* Compare the LINE boxes, not the element box. An inline span that wraps reports one rect
         covering every line it touches, so two spans on consecutive lines "overlap" by the height
         of the wrap while nothing on the screen touches anything — that is what the fruit sheet's
         "Customer Ratings" / "(41 jobs completed)" pair looked like to the first version of this
         tally, and it was a false positive. A Range answers one rect per line, which is the box the
         glyphs are actually painted in. Both axes must overlap on the SAME pair of lines, or the
         widest-x line and the tallest-y line would invent a collision between them. */
      const linesOf = el => {
        const rg = document.createRange();
        rg.selectNodeContents(el);
        return [...rg.getClientRects()].filter(r => r.width > 1 && r.height > 1);
      };
      let ox = 0, oy = 0;
      linesOf(leaves[i]).forEach(a => linesOf(leaves[j]).forEach(b => {
        const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (x > 3 && y > 3) { if (x > ox) ox = x; if (y > oy) oy = y; }
      }));
      if (ox > 3 && oy > 3) out.textCollide.push({
        card: (card.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 26),
        a: (leaves[i].textContent || '').trim().slice(0, 14),
        b: (leaves[j].textContent || '').trim().slice(0, 14),
        ox: Math.round(ox), oy: Math.round(oy) });
    }
  });

  /* A bottom-navigation item pushed off the panel. The row is a flex container whose items are
     flex:1, and a flex item's min-width defaults to 'auto' — which for a word means the item
     cannot shrink below that word, so the row overflows instead. Measured at 320px with the
     phone's text at 200%: the resident's four labels needed 456px of a 320px row and "Profile"
     painted 132px past the row's right edge — which is the edge of the device, so a destination
     with no way to reach it.
     No other tally sees this. The document is not wider than the phone (that check answers
     "none" on the same screen), nothing clips the item, so the truncation tally is silent, and
     the tap-target walk covers #screen, which does not contain the nav.
     (No backticks anywhere in this file's page scripts: they are template literals, and one
     ends the string early — which is how this comment first broke the camera.) */
  document.querySelectorAll('.bottomnav').forEach(row => {
    const rb = row.getBoundingClientRect();
    if (!rb.width) return;
    row.querySelectorAll('.navitem').forEach(item => {
      const r = item.getBoundingClientRect();
      const over = Math.round(Math.max(r.right - rb.right, rb.left - r.left, 0));
      if (over > 1) out.navEscape.push({
        text: ((item.querySelector('.nav-label') || item).textContent || '').trim().slice(0, 12),
        over: over, box: Math.round(rb.width), scroll: row.scrollWidth });
    });
  });

  /* A circle painted as a sliver. A computed "border-radius:50%" is the one declaration that
     states an element's width and height must agree, and a flex row that runs out of room breaks
     it in silence: the provider dashboard's 8px "requests waiting" dot sits beside a heading, and
     at 320px with the phone's text at 200% the heading took the row and the dot painted 2.3px
     wide by 8px tall — a clipped mark, not a status indicator. Nothing else sees it: it is not
     overflow, not clipped text, not off the type scale, and its contrast is fine because it
     paints no text at all. */
  document.querySelectorAll(WALK).forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.borderTopLeftRadius !== '50%' || cs.borderTopRightRadius !== '50%') return;
    const r = el.getBoundingClientRect();
    /* Only a box that paints nothing at all is skipped. The first version of this guard asked
       for 3px on each side, and the defect that motivated the tally — an 8px dot crushed to 2.3
       — fell straight through it, so the run reported clean while the screenshot showed a
       sliver. An instrument whose floor sits above its own finding is the worst kind of pass. */
    if (r.width < 1 || r.height < 1) return;
    const off = Math.abs(r.width - r.height);
    if (off > 2) out.squashedCircle.push({ cls: (el.className || '').toString().slice(0, 24),
      w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10,
      text: (el.textContent || '').trim().slice(0, 18) });
  });

  /* A control no tap can reach. Every other geometry tally here asks about painting; this one
     asks the question a phone actually poses. A button whose box is outside the viewport with
     nothing that scrolls, or outside an ancestor that clips it without ever offering a scroll,
     cannot be pressed by a thumb however long the user tries — and it reports clean everywhere
     else, because it is not clipped text (nothing clips it), not under the nav, not off the
     type scale, and its contrast is fine. Found by sweeping the heights the repository had never
     measured: 320x480 is a small handset, an Android Go device, or any phone in split-screen, and
     at that size with the text at 200% the booking sheet put "Send request" 149px below the
     bottom edge of the device and the admin's PIN dialog scattered its own Close button off both
     edges at once. See 61. */
  const scrollsV = v => v === 'auto' || v === 'scroll';
  const clipsV = v => scrollsV(v) || v === 'hidden' || v === 'clip';
  const sticksOut = (r, b) => Math.max(0, b.left - r.left, r.right - b.right, b.top - r.top, r.bottom - b.bottom);
  const viewH = window.innerHeight;
  const labelOf = el => (el.getAttribute('aria-label') || el.textContent || el.value || el.placeholder || '')
    .replace(/\s+/g, ' ').trim().slice(0, 26) || '<' + el.tagName.toLowerCase() + '>';
  /* The local is named 'over', not 'out': the results object this whole script answers with is
     'out', and a local of the same name inside this loop would shadow it. Which is also why this
     file's page-script comments carry no backticks at all — the scripts are template literals, so
     one ends the string early. That hazard is written three comments above this one, and was hit
     again while writing this one, which is the best argument for the note being here. */
  document.querySelectorAll(WALK).forEach(el => {
    if (!el.matches || !el.matches('button, a[href], input, select, textarea, summary, [onclick], [role="button"], .navitem, .chip')) return;
    if (el.closest('[hidden]') || el.disabled) return;
    /* Leaflet's panes clip on purpose and its map moves by drag, not scroll. The camera already
       refuses to resize vendor controls; this refuses to reason about them for the same reason. */
    if (el.closest('.leaflet-pane, .leaflet-control-container')) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    let governed = false, p = el.parentElement;
    while (p && !governed) {
      const cs = getComputedStyle(p);
      const over = sticksOut(r, p.getBoundingClientRect());
      const canScroll = (scrollsV(cs.overflowY) && p.scrollHeight > p.clientHeight + 2) ||
                        (scrollsV(cs.overflowX) && p.scrollWidth > p.clientWidth + 2);
      if (over > 2 && (clipsV(cs.overflowY) || clipsV(cs.overflowX))) {
        if (canScroll) { governed = true; break; }
        out.unreachable.push({ what: labelOf(el), how: 'clipped', px: Math.round(over),
          by: (p.id ? '#' + p.id : '.' + String(p.className).split(' ')[0]), tag: el.tagName.toLowerCase() });
        return;
      }
      if (canScroll) governed = true;
      if (cs.position === 'fixed') break;
      p = p.parentElement;
    }
    const below = r.top >= viewH, above = r.bottom <= 0, right = r.left >= vw, left = r.right <= 0;
    if (!(below || above || right || left)) return;
    if (document.documentElement.scrollHeight > viewH + 2 || document.documentElement.scrollWidth > vw + 2) governed = true;
    if (governed) return;
    out.unreachable.push({ what: labelOf(el),
      how: below ? 'below' : above ? 'above' : right ? 'right' : 'left',
      px: Math.round(below ? r.top - viewH : above ? -r.bottom : right ? r.left - vw : -r.right),
      by: 'viewport', tag: el.tagName.toLowerCase() });
  });

  /* Anything the nav actually traps. Content sliding under a glass bar while you
     scroll is normal and wanted; a control that is still covered when the screen
     is scrolled to its end is not. So scroll to the bottom first, then ask. */
  const nav = document.querySelector('.bottomnav');
  if (nav) {
    const scroller = document.querySelector('#screen') || document.scrollingElement;
    const was = scroller.scrollTop;
    /* The screen scrolls smoothly by contract, so a plain scrollTop assignment
       starts an animation and the measurement would catch it mid-glide. Turn the
       behaviour off for the duration of the test, the same way the app does when
       it restores a scroll position. */
    const behaviour = scroller.style.scrollBehavior;
    scroller.style.scrollBehavior = 'auto';
    scroller.scrollTop = scroller.scrollHeight;
    const nr = nav.getBoundingClientRect();
    document.querySelectorAll('#screen button, #screen a, #screen input, #screen select').forEach(el => {
      const r = painted(el); if (!r) return;
      if (vendor(el)) return;
      if (r.bottom <= nr.top + 1) return;
      const cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
      if (cx < 0 || cy < 0 || cx > vw || cy > document.documentElement.clientHeight) return;
      const hit = document.elementFromPoint(cx, cy);
      if (hit && (hit === nav || nav.contains(hit)))
        out.overlaps.push({ what: text(el).slice(0, 30), underBy: Math.round(r.bottom - nr.top) });
    });
    scroller.scrollTop = was;
    scroller.style.scrollBehavior = behaviour;
  }

  /* clipped or ellipsised text */
  document.querySelectorAll(WALK).forEach(el => {
    if (el.children.length) return;
    const t = (el.textContent || '').trim(); if (!t) return;
    const s = getComputedStyle(el);
    if (s.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1)
      out.previews.push({ text: t.slice(0, 30), lost: el.scrollWidth - el.clientWidth });
    else if (el.scrollWidth > el.clientWidth + 3 && /hidden/.test(s.overflow))
      out.truncated.push({ text: t.slice(0, 30), lost: el.scrollWidth - el.clientWidth, hidden: true });
  });

  /* the type scale. Read by PAINTING each token, not by parsing its declaration: the tokens
     are rem now, so parseFloat("--t-caption: 0.875rem") answers 0.875 and every element on the
     page suddenly looked off-scale — 2831 reports from a reference list that had stopped
     measuring anything. A probe element resolves whatever unit the token uses to the px the
     browser actually applies, so this survives px, rem, or a root font size the OS changed. */
  const rootS = getComputedStyle(document.documentElement);
  const probe = document.createElement('span');
  probe.style.position = 'absolute';
  probe.style.fontSize = '0px';
  probe.style.height = '0';
  probe.style.overflow = 'hidden';
  document.body.appendChild(probe);
  const scale = ['t-display','t-title-lg','t-num','t-title','t-lead','t-body-lg','t-input','t-body','t-body-sm','t-caption']
    .map(t => { probe.style.fontSize = 'var(--' + t + ')'; return parseFloat(getComputedStyle(probe).fontSize); })
    .filter(v => isFinite(v) && v > 0);
  probe.remove();
  out.scalePx = scale.map(v => Math.round(v * 10) / 10);
  out.rootPx = parseFloat(rootS.fontSize);
  const seenSizes = {};
  /* A hard floor, checked separately from "is this a declared token". The scale test
     allows 0.7px of rounding noise, and 14 - 13.3 is 0.6999999999 in floating point —
     so the user-agent default for a form control slipped inside it and the report said
     the type scale was clean while painting 13.3px text. §68's floor is not a
     tolerance, so it does not get one. */
  const FLOOR = 14;
  const below = (el, f) => {
    if (!(f > 0) || f >= FLOOR - 0.05) return null;
    if (el.closest && el.closest('.sr-only')) return null;
    return { size: f, tag: el.tagName.toLowerCase(),
      text: (el.textContent || el.value || '').trim().slice(0, 24) };
  };
  document.querySelectorAll(WALK).forEach(el => {
    if (el.children.length) return;
    if (!(el.textContent || '').trim()) return;
    /* Leaflet's controls are excluded from the scale test for the same reason they are
       excluded from the tap test: their CSS ships with the library. Reporting "22px +" as
       off the type scale put 16 failures on eight screens and every one of them was the map
       zoom control — noise that would have sent the next reader to fix a font size the
       application does not own. */
    if (vendor(el)) return;
    /* The bottom nav's labels are sized by measurement, not by the type scale: fitNavLabels() picks
       the largest size that keeps every word whole in a slot of viewport divided by destinations, so
       the answer is a number like 15.9px that no token owns. The scale exists to keep AUTHORED type
       consistent, not to forbid a measured fit — and the floor is still enforced, because this walk
       skips these labels while the below-14px walk does not. That asymmetry is the rule: off-scale by
       design, never below the floor. */
    const isNavLabel = !!(el.closest && el.closest('.bottomnav') && el.classList.contains('nav-label'));
    const f = Math.round(parseFloat(getComputedStyle(el).fontSize) * 10) / 10;
    if (!f) return;
    seenSizes[f] = (seenSizes[f] || 0) + 1;
    /* The skip is on the SCALE test only. The first version of this line was a plain return, which
     also disarmed the floor check two statements below — so the comment above it promised an
     asymmetry the code did not implement, and the only thing that revealed that was a falsifier
     break reporting MISSED. The break was right; deleting it, which is what was done at the time,
     was the wrong half of the response. */
    if (!isNavLabel && !scale.some(s => Math.abs(s - f) < 0.7))
      out.offScale.push({ size: f, text: (el.textContent || '').trim().slice(0, 24) });
    const b = below(el, f);
    if (b) out.belowFloor.push(b);
  });
  out.usedSizes = Object.keys(seenSizes).map(Number).sort((a,b)=>a-b);

  /* Form controls, measured separately, because the loop above skips anything with
     children and a <select> keeps its words in <option> elements. That blind spot let
     six dropdowns paint at the user-agent default of 13.3px — under the floor 68 sets —
     while the type-scale tally reported clean. Controls that paint no words are skipped
     on purpose: a checkbox has no text to be too small. */
  document.querySelectorAll(WALK).forEach(el => {
    if (!isField(el)) return;
    if (/^(checkbox|radio|range|color|file|hidden)$/.test(el.type || '')) return;
    if (el.disabled && el.tagName === 'INPUT') return;
    const f = Math.round(parseFloat(getComputedStyle(el).fontSize) * 10) / 10;
    if (!f) return;
    seenSizes[f] = (seenSizes[f] || 0) + 1;
    if (!scale.some(s => Math.abs(s - f) < 0.7))
      out.offScale.push({ size: f, text: (el.value || el.tagName.toLowerCase()) + ' (form control)' });
    const b = below(el, f);
    if (b) out.belowFloor.push(b);
  });
  out.usedSizes = Object.keys(seenSizes).map(Number).sort((a,b)=>a-b);

  /* contrast against what is actually painted behind the text */
  const rgba = (s) => { const m = (s||'').match(/rgba?\\(([\\d.]+),\\s*([\\d.]+),\\s*([\\d.]+)(?:,\\s*([\\d.]+))?\\)/); return m ? [+m[1],+m[2],+m[3], m[4]===undefined?1:+m[4]] : null; };
  const over = (fg, bg) => [0,1,2].map(i => fg[i]*fg[3] + bg[i]*(1-fg[3]));
  const lum = (c) => { const f = v => { v/=255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }; return 0.2126*f(c[0]) + 0.7152*f(c[1]) + 0.0722*f(c[2]); };
  const ratio = (a, b) => { const L1 = lum(a), L2 = lum(b); return (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05); };
  /* Contrast against what is actually painted behind the text.
     Taking the "worst stop" of a gradient is wrong — white text on a navy→blue
     header reads as white-on-white if the gradient happens to end in white. The
     colour has to be evaluated where the text actually sits: project the element's
     centre onto the gradient line of the painted box and interpolate the stops. */
  function splitTop(s){
    const out2 = []; let depth = 0, cur = '';
    for (const ch of s) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { out2.push(cur); cur = ''; } else cur += ch;
    }
    if (cur.trim()) out2.push(cur);
    return out2;
  }
  function toDeg(tok){
    if (/deg$/.test(tok)) return parseFloat(tok);
    const dir = { 'to top':0, 'to top right':45, 'to right':90, 'to bottom right':135,
                  'to bottom':180, 'to bottom left':225, 'to left':270, 'to top left':315 };
    return dir[tok.replace(/\\s+/g,' ').trim()] ?? 180;
  }
  function parseGradient(img){
    const m = img.match(/linear-gradient\\((.*)\\)/);
    if (!m) return null;
    const parts = splitTop(m[1]);
    let angle = 180;
    const head = parts[0].trim();
    const am = head.match(/^(to\\s+\\w+(?:\\s+\\w+)?|[\\d.]+deg)/i);
    if (am && parts.length > 2) { angle = toDeg(am[0]); parts.shift(); }
    const stops = [];
    parts.forEach((p, i, arr) => {
      const c = rgba(p); if (!c) return;
      const pm = p.match(/([\\d.]+)%\\s*$/);
      stops.push({ c, pos: pm ? parseFloat(pm[1]) / 100 : (arr.length === 1 ? 0 : i / (arr.length - 1)) });
    });
    return stops.length ? { angle, stops } : null;
  }
  function sample(stops, t){
    if (t <= stops[0].pos) return stops[0].c;
    if (t >= stops[stops.length-1].pos) return stops[stops.length-1].c;
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i], b = stops[i+1];
      if (t >= a.pos && t <= b.pos) {
        const k = (t - a.pos) / ((b.pos - a.pos) || 1);
        return [0,1,2,3].map(j => a.c[j] + (b.c[j] - a.c[j]) * k);
      }
    }
    return stops[stops.length-1].c;
  }
  function gradAt(node, spec, cx, cy){
    const r = node.getBoundingClientRect();
    const rad = spec.angle * Math.PI / 180;
    const dx = Math.sin(rad), dy = -Math.cos(rad);
    const L = Math.abs(r.width * dx) + Math.abs(r.height * dy);
    const t = (((cx - (r.left + r.width/2)) * dx) + ((cy - (r.top + r.height/2)) * dy)) / (L || 1) + 0.5;
    return sample(spec.stops, Math.max(0, Math.min(1, t)));
  }
  function backdrop(el){
    const layers = [];
    let n = el;
    while (n) {
      const s = getComputedStyle(n);
      const c = rgba(s.backgroundColor);
      if (c && c[3] > 0) layers.push({ solid: c });
      const img = s.backgroundImage || '';
      if (img.indexOf('linear-gradient') > -1) {
        const spec = parseGradient(img);
        if (spec) layers.push({ grad: spec, node: n });
      }
      n = n.parentElement;
    }
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width/2, cy = r.top + r.height/2;
    let acc = [255,255,255,1];
    for (const L of layers.slice().reverse())
      acc = over(L.solid || Object.assign(gradAt(L.node, L.grad, cx, cy), { 3: 1 }), acc);
    return acc;
  }
  document.querySelectorAll(WALK).forEach(el => {
    if (el.children.length) return;
    const t = (el.textContent || '').trim(); if (t.length < 2) return;
    const r = painted(el); if (!r) return;
    const s = getComputedStyle(el);
    const fg = rgba(s.color); if (!fg) return;
    const size = parseFloat(s.fontSize), bold = +s.fontWeight >= 700;
    const need = (size >= 24 || (size >= 18.66 && bold)) ? 3 : 4.5;
    const bg = backdrop(el);
    const got = ratio(over(fg, bg), bg);
    if (got < need - 0.01)
      out.contrast.push({ text: t.slice(0, 26), ratio: Math.round(got*100)/100, need, size, weight: s.fontWeight,
                          on: 'rgb(' + bg.slice(0,3).map(Math.round).join(',') + ')' });
  });

  /* the official mark must keep its proportions (AGENTS.md 10) */
  document.querySelectorAll('img').forEach(el => {
    const src = (el.getAttribute('src') || '').slice(0, 44);
    /* A missing file used to be invisible here. The proportion test below needs
       naturalWidth and returns early at zero — which is precisely what a broken
       image looks like. The category tiles are image files now, so a dangling path
       is a blank square on the front door of the app and nothing reported it. */
    /* complete && no pixels is a real failure. An image that has not finished is not:
       the first version of this check reported four OpenStreetMap tiles that were
       simply still in flight, which is a false alarm on every screen that mounts a
       map — and a tally that cries wolf gets ignored, which is worse than no tally. */
    if (src && el.complete && el.naturalWidth === 0) { out.broken.push({ src, why: 'no pixels' }); return; }
    const r = painted(el); if (!r) return;
    const natural = el.naturalWidth / el.naturalHeight, drawn = r.width / r.height;
    if (Math.abs(natural - drawn) / natural > 0.04)
      out.stretched.push({ src: src.slice(0,26), natural: Math.round(natural*100)/100, drawn: Math.round(drawn*100)/100 });
  });
  /* The WebView loads this file off disk with no network (AGENTS.md 81), so every
     resource the page actually fetched must be a file: or a data: URL. This asks the
     browser what it requested rather than trusting a grep of the source. */
  (performance.getEntriesByType('resource') || []).forEach(e => {
    if (/^(https?|ws|wss):/i.test(e.name)) out.remote.push({ url: e.name.slice(0, 72), kind: e.initiatorType || '-' });
  });
  /* mountMap() marks every map with .map-mount so Leaflet's absolutely placed panes
     have a frame to resolve against. Leaflet does set that position itself, but
     only asynchronously — late enough that the first second of a map's life painted
     its tiles across the card above (seen in a real screenshot). Checking the mark
     rather than the computed position keeps the test deterministic: waiting for the
     page to heal itself hides exactly the window that a person sees. */
  document.querySelectorAll('.leaflet-container').forEach(el => {
    const cr = el.getBoundingClientRect();
    if (!cr.width || !cr.height) return;
    if (!el.classList.contains('map-mount'))
      out.mapEscape.push({ what: el.id || '(unnamed)', why: 'mounted without .map-mount' });
    else if (getComputedStyle(el).position === 'static')
      out.mapEscape.push({ what: el.id || '(unnamed)', why: '.map-mount is not positioning the frame' });
  });
  /* A modal layer is only modal if it is actually on top. Sample points across the
     open sheet and ask the page what is really there: a lower layer with a large
     internal z-index (Leaflet puts 1000 on its own controls) will answer for a
     point the sheet believes it owns. */
  const top = document.querySelector('.sheet-layer, .modal-layer');
  if (top) {
    const panel = top.querySelector('.sheet, .modal-card') || top;
    const pr = panel.getBoundingClientRect();
    if (pr.width > 4 && pr.height > 4) {
      for (let ix = 1; ix <= 4; ix++) {
        for (let iy = 1; iy <= 4; iy++) {
          const x = Math.round(pr.left + pr.width * ix / 5);
          const y = Math.round(pr.top + pr.height * iy / 5);
          if (x < 0 || y < 0 || x > vw || y > document.documentElement.clientHeight) continue;
          const hit = document.elementFromPoint(x, y);
          if (hit && !top.contains(hit) && !hit.contains(top)) {
            out.occluded.push({ what: (hit.className || hit.tagName).toString().split(' ')[0],
              at: ix + '/' + iy });
          }
        }
      }
    }
  }
  /* And a sheet that keeps declaring aria-modal while a modal paints above it is a lie
     with a consequence: Chromium marks everything outside the dialog inert, so the modal
     above it leaves the platform accessibility tree — visible, tappable, and absent to a
     screen reader. Asked of the app's own derivation rather than of a class, because the
     rule that decides this lives in one place and an instrument that guessed at a second
     one would disagree with it. */
  const sheetPanel = document.querySelector('.sheet');
  if (sheetPanel) {
    if (typeof layerKeys !== 'function') {
      out.modalInert.push({ what: 'the instrument cannot ask which layer is on top: no layerKeys on the page' });
    } else if (layerKeys().some(k => !!state[k])
        && sheetPanel.getAttribute('aria-modal') === 'true') {
      out.modalInert.push({ what: 'the sheet still claims modality under an open modal' });
    }
  }
  return out;
})()`;

/* One stop of the Tab walk, evaluated in the page after a real keypress. It answers three things
   about whatever the browser just focused:

     changed  — does anything the user could see differ while focused? The comparison is against a
                clone of the element appended to the same parent: the clone inherits every selector
                that matches (class, attribute, ancestry) and cannot match a focus pseudo-class, so
                it is the element's own unfocused style without a second round trip. Comparing
                against a fixed guess would call a control's permanent shadow a focus ring.
     uaRing   — the ring that appeared is the browser's default (outline-style: auto), which means
                the app's own rule did not reach this control. Visible, so not a failure of 2.4.7,
                and it is exactly the drift a hand-written selector list causes silently.
     behind   — something else is painted over the element the browser just focused, i.e. Tab walked
                past the scrim into the screen behind it. Hit-tested at the element's own centre
                rather than matched against a class or an attribute, because a check that reads the
                same marker as the code under test cannot see that marker go missing — which is
                exactly how one mutant survived its first run here.

   No backticks in this file's page scripts: they are template literals. */
const FOCUS_STOP_JS = `(function(){
  var el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return null;
  var r = el.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  var a = getComputedStyle(el);
  var clone = el.cloneNode(false);
  var b = a;
  if (el.parentElement) {
    el.parentElement.appendChild(clone);
    b = getComputedStyle(clone);
    clone.remove();
  }
  var ring = a.outlineStyle !== 'none' && parseFloat(a.outlineWidth) >= 1;
  var glow = a.boxShadow !== 'none' && a.boxShadow !== b.boxShadow;
  var edge = a.borderTopColor !== b.borderTopColor || a.borderTopWidth !== b.borderTopWidth;
  /* Is any part of the focused element actually exposed to a tap? Probed at the centre and at four
     inset corners, because the first version asked only the centre and reported the sheet's own
     scrim as unreachable — its centre is under the panel by design, while the whole rest of it is
     the thing a user taps to dismiss. An element with no exposed point at all is the real defect:
     focus landed somewhere a finger cannot go.

     Hit-tested rather than matched against a class or an attribute, because a check that reads the
     same marker as the code under test cannot see that marker go missing — which is exactly how one
     mutant survived its first run here. */
  var exposed = false, foreign = false;
  var probe = function(){
    exposed = false; foreign = false;
    var q = el.getBoundingClientRect();
    var xs = [q.left + 2, q.right - 2, q.left + 2, q.right - 2, (q.left + q.right) / 2];
    var ys = [q.top + 2, q.top + 2, q.bottom - 2, q.bottom - 2, (q.top + q.bottom) / 2];
    for (var k = 0; k < 5; k++) {
      if (xs[k] < 0 || ys[k] < 0 || xs[k] >= innerWidth || ys[k] >= innerHeight) continue;
      var hit = document.elementFromPoint(xs[k], ys[k]);
      if (!hit) continue;
      if (hit === el || el.contains(hit)) return true;
      /* A point that lands on one of the element's own ancestors is the element being clipped by a
         scroll container — reachable by scrolling, which is what the reach tally already judges.
         Only a hit on something foreign counts as being covered. Without this distinction the date
         chip in the booking sheet's horizontal rail — clipped by design, one swipe from view — was
         reported as unreachable. */
      if (!hit.contains(el)) foreign = true;
    }
    return false;
  };
  exposed = probe();
  /* And if it is covered, ask once more with the element brought to the middle of the window. A
     control sitting under a sticky bar at this scroll offset is not the defect — every ordinary
     list row is under the bar until you scroll, and the walk would otherwise cry wolf on all of
     them. What survives the scroll is the case that matters: focus landed somewhere no amount of
     scrolling can show. */
  if (!exposed && foreign) {
    el.scrollIntoView({ block: 'center', inline: 'center' });
    exposed = probe();
  }
  var covered = !exposed && foreign;
  var name = (el.getAttribute('aria-label') || el.textContent || el.placeholder || el.type || '')
    .replace(/\\s+/g, ' ').trim().slice(0, 22);
  return {
    key: el.tagName.toLowerCase() + '|' + Math.round(r.top) + '|' + Math.round(r.left) + '|' + Math.round(r.width),
    tag: el.tagName.toLowerCase(), what: name,
    cls: (el.className || '').toString().slice(0, 26),
    fv: el.matches(':focus-visible'),
    changed: (ring && a.outline !== b.outline) || glow || edge,
    uaRing: ring && a.outlineStyle === 'auto',
    ring: a.outlineStyle + ' ' + a.outlineWidth,
    behind: covered,
    offscreen: r.bottom < 1 || r.top > innerHeight - 1 || r.right < 1 || r.left > innerWidth - 1
  };
})()`;

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
].filter(Boolean);

function findChrome() {
  for (const p of CHROME_CANDIDATES) if (fs.existsSync(p)) return p;
  throw new Error('no Chrome or Edge found; set CHROME_PATH');
}

const get = (url) => new Promise((resolve, reject) => {
  http.get(url, res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
  }).on('error', reject);
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* Ask the OS for a port nobody is holding. A fixed one collides with any other
   debugging session on the machine, and the failure looks identical to "Chrome
   would not start", which is a bad hour to lose. */
function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const p = srv.address().port;
      srv.close(() => resolve(p));
    });
  });
}

/* ------------------------------------------------------------------ the CDP
   A hand-rolled client would be a lot of code. Chrome's HTTP endpoint hands us a
   WebSocket URL, and Node's global WebSocket speaks it directly, so a session is
   one queue of ids and one promise per command.
   -------------------------------------------------------------------------------- */
class Session {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.waiting = new Map();
    this.events = [];
    this.onEvent = () => {};
    ws.onmessage = (e) => {
      const msg = JSON.parse(typeof e.data === 'string' ? e.data : Buffer.from(e.data).toString());
      if (msg.id && this.waiting.has(msg.id)) {
        const { resolve, reject } = this.waiting.get(msg.id);
        this.waiting.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message + ' ' + JSON.stringify(msg.error.data))) : resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
        this.onEvent(msg);
      }
    };
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.waiting.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  /* Evaluate in the page and hand the value back, unwrapping Chrome's envelope. */
  async evaluate(expression) {
    const r = await this.send('Runtime.evaluate', {
      expression, returnByValue: true, awaitPromise: true
    });
    if (r.exceptionDetails)
      throw new Error('page threw: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  }
  static async connect(port) {
    const list = await get(`http://127.0.0.1:${port}/json/list`);
    const page = list.find(t => t.type === 'page' && !t.url.startsWith('devtools://')) || list[0];
    await new Promise(r => setTimeout(r, 50));
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = () => reject(new Error('could not open the DevTools socket'));
    });
    return new Session(ws);
  }
}

/* ------------------------------------------------------------------- screens
   Each screen says what a person would have to reach it. Everything here uses
   the app's own state and its own render(), because that is what its buttons do
   — no query-parameter hook was added to the shipped file just to photograph it.
   -------------------------------------------------------------------------------- */
const SCREENS = [
  ['login',            `state.view='login'; state.authMode='login'; state.role='resident'; render();`],
  ['login-register',   `state.view='login'; state.authMode='register'; state.role='resident'; render();`],
  ['splash',           `state.view='splash'; render();`],
  ['resident-home',    `state.view='app'; state.role='resident'; state.tab='home'; render();`],
  ['resident-results', `state.view='app'; state.role='resident'; startDiscovery('leak');`],
  /* The Filter providers button is painted on the results bar with `aria-pressed` and opens a sheet of
     form controls — the same kind of surface §64 found every text sensor skipping, and the same
     destination-behind-a-row class §97 turned into a measurement. It surfaced as soon as the audit's
     population widened from the three profile hubs to every branch of `state.sheet`: five of the six
     sheets the app can raise were already walked, this one was not. */
  ['resident-filter-sheet', `state.view='app'; state.role='resident'; startDiscovery('leak');
                        clickPainted(/openSheet\\('providerFilters'\\)/, 'the Filter providers button on the results bar');`],
  /* Reached the way a tap reaches it. openProviderDetail() is what mounts the
     map; assigning state.tab skips that and photographs an empty frame. */
  ['provider-detail',  `state.view='app'; state.role='resident'; state.tab='results'; render();
                        openProviderDetail(PROVIDERS[0].id, 'results');`],
  ['booking-sheet',    `state.view='app'; state.role='resident'; openProviderDetail(PROVIDERS[0].id, 'results');
                        openBookingRequest(); state.requestDraft.service='Kitchen faucet keeps leaking near the cabinet.';
                        state.sheet='bookingRequest'; render();`],
  ['booking-detail',   `state.view='app'; state.role='resident';
                        openBookingDetail(BOOKINGS.find(b=>b.status==='upcoming'&&b.customerId===CURRENT_CUSTOMER_ID).id);`],
  /* A proposed time is a record, and the sheet that files it and the card that answers it are two
     destinations reached by tapping. The walk creates the request the way a resident does — the real
     opener, the real submit — rather than pushing a row into the array, because a screen whose state
     was written by the harness is a screen nobody can reach. */
  ['reschedule-sheet',  `state.view='app'; state.role='resident';
                        const mv = BOOKINGS.find(b=>b.status==='upcoming'&&b.customerId===CURRENT_CUSTOMER_ID) || BOOKINGS[0];
                        mv.status='upcoming'; openBookingDetail(mv.id);
                        openRescheduleRequest(mv.id); state.sheet='reschedule'; render();`],
  /* The legal sheet is the screen a person reaches from the sign-in card before they agree to
     anything, so it is walked from its own opener. */
  ['legal-terms',       `state.view='login'; state.role='resident'; state.authMode='register'; render();
                        openLegalDoc('terms'); state.sheet='legalDoc'; render();`],
  ['reschedule-answer', `state.view='app'; state.role='resident';
                        const ans = BOOKINGS.find(b=>b.status==='upcoming') || BOOKINGS[0];
                        ans.status='upcoming'; openRescheduleRequest(ans.id);
                        state.rescheduleDraft.dayIdx=1; state.rescheduleDraft.timeIdx=2;
                        submitRescheduleRequest();
                        applyProviderIdentity(ans.providerId); state.role='provider';
                        openProviderBooking(ans.id); render();`],
  /* §9's rule 6 — the pending proposal has to reach each side's own list — is only proved on a screen
     the camera paints. Both rows raise a real ask through the app's own submit path (not by pushing a
     record), then render the list that should carry it, so the inbox card, its row and its tap target
     are measured like any other markup rather than asserted only in Node. */
  /* §9's rule 6 — the pending proposal has to reach each side's own list — is only proved on a screen
     the camera paints. Both rows raise the ask through the app's own submit path (not by pushing a
     record), then paint the list that should carry it, so the inbox card, its row and its tap target are
     measured like any other markup rather than asserted only in Node.

     The `pendingReschedule` guard is not decoration. The first version of these two rows each submitted
     unconditionally, and the second row died before painting: the app refuses a second proposal while one
     is waiting — that is one of the flow's own rules — so no draft was armed, and the next line reached
     for `state.rescheduleDraft.dayIdx` on a null draft. A camera row that depends on a clean slate is a
     row that only works first; each of these now works on a page where the other has already run. And a
     row has to sign in as somebody who can see the job: the first `provider-asks` raised the ask as the
     resident on the resident's booking and then called `applyProviderIdentity` for its provider, which
     falls back to p1 for anyone without a demo profile — so the screenshot came back with no card at
     all, and a walk that paints nothing measures nothing. */
  ['resident-asks', `state.view='app'; state.role='resident';
                     const ra = bookingsForResident().find(b=>b.status==='upcoming');
                     openBookingDetail(ra.id);
                     if (!pendingReschedule(ra.id)) { openRescheduleRequest(ra.id);
                       state.rescheduleDraft.dayIdx=1; state.rescheduleDraft.timeIdx=2;
                       submitRescheduleRequest(); }
                     state.sheet=null; state.tab='bookings'; render();`],
  ['provider-asks', `state.view='app'; state.role='provider'; state.tab='bookings'; render();
                     const pa = bookingsForProvider().find(b=>b.status==='upcoming');
                     openProviderBooking(pa.id);
                     if (!pendingReschedule(pa.id)) { openRescheduleRequest(pa.id);
                       state.rescheduleDraft.dayIdx=1; state.rescheduleDraft.timeIdx=2;
                       submitRescheduleRequest(); }
                     state.sheet=null; state.tab='bookings'; render();`],
  /* The pilot category, reached the way a resident reaches it: pick the category's
     provider, open the sheet, choose a mode. Screens nobody can navigate to are
     not screens — they are markup. */
  ['fruit-sheet',      `state.view='app'; state.role='resident'; openProviderDetail('p7', 'results');
                        openBookingRequest(); state.requestDraft.mode='sell_fruit';
                        state.requestDraft.fruit={ fruitType:'Mango', treeCount:1,
                          estimatedQuantityGrams:40000, treeHeightBand:'about 5 metres, ladder needed',
                          ownershipConfirmed:true };
                        state.sheet='bookingRequest'; render();`],
  ['fruit-harvest-sheet', `state.view='app'; state.role='resident'; openProviderDetail('p7', 'results');
                        openBookingRequest(); state.requestDraft.mode='harvest_only';
                        state.requestDraft.fruit={ fruitType:'Mango', treeCount:2,
                          estimatedQuantityGrams:25000 };
                        state.sheet='bookingRequest'; render();`],
  ['fruit-offer',      `state.view='app'; state.role='resident';
                        openBookingDetail(BOOKINGS.find(b=>b.id==='b8').id);`],

  ['booking-tracking', `state.view='app'; state.role='resident';
                        openBookingDetail(BOOKINGS.find(b=>b.status==='ongoing'&&b.customerId===CURRENT_CUSTOMER_ID).id);`],
  ['resident-bookings',`state.view='app'; state.role='resident'; state.tab='bookings'; render();`],
  ['messages',         `state.view='app'; state.role='resident'; state.tab='messages'; state.isChatOpen=false; render();`],
  ['chat-room',        `state.view='app'; state.role='resident'; state.tab='messages';
                        openChatThread(PROVIDERS[0].id, bookingsForResident()[0] && bookingsForResident()[0].id);
                        state.isChatOpen=true; render();`],
  ['resident-profile', `state.view='app'; state.role='resident'; state.tab='profile'; render();`],
  ['concierge',        `state.view='app'; state.role='resident'; state.tab='concierge'; render();`],
  /* The answer the concierge gives when the words sort into nothing. Typed into the
     field and submitted through the painted button, because the state only exists if
     a thumb can create it — and until this change an unsortable description was
     photographed as, and shipped as, a plumbing briefing. */
  ['concierge-no-match', `state.view='app'; state.role='resident'; state.tab='concierge'; render();
                          document.getElementById('concierge-input-field').value =
                            'The garden gate hinge is loose and the paint is peeling.';
                          document.getElementById('concierge-analyze-btn').click();`],
  ['notifications',    `state.view='app'; state.role='resident'; state.tab='notifications'; render();`],
  ['provider-dash',    `state.view='app'; state.role='provider'; state.tab='dashboard'; render();`],
  /* The pilot's provider side, reached by signing in as the fruit pro rather than
     by a parallel app: same shell, same screens, different identity. */
  ['fruit-provider-dash', `applyProviderIdentity('p7');
                        state.view='app'; state.role='provider'; state.tab='dashboard'; render();`],
  ['fruit-request',    `applyProviderIdentity('p7');
                        state.view='app'; state.role='provider'; state.tab='provider_booking_detail';
                        openProviderBooking('b10'); render();`],
  ['offer-sheet',      `applyProviderIdentity('p7');
                        state.view='app'; state.role='provider'; state.tab='provider_booking_detail';
                        openProviderBooking('b10'); openMakeOffer('b10');
                        offerInput('unitPesos','55'); offerInput('labourPesos','1600'); render();`],
  ['fruit-harvest-job',`applyProviderIdentity('p7');
                        state.view='app'; state.role='provider'; state.tab='provider_booking_detail';
                        openProviderBooking('b9'); render();`],
  ['fruit-provider-profile', `applyProviderIdentity('p7');
                        state.view='app'; state.role='provider'; state.tab='profile'; render();`],
  ['provider-fsm',     `state.view='app'; state.role='provider'; state.tab='fsm'; render();`],
  ['provider-bookings',`state.view='app'; state.role='provider'; state.tab='bookings'; render();`],
  ['provider-job',     `state.view='app'; state.role='provider'; state.tab='bookings'; render();
                        openProviderBooking(pendingProviderRequests()[0].id);`],
  ['provider-profile', `state.view='app'; state.role='provider'; state.tab='profile'; render();`],
  /* The profile modules open as sheets, and until now no sheet like this was in the table at
     all — so the resident's spending card and the provider's new credential list had never been
     photographed or measured, which is exactly how the invented history survived a suite that
     renders every screen it knows about. */
  ['resident-spending',  `state.view='app'; state.role='resident'; state.tab='profile'; render();
                          openProfileSection('resident','spending','Spending summary','Paid, by service');`],
  ['provider-credentials', `state.view='app'; state.role='provider';
                          state.tab='profile'; render();
                          openProfileSection('provider','credentials','Credentials','Documents on file');`],
  /* Below the sheets sit the modals that a sheet's own button opens. They had never been
     photographed, so a control added into one — the payment-method select, the payout
     account field — met no tap floor and no contrast check. Each entry opens its section
     and then clicks the button painted inside it, so a control whose handler was dropped
     fails the shot by name instead of photographing a screen nobody can reach. */
  ['resident-payment-modal', `state.view='app'; state.role='resident'; state.tab='profile'; render();
                          openProfileSection('resident','payments','Payment','How you settle');
                          clickPainted(/ProfileAction\\(.add_payment.\\)/, 'the change-method button');`],
  ['provider-payout-modal', `state.view='app'; state.role='provider'; state.tab='profile'; render();
                          openProfileSection('provider','payout','Payout & Earnings','Where the money goes');
                          clickPainted(/ProfileAction\\(.payout.\\)/, 'the manage-payout button');`],
  ['admin-security-modal', `state.view='app'; state.role='admin'; state.tab='profile'; render();
                          openProfileSection('admin','security','Security & Sign-in','What this device keeps');
                          clickPainted(/AccountAction\\(.pin.\\)/, 'the security-PIN button');`],
  /* Four more dialogs on the same shelf, found by measuring rather than by noticing. `node
     tools/audit-camera-dialog-coverage.cjs` asks which profile controls the app paints that raise a
     layer, and which of those names any row of this table clicks: the difference is a destination the
     walk does not have. Three of the same card's buttons — Password, Two-factor, View Sessions — and
     the provider's Enable Dispatch had each been *proved* to paint a dialog by the gate (which calls
     the handler) and photographed by nothing (which is the only way to measure a dialog's tap targets,
     contrast and dialog semantics). This is the fourth time the class was found by a person happening
     to look — `admin-account`, the audit log, the verification review, the logout confirm — and the
     first time an instrument asked the question on its own. */
  ['admin-password-modal', `state.view='app'; state.role='admin'; state.tab='profile'; render();
                          openProfileSection('admin','security','Security & Sign-in','What this device keeps');
                          clickPainted(/adminAccountAction\\('password'\\)/, 'the Password button');`],
  ['admin-twofa-modal', `state.view='app'; state.role='admin'; state.tab='profile'; render();
                          openProfileSection('admin','security','Security & Sign-in','What this device keeps');
                          clickPainted(/adminAccountAction\\('twofa'\\)/, 'the Two-factor button');`],
  ['admin-sessions-modal', `state.view='app'; state.role='admin'; state.tab='profile'; render();
                          openProfileSection('admin','security','Security & Sign-in','What this device keeps');
                          clickPainted(/adminAccountAction\\('sessions'\\)/, 'the View Sessions button');`],
  ['provider-dispatch-modal', `state.view='app'; state.role='provider'; state.tab='profile'; render();
                          openProfileSection('provider','dispatch','Emergency Dispatch','Urgent requests');
                          clickPainted(/providerProfileAction\\('dispatch'\\)/, 'the Enable Dispatch button');`],
  /* Three more, from widening the audit's own population. Its first scan read only the section cards,
     so a control painted by the hub itself — Log Out on two roles, Lock Admin Session — was never
     enumerated, and the tool reported complete coverage for a dialog it had not looked for. Once the
     hub markup was read too, these three surfaced on the same run that added the four above. */
  ['provider-logout-modal', `state.view='app'; state.role='provider'; state.tab='profile'; render();
                          clickPainted(/providerProfileAction\\('logout'\\)/, 'the Log Out button under the account rail');`],
  ['admin-logout-modal', `state.view='app'; state.role='admin'; state.tab='profile'; render();
                          clickPainted(/adminAccountAction\\('logout'\\)/, 'the Log Out button under the account rail');`],
  ['admin-lock-modal', `state.view='app'; state.role='admin'; state.tab='profile'; render();
                          clickPainted(/adminAccountAction\\('lock'\\)/, 'the Lock Admin Session button');`],
  /* The six forms where a person types the app's most sensitive facts — a name, a phone, a home
     address, a household item, a service price, a portfolio entry. Three dialog screens already
     sat in this table (a payment picker, a payout field, a PIN note), and these had never been
     painted at all. It mattered twice over: a destination behind a button is a destination, and
     until this pass every text measurement in the camera skipped .modal-layer, so the fields
     themselves had been checked by nothing. */
  ['resident-edit-form', `state.view='app'; state.role='resident'; state.tab='profile'; render();
                          clickPainted(/residentProfileAction\\('edit'\\)/, 'the Edit Profile button');`],
  /* Reached on a handset first: walk 8 opened this confirm on the vivo and the caret stayed on `<body>`,
     which is the §77 guarantee failing on a device while every bench reading passed — because no bench
     screen opened this dialog. A destination behind a row is still a destination, and `clickPainted` is
     how the walk reaches one with a real input event rather than a page-side `click()`, which is the one
     difference between the two readings worth controlling for. */
  ['resident-logout-modal', `state.view='app'; state.role='resident'; state.tab='profile'; render();
                          clickPainted(/residentProfileAction\\('logout'\\)/, 'the Log Out button in the account rail');`],
  ['resident-household-form', `state.view='app'; state.role='resident'; state.tab='profile'; render();
                          openProfileSection('resident','home','Home & Maintenance Profile','Items you add on this device');
                          clickPainted(/residentProfileAction\\('add_item'\\)/, 'the add-household-item button');`],
  ['provider-edit-form', `state.view='app'; state.role='provider'; state.tab='profile'; render();
                          clickPainted(/providerProfileAction\\('edit'\\)/, 'the Edit Professional Profile button');`],
  ['provider-service-form', `state.view='app'; state.role='provider'; state.tab='profile'; render();
                          openProfileSection('provider','services','Services Offered','What this account takes on');
                          clickPainted(/providerProfileAction\\('add_service'\\)/, 'the add-service button');`],
  ['provider-portfolio-form', `state.view='app'; state.role='provider'; state.tab='profile'; render();
                          openProfileSection('provider','portfolio','Work Portfolio','Service photos and examples');
                          clickPainted(/providerProfileAction\\('portfolio_add'\\)/, 'the add-work button');`],
  ['admin-edit-form', `state.view='app'; state.role='admin'; state.tab='profile'; render();
                          clickPainted(/adminAccountAction\\('edit'\\)/, 'the Edit Profile button');`],
  /* The dialog a save shows when nothing on the form was edited (§68). Reached the way a person
     reaches it — open the form, press Save — because a screen that has never been painted has never
     been measured, and this one carries the sentence the pass exists to make true. */
  ['resident-save-unchanged', `state.view='app'; state.role='resident'; state.tab='profile'; render();
                          clickPainted(/residentProfileAction\\('edit'\\)/, 'the Edit Profile button');
                          clickPainted(/saveResidentProfile\(\)/, 'the Save Changes button');`],
  ['provider-save-unchanged', `state.view='app'; state.role='provider'; state.tab='profile'; render();
                          clickPainted(/providerProfileAction\\('edit'\\)/, 'the Edit Professional Profile button');
                          clickPainted(/saveProviderProfessionalProfile\(\)/, 'the Save Changes button');`],
  ['admin-save-unchanged', `state.view='app'; state.role='admin'; state.tab='profile'; render();
                          clickPainted(/adminAccountAction\\('edit'\\)/, 'the Edit Profile button');
                          clickPainted(/saveAdminProfile\(\)/, 'the Save Changes button');`],
  ['admin-dash',       `state.view='app'; state.role='admin'; state.tab='admin_dashboard'; state.adminScreen='overview'; render();`],
  /* The audit log is the record §29 exists to keep, and the camera had never painted it:
     it sits one tap off the dashboard, and no table entry reached it. An action is logged
     first so the screen has a row, because the timestamps are the thing worth looking at —
     every row used to carry one typed date, which no source grep could tell from a real
     one. Reached by clicking the row a person clicks, not by assigning the screen. */
  ['admin-audit',      `state.view='app'; state.role='admin'; state.tab='admin_dashboard';
                        state.adminScreen='overview'; render();
                        adminLog('Camera pass check', 'the audit screen itself', 'Recorded so the row can be read');
                        clickPainted(/adminScreen='audit'/, 'the audit log row');`],
  ['admin-finance',    `state.view='app'; state.role='admin'; state.tab='admin_dashboard'; state.adminScreen='finance'; render();`],
  ['admin-trust',      `state.view='app'; state.role='admin'; state.tab='admin_dashboard'; state.adminScreen='trust'; render();`],
  ['admin-intel',      `state.view='app'; state.role='admin'; state.tab='admin_dashboard'; state.adminScreen='intelligence'; render();`],
  ['admin-categories', `state.view='app'; state.role='admin'; state.tab='admin_dashboard'; state.adminScreen='categories'; render();`],

  ['admin-verifiers',  `state.view='app'; state.role='admin'; state.tab='admin_verifications'; state.adminProviderCategory='pending'; render();`],
  /* The attention queue is a segment a thumb taps, so it is a destination: the fifth rail item on the
     Providers screen, reached by the same state value the button writes. Its filtered-to-nothing branch
     is deliberately not in this table, because every kind on the seed has at least one provider, so no
     tap can reach that wording — the gate asserts it instead, which is the rule for a state nobody can
     enter rather than a screen nobody has checked. */
  ['admin-attention',  `state.view='app'; state.role='admin'; state.tab='admin_verifications'; state.adminProviderCategory='attention'; state.adminAttentionKind=null; render();`],
  /* The review screen was in no table at all — a whole destination, reached by tapping
     "Open verification" on a pending applicant, that had never been photographed. Its
     modals now carry checkboxes and selects, so they are reached by clicking the painted
     button rather than by assigning the state. */
  ['admin-review', `state.view='app'; state.role='admin'; state.tab='admin_verifications'; render();
                          openProviderVerification('maria');`],
  ['admin-review-complete', `state.view='app'; state.role='admin'; state.tab='admin_verifications'; render();
                          openProviderVerification('joel');`],
  ['admin-review-request', `state.view='app'; state.role='admin'; state.tab='admin_verifications'; render();
                          openProviderVerification('maria');
                          clickPainted(/Action\\(.request.\\)/, 'the request-update button');`],
  ['admin-review-document', `state.view='app'; state.role='admin'; state.tab='admin_verifications'; render();
                          openProviderVerification('maria');
                          clickPainted(/Action\\(.document.,/, 'the open-document button');`],
  /* The decisive dialogs: what an admin sees at the moment of approving, rejecting or
     flagging. None of them had ever been painted, so nothing had measured their buttons,
     their contrast, or whether the reason text fits the box it is typed into. */
  ['admin-review-approve', `state.view='app'; state.role='admin'; state.tab='admin_verifications'; render();
                          openProviderVerification('joel');
                          clickPainted(/Action\\(.approve_confirm.\\)/, 'the approve button');`],
  ['admin-review-reject', `state.view='app'; state.role='admin'; state.tab='admin_verifications'; render();
                          openProviderVerification('maria');
                          clickPainted(/Action\\(.reject.\\)/, 'the reject button');`],
  ['admin-review-flag', `state.view='app'; state.role='admin'; state.tab='admin_verifications'; render();
                          openProviderVerification('maria');
                          clickPainted(/Action\\(.document.,/, 'the open-document button');
                          clickPainted(/Action\\(.flag.,/, 'the flag-an-issue button');`],
  ['admin-verified',   `state.view='app'; state.role='admin'; state.tab='admin_verifications'; state.adminProviderCategory='verified'; render();`],
  ['admin-desk',       `state.view='app'; state.role='admin'; state.tab='admin_disputes'; render();`],
  ['admin-provider',   `state.view='app'; state.role='admin'; state.tab='admin_provider_profile';
                        state.selectedAdminProvider='p1'; state.adminProviderSection='overview'; render();`],
  /* The admin's fourth nav item is "Account", and it renders adminProfile() through the same
     tab='profile' dispatch the other two roles use. It sat out every camera run since the
     table was written — 46 screens never included it — and it is the screen that holds the
     admin's editable name, phone and office. */
  ['admin-account',    `state.view='app'; state.role='admin'; state.tab='profile'; render();`],
  /* Reached by the "Insights" button in the Providers top bar — a whole destination behind a
     real control, and the word 'insights' appeared nowhere in this file until this entry was
     added, so it had never been
     photographed or measured by any tally. Found while grepping the application for statistics
     taken from a raw seed-array length; the screen it leads to types four of its numbers. */
  ['admin-insights',   `state.view='app'; state.role='admin'; state.tab='admin_provider_insights'; render();`],
  /* Placed after every screen that reads the pending counts, because it leaves one
     applicant decided. The record is written the way verificationAction writes it, so the
     shot shows the same shape a real approval produces. */
  ['admin-decided',    `state.view='app'; state.role='admin';
                        reviewOf('joel').status='verified'; reviewOf('joel').decidedAt=Date.now();
                        reviewOf('joel').reviewer=state.adminProfileData.name;
                        state.tab='admin_verifications'; state.adminProviderCategory='decided'; render();`],
  ['admin-verifiers-empty', `state.view='app'; state.role='admin';
                        /* A person reaches this by approving every applicant: the queue filters
                           decided applicants out, so finishing the queue is what empties it. The
                           list is cleared directly because what is being photographed is the
                           state, not the clicks — the empty branch had never been painted for a
                           camera, so its tap targets and contrast were unmeasured. */
                        PENDING_APPLICANTS.length = 0;
                        state.tab='admin_verifications'; state.adminProviderCategory='pending'; render();`],
  ['case-sheet',       `state.view='app'; state.role='resident'; state.tab='booking_detail';
                        const b=BOOKINGS.find(x=>x.status==='completed'&&x.pricing); b.completedAt=new Date().toISOString();
                        state.selectedBookingId=b.id; render(); openCaseSheet(b.id);`],
  ['empty-search',     `state.view='app'; state.role='resident'; state.tab='results';
                        state.searchQuery='piano tuning'; state.providerFilters=blankFilters(); render();`],

  /* ---- screens that change the data: reset first, and kept last ----
     The whole run happens in one page session, so a screen that answers an offer
     leaves nothing for the next one that needs one — and quietly dirties every
     screen after it. Each of these calls the app's own reset before it sets up, so
     it photographs the state its name claims rather than whatever ran before it. */
  ['fruit-record',     `resetDemoData(); state.view='app'; state.role='resident';
                        answerOffer('b8','accept',{ role:'customer', id:CURRENT_CUSTOMER_ID });
                        openBookingDetail('b8');`],
  ['fruit-voided',     `resetDemoData(); state.view='app'; state.role='resident';
                        answerOffer('b8','accept',{ role:'customer', id:CURRENT_CUSTOMER_ID });
                        attemptTransition('b8','cancelled',{ role:'provider', id:'p8' },
                          { reason:'Could not do the job' });
                        openBookingDetail('b8');`],
  ['admin-intel-produce', `resetDemoData(); state.view='app'; state.role='admin';
                        answerOffer('b8','accept',{ role:'customer', id:CURRENT_CUSTOMER_ID });
                        state.tab='admin_dashboard'; state.adminScreen='intelligence'; render();`],
  /* The weighing step, photographed from both sides of the same job. b10 is the
     harvest-and-buy that p7 can actually walk, so these three set it up the way the
     app does — offer, answer, arrive — rather than assigning a state nobody could. */
  ['fruit-weighed',    `resetDemoData(); applyProviderIdentity('p7');
                        makeOffer('b10',{ basis:'per_kg', quantityGrams:120000, unitPriceCentavos:5500,
                          produceCentavos:660000, labourCentavos:0, whoHarvests:'provider' },{ role:'provider' });
                        answerOffer('b10','accept',{ role:'customer', id:CURRENT_CUSTOMER_ID });
                        ['upcoming','en_route','arrived'].forEach(t =>
                          attemptTransition('b10', t, { role:'provider', id:'p7' }));
                        finaliseProduce('b10',{ quantityGrams:31000, note:'A third was damaged and left' },{ role:'provider' });
                        state.view='app'; state.role='provider'; state.tab='provider_booking_detail';
                        openProviderBooking('b10'); render();
                        document.querySelector('.finalise-card').scrollIntoView();`],
  ['finalise-sheet',   `resetDemoData(); applyProviderIdentity('p7');
                        makeOffer('b10',{ basis:'per_kg', quantityGrams:120000, unitPriceCentavos:5500,
                          produceCentavos:660000, labourCentavos:0, whoHarvests:'provider' },{ role:'provider' });
                        answerOffer('b10','accept',{ role:'customer', id:CURRENT_CUSTOMER_ID });
                        ['upcoming','en_route','arrived'].forEach(t =>
                          attemptTransition('b10', t, { role:'provider', id:'p7' }));
                        state.view='app'; state.role='provider'; state.tab='provider_booking_detail';
                        openProviderBooking('b10'); openFinalise('b10');
                        /* Type it the way the phone does. The field deliberately keeps its
                           own value while the totals update under it, so a script that only
                           moved the model would photograph a field and a total that never
                           occur together. */
                        document.getElementById('final-qty').value='31'; finalInput('qtyKg','31');`],
  ['finalise-warn',    `resetDemoData(); applyProviderIdentity('p7');
                        makeOffer('b10',{ basis:'per_kg', quantityGrams:120000, unitPriceCentavos:5500,
                          produceCentavos:660000, labourCentavos:0, whoHarvests:'provider' },{ role:'provider' });
                        answerOffer('b10','accept',{ role:'customer', id:CURRENT_CUSTOMER_ID });
                        ['upcoming','en_route','arrived'].forEach(t =>
                          attemptTransition('b10', t, { role:'provider', id:'p7' }));
                        state.view='app'; state.role='provider'; state.tab='provider_booking_detail';
                        openProviderBooking('b10'); openFinalise('b10');
                        /* A scale reads in grams; this field asks for kilos. Typed the way a
                           person holding a scale readout would type it. */
                        document.getElementById('final-qty').value='31000'; finalInput('qtyKg','31000');`],
  ['fruit-weighed-record', `resetDemoData(); applyProviderIdentity('p7');
                        makeOffer('b10',{ basis:'per_kg', quantityGrams:120000, unitPriceCentavos:5500,
                          produceCentavos:660000, labourCentavos:0, whoHarvests:'provider' },{ role:'provider' });
                        answerOffer('b10','accept',{ role:'customer', id:CURRENT_CUSTOMER_ID });
                        ['upcoming','en_route','arrived'].forEach(t =>
                          attemptTransition('b10', t, { role:'provider', id:'p7' }));
                        finaliseProduce('b10',{ quantityGrams:31000 },{ role:'provider' });
                        state.view='app'; state.role='resident'; openBookingDetail('b10');
                        document.querySelector('.produce-card').scrollIntoView();`],
];

/* The table is data, and data can be wrong in ways the parser will not report. A
   missing comma between two entries does not throw — it parses the second as a
   subscript on the first, which evaluates to undefined, and the screen simply stops
   being measured while the tool goes on printing a count that looks like coverage.
   This ran into exactly that: 42 entries, 40 measured, no complaint anywhere. */
(function validateScreens(){
  const bad = [];
  SCREENS.forEach((entry, i) => {
    if (!Array.isArray(entry) || entry.length !== 2 ||
        typeof entry[0] !== 'string' || typeof entry[1] !== 'string')
      bad.push('#' + i + ' ' + JSON.stringify(entry));
  });
  const names = SCREENS.map(x => x && x[0]);
  const dupes = names.filter((n, i) => n && names.indexOf(n) !== i);
  if (bad.length || dupes.length) {
    console.error('SCREENS table is malformed — refusing to report a screen count.');
    if (bad.length)    console.error('  not a [name, script] pair: ' + bad.join(', '));
    if (dupes.length)  console.error('  duplicate names: ' + dupes.join(', '));
    process.exit(1);
  }
})();

/* A run that hit EPERM on its own profile leaves the folder in the user's temp forever, because
   only that run ever knew its name. This sweeps by prefix, skips anything younger than an hour
   (a live run's own folder is being written to right now), and never throws: a folder still held
   by Chrome is a folder that will be reclaimed by the next run, not an error to report.

   Two prefixes, because one is history. `suki-diag-` was what a one-off diagnostic driver named its
   profiles on 2026-10-11; that script is gone from `tools/`, so nothing creates the name any more and
   its orphan can never be collected by a reclaimer that only knows the live prefix. Listing a dead
   prefix is safe precisely because of the hour guard: whatever still holds such a folder is a run that
   started less than an hour ago, and a run in this repository's own naming is the only thing that ever
   made one. */
const PROFILE_PREFIXES = ['suki-shot-', 'suki-diag-'];
function reclaimAbandonedProfiles(keep) {
  const tmp = os.tmpdir();
  let gone = 0;
  for (const name of fs.readdirSync(tmp)) {
    if (!PROFILE_PREFIXES.some(p => name.startsWith(p))) continue;
    const p = path.join(tmp, name);
    if (p === keep) continue;
    try { if (Date.now() - fs.statSync(p).mtimeMs < 3600000) continue; } catch (e) { continue; }
    try {
      fs.rmSync(p, { recursive: true, force: true, maxRetries: 2, retryDelay: 200 });
      gone++;
    } catch (e) { /* still locked by a Chrome that has not let go — leave it for the next sweep */ }
  }
  return gone;
}

async function main() {
  if (has('list')) {
    console.log(SCREENS.map(s => '  ' + s[0]).join('\n'));
    return;
  }
  if (!fs.existsSync(APP_FILE)) throw new Error('missing ' + APP_FILE);

  const chrome = findChrome();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'suki-shot-'));
  /* Reclaim the profiles earlier runs abandoned. Chrome keeps a handle on its own folder for a
     moment after SIGKILL, so the delete at the end of a main() below can throw EPERM and the
     folder is simply left behind — 157 of them and 2.97 GB in one week of sweeps, with nothing
     anywhere set to reclaim them. A suki-shot-* untouched for an hour cannot belong to a run in
     progress, so trying again is safe; a folder still locked by a live run survives this quietly,
     which is why the loop reports what it removed rather than assuming it removed everything. */
  const reclaimed = reclaimAbandonedProfiles(profile);
  if (reclaimed) console.log('reclaimed ' + reclaimed + ' abandoned Chrome profile folder(s) from earlier runs');

  const url = 'file:///' + APP_FILE.replace(/\\/g, '/') + (APP_MODE ? '?app=1' : '');
  const wanted = ONLY.length ? SCREENS.filter(s => ONLY.includes(s[0])) : SCREENS;
  const port = await freePort();
  /* Chrome's own words go to a file: this is a Windows GUI binary, so its stdout
     never arrives through the shell, and a silent failure is worthless to debug. */
  const chromeLog = path.join(profile, 'chrome.log');
  const logFd = fs.openSync(chromeLog, 'w');

  const child = spawn(chrome, [
    '--headless', '--disable-gpu', '--hide-scrollbars',
    '--allow-file-access-from-files',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${port}`,
    DESKTOP ? '--window-size=1280,900' : `--window-size=${WIDTH},${HEIGHT}`,
    'about:blank'
  ], { stdio: ['ignore', logFd, logFd] });

  /* This build of Chrome does not write DevToolsActivePort into the profile, so
     the port is discovered the way a real driver does: ask the endpoint. */
  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) {
    try { ready = !!(await get(`http://127.0.0.1:${port}/json/version`)).Browser; }
    catch { await sleep(250); }
  }
  if (!ready) {
    fs.closeSync(logFd);
    const log = fs.existsSync(chromeLog) ? fs.readFileSync(chromeLog, 'utf8') : '';
    child.kill('SIGKILL');
    fs.rmSync(profile, { recursive: true, force: true });
    throw new Error('no DevTools endpoint on port ' + port + '. Chrome said: ' + (log.slice(0, 400) || '(nothing)'));
  }
  fs.closeSync(logFd);

  let session;
  for (let i = 0; i < 20 && !session; i++) {
    try { session = await Session.connect(port); } catch { await sleep(300); }
  }
  if (!session) { child.kill('SIGKILL'); fs.rmSync(profile, { recursive: true, force: true }); throw new Error('could not attach to the page target'); }

  const consoleErrors = [];
  session.onEvent = (e) => {
    if (e.method === 'Runtime.exceptionThrown')
      consoleErrors.push('EXCEPTION ' + (e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text));
    if (e.method === 'Log.entryAdded' && e.params.entry.level === 'error')
      consoleErrors.push('CONSOLE  ' + e.params.entry.text.slice(0, 200));
  };

  await session.send('Page.enable');
  await session.send('Runtime.enable');
  await session.send('Log.enable').catch(() => {});
  /* Chrome's screenshot uses the viewport we give it. mobile:true makes
     text autosizing and the visual viewport behave like a phone instead of
     scaling a desktop layout down. */
  await session.send('Emulation.setDeviceMetricsOverride', {
    width: DESKTOP ? 1280 : WIDTH, height: DESKTOP ? 900 : HEIGHT,
    deviceScaleFactor: DPR, mobile: !DESKTOP
  });
  await session.send('Emulation.setScrollbarsHidden', { hidden: true });
  const mediaFeatures = [];
  if (REDUCED) mediaFeatures.push({ name: 'prefers-reduced-motion', value: 'reduce' });
  if (DARK) mediaFeatures.push({ name: 'prefers-color-scheme', value: 'dark' });
  if (mediaFeatures.length) {
    await session.send('Emulation.setEmulatedMedia', { features: mediaFeatures });
    console.log('  emulating ' + mediaFeatures.map(f => f.name + ': ' + f.value).join(', '));
  }
  if (TIMEZONE) {
    await session.send('Emulation.setTimezoneOverride', { timezoneId: TIMEZONE });
    console.log('  emulating timezone: ' + TIMEZONE);
  }

  const loaded = new Promise(resolve => {
    const check = (e) => { if (e.method === 'Page.loadEventFired') resolve(); };
    session.onEvent = ((prev) => (e) => { check(e); prev(e); })(session.onEvent);
  });
  await session.send('Page.navigate', { url });
  await Promise.race([loaded, sleep(15000)]);

  /* The launch screen hands over to sign-in on its own timer about 1.25s after
     load. Wait it out before navigating anywhere, or it lands on top of the
     screen being photographed. */
  await sleep(1900);
  /* The launch screen plays once on cold load; force the entry point the tool
     actually wants to start from. */
  await session.evaluate(`(function(){ try { state.view='login'; render(); return true; } catch(e){ return String(e); } })()`);
  await sleep(400);

  const boot = await session.evaluate(`(function(){
     return { title: document.title, hasState: typeof state !== 'undefined',
              roles: typeof PROVIDERS !== 'undefined' ? PROVIDERS.length : 0,
              bookings: typeof BOOKINGS !== 'undefined' ? BOOKINGS.length : 0,
              persistent: typeof Store !== 'undefined' ? Store.kind : 'no Store',
              version: typeof SCHEMA_VERSION !== 'undefined' ? SCHEMA_VERSION : '?' };
  })()`);
  console.log('page: ' + boot.title + ' | providers ' + boot.roles + ' | bookings ' + boot.bookings +
              ' | store ' + boot.persistent + ' | schema v' + boot.version);

  fs.mkdirSync(OUT, { recursive: true });
  /* Reset once, not per screen: resetDemoData() renders, and doing it immediately
     before a navigation let its own paint land after the screen we asked for —
     the tool then photographed the sign-in card and reported it as the chat room. */
  await session.evaluate(`(function(){ localStorage.clear(); resetDemoData(); return true; })()`);
  /* A helper for the screens that only exist behind a button: click the control the app
     actually painted instead of assigning the state it would set. If the handler went
     away, the shot fails with the button's name rather than photographing a reach of
     nobody — the same trap as a screen table that moves the model but not the field. */
  await session.evaluate(`(function(){
     window.clickPainted = function (re, label) {
        var wanted = new RegExp(re.source, re.flags);
        var hit = [].slice.call(document.querySelectorAll('[onclick]'))
           .filter(function (el) { return wanted.test(el.getAttribute('onclick')); })[0];
        if (!hit) throw new Error('nothing on the screen is ' + label);
        /* A button with no type defaults to submit, and submit inside a form navigates.
           Report what was actually hit so a screen that kills the tab says why. */
        var inForm = !!hit.closest('form');
        if (hit.tagName === 'BUTTON' && !hit.getAttribute('type')) {
           if (inForm) throw new Error(label + ' is a submit button inside a form — clicking it would navigate');
           hit.setAttribute('type', 'button');
        }
        hit.click();
        return label + ' (' + hit.tagName.toLowerCase() + (inForm ? ' in form' : '') + ')';
     };
     return true;
  })()`);
  await sleep(500);

  if (FONT_SCALE) {
    const scaleFactor = Number(FONT_SCALE);
    if (!isFinite(scaleFactor) || scaleFactor <= 0) {
      console.error('--font-scale wants a number like 1.35, got: ' + FONT_SCALE);
      process.exit(1);
    }
    const applied = await session.evaluate(`(function(){
      document.documentElement.style.fontSize = ${(16).toFixed(0)} * ${scaleFactor} + 'px';
      return 'root set to ' + document.documentElement.style.fontSize
        + ' -> computed ' + getComputedStyle(document.documentElement).fontSize
        + ' -> caption ' + getComputedStyle(document.body).fontSize;
    })()`);
    console.log('  emulating OS text size ' + FONT_SCALE + 'x → ' + applied);
  }

  const manifest = [];
  /* Wide enough for the longest screen name in the table, so the column stays readable as the
     table grows — six of the names added in §63 are longer than the fixed 20 this printed at,
     and the output started running "resident-payment-modalshows" together, which is the same
     failure as a mislabelled row: the column stops being worth reading. */
  const NAME_W = wanted.reduce((n, s) => Math.max(n, s[0].length), 20) + 1;
  for (const [name, nav] of wanted) {
    try {
      /* Stand the app back up the way its own bottom navigation does before each screen.
         A person tapping between tabs runs clearModals(); the walk used to assign
         state.role over whatever sheet the previous screen left open, and the app then
         spent the difference with real history.back() calls — on a file:// page that is a
         navigation, and Chrome took the target with it. Three screens vanished this way
         before the cause was the harness rather than the markup. */
      await session.evaluate(`(function(){
         try { clearModals(); } catch (e) {}
         /* The app pays back the entries it owns with real history.back() calls, which is
            right on a phone and wrong here: the walk jump-cuts between screens, and a back()
            past the page's own entries leaves the file entirely and Chrome closes the target.
            Take the debt without paying it, so each screen starts from one clean layer stack
            and the recorded behaviour of Back is still measured by the gate, not by this tool. */
         try { ignoreNextPop += ownedEntries; ownedEntries = 0; } catch (e) {}
         return true;
      })()`);
      const err = await session.evaluate(`(function(){
         try { ${nav} return ''; } catch(e){ return String(e && e.message || e); }
      })()`);
      if (err) { console.log('  SKIP ' + name + ' — ' + err); continue; }
      /* Let transitions settle: the app animates sheets and toasts, and a shot
         taken mid-flight photographs a half-moved screen. */
      await session.evaluate(`(function(){
         /* The launch screen schedules its own hand-over to sign-in about 1.25s
            after it paints. Photographing other screens behind it is fine; letting
            it fire mid-run switches the app out from under the shot and closes any
            sheet that was open. */
         try { if (typeof bootFromSplash !== 'undefined' && bootFromSplash._t) clearTimeout(bootFromSplash._t); } catch (e) {}
         try { if (typeof state !== 'undefined' && state.view === 'splash') { /* leave it on screen */ } } catch (e) {}
         return true;
      })()`);
      await sleep(parseInt(flag('wait', APP_MODE ? '700' : '900'), 10));
      /* A sheet needs one more push: the app's own render pass can hand the sheet
         state to a screen change before the layer mounts, and the second call lands
         on a screen that is already there. Only retried when the layer is absent,
         so an ordinary screen is never rendered twice for no reason. */
      for (let attempt = 0; attempt < 2; attempt++) {
        const mounted = await session.evaluate(`(function(){
           return !!document.querySelector('.sheet, .auth-sheet, .chat-list');
        })()`);
        const wantsSheet = /sheet|case/i.test(name);
        if (mounted || !wantsSheet) break;
        await session.evaluate(`(function(){ try { ${nav} return ''; } catch(e){ return String(e && e.message || e); } })()`);
        await sleep(420);
      }
      /* A toast expires on its own after 2.6s; a screenshot taken at 0.7s would
         otherwise photograph the tool's own housekeeping over the customer's
         screen. Clear the snackbar layer, then shoot. */
      await session.evaluate(`(function(){ const r=document.getElementById('toast-root'); if(r) r.innerHTML=''; return true; })()`);
      await sleep(120);
      /* Say what was actually photographed. A filename is a claim about the pixels
         in it, and without this the tool can silently shoot the wrong screen.
         querySelector returns the first match in DOCUMENT order, not in the order of
         the selector list, so the layers are asked one at a time — and asked in the
         order they paint: a dialog outranks the sheet it was raised from, a sheet
         outranks the screen behind it. The dialog used to be missing from this list
         entirely, which labelled all six form screens by the hub underneath them
         ("Resident Profile" over a picture of the edit form) and the same for the
         three dialogs that predated them; the walk's own output misled this pass
         twice, which is how it was noticed. The last two fallbacks exist because the
         root tabs carry a bare <h1> with no class on it — the resident's name, not a
         page heading — so the tool printed "(untitled)" over a screen that does have
         a title, and a column of lies teaches you to stop reading the column.
         "(untitled)" now means genuinely no heading was found. */
      const seen = await session.evaluate(`(function(){
         const t = document.querySelector('.modal-layer b') || document.querySelector('.sheet .sheet-title') ||
                   document.querySelector('.chat-head-name') ||
                   document.querySelector('.auth-sheet .auth-wordmark') || document.querySelector('#screen .topbar .title') ||
                   document.querySelector('#screen .card-title') || document.querySelector('#screen h1') ||
                   document.querySelector('#screen h2');
         const a = document.querySelector('.sheet, .auth-sheet, .chat-list');
         const el = a || document.getElementById('screen');
         return { title: t ? t.textContent.trim().replace(/\\s+/g,' ').slice(0,40) : '(untitled)',
                  sheet: (typeof state !== 'undefined' && state.sheet) || '-',
                  where: (typeof state !== 'undefined' ? state.view + '/' + state.role + ':' + state.tab : '?'),
                  overflow: el ? el.scrollHeight - el.clientHeight : 0 };
      })()`);
      /* --probe='JS' runs an expression after the navigation and prints what the
         page answers. Half of this audit was a wrong theory about a painted box,
         and the cheap way to settle a theory is to ask the page. */
      if (PROBE) {
        /* Its own try, because a bad probe string used to be reported as "page threw" —
           which reads as an app defect to whoever is holding the output, when the only
           thing that broke was the question. (@file is loaded relative to the repo; a bare
           value is evaluated as JavaScript as written, and until the flag parser stopped
           cutting it at the first '=' that almost always produced a SyntaxError the page
           had nothing to do with.) */
        try {
          const expr = PROBE.startsWith('@') ? fs.readFileSync(path.resolve(ROOT, PROBE.slice(1)), 'utf8') : PROBE;
          console.log('    probe → ' + JSON.stringify(await session.evaluate(`(function(){ try { return (${expr}); } catch(e){ return 'threw: ' + e.message; } })()`)));
        } catch (err) { console.log('    probe failed (not a page fault): ' + err.message.split('\n')[0]); }
      }
      const shot = await session.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const file = path.join(OUT, name + '.png');
      fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
      /* Measure the same painted frame that was just photographed. */
      let audit = null;
      if (MEASURE) {
        try { audit = await session.evaluate(AUDIT_JS); } catch (e) { audit = { error: e.message }; }
      }
      /* The Tab walk runs after the screenshot on purpose: focusing a control paints a ring, and
         the picture should be of the screen as a customer left it, not as the tool found it. */
      let focus = null;
      if (FOCUS) {
        focus = [];
        /* Stop the glide before walking. #screen scrolls smoothly by contract, so a Tab that lands
           below the fold starts an animation, and a rect read in the next breath is the element's
           *old* position — which this tool would then report as "focus went somewhere off the
           viewport". 19 of those, every one a profile-hub row, before the cause was the camera
           rather than the page. The same trap is already named once in this file for the under-nav
           check; the walk is the second place it bites, because focusing an element scrolls it and
           scrolling an element takes 250ms here. Restored after the walk so the pixels shot are the
           app's own. */
        await session.evaluate(`(function(){
           const s = document.createElement('style');
           s.id = 'suki-no-glide';
           s.textContent = '*{ scroll-behavior:auto !important; }';
           document.head.appendChild(s);
           if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
           return true;
        })()`);
        for (let i = 0; i < FOCUS_STEPS; i++) {
          await session.send('Input.dispatchKeyEvent',
            { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
          await session.send('Input.dispatchKeyEvent',
            { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
          const stop = await session.evaluate(FOCUS_STOP_JS);
          if (!stop) continue;
          /* The browser wraps to the address bar and back; seeing a stop twice means the walk has
             come round, and continuing would only pad the count. */
          if (focus.some(s => s.key === stop.key && s.what === stop.what)) break;
          focus.push(stop);
        }
        await session.evaluate(`(function(){ const s=document.getElementById('suki-no-glide'); if (s) s.remove(); return true; })()`);
      }
      manifest.push({ name, shows: seen.title, sheet: seen.sheet, where: seen.where, file: path.relative(ROOT, file), overflow: seen.overflow, viewport: WIDTH + 'x' + HEIGHT, audit, focus });
      console.log('  shot ' + name.padEnd(NAME_W) + 'shows "' + seen.title + '" [' + seen.where +
                  (seen.sheet !== '-' ? ' sheet:' + seen.sheet : '') + ']' +
                  (seen.overflow > 4 ? ('  scrolls ' + seen.overflow + 'px past the fold') : ''));
    } catch (e) {
      console.log('  FAIL ' + name + ' — ' + e.message);
    }
  }

  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({
    generatedAt: new Date().toISOString(), viewport: { width: WIDTH, height: HEIGHT, dpr: DPR },
    appMode: APP_MODE, url, screens: manifest, consoleErrors
  }, null, 2));
  if (MEASURE) {
    const flat = (key) => manifest.flatMap(m => (m.audit && m.audit[key] || []).map(x => ({ screen: m.name, ...x })));
    const tally = (rows, label, fmt) => {
      console.log('\n' + label + ': ' + rows.length);
      const byScreen = {};
      rows.forEach(r => { byScreen[r.screen] = (byScreen[r.screen] || 0) + 1; });
      Object.entries(byScreen).sort((a, b) => b[1] - a[1]).slice(0, 8)
        /* The same reason the shot column stopped padding to a literal: a name exactly as wide as
           the pad prints `fruit-provider-profile18`, and a line that reads as one token is read as
           one fact — here a screen and its count, which is the pair someone compares by eye. */
        .forEach(([s, n]) => console.log('  ' + s.padEnd(NAME_W) + n));
      const uniq = new Map();
      rows.forEach(r => { const k = fmt(r); if (!uniq.has(k)) uniq.set(k, r); });
      [...uniq.values()].slice(0, 14).forEach(r => console.log('    · ' + fmt(r)));
      if (uniq.size > 14) console.log('    … ' + (uniq.size - 14) + ' more');
    };
    const small = flat('small').filter(r => r.boxH < 44), contrast = flat('contrast'), trunc = flat('truncated'),
          previews = flat('previews'),
          off = flat('offScale'), over = flat('overlaps'), unl = flat('unlabelled'), str = flat('stretched');
    tally(small, 'controls under a 44px tap target', r => r.screen + ' "' + r.what + '" ' + r.w + 'x' + r.h + 'px' + (r.boxH > r.h ? ' (wrapper ' + r.boxH + 'px)' : ''));
    tally(contrast, 'text below WCAG contrast', r => r.screen + ' "' + r.text + '" ' + r.ratio + ':1 (needs ' + r.need + ', ' + r.size + 'px w' + r.weight + ' on ' + r.on + ')');
    tally(trunc, 'text clipped by its own container', r => r.screen + ' "' + r.text + '" loses ' + r.lost + 'px' + (r.ellipsis ? ' (ellipsis)' : ''));
    tally(off, 'font sizes off the type scale', r => r.screen + ' ' + r.size + 'px "' + r.text + '"');
    tally(flat('belowFloor'), 'text painted below the 14px floor (68)', r => r.screen + ' ' + r.size + 'px <' + r.tag + '> "' + r.text + '"');
    tally(over, 'content sitting under the bottom nav', r => r.screen + ' "' + r.what + '" by ' + r.underBy + 'px');
    tally(unl, 'clickable things with no accessible name', r => r.screen + '  ' + r.unlabelled);
    tally(flat('nameless'), 'form controls a screen reader cannot name', r => r.screen + '  ' + r.field);
    tally(str, 'images drawn out of proportion', r => r.screen + '  ' + r.src + ' natural ' + r.natural + ' drawn ' + r.drawn);
    tally(flat('mapEscape'), 'map panes painted outside their own frame', r => r.screen + '  ' + r.what + ' — ' + r.why);
    tally(flat('occluded'), 'something painting on top of an open modal layer', r => r.screen + '  ' + r.what + ' at sample ' + r.at);
    tally(flat('modalInert'), 'a sheet claiming modality under an open modal', r => r.screen + '  ' + r.what);
    tally(flat('catMotion'), 'category artwork moving in the painted page', r => r.screen + '  ' + r.what);
    tally(flat('broken'), 'images that asked for a file and got no pixels', r => r.screen + '  ' + r.src + ' — ' + r.why);
    tally(flat('remote'), 'requests that left the device for a network', r => r.screen + '  ' + r.kind + '  ' + r.url);
    tally(flat('svgSmall'), 'chart text that paints below the 14px floor', r => r.screen + '  "' + r.text + '" declares ' + r.declared + 'px, paints ' + r.rendered + 'px');
    tally(flat('chartEscape'), 'chart labels painted outside their own chart box', r => r.screen + '  "' + r.text + '" (' + r.cls + ') hangs ' + r.over + 'px ' + r.dir + ' of a ' + r.box + 'px box');
    tally(flat('navCut'), 'bottom-nav labels cut although the 14px floor would have fitted them', r => r.screen + '  "' + r.text + '" is cut at ' + r.px + 'px in a ' + r.slot + 'px slot, needing only ' + r.atFloor + 'px');
    /* Written as one string by the pass that added it — '  "" + r.text + "" is cut at " + r.px + …'
       substitutes nothing, so the count was right and every detail line printed its own source. The
       family that guards this tally reads the count, which is how it survived: a checker whose
       numbers are right and whose sentences are junk teaches you to stop reading the sentences. */
    tally(flat('layerDialog'), 'layers that opened without dialog semantics or the caret inside them', r => r.screen + '  .' + r.layer + ' "' + r.title + '" is missing ' + r.why);
    tally(flat('splitFigure'), 'stat-strip figures painted across more than one line', r => r.screen + '  "' + r.text + '" breaks into ' + r.lines + ' lines');
    tally(flat('chartOver'), 'bars painted above their own top gridline (a scale smaller than its data)', r => r.screen + '  a bar rises ' + r.over + 'px above the line that names its maximum in a ' + r.box + 'x' + r.h + 'px drawing');
    tally(flat('textCollide'), 'text painted on top of other text in the same card', r => r.screen + '  "' + r.a + '" x "' + r.b + '" in ' + r.card + ' overlap ' + r.ox + 'x' + r.oy + 'px');
    tally(flat('navEscape'), 'bottom-nav items pushed off the panel', r => r.screen + '  "' + r.text + '" hangs ' + r.over + 'px past a ' + r.box + 'px row (the row needs ' + r.scroll + 'px)');
    tally(flat('squashedCircle'), 'round markers painted as a sliver (a flex row took their width)', r => r.screen + '  .' + r.cls + ' ' + r.w + 'x' + r.h + 'px "' + r.text + '"');
    tally(flat('unreachable'), 'controls no tap can reach (off the viewport or clipped, with nothing that scrolls)', r => r.screen + '  <' + r.tag + '> "' + r.what + '" is ' + r.px + 'px ' + r.how + ' past ' + r.by);
    /* Only printed when the walk ran. A tally that reports 0 because its sensor never fired is
       the exact failure this repository keeps documenting, so silence here is not a pass — the
       absence of the line is the honest answer for a run without --focus. */
    if (FOCUS) {
      const stops = manifest.flatMap(m => (m.focus || []).map(x => ({ screen: m.name, ...x })));
      console.log('\nkeyboard stops walked: ' + stops.length + ' across ' +
        manifest.filter(m => m.focus).length + ' screens');
      tally(stops.filter(s => !s.changed), 'keyboard stops with no visible focus ring',
        r => r.screen + '  <' + r.tag + '> "' + r.what + '" .' + r.cls + ' outline ' + r.ring);
      tally(stops.filter(s => s.uaRing), 'keyboard stops covered by the browser default ring rather than the app rule',
        r => r.screen + '  <' + r.tag + '> "' + r.what + '" .' + r.cls);
      tally(stops.filter(s => s.behind), 'keyboard stops behind an open layer (Tab walked past the scrim)',
        r => r.screen + '  <' + r.tag + '> "' + r.what + '" .' + r.cls);
      tally(stops.filter(s => s.offscreen), 'keyboard stops that focus something off the viewport',
        r => r.screen + '  <' + r.tag + '> "' + r.what + '" .' + r.cls);
    }
    const vend = flat('vendor');
    console.log('\nvendor-owned controls excluded (Leaflet attribution + markers, not ours to resize): ' +
      vend.length + (vend.length ? '  e.g. ' + [...new Set(vend.map(r => r.what || 'unlabelled <img>'))].slice(0, 4).join(' | ') : ''));
    const weak = flat('placeholderOnly');
    console.log('\nfields whose only name is a placeholder (it vanishes on typing; listed for review): ' + weak.length + (weak.length ? '  ' + weak.slice(0, 6).map(r => r.screen + ' ' + r.field).join(', ') : ''));
    console.log('\nsingle-line previews shortened with an ellipsis (intended, listed for review): ' + previews.length + (previews.length ? '  e.g. ' + previews.slice(0,3).map(r => '\"' + r.text + '\x22 loses ' + r.lost + 'px').join(', ') : ''));
    const hOver = manifest.filter(m => m.audit && m.audit.hOverflow > 0);
    console.log('\nhorizontal overflow (a screen wider than the phone): ' + (hOver.length ? hOver.map(m => m.name + ' +' + m.audit.hOverflow + 'px').join(', ') : 'none'));
    const sizes = new Set(manifest.flatMap(m => (m.audit && m.audit.usedSizes) || []));
    console.log('distinct painted font sizes across the app: ' + sizes.size + '  [' + [...sizes].sort((a,b)=>a-b).join(', ') + ']');
    fs.writeFileSync(path.join(OUT, 'audit.json'), JSON.stringify(manifest.map(m => ({ name: m.name, ...m.audit })), null, 1));
  }

  if (consoleErrors.length) {
    console.log('\nthe page reported ' + consoleErrors.length + ' error(s):');
    [...new Set(consoleErrors)].slice(0, 12).forEach(e => console.log('  ' + e));
  } else {
    console.log('\nno console errors across ' + manifest.length + ' screens');
  }
  console.log('PNGs in ' + OUT);

  /* Ask the browser to shut itself down before killing it, rather than leaving a SIGKILL mid-write.
     This was tried as the real cure for the abandoned-profile leak and it DOES NOT WORK on this
     machine: over four clean single-screen runs after it, three still threw EPERM and the folders
     kept accumulating. It stays because it costs at most 1.5 s and sometimes the delete then
     succeeds, but the thing that actually bounds the leak is `reclaimAbandonedProfiles()` at the
     START of the next run. A first version of this block sent the command after closing the
     websocket and hung the tool forever waiting for a reply that could not arrive; a second version
     looked fixed across two runs, which was two runs too few to conclude anything. */
  try {
    await Promise.race([session.send('Browser.close'), sleep(1500)]);
  } catch (e) { /* already gone, or the domain is refused */ }
  try { session.ws.close(); } catch (e) { /* closed */ }
  const exited = new Promise(resolve => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    child.once('exit', finish); child.once('error', finish);
    setTimeout(finish, 3000);
  });
  try { child.kill('SIGKILL'); } catch (e) { /* it closed itself */ }
  await exited;
  /* Chrome keeps a handle on its profile after the kill and a Windows delete then throws EPERM.
     The screenshots are the point; a leftover temp folder is not worth failing a run over. */
  await sleep(400);
  try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); }
  catch (e) { console.log('(left the throwaway Chrome profile at ' + profile + ': ' + e.code + ')'); }
}

main().catch(err => { console.error(err.message); process.exit(1); });

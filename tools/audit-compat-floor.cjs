/* What is the oldest WebView that can render this app, and which feature decides?

   Asked "make it compatible with low and high end Android", the tempting answer is a number read off
   `minSdkVersion`. That number is about the *shell*: this app's floor is the WebView, which updates independently of
   the OS through Play, so an Android 7 handset with a 2024 WebView is fine and a 2020 Go handset with a frozen
   WebView 77 is not. `minSdk 24` says nothing about either.

   So this reads the application and asks which CSS/JS features it actually uses, what the oldest Chromium that
   honours each one is, and — the part that decides whether it matters — what happens on a WebView that predates
   it. A dropped `gap` compresses a row; a dropped `inset:0` leaves a full-screen scrim with no geometry, which is
   not a visual regression but a control that cannot be tapped. Those two are not the same finding and a scan that
   reports one number conflates them.

   Two numbers are printed: the **raw floor** (the newest minimum version among everything used) and the
   **breaking floor** (the same, restricted to features whose failure mode is not graceful). The exit code gates
   the breaking floor against `--max-chromium` (default 79), because that is the one a device can be assumed
   below. The raw floor is reported and never gated: it is information about a degradation, not a defect.

   Every feature row carries its own population control: a pattern that matched nothing is reported as `absent`,
   and a scan whose every pattern is absent refuses with NO CONCLUSION rather than printing "no floor", which is
   the shape every other audit here has had to learn.

     node tools/audit-compat-floor.cjs
     node tools/audit-compat-floor.cjs --file=Sukinnect.html
     node tools/audit-compat-floor.cjs --max-chromium=84
     node tools/falsify-compat-floor.cjs        # proves the floor can be raised and the scan can go blind
*/
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const arg = (name, dflt) => {
  const hit = process.argv.find(a => a.startsWith('--' + name + '='));
  return hit ? hit.slice(name.length + 3) : dflt;
};
const FILE = path.join(ROOT, arg('file', 'Sukinnect-next.html'));
const MAX_BREAKING = Number(arg('max-chromium', 79));

/* minChromium is the version that first honours the property or method at all, from the Chromium release notes
   and caniuse's WebView column. `severity` is what a *later* reader needs and cannot derive from the version:
   benign = the declaration is dropped and the layout stays usable; breaking = the drop removes geometry,
   visibility or a hit area. `guard` names what makes a benign one benign — usually a fallback declaration for
   the same property written immediately before it, which is why `min-height:100vh; min-height:100dvh` is safe and
   a bare `min-height:100dvh` would not be. */
const FEATURES = [
  { name: 'inset shorthand', re: /(^|[;\s{])inset\s*:/g, min: 87, severity: 'breaking',
    note: 'a positioned element with only `inset:0` loses its box entirely' },
  { name: 'aspect-ratio', re: /(^|[;\s{])aspect-ratio\s*:/g, min: 88, severity: 'breaking',
    note: 'a sized placeholder collapses to its content height' },
  { name: ':has()', re: /:has\(/g, min: 105, severity: 'breaking',
    note: 'the whole selector is dropped, so the rule stops applying' },
  { name: 'container queries', re: /@container|container-type\s*:/g, min: 105, severity: 'breaking',
    note: 'a component sized by its container falls back to the viewport' },
  { name: ':is() / :where()', re: /:is\(|:where\(/g, min: 88, severity: 'breaking',
    note: 'the whole selector list is dropped' },
  { name: 'color-mix()', re: /color-mix\(/g, min: 111, severity: 'breaking',
    note: 'the colour declaration is dropped, so the element paints with no background' },
  { name: 'scrollbar-gutter', re: /scrollbar-gutter\s*:/g, min: 94, severity: 'benign',
    note: 'the gutter is not reserved; content shifts by the scrollbar width when it appears' },
  { name: 'text-decoration-thickness', re: /text-decoration-thickness\s*:/g, min: 87, severity: 'benign',
    note: 'the decoration keeps its default thickness' },
  { name: 'logical properties', re: /(^|[;\s{])(margin|padding|inset|border)-(block|inline)(-(start|end))?\s*:/g,
    min: 89, severity: 'benign', note: 'the spacing declaration is dropped' },
  { name: ':focus-visible', re: /:focus-visible/g, min: 86, severity: 'benign',
    note: 'falls back to :focus if that rule also exists; a keyboard ring can be lost' },
  { name: 'backdrop-filter', re: /backdrop-filter\s*:/g, min: 76, severity: 'benign',
    note: 'the blur is not painted; the scrim behind it still is' },
  { name: 'overscroll-behavior', re: /overscroll-behavior\s*:/g, min: 63, severity: 'benign',
    note: 'scroll chaining to the page behind is not suppressed' },
  { name: 'flexbox gap', re: /(^|[;\s{])gap\s*:/g, min: 84, severity: 'benign',
    note: 'flex items touch; padding on the children still spaces them' },
  { name: 'dynamic viewport units (dvh/svh/lvh)', re: /\b\d*\.?\d+(dvh|svh|lvh|dvw|svw|lvw)\b/g, min: 108,
    severity: 'benign', guard: /\b\d+(\.\d+)?vh\b/, note: 'benign ONLY with a plain-`vh` fallback on the line before it' },
  { name: 'min() / max() / clamp()', re: /(^|[;\s(])(min|max|clamp)\(/g, min: 79, severity: 'benign',
    note: 'the declaration is dropped; :root font-size falls back to the UA default' },
  { name: 'structuredClone', re: /\bstructuredClone\(/g, min: 98, severity: 'breaking',
    note: 'a TypeError at the call site, not a silent drop' },
  { name: 'Array toSorted / toReversed / toSpliced', re: /\.to(Sorted|Reversed|Spliced)\(/g, min: 110,
    severity: 'breaking', note: 'a TypeError at the call site' },
];

let src;
try { src = fs.readFileSync(FILE, 'utf8'); }
catch (e) {
  console.log('NO CONCLUSION: ' + path.relative(ROOT, FILE) + ' could not be read — ' + e.code);
  process.exit(1);
}
const lines = src.split(/\r?\n/);

/* Strip comments before scanning. A comment that says "we avoided :has() because …" is not a use of :has(), and a
   scanner that counts prose is the defect this repository has now written down three times. */
const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

const rows = [];
for (const f of FEATURES) {
  const re = new RegExp(f.re.source, 'g');
  const hits = code.match(re) || [];
  let guarded = 0;
  if (hits.length && f.guard) {
    /* Count only the hits that really do have a fallback declaration for the same property before them. */
    for (let i = 0; i < lines.length; i++) {
      const lineRe = new RegExp(f.re.source, 'g');
      if (!lineRe.test(lines[i])) continue;
      const window = lines.slice(Math.max(0, i - 2), i + 1).join(' ');
      /* The probe has to name a plain `vh`, not the string 'vh': the substring occurs inside `dvh` itself, so a
         test written that way reports every use as guarded and can never observe the fallback it exists to check. */
      if (f.guard.test(window)) guarded++;
    }
  }
  const unguarded = hits.length - (f.guard ? guarded : 0);
  rows.push({ name: f.name, min: f.min, severity: f.severity, uses: hits.length, unguarded, note: f.note });
}

/* Exceptions are declared in the application, beside the rule that needs them, and read from there rather than
   maintained in this file — a list kept next to the scanner is the list that rots. Each one must name a feature this
   table knows, must be a feature the file actually uses, and must carry a reason: an exception that hides nothing,
   hides a typo, or is empty is a finding, because the only thing worse than a breaking feature is a breaking
   feature that has been quietly excused. */
const DECL = new Map();
const DECL_RE = new RegExp('compat-exception:\\s*([^\\n\\u2014]+?)\\s*\\u2014\\s*([\\s\\S]*?)\\*\\/', 'g');
/* Read them from the RAW source: the declaration is itself a comment, and `code` has every comment
   stripped out of it. Parsing the stripped text would find no exception ever, which is a scanner that
   silently stops honouring the very thing it was extended to honour. */
for (const m of src.matchAll(DECL_RE)) {
  const name = m[1].trim();
  const reason = m[2].replace(/\s+/g, ' ').trim();
  if (DECL.has(name)) { DECL.get(name).dupes++; } else { DECL.set(name, { reason, dupes: 1 }); }
}
const declFindings = [];
for (const [name, d] of DECL) {
  const row = rows.find(r => r.name === name);
  if (!row) { declFindings.push("a compat-exception names \"" + name + "\", which is not a feature in this table — "
    + "the declaration is stale or the name is misspelled, so nothing is excused and nobody would notice"); continue; }
  if (row.uses === 0) { declFindings.push("a compat-exception declares \"" + name + "\" but the file uses it "
    + "nowhere — the rule it was written beside is gone and the excuse outlived it"); continue; }
  if (d.reason.length < 40) declFindings.push("a compat-exception for \"" + name + "\" carries a "
    + d.reason.length + "-character reason; an exception has to say what degrades and where that is checked");
}
const present = rows.filter(r => r.uses > 0);
console.log('compatibility floor — ' + path.relative(ROOT, FILE) + ' — ' + lines.length + ' lines read, '
  + present.length + ' of ' + FEATURES.length + ' patterns matched');
if (present.length === 0) {
  console.log('NO CONCLUSION: not one feature pattern matched, which means the scan is blind, not that the file is'
    + ' old-WebView-safe. Every pattern here is checked against the file, so an empty result is a broken reader.');
  process.exit(1);
}
for (const r of rows) {
  const state = r.uses === 0 ? 'absent' : DECL.has(r.name) ? 'declared'
    : (r.unguarded === 0 && r.name.includes('dynamic') ? 'guarded' : 'used');
  console.log('  ' + String(r.min).padStart(4) + '  ' + r.name.padEnd(36) + ' ' + state.padEnd(8)
    + (' ' + r.uses + ' use' + (r.uses === 1 ? '' : 's')).padEnd(12)
    + (r.severity === 'breaking' ? 'BREAKING' : 'benign')
    + (r.uses && r.unguarded < r.uses ? '  (' + (r.uses - r.unguarded) + ' with a fallback)' : ''));
}

const rawFloor = present.reduce((a, r) => Math.max(a, r.min), 0);
const breakingRows = present.filter(r => r.severity === 'breaking' && r.unguarded > 0 && !DECL.has(r.name));
const breakingFloor = breakingRows.reduce((a, r) => Math.max(a, r.min), 0);
const rawWho = present.filter(r => r.min === rawFloor).map(r => r.name).join(', ');

console.log('─'.repeat(88));
console.log('raw floor:      Chromium ' + rawFloor + '  (' + rawWho + ')');
console.log('breaking floor: ' + (breakingFloor ? 'Chromium ' + breakingFloor + '  ('
  + breakingRows.map(r => r.name + ' — ' + r.note + ')').join('; ') : 'none — every feature above the raw floor'
  + ' that is used either degrades gracefully, has a fallback, or carries a declared exception'));
console.log('budget:         breaking floor must stay at or below Chromium ' + MAX_BREAKING
    + '  (minSdk 24 ships WebViews far older than that; Play updates the rest)');

const findings = declFindings.slice();
if (breakingFloor > MAX_BREAKING) {
  findings.push('a feature needing Chromium ' + breakingFloor + ' is used without a fallback, and its drop removes'
    + ' geometry rather than cosmetics: ' + breakingRows.map(r => r.name).join(', '));
}
console.log('findings: ' + findings.length);
findings.forEach(f => console.log('  FINDING ' + f));
process.exit(findings.length ? 1 : 0);

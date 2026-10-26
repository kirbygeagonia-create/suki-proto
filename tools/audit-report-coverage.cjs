/* Does the plan's own completion report (§17) name every row of its audit matrix (§4)?

   Asked because of R6. §4 carries 47 concern rows, each with a class — AR (resolved before Phase B), CD,
   PR, PD, NA, CV — and §17 is the report a reviewer reads to find out what Phase B did. R6 was classified
   AR/PR with a P2 action, that action was never built, and **the row appeared nowhere in §17**, so nothing
   in the repository could notice the gap between "the plan has 47 rows" and "the report dispositions 29 of
   them". `audit-matrix-coverage.cjs` counts the rows; this asks the other half — which rows the report
   speaks about.

   It is a list to read, not a gate to pass: sixteen of the eighteen rows §17 does not name are AR, and each
   of those is held by an instrument that already existed, so not repeating them is right. What is not right
   is silence about it — which is why the rule this tool exists to serve is: **a row re-classed out of AR
   gets a §17 disposition in the same change.**

   The tool refuses rather than summarising. If no §17 heading is found, or no §4 rows are parsed, the
   answer is NO CONCLUSION with exit 1: an empty census must not read like a clean one.

     node tools/audit-report-coverage.cjs [path-to-plan]                    */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PLAN = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'SUKINNECT_UX_RELIABILITY_MVP_PLAN.md');

let lines;
try { lines = fs.readFileSync(PLAN, 'utf8').split(/\r?\n/); }
catch (err) { console.log('NO CONCLUSION  the plan could not be read: ' + err.message); process.exit(1); }

const s17 = lines.findIndex(l => /^##\s*17[.\s]/.test(l));
if (s17 < 0) {
  console.log('NO CONCLUSION  no "## 17" heading exists, so the report cannot be compared with the matrix. ' +
    'A renamed or deleted section is not a report that covers nothing.');
  process.exit(1);
}

/* The plan's own sections, censused. This check exists because of a mistake made while writing the file:
   an edit intended to append a status block to §5 matched `---\n\n## 6. Navigation / back audit` as its
   anchor and replaced it, deleting the heading while leaving the section's prose behind. The document still
   read as seventeen sections to anyone scrolling it, the §4 matrix was untouched, and every count in this
   tool still passed — the text that had lost its home was silently filed under the previous section. A
   heading is structure, and structure a document depends on is worth a census. */
const heads = [];
for (let i = 0; i < lines.length; i++) {
  const m = /^##\s+(\d+(?:\.\d+)?)[.\s]/.exec(lines[i]);
  if (m) {
    const parts = m[1].split('.');
    heads.push({ n: Number(parts[0]), sub: parts.length > 1 ? Number(parts[1]) : null, line: i + 1 });
  }
}
const top = heads.filter(h => h.sub === null);
const expected = Array.from({ length: 17 }, (_, i) => i + 1);
const headProblems = [];
for (const n of expected) {
  const hits = top.filter(h => h.n === n);
  if (hits.length === 0) headProblems.push('§' + n + ' has no heading');
  else if (hits.length > 1) headProblems.push('§' + n + ' appears ' + hits.length + ' times');
}
for (let i = 1; i < top.length; i++) if (top[i].n < top[i - 1].n) headProblems.push('§' + top[i].n + ' at line ' + top[i].line + ' is out of order');
if (top.length !== expected.length) headProblems.push(top.length + ' top-level headings where the plan has 17 sections');
console.log('sections: ' + top.length + ' top-level headings, numbered ' + top.map(h => h.n).join(','));
for (const p of headProblems) console.log('  HEADING  ' + p);

const rows = [];
for (let i = 0; i < s17; i++) {
  const m = /^\|\s*(G\d+|R\d+|P1[a-k]|A\d+)\s*\|/.exec(lines[i]);
  if (m) rows.push({ id: m[1], cls: (lines[i].split('|')[3] || '').replace(/\*\*/g, '').trim() });
}
if (rows.length < 40) {
  console.log('NO CONCLUSION  only ' + rows.length + ' matrix rows parsed above §17 — the scan is blind to the ' +
    'table rather than the table being short.');
  process.exit(1);
}

/* A row counts as dispositioned only where the report *lists* it — a bullet or a table row — not wherever
   prose happens to mention an id. The first version asked whether the id appeared anywhere below the §17
   heading, and a paragraph written about this very tool then "dispositioned" all seven AR rows it named in
   passing, printing 47 of 47 covered while saying nothing at all about any of them. A sentence that cites a
   row is not a verdict on it, and an instrument that cannot tell the two apart will be satisfied by one.

   A markdown list item is its first line *and its continuation lines*: the second version of this scan took
   only lines opening with `-`, so six ids written inside wrapped bullets read as undispositioned and the
   tool condemned a document that had in fact dispositioned them. A blank line, or a line that opens its own
   block (`-`, `|`, `#`, or a bold paragraph lead), ends an item. */
const report = lines.slice(s17);
const isItemStart = (l) => /^\s*([-*]|\|)\s/.test(l) || /^#/.test(l);const endsItem = (l) => l.trim() === '' || isItemStart(l) || /^\*\*/.test(l);
let listed = '';
let inItem = false;
for (const l of report) {
  if (isItemStart(l)) { inItem = /^([-*]|\|)/.test(l.trim()); if (inItem) listed += l + '\n'; }
  else if (inItem) { if (endsItem(l)) { inItem = false; } else { listed += l + '\n'; } }
}
const named = [];
const silent = [];
for (const r of rows) {
  const hit = new RegExp('(^|[^A-Za-z0-9])' + r.id + '([^A-Za-z0-9]|$)').test(listed);
  (hit ? named : silent).push(r);
}

console.log('plan: ' + path.relative(ROOT, PLAN) + '   §4 rows: ' + rows.length +
  '   §17 starts at line ' + (s17 + 1));
console.log('dispositioned in §17 (a bullet or a table row naming the id): ' + named.length +
  '   not dispositioned: ' + silent.length);
for (const r of silent) {
  console.log('  ' + r.id.padEnd(4) + (r.cls.split(' ')[0] || '(none)').padEnd(6) +
    (/^AR/.test(r.cls) ? 'held by an earlier pass' : 'NOT AR — owes a §17 disposition'));
}
const unheld = silent.filter(r => !/^AR/.test(r.cls)).map(r => r.id);
/* The report also *lists* each row under a class heading ("AR — 21. `G1` `G2` …"). That list is a second
   copy of a fact §4 already holds, and this repository has learned the hard way that two copies drift — so
   the listing is compared with the table, id by id. A row moved in §4 without the list being re-cut is a
   finding, and so is an id the list names that §4 does not carry at all. */
const classOf = (cls) => /^AR/.test(cls) ? 'AR' : /^CD/.test(cls) ? 'CD' : /^PR/.test(cls) ? 'PR'
  : /^PD/.test(cls) ? 'PD' : /^NA/.test(cls) ? 'NA' : /^CV/.test(cls) ? 'CV' : '?';
const claimed = {};
let bucket = null;
for (const l of report) {
  const head = /^- \*\*(AR|CD|PR|PD|CV|NA) — (\d+)/.exec(l.trim());
  if (head) { bucket = { cls: head[1], n: Number(head[2]), ids: [] }; claimed[head[1]] = bucket; }
  else if (bucket && (l.trim() === '' || /^([-*|]|\*\*)/.test(l.trim()))) bucket = null;
  if (bucket) for (const m of l.matchAll(/`((?:[GR]\d+|A\d+|P1[a-k]))`/g)) {
    /* A row named twice inside one bullet is still one disposition — the AR bullet's own prose re-cites two
       of its members to explain why they differ — so the set, not the count of mentions, is the fact. */
    if (bucket.ids.indexOf(m[1]) < 0) bucket.ids.push(m[1]);
  }
}
const listProblems = [];
for (const cls of Object.keys(claimed)) {
  const b = claimed[cls];
  const actual = rows.filter(r => classOf(r.cls) === cls).map(r => r.id);
  const missing = actual.filter(id => b.ids.indexOf(id) < 0);
  const extra = b.ids.filter(id => actual.indexOf(id) < 0);
  if (b.n !== b.ids.length) listProblems.push(cls + ' announces ' + b.n + ' ids and lists ' + b.ids.length);
  if (b.n !== actual.length) listProblems.push(cls + ' announces ' + b.n + ' but §4 classifies ' + actual.length);
  if (missing.length) listProblems.push(cls + ' list omits: ' + missing.join(' '));
  if (extra.length) listProblems.push(cls + ' list names rows §4 no longer classifies so: ' + extra.join(' '));
}
for (const r of rows) {
  const cls = classOf(r.cls);
  if (claimed[cls] && claimed[cls].ids.indexOf(r.id) < 0) listProblems.push(r.id + ' is ' + cls + ' in §4 but absent from the §17 ' + cls + ' list');
}
const uniqueProblems = [...new Set(listProblems)];
/* An empty class list is not agreement — it is the cross-check having nothing to compare. Deleting every
   `- **AR — N…**` bullet made this audit report `findings: 0` on a strictly worse document, and the
   falsifier's break caught it (aggregate-62, MISSED: "wanted findings greater than 1, got findings 0").
   A guard that goes silent when its input disappears is the failure this repository keeps meeting, so each
   class §4 actually uses must have a list here. */
/* §4 writes its class cell annotated — `**AR (decided and built 2026-10-26; the class still read PD)**` —
   so the row's class must be reduced to its two-letter key before it is compared with the §17 list keys.
   Without this the new check reported "§17 carries no class list for AR (decided and built…)", a false
   finding manufactured by comparing an annotation against a bare key — the same annotation trap that hid
   nine rows from the row-instrument census an hour earlier. */
const clsKey = (c) => (/^(AR|CD|PR|PD|CV|NA)/.exec(String(c || '').replace(/^\*\*/, '')) || [])[1];
const classesIn4 = [...new Set(rows.map(r => clsKey(r.cls)))].filter(Boolean).sort();
const missingClasses = classesIn4.filter(c => !claimed[c] || !claimed[c].ids.length);
missingClasses.forEach(c => uniqueProblems.push('§17 carries no class list for ' + c +
  ' — the id-for-id cross-check has nothing to compare, which is not the same as agreeing'));
if (missingClasses.length) uniqueProblems.push('the §17 class list is missing ' + missingClasses.length +
  ' of the ' + classesIn4.length + ' classes §4 uses');
console.log('class list: ' + Object.keys(claimed).sort().map(k => k + ' ' + claimed[k].ids.length).join(' · '));
for (const p of uniqueProblems) console.log('  LIST MISMATCH  ' + p);

const total = unheld.length + uniqueProblems.length + headProblems.length;
console.log('findings: ' + total);
console.log(total
  ? (unheld.length ? 'rows §17 neither dispositions nor can leave silent: ' + (unheld.join(', ') || '(none)') : '') +
    (uniqueProblems.length ? '\nthe §17 class list disagrees with §4 in ' + uniqueProblems.length + ' way(s)' : '') +
    (headProblems.length ? '\nthe plan\'s own sections are miscounted or out of order in ' + headProblems.length + ' way(s)' : '')
  : (silent.length ? silent.length + ' rows are silent, and every one is AR, which is the class the report may leave alone'
    : 'the report lists a disposition for every row, its class list matches the table id for id, and all 17 sections have their headings.'));
process.exit(total ? 1 : 0);

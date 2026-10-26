/* Does the improvement plan's own audit matrix still cover what it claims to cover?

   §4 of `SUKINNECT_UX_RELIABILITY_MVP_PLAN.md` says §13 of the brief contains 47 concern bullets and
   that the matrix carries 47 rows — G1–G11, R1–R11, P1a–P1k, A1–A14 — each classified. That is a
   countability claim about a document, and until now nothing checked it: a row deleted in an edit, an id
   skipped (G9 then G11), or a class cell emptied would have left the sentence standing while the table
   quietly stopped covering the brief. This tool reads the table and refuses rather than summarising it.

   It prints one row per id with its class, the distribution, and exits 1 when the sets are incomplete or
   a row carries no class. It does NOT judge whether a classification is right — reading a disposition
   against the code is a person's job, and §4's own rows say what was measured.

     node tools/audit-matrix-coverage.cjs [path-to-plan]                    */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PLAN = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'SUKINNECT_UX_RELIABILITY_MVP_PLAN.md');

const EXPECT = {
  G: Array.from({ length: 11 }, (_, i) => 'G' + (i + 1)),
  R: Array.from({ length: 11 }, (_, i) => 'R' + (i + 1)),
  P1: 'abcdefghijk'.split('').map(s => 'P1' + s),
  A: Array.from({ length: 14 }, (_, i) => 'A' + (i + 1))
};
const ALL = [].concat(EXPECT.G, EXPECT.R, EXPECT.P1, EXPECT.A);

let src = '';
try { src = fs.readFileSync(PLAN, 'utf8'); }
catch (err) { console.log('NO CONCLUSION  the plan could not be read: ' + err.message); process.exit(1); }

const rows = src.split(/\r?\n/)
  .filter(l => /^\|\s*(G\d+|R\d+|P1[a-k]|A\d+)\s*\|/.test(l))
  .map(l => {
    const f = l.split('|').map(s => s.trim());
    return { id: f[1], concern: f[2], cls: (f[3] || '').replace(/\*\*/g, '').trim() };
  });

if (rows.length < 40) {
  console.log('NO CONCLUSION  only ' + rows.length + ' matrix rows were parsed, which means the scan is ' +
    'blind to the table rather than the table being short. Check the row format before believing this.');
  process.exit(1);
}

const seen = {};
for (const r of rows) seen[r.id] = (seen[r.id] || 0) + 1;
const missing = ALL.filter(id => !seen[id]);
const duplicated = Object.keys(seen).filter(id => seen[id] > 1);
const unexpected = rows.map(r => r.id).filter(id => ALL.indexOf(id) < 0);
const unclassified = rows.filter(r => !r.cls || !r.concern).map(r => r.id);

const families = Object.keys(EXPECT).map(k => k + ': ' + EXPECT[k].filter(id => seen[id]).length + '/' + EXPECT[k].length);
const t = {};
for (const r of rows) {
  const key = /^AR/.test(r.cls) ? 'AR' : /^CD/.test(r.cls) ? 'CD' : /^PR/.test(r.cls) ? 'PR'
    : /^PD/.test(r.cls) ? 'PD' : /^NA/.test(r.cls) ? 'NA' : /^CV/.test(r.cls) ? 'CV' : r.cls;
  t[key] = (t[key] || 0) + 1;
}

console.log('plan: ' + path.relative(ROOT, PLAN) + '   rows parsed: ' + rows.length +
  '   expected ids: ' + ALL.length);
console.log('families: ' + families.join(' · '));
console.log('classes:  ' + Object.keys(t).sort().map(k => k + ' ' + t[k]).join(' · '));
for (const r of rows) console.log('  ' + r.id.padEnd(4) + (r.cls || '(none)').padEnd(14) + r.concern.slice(0, 96));

const findings = missing.length + duplicated.length + unexpected.length + unclassified.length;
if (missing.length) console.log('MISSING ids: ' + missing.join(', '));
if (duplicated.length) console.log('DUPLICATED ids: ' + duplicated.join(', '));
if (unexpected.length) console.log('UNEXPECTED ids: ' + unexpected.join(', '));
if (unclassified.length) console.log('ROWS WITH NO CLASS OR CONCERN: ' + unclassified.join(', '));
console.log('findings: ' + findings);
console.log(findings ? 'the matrix no longer covers the brief it claims to cover.'
  : 'every id the plan names is present exactly once, and every row carries a class and a concern.');
process.exit(findings ? 1 : 0);

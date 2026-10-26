/* Proves `audit-report-coverage.cjs` can fail, and can fail in the direction that matters.

   The audit asks one question the repository had never asked: the improvement plan's §4 carries 47 concern
   rows, and §17 is the report a reader consults for what Phase B owes — so which rows does the report
   actually disposition? It was written because R6 was classified AR/PR, its P2 half was never built, and the
   row appeared nowhere in §17. Nothing could see that, because every existing instrument measures the
   application, not the plan's account of it.

   Four breaks, each a different way this kind of census goes quietly wrong:
     1 every listed mention of one open row is removed. The audit must exit 1 and name that row — the case the
       tool exists to catch, and the only break whose *content* the check has to read rather than its count;
     2 the whole class list goes. Many rows fall silent at once and the findings count has to climb with
       them — a census that reports "1 finding" no matter how much of the report is removed is counting its
       own loop, not the document;
     3 the parser's continuation-line rule is taken out, and the audit must then refuse **a correct
           document** — six ids live inside wrapped bullets, so a reader that only sees a bullet's first line
           invents findings. This is the break that proves the list parsing is load-bearing rather than
           decorative, and it is caught in the opposite direction: the tool goes red on a tree that is fine;
     4 a section heading is demoted from `##` to `###`, which is the exact damage this file's own editing
           session caused and did not notice: the section's prose stayed, the count of sections did not, and
           every other number in the audit kept passing. A heading is structure, and the plan's §17 lookup
           depends on there being exactly seventeen of them.

   The target is the plan document and the audit itself, not the application page — so this family never
   touches `Sukinnect-next.html`, which is the mutex every other family shares.

     node tools/falsify-report-coverage.cjs    seconds                                */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PLAN = path.join(ROOT, 'SUKINNECT_UX_RELIABILITY_MVP_PLAN.md');
const AUDIT = path.join(ROOT, 'tools', 'audit-report-coverage.cjs');
const planOriginal = fs.readFileSync(PLAN, 'utf8');
const auditOriginal = fs.readFileSync(AUDIT, 'utf8');

function run() {
  try {
    const out = execFileSync(process.execPath, [AUDIT], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    return { code: 0, out: out };
  } catch (err) {
    return { code: err.status === undefined ? -1 : err.status, out: (err.stdout || '') + (err.stderr || '') };
  }
}
function findings(out) {
  /* Read the verdict line, never the body: the audit prints rows that contain the word "findings" in their
     own prose, and a `match(/findings: (\d+)/)` over the whole output can land on one of those. */
  const line = out.split(/\r?\n/).reverse().find(l => /^findings: \d+$/.test(l.trim()));
  return line ? Number(/\d+/.exec(line.trim())[0]) : null;
}

const base = run();
const baseFindings = findings(base.out);
if (base.code !== 0 || baseFindings !== 0) {
  console.log('BROKEN  baseline is not clean (exit ' + base.code + ', findings ' + baseFindings + '):\n' + base.out);
  process.exit(1);
}
console.log('baseline: the report dispositions every row of the matrix, findings 0');

const BREAKS = [
  /* One regex, not two anchors, because the row is cited in three places now — its own disposition bullet,
     the PR class bullet, and the §14 acceptance table — and the audit credits every one of them. A break that
     removes two of three proves nothing: the row stays dispositioned. The first version of this break named
     two anchors and went **not applied** the day the table was added, which is the orphaned-needle class
     arriving in a family that had existed for an hour. */
  { name: 'every listed mention of one open row is taken out of the report',
    file: PLAN, re: /(\*\*|`)A11\1/g,
    want: (f) => f >= 1, expect: 'A11 reported as a silent, non-AR row',
    also: (out) => /silent: A11/.test(out) },
  { name: 'the class list goes, and every row it named falls silent at once',
    file: PLAN, drop: /^- \*\*(AR|CD|PR|PD|CV|NA) — /gm,
    want: (f) => f > 1, expect: 'findings greater than 1', also: null },
  { name: 'a section heading is demoted, so its prose is filed under the previous section',
    file: PLAN, from: '## 12. Static category-art plan', to: '### 12. Static category-art plan',
    want: (f) => f >= 1, expect: '§12 reported as having no heading',
    also: (out) => /§12 has no heading/.test(out) },
  { name: 'the parser stops reading a bullet\'s continuation lines',
    file: AUDIT,
    from: '  else if (inItem) { if (endsItem(l)) { inItem = false; } else { listed += l + \'\\n\'; } }',
    to: '  else if (inItem) { inItem = false; }',
    want: (f, code) => code !== 0 && f !== null && f > 0,
    expect: 'a refusal on a correct document (false findings)', also: null },
];

let caught = 0, applied = 0, skipped = 0;
try {
  for (const b of BREAKS) {
    const source = b.file === PLAN ? planOriginal : auditOriginal;
    let mutated = source;
    if (b.re || b.drop) {
      const rx = b.re || b.drop;
      mutated = source.replace(rx, '');
      if (mutated === source) { skipped++; console.log('SKIP  ' + b.name + '  (its pattern matched nothing)'); continue; }
    } else {
      for (const e of (b.edits || [{ from: b.from, to: b.to }])) {
        const hits = source.split(e.from).length - 1;
        if (hits !== 1) {
          skipped++; console.log('SKIP  ' + b.name + '  (an anchor matched ' + hits + ' times, needs exactly 1)');
          mutated = null; break;
        }
        mutated = mutated.replace(e.from, e.to);
      }
      if (mutated === null) continue;
    }
    fs.writeFileSync(b.file, mutated);
    if (fs.readFileSync(b.file, 'utf8') === source) { skipped++; console.log('SKIP  ' + b.name + '  (the write did not land)'); continue; }
    applied++;
    const r = run();
    const f = findings(r.out);
    const ok = b.want(f, r.code) && (!b.also || b.also(r.out));
    if (ok) { caught++; console.log('CAUGHT  ' + b.name + '  → ' + b.expect + ' (findings ' + f + ', exit ' + r.code + ')'); }
    else console.log('MISSED  ' + b.name + '  (wanted ' + b.expect + ', got findings ' + f + ', exit ' + r.code + ')');
  }
} finally {
  fs.writeFileSync(PLAN, planOriginal);
  fs.writeFileSync(AUDIT, auditOriginal);
}
const restored = fs.readFileSync(PLAN, 'utf8') === planOriginal && fs.readFileSync(AUDIT, 'utf8') === auditOriginal;
console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + skipped + ' not applied; files ' +
  (restored ? 'restored byte-for-byte.' : 'NOT RESTORED — compare with git.'));
process.exit(applied > 0 && caught === applied && skipped === 0 && restored ? 0 : 1);

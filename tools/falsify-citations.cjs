/* Proves `audit-citations.cjs` can fail, in both directions.

   The tool exists because a session that spent its time auditing claims about code made three false ones
   about its own instruments — a `falsify-status-duplication` family, a `login`-suite role check, and §85's
   declared-state check on a dialog it never touched — each caught only because the author stopped to `ls`
   it. A check that runs instead of a habit that has to be remembered is the difference.

   Three breaks:
     1 a phantom family is cited in the plan. The audit must name it and refuse — the case it was written for;
     2 the stated exemption for the absent brief is taken away. The file is still absent, so the audit must
       now report it as unexplained: an exemption earns its place by being written beside the absence, and
       removing the sentence removes the excuse;
     3 the resolver's walk over the tracked tree is blinded to one directory. `ASSET-LICENSES.md` then reads
       as a missing file **on a correct plan** — the false-positive direction, which this repository has
       decided repeatedly is worse than a miss, because a phantom finding teaches the reader to distrust the
       claim. The break is caught by requiring the refusal, not by requiring silence.

   Targets are the plan document and the audit itself. Neither is `Sukinnect-next.html`, so this family can
   run while a page-mutating pass is in flight — the one family shape in this tree that can say that.

     node tools/falsify-citations.cjs    seconds                                          */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PLAN = path.join(ROOT, 'SUKINNECT_UX_RELIABILITY_MVP_PLAN.md');
const AUDIT = path.join(ROOT, 'tools', 'audit-citations.cjs');
const planOriginal = fs.readFileSync(PLAN, 'utf8');
const auditOriginal = fs.readFileSync(AUDIT, 'utf8');

function run() {
  try {
    return { code: 0, out: execFileSync(process.execPath, [AUDIT], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }) };
  } catch (err) {
    return { code: err.status === undefined ? -1 : err.status, out: (err.stdout || '') + (err.stderr || '') };
  }
}
function findingsOf(out) {
  const line = out.split(/\r?\n/).reverse().find((l) => /^findings: \d+$/.test(l.trim()));
  return line ? Number(/\d+/.exec(line.trim())[0]) : null;
}

const base = run();
if (base.code !== 0 || findingsOf(base.out) !== 0) {
  console.log('BROKEN  baseline is not clean (exit ' + base.code + ', findings ' + findingsOf(base.out) + ')');
  process.exit(1);
}
console.log('baseline: every citation in the plan resolves or is exempt with a stated reason');

const BREAKS = [
  { name: 'a family that does not exist is cited in the plan',
    file: PLAN,
    from: '## 17. Phase B implementation status',
    to: 'Cites `tools/falsify-a-family-nobody-wrote.cjs`.\n\n## 17. Phase B implementation status',
    want: (f, out) => f >= 1 && /falsify-a-family-nobody-wrote/.test(out),
    expect: 'the phantom named and the audit refused' },
  { name: 'the sentence explaining the absent brief is removed, so its absence is no longer stated',
    file: PLAN, re: /\*\(citation-exempt:[^)]*\)\*/,
    want: (f, out) => f >= 1 && /UNEXPLAINED|MISSING FILE  SUKINNECT_UX_RELIABILITY_MVP_PROMPT/.test(out),
    expect: 'the absent brief reported as unexplained' },
  { name: 'the resolver stops walking the tracked tree for one directory',
    file: AUDIT,
    from: "      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist' || e.name === '.shots' ||",
    to: "      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist' || e.name === 'assets' ||",
    want: (f, code) => code !== 0 && f >= 1,
    expect: 'a refusal on a correct plan (a phantom file finding)' },
];

let caught = 0, applied = 0, skipped = 0;
try {
  for (const b of BREAKS) {
    const source = b.file === PLAN ? planOriginal : auditOriginal;
    let mutated = source;
    if (b.re) {
      mutated = source.replace(b.re, '');
      if (mutated === source) { skipped++; console.log('SKIP  ' + b.name + '  (its pattern matched nothing)'); continue; }
    } else {
      const hits = source.split(b.from).length - 1;
      if (hits !== 1) { skipped++; console.log('SKIP  ' + b.name + '  (its anchor matched ' + hits + ' times, needs exactly 1)'); continue; }
      mutated = source.replace(b.from, b.to);
    }
    fs.writeFileSync(b.file, mutated);
    if (fs.readFileSync(b.file, 'utf8') === source) { skipped++; console.log('SKIP  ' + b.name + '  (the write did not land)'); continue; }
    applied++;
    const r = run();
    const f = findingsOf(r.out);
    if (b.want(f, r.out)) { caught++; console.log('CAUGHT  ' + b.name + '  → ' + b.expect + ' (findings ' + f + ', exit ' + r.code + ')'); }
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

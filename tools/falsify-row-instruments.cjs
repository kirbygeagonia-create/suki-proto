'use strict';
/* tools/falsify-row-instruments.cjs — can the traceability census fail?
   Staged in .scratch until the aggregate pass releases the tree; copy it to tools/ unchanged.

     node tools/falsify-row-instruments.cjs

   Three hazards, each with a break that must move a number this tool prints:
   1 a citation that no longer resolves must be reported, not admired. The token is CHOSEN by searching
     §17 for a family name a row actually depends on, because the first version picked the first
     `falsify-*` token in the file — `falsify-all`, which appears only in class-level prose — so renaming
     it correctly changed nothing and the break printed MISSED against a working guard.
   2 a population scan that loses rows must refuse. The guard already earned its keep: nine §4 rows write
     their class as `**CD (now measured)**`, annotation inside the bold, and a scan that requires the bare
     code saw 38 rows and would have reported on a subset as if it were the matrix.
   3 the gate-label channel is reported as an OBSERVATION, not a break: today zero rows quote a label that
     resolves against verify.cjs's 646, so a mutant that blinds the channel cannot change any count. The
     census prints the channel split on every run so that deadness is visible in the baseline instead of
     being discovered through a break that appears to pass. */
const cp = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const PLAN = path.join(ROOT, 'SUKINNECT_UX_RELIABILITY_MVP_PLAN.md');
const VERIFY = path.join(ROOT, 'tools', 'verify.cjs');
const TOOL = path.join(ROOT, 'tools', 'audit-row-instruments.cjs');
const planOrig = fs.readFileSync(PLAN, 'utf8');
const verifyOrig = fs.readFileSync(VERIFY, 'utf8');

function run() {
  try {
    return { code: 0, out: cp.execFileSync(process.execPath, [TOOL], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 25 }) };
  } catch (e) {
    return { code: e.status === undefined ? -1 : e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}
const num = (re, out) => { const m = re.exec(out); return m ? Number(m[1]) : null; };

let base;
try {
  base = run();
  if (base.code !== 0) { console.log('BROKEN  the census does not run green on the committed tree:\n' + base.out.slice(0, 600)); process.exit(1); }
  const bTraced = num(/traced to a runnable name: (\d+)/, base.out);
  const bLabels = num(/via a resolved gate label only: (\d+)/, base.out);
  console.log('baseline: traced ' + bTraced + '/47, via a resolvable gate label ' + bLabels);

  /* Break 1 — find a citation a traced row genuinely leans on by trying each family token §17 names and
     keeping the first that moves the count. If none moves it, say so: that would mean no row depends on a
     citation, which is a stronger statement than the break was written to make and has to be printed. */
  const tokens = [...new Set((planOrig.match(/falsify-[a-z0-9-]+/g) || []))]
    .filter(t => fs.existsSync(path.join(ROOT, 'tools', t + '.cjs')));
  let moved = null;
  for (const t of tokens) {
    fs.writeFileSync(PLAN, planOrig.split(t).join(t + 'x'));
    const r = run();
    const tr = num(/traced to a runnable name: (\d+)/, r.out);
    if (tr !== null && tr < bTraced) { moved = { t: t, tr: tr }; break; }
    fs.writeFileSync(PLAN, planOrig);
  }
  if (moved) console.log('CAUGHT   citation to ' + moved.t + ' retargeted to a file that does not exist → traced ' + moved.tr + ' (baseline ' + bTraced + ')');
  else console.log('MISSED   no §17 family citation moves the traced count when broken — no row depends on one, which the census already reports');

  /* Break 2 — strip the annotation inside the bold so nine class cells become unreadable. */
  fs.writeFileSync(PLAN, planOrig.replace(/\*\*(AR|CD|PR|PD|CV|NA) \(/g, '$1('));
  const r2 = run();
  const refused = /NO CONCLUSION/.test(r2.out) && r2.code !== 0;
  console.log((refused ? 'CAUGHT   ' : 'MISSED   ') + 'class cells rewritten so the row scan loses nine rows → ' +
    (refused ? 'refused with NO CONCLUSION' : 'answered anyway: traced ' + num(/traced to a runnable name: (\d+)/, r2.out)));
  fs.writeFileSync(PLAN, planOrig);

  /* Break 3 — blind the label resolver. Expected: NO change while the channel is dead, so this prints as
     an observation with the number that proves it, not as a pass. */
  fs.writeFileSync(VERIFY, verifyOrig.replace(/c\.check\(\s*'/g, 'c.checkNote(\''));
  const r3 = run();
  const tr3 = num(/traced to a runnable name: (\d+)/, r3.out);
  console.log('OBSERVED gate labels made unmatchable → traced ' + tr3 + ' (baseline ' + bTraced + '); ' +
    'equal counts are expected while the label channel resolves nothing, which the split line above proves');

  const ok = !!moved && refused;
  console.log('\n' + (ok ? 'the census is falsifiable: a broken citation and a lost row are both detected'
    : 'NOT PROVEN: at least one hazard this tool exists to catch is invisible to it'));
  process.exit(ok ? 0 : 1);
} finally {
  fs.writeFileSync(PLAN, planOrig);
  fs.writeFileSync(VERIFY, verifyOrig);
  console.log('files restored byte-for-byte: ' +
    (fs.readFileSync(PLAN, 'utf8') === planOrig && fs.readFileSync(VERIFY, 'utf8') === verifyOrig));
}

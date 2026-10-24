/* Proves tools/audit-build-bytes.cjs can fail, in both directions.

   The audit compares four reads of one page (source, `dist/`, the staged Android asset, the bundle inside
   the newest APK) and has two reasons to refuse rather than answer: an artifact it could not read, and a
   count of artifacts below the four the comparison needs. Both matter because the failure mode of a
   comparison tool is not a wrong verdict, it is a *skipped* one — a missing file that silently leaves
   three rows agreeing prints exactly like a healthy build. So each guard is broken on its own, with the
   same absent artifact planted, and the other one has to still refuse; that is the evidence the pair is
   load-bearing rather than decorative.

     node tools/falsify-build-bytes.cjs        ~40 seconds, no Chrome, nothing installed           */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const AUDIT = path.join(ROOT, 'tools', 'audit-build-bytes.cjs');
const DIST = path.join(ROOT, 'dist', 'Sukinnect-next.html');
const ASSET = path.join(ROOT, 'Sukinnect-Android', 'app', 'src', 'main', 'assets', 'Sukinnect.html');
const PRISTINE_AUDIT = fs.readFileSync(AUDIT);
const PRISTINE_DIST = fs.readFileSync(DIST);
const MISSING_GUARD = 'if (missing.length) {';
const COUNT_GUARD = 'if (rows.length < 4) {';

function run() {
  let out = '', code = 0;
  try { out = execFileSync(process.execPath, [AUDIT], { encoding: 'utf8', cwd: ROOT, timeout: 300000 }); }
  catch (err) { out = (err.stdout || '') + (err.stderr || ''); code = typeof err.status === 'number' ? err.status : 1; }
  const f = /findings: *([0-9]+)/.exec(out);
  return { findings: f ? Number(f[1]) : null, refused: /NO CONCLUSION/.test(out), differs: /DIFFER/.test(out), code, out };
}
const editAudit = (from, to) => {
  const src = fs.readFileSync(AUDIT, 'utf8').replace(/\r\n/g, '\n');
  if (src.split(from).length - 1 !== 1) throw new Error('guard needle matched ' + (src.split(from).length - 1));
  fs.writeFileSync(AUDIT, src.replace(from, to));
};

const BREAKS = [
  { name: 'the published copy drifts by one byte',
    apply() { fs.writeFileSync(DIST, PRISTINE_DIST.toString('utf8') + ' '); },
    undo() { fs.writeFileSync(DIST, PRISTINE_DIST); },
    want: 'differ' },
  { name: 'a copy that cannot be read is refused rather than counted clean',
    apply() { fs.renameSync(ASSET, ASSET + '.held'); },
    undo() { if (fs.existsSync(ASSET + '.held')) fs.renameSync(ASSET + '.held', ASSET); },
    want: 'refuse' },
  { name: 'the artifact-count guard alone still refuses an unread copy',
    apply() { fs.renameSync(ASSET, ASSET + '.held'); editAudit(MISSING_GUARD, 'if (false && missing.length) {'); },
    undo() { fs.writeFileSync(AUDIT, PRISTINE_AUDIT); if (fs.existsSync(ASSET + '.held')) fs.renameSync(ASSET + '.held', ASSET); },
    want: 'refuse' },
  { name: 'the missing-artifact guard alone still refuses a short comparison',
    apply() { fs.renameSync(ASSET, ASSET + '.held'); editAudit(COUNT_GUARD, 'if (rows.length > 4) {'); },
    undo() { fs.writeFileSync(AUDIT, PRISTINE_AUDIT); if (fs.existsSync(ASSET + '.held')) fs.renameSync(ASSET + '.held', ASSET); },
    want: 'refuse' }
];

let applied = 0, caught = 0, notPlanted = 0, missed = 0;
const base = run();
console.log('control  unmutated tree: findings=' + base.findings + ' differs=' + base.differs + ' refused=' + base.refused + ' exit=' + base.code);
if (base.findings !== 0 || base.refused || base.code !== 0) {
  console.log('ABORT — the audit does not answer clean on the unmutated tree; nothing below isolates a cause.');
  process.exitCode = 1;
} else {
  try {
    for (const b of BREAKS) {
      b.undo();
      try { b.apply(); } catch (err) { console.log('NOT PLANTED  ' + b.name + '  (' + err.message + ')'); notPlanted++; continue; }
      applied++;
      const r = run();
      const ok = b.want === 'differ'
        ? (r.code === 1 && r.differs && r.findings !== null && r.findings >= 1)
        : (r.refused && r.code === 1);
      const detail = b.want === 'differ'
        ? 'exit ' + r.code + ', findings=' + r.findings + (r.differs ? ', copy named DIFFER' : ', no copy named')
        : (r.refused ? 'NO CONCLUSION, exit ' + r.code : 'answered findings=' + r.findings + ' exit ' + r.code);
      if (ok) { caught++; console.log('CAUGHT   ' + b.name + '\n         -> ' + detail); }
      else { missed++; console.log('MISSED   ' + b.name + '\n         -> ' + detail); }
      b.undo();
    }
  } finally {
    fs.writeFileSync(AUDIT, PRISTINE_AUDIT);
    fs.writeFileSync(DIST, PRISTINE_DIST);
    if (fs.existsSync(ASSET + '.held')) fs.renameSync(ASSET + '.held', ASSET);
    console.log('─'.repeat(70));
    console.log(caught + ' of ' + applied + ' breaks caught, ' + notPlanted + ' not applied, ' + missed + ' missed');
    const after = run();
    console.log('cleanup  audit restored: ' + (fs.readFileSync(AUDIT).equals(PRISTINE_AUDIT)) +
      ' · dist restored: ' + (fs.readFileSync(DIST).equals(PRISTINE_DIST)) +
      ' · asset restored: ' + (fs.existsSync(ASSET) && after.findings === 0));
    if (caught !== applied || notPlanted || missed) process.exitCode = 1;
  }
}

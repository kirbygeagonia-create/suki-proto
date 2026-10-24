/* Proves `tools/audit-camera-dialog-coverage.cjs` can fail.

   The audit compares two populations: the profile controls the app paints that raise a layer, and the
   action names the camera's table clicks. Either half can go empty without the difference changing, and
   an empty difference from an empty scan reads exactly like a covered application. So each break here is
   one of the four ways that goes wrong — a walked screen that stops clicking its action, a table scan
   that matches nothing, an app scan that never raises a layer, and the row-count guard taken out — and
   the audit has to say which of them happened rather than report zero.

     node tools/falsify-camera-dialog-coverage.cjs        ~20 seconds, no Chrome              */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const AUDIT = path.join(ROOT, 'tools', 'audit-camera-dialog-coverage.cjs');
const CAM = path.join(ROOT, 'tools', 'shot.cjs');
const PRISTINE_AUDIT = fs.readFileSync(AUDIT, 'utf8');
const PRISTINE_CAM = fs.readFileSync(CAM, 'utf8');

function run() {
  let out = '', code = 0;
  try { out = execFileSync(process.execPath, [AUDIT], { encoding: 'utf8', cwd: ROOT, timeout: 300000 }); }
  catch (err) { out = (err.stdout || '') + (err.stderr || ''); code = typeof err.status === 'number' ? err.status : 1; }
  const f = /findings: *([0-9]+)/.exec(out);
  return { findings: f ? Number(f[1]) : null, refused: /NO CONCLUSION/.test(out), code, out, printed: !!f };
}

const BREAKS = [
  { name: 'a walked dialog stops clicking the control it was added for',
    file: 'cam',
    from: "clickPainted(/residentProfileAction\\\\('logout'\\\\)/, 'the Log Out button in the account rail')",
    to: 'void 0',
    expect: 'more' },
  { name: 'the table scan matches nothing, so every control looks uncovered — or none does',
    file: 'audit',
    from: "const clicked = row.body.match(/clickPainted\\(\\/[^/]+\\//g) || [];",
    to: "const clicked = row.body.match(/clickPaintedZZZ\\(\\/[^/]+\\//g) || [];",
    expect: 'refuse' },
  { name: 'the app scan raises no layer, so its population is silently empty',
    file: 'audit',
    from: '      a.state[modalKey] = name;\n      a.render();',
    to: '      a.state[modalKey] = null;\n      a.render();',
    expect: 'refuse' },
  { name: 'the table is no longer being read, and the row-count guard is what says so',
    file: 'audit',
    from: "block.matchAll(/\\n *\\['([a-z0-9-]+)',\\s*`/g)",
    to: "block.matchAll(/\\n *\\['([a-z0-9-]+)ZZZ',\\s*`/g)",
    expect: 'refuse' }
];

let applied = 0, caught = 0, missed = 0, notPlanted = 0;
const restore = [];
try {
  const base = run();
  console.log('control  unmutated tree: findings=' + base.findings + ' refused=' + base.refused + ' exit=' + base.code);
  if (!base.printed || base.refused || base.code !== 0) {
    console.log('ABORT — the audit does not answer on the unmutated tree; nothing below isolates a cause. NO CONCLUSION.');
    process.exitCode = 1;
  } else {
    for (const b of BREAKS) {
      const p = b.file === 'cam' ? CAM : AUDIT;
      const src = fs.readFileSync(p, 'utf8');
      const n = src.split(b.from).length - 1;
      if (n !== 1) { console.log('NOT PLANTED  ' + b.name + '  (needle matched ' + n + ')'); notPlanted++; continue; }
      restore.push({ p, s: src });
      fs.writeFileSync(p, src.replace(b.from, b.to));
      applied++;
      const r = run();
      let ok;
      if (b.expect === 'refuse') ok = r.refused && r.code === 1;
      else ok = r.printed && r.findings !== null && r.findings > base.findings;
      const detail = b.expect === 'refuse'
        ? (r.refused ? 'NO CONCLUSION, exit ' + r.code : 'answered findings=' + r.findings + ' exit ' + r.code)
        : 'findings=' + r.findings + ' (control was ' + base.findings + ')';
      if (ok) { caught++; console.log('CAUGHT   ' + b.name + '\n         -> ' + detail); }
      else { missed++; console.log('MISSED   ' + b.name + '\n         -> ' + detail); }
      while (restore.length) { const it = restore.pop(); fs.writeFileSync(it.p, it.s); }
    }
  }
} finally {
  while (restore.length) { const it = restore.pop(); fs.writeFileSync(it.p, it.s); }
  console.log('─'.repeat(70));
  console.log(applied + ' of ' + BREAKS.length + ' breaks applied, ' + caught + ' caught, ' +
    notPlanted + ' not applied, ' + missed + ' missed');
  console.log('cleanup  audit restored: ' + (fs.readFileSync(AUDIT, 'utf8') === PRISTINE_AUDIT) +
    ' · camera restored: ' + (fs.readFileSync(CAM, 'utf8') === PRISTINE_CAM));
  if (caught !== BREAKS.length || notPlanted || missed) process.exitCode = 1;
}

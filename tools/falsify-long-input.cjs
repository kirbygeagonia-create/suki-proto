/* Proves the guard against an unbreakable typed word, and proves which half of it is doing the work.

   Why this class existed at all: `maxlength` appears nowhere in Sukinnect-next.html, so every field
   in the app can hold one 60-character token with no space in it. A word like that has no break
   opportunity, so `flex-wrap` has nothing to wrap and a column has nothing to shrink to — it simply
   grows past the phone. tools/probe-long-input.js found twelve of those (the profile hub's
   `Home Address: <b>…</b>` rows 111px off the edge, the admin top bar's <h1> 172px off it) before
   one inherited declaration fixed all but one.

   Why two instruments and not one: the camera half proves the rule is what holds the layout — a
   painted geometry the Node harness cannot see, because it has no layout at all. The gate half
   proves the *keyword*, and that split is measured, not assumed. The first version of this file
   claimed `break-word` would "still widen the flex item" without testing it; running the whole
   69-screen sweep under each keyword said the opposite of the comment and the same as the choice:
   `anywhere` leaves ONE finding (the admin top bar clips 30px of a 60-character name inside a bar
   that already hides overflow), `break-word` leaves FIVE on the same screen and puts the title
   172px past the edge of the phone. So the keyword is pinned by the gate, because the difference
   only appears mid-walk — a two-screen subset reads 0 under either value, which is why break two
   below does not ask the camera. A mutant whose only proof is a state the harness cannot reach is
   a mutant that reports a miss the next time somebody runs this on a laptop.

     node tools/falsify-long-input.cjs    ~3 minutes, needs the machine's Chrome             */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');
const LABEL = 'an unbreakable typed word breaks inside the phone instead of running past its edge';
const NEEDLE = '  body{ overflow-wrap:anywhere; }';
const PROBE = '@tools/probe-long-input.js';
/* The two screens this pass found the defect on, and which reproduce it in a subset run — unlike
   the one remaining finding, which only appears mid-walk and is recorded in CHANGES.md §66. */
const SCREENS = 'resident-profile,provider-profile';
const DAMAGE = ['PAST PANEL', 'WIDER THAN PHONE', 'PAGE OVERFLOW', 'CLIPPED NO ELLIPSIS'];

function gateRun() {
  try {
    return { code: 0, out: execFileSync(process.execPath, [path.join(ROOT, 'tools', 'verify.cjs')],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (err) {
    return { code: err.status === undefined ? -1 : err.status, out: (err.stdout || '') + (err.stderr || '') };
  }
}

function damage() {
  let out = '';
  try {
    out = execFileSync(process.execPath,
      [path.join(ROOT, 'tools', 'shot.cjs'), '--probe=' + PROBE, '--only=' + SCREENS],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    out = (err.stdout || '') + (err.stderr || '');
  }
  /* A camera that printed no probe line measured nothing, which is not a zero. */
  if (out.indexOf('probe →') === -1) return null;
  return DAMAGE.reduce((n, k) => n + (out.split(k).length - 1), 0);
}

const BREAKS = [
  { name: 'the inherited break is gone, so a long word runs off the phone again',
    to: '  /* no inherited break */', camera: true },
  { name: 'the rule says break-word, which the full sweep measured as worse',
    to: '  body{ overflow-wrap:break-word; }', camera: false },
];

let caught = 0, applied = 0, unmatched = 0;
try {
  const baseGate = gateRun();
  if (baseGate.code !== 0 || baseGate.out.indexOf('PASS  ' + LABEL) === -1) {
    console.log('BASELINE gate does not pass on the unmutated file — nothing below means anything.');
    process.exit(1);
  }
  const baseDamage = damage();
  if (baseDamage !== 0) {
    console.log('BASELINE camera reads ' + baseDamage + ' damage findings on ' + SCREENS +
      ' — the rule cannot be credited with a clean screen that is not clean.');
    process.exit(1);
  }
  console.log('baseline: gate passes on the named check and 0 damage findings on ' + SCREENS);

  for (const b of BREAKS) {
    const hits = original.split(NEEDLE).length - 1;
    if (hits !== 1) {
      unmatched++;
      console.log('SKIP  ' + b.name + '  (the needle matched ' + hits + ' times, needs exactly 1)');
      continue;
    }
    applied++;
    fs.writeFileSync(TARGET, original.replace(NEEDLE, b.to));
    const run = gateRun();
    const gateFailed = run.code !== 0 && run.out.indexOf('FAIL  ' + LABEL) > -1;
    const d = b.camera ? damage() : null;
    const cameraFailed = !b.camera || (d !== null && d > 0);
    if (gateFailed && cameraFailed) {
      caught++;
      console.log('CAUGHT  ' + b.name + (b.camera ? '  (' + d + ' damage findings)' : '  (gate only)'));
    } else {
      console.log('MISSED  ' + b.name + '  (gate ' + (gateFailed ? 'failed' : 'STILL PASSED') +
        ', camera ' + (b.camera ? d : 'not asked') + ')');
    }
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied; file restored.');
process.exit(applied > 0 && caught === applied && unmatched === 0 ? 0 : 1);

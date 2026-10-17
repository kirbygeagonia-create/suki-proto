/* Proves the three checks added with the responsive-type change watch the rule they claim to.
   The defect they exist for was measured on a phone, not read off the source: an OPPO at
   font_scale 1.35 computed a 21.6px root while the app painted 14px text, because every token was
   a hard px — so Sukinnect was the only app on that device that ignored the user's text-size
   setting. Mutant 3 is the tempting half-fix: pinning the root to 16px would satisfy "it is a
   font-size declaration" while putting the limitation straight back.
     node tools/falsify-responsive-type.cjs                                                */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

const CAP = 'font-size: min(1em, 20px);';
const VAL_RULE = '.chart-val{transform:translate(-50%,-100%); color:var(--ink); font-weight:700;}';

/* Single-line needles: the file is CRLF, so a needle carrying \n never matches and the mutant
   reports itself as SKIP while looking like a pass. */
const MUTANTS = [
  { name: 'one token goes back to px',
    needle: '--t-caption:0.875rem', to: '--t-caption:14px',
    label: 'every type token is relative, so an OS text-size setting reaches the app' },
  { name: 'the cap is deleted',
    needle: CAP, to: '/* no cap */',
    label: 'the root caps how far the device can push it' },
  { name: 'the root is pinned to a fixed size, which honours nothing',
    needle: CAP, to: 'font-size: 16px;',
    label: 'the root caps how far the device can push it' },
  { name: 'a rule starts setting a literal px font size again',
    needle: VAL_RULE, to: VAL_RULE.replace('}', ' font-size:13px;}'),
    label: 'no rule sets a literal px font size — the scale is the only source' },
];

function gateOutput() {
  try {
    return { code: 0, out: execFileSync(process.execPath, [path.join(ROOT, 'tools', 'verify.cjs')],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (err) {
    return { code: err.status === undefined ? -1 : err.status,
      out: (err.stdout || '') + (err.stderr || '') };
  }
}

let caught = 0, applied = 0, unmatched = 0;
try {
  for (const m of MUTANTS) {
    const hits = original.split(m.needle).length - 1;
    if (hits !== 1) {
      unmatched++;
      console.log('SKIP  ' + m.name + '  (needle matched ' + hits + ' times, needs exactly 1)');
      continue;
    }
    applied++;
    fs.writeFileSync(TARGET, original.replace(m.needle, m.to));
    const run = gateOutput();
    const failed = run.code !== 0 && run.out.includes('FAIL  ' + m.label);
    if (failed) { caught++; console.log('CAUGHT  ' + m.name); }
    else console.log('MISSED  ' + m.name + '  (exit ' + run.code + ')');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' mutants caught, '
  + unmatched + ' not applied; file restored.');
process.exit(applied > 0 && caught === applied && unmatched === 0 ? 0 : 1);

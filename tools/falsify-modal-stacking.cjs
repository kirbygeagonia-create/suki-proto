/* Proves the two checks added with the modal-stacking fix actually watch the rule
   they claim to: it puts each defect back and requires the named check to fail.
   A mutant that every check survives means the check is not looking.
     node tools/falsify-modal-stacking.cjs                                            */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

const LABEL = 'a modal opened from a sheet sits above the sheet';

/* Single-line needles on purpose: the file is CRLF, so a needle carrying \n never
   matches and the mutant reports itself as SKIP while looking like a pass.
   Re-pointed when the stacking numbers moved onto the named ladder: the two order mutants now edit
   the RUNG, because that is where the number lives, and the fourth mutant puts a literal back into
   the one overlay that had no class to inherit — the verification review's own scrim, which used to
   type 50 in a file declaring .modal-layer at 70. */
const MUTANTS = [
  { name: 'the modal drops under the sheet again',
    label: LABEL,
    apply: s => s.replace('--z-modal:70;', '--z-modal:50;') },
  { name: 'the sheet is raised over the modal',
    label: LABEL,
    apply: s => s.replace('--z-sheet:60;', '--z-sheet:80;') },
  { name: 'the modal loses its z-index entirely',
    label: LABEL,
    apply: s => s.replace('top:0; right:0; bottom:0; left:0; background:var(--scrim); z-index:var(--z-modal);',
                          'top:0; right:0; bottom:0; left:0; background:var(--scrim);') },
  { name: 'an overlay with no class goes back to typing its own number',
    /* The order between .modal-layer and .sheet-layer is untouched by this one, so the pair check
       cannot see it — the ladder check can. Naming the wrong label here would have printed MISSED
       against a gate that had genuinely gone red. */
    label: 'no layer types its own stacking number, and the ladder is what it types instead',
    apply: s => s.replace('background:var(--scrim); z-index:var(--z-modal); display:flex;',
                          'background:var(--scrim); z-index:40; display:flex;') },
  { name: 'the sheet goes back to typing its own dim',
    /* The dim is the sibling decision to the rung: both are one idea written per layer. Kept in this
       family rather than a new one because it is the same two layers disagreeing. */
    label: 'the dim behind a full-cover layer is the token, not a per-layer alpha',
    apply: s => s.replace(/background:var\(--scrim\);\r?\n    animation:scrimIn/,
                          m => m.replace('var(--scrim)', 'rgba(3,0,43,.52)')) },
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

let caught = 0, applied = 0;
try {
  for (const m of MUTANTS) {
    const mutated = m.apply(original);
    if (mutated === original) { console.log('SKIP  ' + m.name + '  (needle did not match)'); continue; }
    applied++;
    fs.writeFileSync(TARGET, mutated);
    const run = gateOutput();
    const failed = run.code !== 0 && run.out.includes('FAIL  ' + (m.label || LABEL));
    if (failed) { caught++; console.log('CAUGHT  ' + m.name); }
    else console.log('MISSED  ' + m.name + '  (exit ' + run.code + ', named check '
      + (run.code !== 0 ? 'not the one that failed' : 'passed anyway') + ')');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' mutants caught; file restored.');
/* `caught === applied` is satisfied by 0 === 0, so an empty run used to exit 0 — which is how this family applied
   no mutants at all for a whole pass after a CSS rewrite orphaned its three needles, and printed a healthy-looking
   summary line while it did. A family that broke nothing has measured nothing. */
if (applied === 0) {
  console.log('NO CONCLUSION: no needle matched the file, so nothing was tested. The needles are stale or the file '
    + 'moved under them — read the SKIP lines above and re-point them.');
  process.exit(1);
}
process.exit(caught === applied ? 0 : 1);

/* Proves the four checks added with the handset layer pass actually watch the rules they
   claim to. Each mutant puts one of the two defects back exactly as the vivo found them:
   the modal list missing the resident's field (Back quit the app from a half-filled
   profile form), and the sheet keeping aria-modal while a modal painted above it (the
   picker left the platform accessibility tree).
     node tools/falsify-layer-modality.cjs                                              */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

/* Single-line needles on purpose: the file is CRLF, so a needle carrying \n never matches
   and the mutant reports itself as SKIP while looking like a pass. */
const MUTANTS = [
  { name: 'the derivation drops the resident modal field, as the hand-written list did',
    needle: 'return Object.keys(state).filter(k => /Modal$/.test(k) || /Confirm$/.test(k));',
    to: 'return Object.keys(state).filter(k => (/Modal$/.test(k) || /Confirm$/.test(k)) && k !== \'residentProfileModal\');',
    label: 'every modal field in state is a layer Back can undo' },
  { name: 'Back closes the sheet but leaves the modal on screen',
    needle: '  layerKeys().forEach(k => { state[k] = typeof state[k] === \'boolean\' ? false : null; });',
    to: '  /* the modal fields are left open */',
    label: 'Back closes the picker and the sheet, and keeps the profile hub under them' },
  { name: 'the sheet never releases its modality to a modal above it',
    needle: '  return layerKeys().some(k => !!state[k]);',
    to: '  return false;',
    label: 'a modal above the sheet takes the modality from it' },
  { name: 'every sheet is treated as if a modal sat on it',
    needle: '  return layerKeys().some(k => !!state[k]);',
    to: '  return true;',
    label: 'a sheet alone is the topmost layer, so it owns the modality' },
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

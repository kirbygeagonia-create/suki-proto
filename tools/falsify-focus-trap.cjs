/* Proves the camera's "keyboard stops behind an open layer" tally can fail, by putting the defect
   back three different ways.

   What was measured before the fix: on the eight screens that open a sheet or a dialog, 91 of 192
   Tab stops landed on controls behind the scrim — covered, untappable, and still focusable, so a
   keyboard user moved through a screen they could not see and could still submit fields on it.

   Why this is a camera family: the harness has no layout and its document.querySelector answers
   null for most selectors, so neither the walk nor the inert call can be asserted from Node. The
   gate covers what it can — that topLayerEl() exists and that the layer roots carry data-layer —
   and the painted page covers the rest.

   The three breaks are deliberately not one edit each:
     · the first removes the call, which is the defect as it stood;
     · the second removes the convention from one layer root, which is how the fix fails silently
       the day someone adds a fourth surface and forgets;
     · the third swaps the convention back to the class names the app used to rely on, and it only
       fires on the verification review — whose modal is an inline fixed overlay with no class at
       all. That is the screen a class-based rule would have left walkable while every other screen
       reported clean.

     node tools/falsify-focus-trap.cjs    ~4 minutes, needs the machine's Chrome                */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

const TALLY = 'keyboard stops behind an open layer (Tab walked past the scrim): ';
const ARGS_BASE = [path.join(ROOT, 'tools', 'shot.cjs'), '--measure', '--focus'];

const BREAKS = [
  { name: 'the layer sync stops inering the background, as it did before this pass',
    only: 'booking-sheet,offer-sheet,resident-profile',
    edits: [['  setInertOutside(topLayerEl());', '  /* the background stays reachable by Tab */']] },
  { name: 'one layer root loses the convention, so topLayerEl() finds nothing',
    only: 'booking-sheet,offer-sheet',
    edits: [['<div class="sheet-layer" data-layer="sheet">', '<div class="sheet-layer">']] },
  { name: 'the lookup goes back to class names, which the verification overlay does not have',
    only: 'admin-review-document,admin-review-request,admin-review-approve',
    edits: [['if (modalAboveSheet()) return document.querySelector(\'[data-layer="modal"]\');',
             'if (modalAboveSheet()) return document.querySelector(\'.modal-layer\');']] },
];

function readTally(out) {
  const line = out.split(/\r?\n/).find(l => l.startsWith(TALLY));
  /* No line is not a zero: a camera that never reached its tally block measured nothing. */
  return line ? Number(line.slice(TALLY.length).trim()) : null;
}

function measure(only) {
  let out = '';
  try {
    out = execFileSync(process.execPath, ARGS_BASE.concat(['--only=' + only]),
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    out = (err.stdout || '') + (err.stderr || '');
  }
  return readTally(out);
}

let caught = 0, applied = 0, unmatched = 0;
try {
  for (const b of BREAKS) {
    const n = measure(b.only);
    if (n !== 0) {
      console.log('BASELINE is ' + n + ' on ' + b.only + ' — the tally must read 0 on the' +
        ' unmutated file before any break means anything.');
      process.exit(1);
    }
  }
  console.log('baseline: 0 stops behind a layer on all three screen groups');
  for (const b of BREAKS) {
    let mutated = original, why = null;
    for (const [from, to] of b.edits) {
      const hits = mutated.split(from).length - 1;
      if (hits !== 1) { why = 'a needle matched ' + hits + ' times, needs exactly 1'; break; }
      mutated = mutated.replace(from, to);
    }
    if (why) {
      unmatched++;
      console.log('SKIP  ' + b.name + '  (' + why + ')');
      continue;
    }
    applied++;
    fs.writeFileSync(TARGET, mutated);
    const n = measure(b.only);
    if (n === null) console.log('MISSED  ' + b.name + '  (the camera printed no tally)');
    else if (n > 0) { caught++; console.log('CAUGHT  ' + b.name + '  (' + n + ' stops behind the scrim)'); }
    else console.log('MISSED  ' + b.name + '  (Tab still stayed inside the layer, so this is not what holds it)');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied; file restored.');
process.exit(applied > 0 && caught === applied && unmatched === 0 ? 0 : 1);

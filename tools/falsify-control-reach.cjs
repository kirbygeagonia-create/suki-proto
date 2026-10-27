/* Proves the camera's "controls no tap can reach" tally can fail, by putting three of the four
   defects back exactly as this pass found them — the fourth turned out to be equivalent, and why
   is recorded on the list below rather than hidden.

   Why a camera family and not a gate check: reachability is a painted geometry. The harness has no
   layout — getBoundingClientRect answers 0 for everything — so a rule about where a button ends up
   on a 480px screen has no Node assertion available to it. Same reason falsify-flex-crush exists.

   All four were measured at 320x480 with the phone's text at 200%: a small handset, an Android Go
   device, or any phone in split-screen. That corner had never been swept before, because every
   figure in this repository was taken at 390x844.
     · the booking sheet's "Send request" 149px below the bottom edge of the device;
     · the same sheet's body refusing to collapse, so the pinned footer was pushed out;
     · the admin's PIN dialog, centred with no height cap, scattering its own Close button off the
       top edge AND its action off the bottom one;
     · "Mark all as read" clipped 196px by the top bar, whose title group could not give up width.

     node tools/falsify-control-reach.cjs    ~3 minutes, needs the machine's Chrome             */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

const TALLY = 'controls no tap can reach (off the viewport or clipped, with nothing that scrolls): ';
const ARGS_BASE = [path.join(ROOT, 'tools', 'shot.cjs'), '--measure', '--width=320', '--height=480',
  '--font-scale=2'];

/* Each break is a list of single-line needle/to pairs (the file is CRLF, so a needle carrying \n
   never matches and the mutant reports itself as SKIP while looking like a pass). `only` names the
   screens where the defect painted, so a run costs seconds rather than a whole walk.

   One break was written, run, and deleted because it was equivalent: removing min-height:0 from
   .sheet-body left every control reachable, because the sheet now scrolls as a whole and the footer
   simply moves into the part that scrolls. That rule is about which part of a sheet moves — a
   design property no geometry check can see — so keeping the mutant would have raised the count
   without raising the coverage.

   And one break needed two edits to be honest. The top bar is held together by two independent
   guards, a wrap and a min-width:0, and removing either one on its own left every control
   reachable. A check that fires only when both are gone is a check of the pair, which is what the
   stylesheet is; two separate single-rule breaks would each have reported a rule that does not
   exist on its own. The version before this one ellipsized the heading instead of wrapping, and the
   camera's own review line is what caught the cost: intended ellipses went 7 → 36 across the walk,
   with "Find Services" and "Provider details" reduced to fragments. A taller bar is information
   kept; a cut title is information lost, and §40 asks every screen to say what it is. */
const BREAKS = [
  { name: 'the sheet goes back to an 80% cap with no scroll of its own',
    only: 'booking-sheet,offer-sheet,fruit-sheet',
    edits: [
      ['box-shadow:0 -12px 34px rgba(3,0,43,.24); max-height:100%;',
       'box-shadow:0 -12px 34px rgba(3,0,43,.24); max-height:80%;'],
      ['    overflow-y:auto; -ms-overflow-style:none; scrollbar-width:none;',
       '    -ms-overflow-style:none; scrollbar-width:none;'],
    ] },
  { name: 'the modal card is centred with no height cap',
    only: 'admin-security-modal,resident-payment-modal,provider-payout-modal',
    edits: [['max-width:350px; max-height:100%; overflow-y:auto;', 'max-width:350px;']] },
  { name: 'the top bar neither wraps nor lets its title give up width',
    only: 'notifications,resident-profile',
    /* Four rules hold one overflow: the bar's wrap, the min-width:0 on the bar's children, the
       bar-level shorthand that stops a control shrinking, and the title group's own min-width:0.
       Removing any subset of them leaves every control reachable, which is what three surviving
       mutants looked like before the break was read correctly rather than as a broken check. So the
       break takes the whole set, and reproduces the 196px clip this pass found. A family that tested
       guards one at a time would have reported rules that do not exist. */
    edits: [['  .topbar{ flex-wrap:wrap; }', '  /* no wrap */'],
            ['  .topbar > div{ min-width:0; }', '  /* no min-width on the bar children */'],
            /* The bar rule that keeps a top-bar control from wrapping also gives it flex:0 0 auto,
               whose middle value is shrink:0, and the title group carries a min-width:0 of its own. */
            ['  .topbar .btn, .topbar .back-btn, .topbar .notif-btn{ white-space:nowrap; flex:0 0 auto; }',
             '  .topbar .btn, .topbar .back-btn, .topbar .notif-btn{ white-space:nowrap; flex:0 1 auto; }'],
            ['  .topbar .hb{ display:flex; align-items:center; gap:10px; min-width:0; }',
             '  .topbar .hb{ display:flex; align-items:center; gap:10px; }']] },
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
  console.log('baseline: 0 unreachable controls on all four screen groups at 320x480 @ 200% text');
  for (const b of BREAKS) {
    let mutated = original, bad = null;
    for (const [from, to] of b.edits) {
      const hits = mutated.split(from).length - 1;
      if (hits !== 1) { bad = hits; break; }
      mutated = mutated.replace(from, to);
    }
    if (bad !== null) {
      unmatched++;
      console.log('SKIP  ' + b.name + '  (a needle matched ' + bad + ' times, needs exactly 1)');
      continue;
    }
    applied++;
    fs.writeFileSync(TARGET, mutated);
    const n = measure(b.only);
    if (n === null) console.log('MISSED  ' + b.name + '  (the camera printed no tally)');
    else if (n > 0) { caught++; console.log('CAUGHT  ' + b.name + '  (' + n + ' controls out of reach)'); }
    else console.log('MISSED  ' + b.name + '  (every control still reachable, so this rule is not what holds it)');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied; file restored.');
process.exit(applied > 0 && caught === applied && unmatched === 0 ? 0 : 1);

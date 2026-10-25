/* Proves the Money-screen action-order check can fail.

   The density baseline (tools/probe-density.js) was measured on the untouched build before anything
   moved: "Run this week’s payouts" and "Restore the sample records" sat 2,239px down a 2.5-screen
   scroll on a screen whose whole job is the money those buttons change. The action card now leads.
   Two screens that the Phase A audit also listed were re-measured with a metric that counts
   pressable rows, not only `.btn`, and are NOT defects: Master Administrator's actions begin at
   121px (its lock/logout pair belongs at the bottom), and Categories' only button is a link to fee
   settings on a screen that declares itself read-only.

   Break 1 is the hazard the check names — the card moved back below the figures. Break 2 is the
   shallower one: a check that only compared positions would pass if the card were deleted, so it
   also requires both labels to be painted, and this break proves that half is not decoration.

   The file is CRLF, so every multi-line anchor is built through crlf(); a needle written with a bare
   \n matches nothing and the run would report a healthy gate for a mutation that never landed.

     node tools/falsify-action-above-fold.cjs    ~2 minutes                                      */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');
const crlf = s => s.replace(/\n/g, '\r\n');

const CHECK = 'the Money screen offers its two actions before the figures those actions change';
const CARD = '    ${thisDeviceCard()}';
const STATEMENT = '    ${statementCard()}';

const BREAKS = [
  { name: 'the action card goes back below the statement figures it changes',
    from: crlf(CARD + '\n' + STATEMENT), to: crlf(STATEMENT + '\n' + CARD) },
  { name: 'the action card is not painted at all',
    from: crlf(CARD), to: '    ' },
];

function gateOutput() {
  let out = '';
  try {
    out = execFileSync(process.execPath, [path.join(ROOT, 'tools', 'verify.cjs')],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 420000 });
  } catch (err) { out = (err.stdout || '') + (err.stderr || ''); }
  return out;
}
function readCheck(out) {
  const line = out.split(/\r?\n/).find(l => l.indexOf(CHECK) >= 0);
  if (!line) return { seen: false, failed: false, why: 'the check vanished from the output' };
  const t = line.trim();
  return { seen: true, failed: t.indexOf('FAIL') === 0, why: t.slice(0, 170) };
}

let caught = 0, applied = 0, unmatched = 0;
const base = readCheck(gateOutput());
if (!base.seen) { console.log('BROKEN  no gate check named "' + CHECK + '"'); process.exit(1); }
if (base.failed) { console.log('BROKEN  baseline already red: ' + base.why); process.exit(1); }
console.log('baseline: the check passes on the file as it stands');

try {
  for (const b of BREAKS) {
    const hits = original.split(b.from).length - 1;
    if (hits !== 1) {
      unmatched++;
      console.log('SKIP  ' + b.name + '  (its anchor matched ' + hits + ' times, needs exactly 1)');
      continue;
    }
    applied++;
    fs.writeFileSync(TARGET, original.replace(b.from, b.to));
    if (fs.readFileSync(TARGET, 'utf8') === original) {
      unmatched++; applied--;
      console.log('SKIP  ' + b.name + '  (the write did not land)');
      continue;
    }
    const r = readCheck(gateOutput());
    if (!r.seen) console.log('MISSED  ' + b.name + '  (' + r.why + ')');
    else if (r.failed) { caught++; console.log('CAUGHT  ' + b.name + '  → ' + r.why); }
    else console.log('MISSED  ' + b.name + '  (the named check still passes)');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied; file restored.');
process.exit(applied > 0 && caught === applied && unmatched === 0 ? 0 : 1);

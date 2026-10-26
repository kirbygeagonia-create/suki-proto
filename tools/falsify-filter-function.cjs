/* Proves the A7 filter check can fail: a control that is painted is not yet a control that works.

   The brief asks twice whether the discovery filters "actually work", and the answer cannot be a
   screenshot — every one of these four axes has already had a shape that looked correct in a picture:
   the barangay filter matched where a provider lives rather than where they declared they serve, the
   wait filter read the same `availabilityMin` the card prints as "can start in", and `activeFilterCount()`
   could report zero active while two axes had narrowed the list, which makes the Clear button the
   screen paints beside that count a button that clears nothing.

   Each break takes one axis out of the predicate or out of the count. Two of them (drops and keeps)
   fail in opposite directions, which is why the gate check compares the whole id set against an
   expectation it builds itself rather than reading the number back from the app: a filter that returns
   a smaller wrong answer still "narrows", so a count alone would call it a pass.

     node tools/falsify-filter-function.cjs    ~4 minutes                             */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

const CHECK = 'every discovery filter narrows the set, and clearing restores it';

const BREAKS = [
  { name: 'the start-within axis stops narrowing anything',
    from: '    (!f.maxWait || p.availabilityMin <= f.maxWait) &&',
    to: '    true &&' },
  { name: 'the area filter goes back to matching where a provider lives',
    from: '    (!f.barangay || providerServes(p, f.barangay)) &&',
    to: '    (!f.barangay || p.barangay === f.barangay) &&' },
  { name: 'the search field stops reading the trade, so a trade word loses the providers it names',
    from: '      p.service.toLowerCase().includes(query) ||',
    to: '      false ||' },
  { name: 'the active-filter count answers zero whatever the state holds',
    from: '  return (f.serviceId ? 1 : 0) + (f.barangay ? 1 : 0) + (f.maxWait ? 1 : 0);',
    to: '  return 0;' },
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
  return { seen: true, failed: t.indexOf('FAIL') === 0, why: t.slice(0, 190) };
}

const base = readCheck(gateOutput());
if (!base.seen) { console.log('BROKEN  no gate check named "' + CHECK + '"'); process.exit(1); }
if (base.failed) { console.log('BROKEN  baseline already red: ' + base.why); process.exit(1); }
console.log('baseline: the check passes on the file as it stands');

let caught = 0, applied = 0, unmatched = 0;
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

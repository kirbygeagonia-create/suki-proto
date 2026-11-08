/* Proves the G10 empty-state census can fail.

   §10 asks for five *distinct* empty kinds — nothing yet, nothing matches, nothing available, nothing
   here to reach, and a destination this role cannot open. The build paints all five, but it paints them
   because twenty-two calls happened to word themselves differently, so the rule that keeps them apart is
   a census rather than a sentiment: every literal title has to answer to one kind, every kind has to
   still have a representative in the file, and the number of call sites has to equal the classified
   literals plus the one named site whose title is built by an expression.

   Two breaks, each the way this actually rots:
     1 a screen re-words its empty state into something the census has never been told about — a new
       kind, or a new name for an old one, and the check refuses until a person decides which;
     2 the "nothing is available here" screen adopts the wording of the "nothing has happened yet"
       screen. Both sentences are true of the same empty list and opposite for the reader: one says the
       records are empty, the other says nothing can serve you. A tally of titles cannot tell those two
       apart; the kind count can, and it drops to four.

     node tools/falsify-empty-kinds.cjs    ~3 minutes                               */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

const CHECK = 'every empty state answers to one of the five kinds';

const BREAKS = [
  { name: 'an empty state re-words itself into a title the census has never been told about',
    from: `emptyState('star', 'No saved providers',`,
    to: `emptyState('star', 'Nothing kept for later',` },
  { name: 'the unavailable screen takes the wording of the nothing-has-happened-yet screen',
    from: `emptyState('alert-triangle', 'No provider is open here',`,
    to: `emptyState('alert-triangle', 'No requests yet',` },
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
console.log('baseline: the census passes on the file as it stands');

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

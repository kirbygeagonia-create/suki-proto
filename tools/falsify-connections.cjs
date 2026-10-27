/* Proves the connections suite watches the rules it claims to. Breaks 1, 2 and 6 are the privacy
   boundary (a withheld household named, the visibility gate inverted, the withheld sentence repeated
   on every row); 3 is the claim that a connection cannot be added; 4 is the grouping arithmetic; and 5
   is the defect a screenshot found — a count parked in the one slot the sheet rule silences.
     node tools/falsify-connections.cjs                                                 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

const WITHHELD_LABEL = "if (withheld) return { name: 'A household that has not booked you', sub: '' };";
const MUTANTS = [
  { name: 'a withheld household is named anyway',
    needle: WITHHELD_LABEL,
    to: "if (withheld) return { name: 'A household on this device', sub: '' };",
    label: 'the provider list hides a household whose only job is a request, and names one it accepted' },
  { name: 'the visibility gate is inverted, so a request reveals and an accepted job hides',
    needle: 'if (PROVIDER_VISIBLE_STATES.includes(b.status)) g.withheld = false;',
    to: 'if (!PROVIDER_VISIBLE_STATES.includes(b.status)) g.withheld = false;',
    label: 'the provider list hides a household whose only job is a request, and names one it accepted' },
  { name: 'a withheld row grows a link out to a stranger',
    needle: "        link: g.withheld ? null : { kind: 'household', id: g.otherId } });",
    to: "        link: { kind: 'household', id: g.otherId } });",
    label: 'a withheld row carries no link out, so the list cannot become a way to open a stranger' },
  { name: 'a connection becomes something you can add',
    needle: "function openConnections() { state.sheet = 'connections'; render(); }",
    to: "function addConnection(id) { state.connections = (state.connections || []).concat(id); }\nfunction openConnections() { state.sheet = 'connections'; render(); }",
    label: 'nothing in the file can add, request or follow a connection' },
  { name: 'the grouping drops a booking, so the list no longer adds up',
    needle: '    g.jobs++;',
    to: "    if (b.status !== 'completed') g.jobs++;",
    label: 'grouping loses nothing: the jobs summed equal the bookings on this side' },
  { name: 'the connection count goes back into a heading the sheet silences',
    needle: '<div style="font-size:var(--t-body-sm); font-weight:700;">${list.length} connection',
    to: '<b class="card-title">${list.length} connection',
    label: 'the connection count is in the line that paints, not in a silenced card heading' },
  { name: 'the withheld sentence returns to every row under a head that already says it',
    needle: WITHHELD_LABEL,
    to: "if (withheld) return { name: 'A household that has not booked you', sub: 'Their name stays withheld until you accept the job' };",
    label: 'the withheld rule is stated once on the head, not repeated on every row' }
];

function gateOutput() {
  try {
    const out = execFileSync(process.execPath, [path.join(ROOT, 'tools', 'verify.cjs')],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status === undefined ? -1 : e.status, out: String(e.stdout || '') + String(e.stderr || '') };
  }
}
const baseline = gateOutput();
if (baseline.code !== 0 || !/all \d+ checks passed/.test(baseline.out)) {
  console.log('BROKEN: the gate is not green before any mutation, so nothing below is a measurement.');
  console.log(baseline.out.split('\n').filter(l => /^FAIL|Error|crashed/.test(l)).slice(0, 6).join('\n'));
  process.exit(1);
}
let applied = 0, caught = 0, unmatched = 0;
try {
  for (const m of MUTANTS) {
    const hits = original.split(m.needle).length - 1;
    if (hits !== 1) { unmatched++; console.log('SKIP  NOT APPLIED  ' + m.name + '  (needle matched ' + hits + ' times)'); continue; }
    applied++;
    fs.writeFileSync(TARGET, original.replace(m.needle, m.to));
    const run = gateOutput();
    if (run.code !== 0 && run.out.includes('FAIL  ' + m.label)) { caught++; console.log('CAUGHT  ' + m.name); }
    else console.log('MISSED  ' + m.name + '  (exit ' + run.code + ', named check '
      + (run.out.includes('FAIL  ' + m.label) ? 'failed' : 'did not') + ')');
  }
} finally { fs.writeFileSync(TARGET, original); }
const restored = fs.readFileSync(TARGET, 'utf8') === original;
console.log('\n' + caught + ' of ' + applied + ' mutants caught, ' + unmatched + ' not applied; file restored '
  + (restored ? 'byte-for-byte.' : 'FAILED — check the tree.'));
process.exit(applied > 0 && caught === applied && unmatched === 0 && restored ? 0 : 1);

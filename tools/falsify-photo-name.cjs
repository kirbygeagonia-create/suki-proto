/* Proves that `tools/probe-concierge-photo-name.js` can see the thing it claims to have measured.

   The probe hands the concierge's file input a real `File` through `DataTransfer` — the mechanism a
   browser uses when a system picker returns a document — and answers that the painted screen holds the
   name and no bytes. That is a "0", and this repository has learned that a 0 from a sensor which could
   not have seen otherwise is worth nothing. Two breaks, each expected to produce a DIFFERENT non-clean
   answer, so neither the leak path nor the nothing-was-measured path can be blind:

     1. the handler stores `URL.createObjectURL(file)` where it stores `file.name` — the screen then
        carries a `blob:` string while no `<img>` exists at all. Breaks a probe that counts image
        elements only, which is why the probe reads the painted markup as well. Expect LEAK.
     2. the handler returns before it reads the file — nothing is painted, nothing leaks. Expect the
        probe to refuse rather than print a clean row, which is the guard its own comment names.

   Both are run against the camera, not the gate: §75's claim is about pixels. ~3 minutes, one browser
   per answer.

     node tools/falsify-photo-name.cjs                                                 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const PROBE = path.join(ROOT, 'tools', 'probe-concierge-photo-name.js');
const original = fs.readFileSync(TARGET, 'utf8');
const EOL = original.indexOf('\r\n') >= 0 ? '\r\n' : '\n';

const KEEPS_NAME = '  state.conciergePhotoAttached = true;' + EOL + '  state.conciergePhotoName = file.name;';
const READS_FILE = 'function handlePhotoUpload(e){' + EOL +
  '  const file = e.target.files && e.target.files[0];' + EOL + '  if(!file) return;';
for (const [needle, what] of [[KEEPS_NAME, 'the line that keeps the name'], [READS_FILE, 'the handler head']]) {
  const n = original.split(needle).length - 1;
  if (n !== 1) {
    console.log(what + ' is not where this file expects it (matched ' + n + ', expected 1) — nothing was written');
    process.exit(1);
  }
}

const BREAKS = [
  { name: 'the handler keeps a blob URL instead of the file name', expect: 'LEAK',
    edits: [[KEEPS_NAME, '  state.conciergePhotoAttached = true;' + EOL +
      '  state.conciergePhotoName = URL.createObjectURL(file);']] },
  { name: 'the handler returns before reading what was picked', expect: 'NO CONCLUSION',
    edits: [[READS_FILE, 'function handlePhotoUpload(e){' + EOL + '  return;']] },
];

function ask() {
  let out = '';
  try {
    out = execFileSync(process.execPath,
      [path.join(ROOT, 'tools', 'shot.cjs'), '--probe=@tools/probe-concierge-photo-name.js', '--only=concierge'],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) { out = (err.stdout || '') + (err.stderr || ''); }
  const line = out.split(/\r?\n/).find(l => l.indexOf('probe →') >= 0);
  if (!line) return { kind: 'SILENT', text: 'the camera printed no probe answer' };
  /* shot.cjs prints the returned string JSON-encoded, so unwrap it before judging its shape. */
  let text = line.slice(line.indexOf('probe →') + 7).trim();
  try { text = JSON.parse(text); } catch (e) { /* a bare word like LEAK: … stays as printed */ }
  const kind = /^LEAK/.test(text) ? 'LEAK' : /^NO CONCLUSION/.test(text) ? 'NO CONCLUSION'
    : /^\{/.test(text) ? 'MEASURED' : 'UNRECOGNISED';
  return { kind, text: String(text).slice(0, 170) };
}

let caught = 0, applied = 0, unmatched = 0;
const base = ask();
if (base.kind !== 'MEASURED') {
  console.log('BASELINE did not measure: ' + base.kind + ' — ' + base.text);
  process.exit(1);
}
if (!/"imageSourcesHoldingBytes":0/.test(base.text) || !/"blobOrDataInPaintedHtml":0/.test(base.text)) {
  console.log('BASELINE reads clean-shaped but not zero: ' + base.text);
  process.exit(1);
}
console.log('baseline: ' + base.text);

try {
  for (const b of BREAKS) {
    let mutated = original, bad = null;
    for (const [from, to] of b.edits) {
      if (mutated.split(from).length - 1 !== 1) { bad = from.slice(0, 60); break; }
      mutated = mutated.split(from).join(to);
    }
    if (bad) { unmatched++; console.log('SKIP    ' + b.name + '  (needle not found: ' + bad + ')'); continue; }
    applied++;
    fs.writeFileSync(TARGET, mutated);
    const r = ask();
    if (r.kind === b.expect) { caught++; console.log('CAUGHT  ' + b.name + '  → ' + r.text); }
    else console.log('MISSED  ' + b.name + '  (expected ' + b.expect + ', the probe answered ' + r.kind + ': ' + r.text + ')');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
const after = fs.readFileSync(TARGET, 'utf8');
if (after !== original) { console.log('the file did not come back identical — stop and look before trusting anything above'); process.exit(1); }

console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied; file restored.');
process.exit(caught === applied && applied === BREAKS.length && unmatched === 0 ? 0 : 1);

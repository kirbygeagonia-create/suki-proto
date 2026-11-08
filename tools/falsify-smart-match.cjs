/* Proves the gate's Smart Match check reads the score, evidence, data source, and ordering.
   The score is a transparent demo heuristic, not AI or a production ranking policy. */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');
const EOL = original.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
const CHECK = 'demo match scores and ordering come from visible provider records';

function runGate() {
  let out = '';
  let code = 0;
  try {
    out = execFileSync(process.execPath, [path.join(ROOT, 'tools', 'verify.cjs')],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) { out = (err.stdout || '') + (err.stderr || ''); code = err.status || 1; }
  const line = out.split(/\r?\n/).find(l => l.indexOf(CHECK) >= 0);
  if (!line) return { seen: false, failed: code !== 0, line: '' };
  return { seen: true, failed: line.indexOf('FAIL') === 0, line: line.trim().slice(0, 170) };
}

const BREAKS = [
  { name: 'the score no longer sums its documented factors',
    from: '    score: servicePoints + areaPoints + arrivalPoints + distancePoints + verificationPoints,',
    to: '    score: 0,' },
  { name: 'verification points stop reading the provider verification record',
    from: "  const verificationStatus = p.verification && p.verification.status || 'not recorded';",
    to: "  const verificationStatus = 'verified';" },
  { name: 'the score stops reading provider-listed area coverage',
    from: '  const servesArea = !!targetArea && providerServes(p, targetArea);',
    to: '  const servesArea = !!targetArea && p.barangay === targetArea;' },
  { name: 'search stops finding providers by the areas they declare serving',
    from: '(p.servesBarangays || []).some(area => area.toLowerCase().includes(query))',
    to: 'false' },
  { name: 'providers stop sorting by the computed score',
    from: [
      '  ).sort((a, b) => providerMatch(b).score - providerMatch(a).score',
      '    || a.availabilityMin - b.availabilityMin',
      '    || a.distanceKm - b.distanceKm',
      '    || a.id.localeCompare(b.id));'
    ].join(EOL),
    to: '  );' },
  { name: 'the visible explanations are removed from the computed result',
    from: '    reasons' + EOL + '  };',
    to: '    reasons: []' + EOL + '  };' },
  { name: 'the results page claims an AI/live match instead of a demo heuristic',
    from: 'Rule-based demo match · not AI or live availability',
    to: 'AI-powered live provider match' },
  { name: 'the suspended provider is shown as verified',
    from: "const statusBadge = platformStatus === 'verified'",
    to: "const statusBadge = true" }
];

function replaceOnce(from, to) {
  const hits = original.split(from).length - 1;
  if (hits !== 1) return false;
  fs.writeFileSync(TARGET, original.replace(from, to));
  return true;
}

const base = runGate();
if (!base.seen || base.failed) {
  console.log('baseline is not green: ' + (base.line || 'named check missing'));
  process.exit(1);
}
console.log('baseline: ' + base.line);

let caught = 0, applied = 0, unmatched = 0;
try {
  for (const b of BREAKS) {
    if (!replaceOnce(b.from, b.to)) {
      unmatched++;
      console.log('SKIP  ' + b.name + '  (anchor did not match exactly once)');
      continue;
    }
    applied++;
    const r = runGate();
    if (!r.seen) console.log('MISSED  ' + b.name + '  (named check missing)');
    else if (r.failed) { caught++; console.log('CAUGHT  ' + b.name + '  → ' + r.line); }
    else console.log('MISSED  ' + b.name + '  (named check still passes)');
    fs.writeFileSync(TARGET, original);
  }
} finally {
  fs.writeFileSync(TARGET, original);
}

console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied; file restored.');
process.exit(applied > 0 && caught === applied && unmatched === 0 ? 0 : 1);

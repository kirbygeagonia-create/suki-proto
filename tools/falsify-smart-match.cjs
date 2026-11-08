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
const CHECK = 'demo match scores, reasons and verification labels reflect provider records';

function runGate() {
  let out = '';
  try {
    out = execFileSync(process.execPath, [path.join(ROOT, 'tools', 'verify.cjs')],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) { out = (err.stdout || '') + (err.stderr || ''); }
  const line = out.split(/\r?\n/).find(l => l.indexOf(CHECK) >= 0);
  if (!line) return { seen: false, failed: false, line: '' };
  return { seen: true, failed: /^\s*FAIL\b/.test(line), line: line.trim().slice(0, 170) };
}

const BREAKS = [
  { name: 'the displayed score stops depending on its weighted signals',
    from: [
      '  const score = totalWeight > 0',
      '    ? Math.round(100 * signals.reduce((t, s) => t + s.weight * s.sub, 0) / totalWeight) : 0;'
    ].join(EOL),
    to: '  const score = 0;' },
  { name: 'service fit stops reading the provider service record',
    from: "provider.serviceId === req.serviceId ? 1 : 0",
    to: '1' },
  { name: 'area fit stops reading declared service coverage',
    from: 'providerServes(provider, barangay) ? 1 : 0',
    to: 'provider.barangay === barangay ? 1 : 0' },
  { name: 'arrival fit stops reading the listed arrival window',
    from: 'signalBand(provider.availabilityMin, [[15, 1], [30, 0.8], [60, 0.6], [120, 0.4], [Infinity, 0.2]])',
    to: '1' },
  { name: 'barangay filtering ignores declared service coverage',
    from: '(!f.barangay || providerServes(p, f.barangay))',
    to: '(!f.barangay || true)' },
  { name: 'providers stop sorting by their computed score',
    from: [
      '  return matched.sort((a, b) => (scoreOf.get(b.id) - scoreOf.get(a.id)) || a.name.localeCompare(b.name));'
    ].join(EOL),
    to: '  return matched;' },
  { name: 'computed reasons are removed from the match result',
    from: 'reasons: signals.filter(s => s.reason).map(s => s.reason),',
    to: 'reasons: [],' },
  { name: 'a suspended provider is labelled verified',
    from: "  if (status === 'verified')",
    to: "  if (true)" },
  { name: 'the result screen claims a live AI match',
    from: 'Rule-based demo match · not AI or live availability',
    to: 'AI-powered live provider match' }
];

function replaceOnce(from, to) {
  const hits = original.split(from).length - 1;
  if (hits !== 1) return false;
  fs.writeFileSync(TARGET, original.replace(from, to));
  return true;
}

const base = runGate();
if (!base.seen || base.failed) {
  console.log('named Smart Match check is unavailable or failing: ' + (base.line || 'named check missing'));
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

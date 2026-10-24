/* The admin Provider Insights screen — the Providers bar's "Insights" button, which no camera table
   had ever named until §81 — typed four bars, named four of the seven trades on the roster, asserted
   a cancellation-rate verdict no record makes, and listed one provider needing attention under a strip
   that counted six. Each break below puts one of those inventions back and requires the named gate
   check to refuse it. A break whose needle matches anywhere other than once is reported as NOT
   APPLIED rather than planted in whichever copy `replace` reaches first.
     node tools/falsify-insights-records.cjs                                              */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');
const BARS = 'every bar on the insights screen is a division the records make';
const GONE = 'the invented figures are gone from the painted screen';
const TRADES = 'the trade list is the roster, not a list somebody maintains';
const ATTENTION = 'the attention card lists exactly the providers the strip counts';
const EMPTY = 'an empty roster explains itself instead of painting dashes';

const MUTANTS = [
  { name: 'the completion bar goes back to the typed 88',
    label: BARS,
    from: "    { label: 'Closed jobs finished', pct: rates.completion,",
    to: "    { label: 'Closed jobs finished', pct: 88," },
  { name: 'the credentials bar goes back to the typed 75',
    label: BARS,
    from: "    { label: 'Documents in good standing', pct: roster ? Math.round(standing / roster * 100) : null,",
    to: "    { label: 'Documents in good standing', pct: 75," },
  { name: 'the strip counts one provider while the card lists six',
    label: ATTENTION,
    from: '    needsAttention: attention.length,',
    to: '    needsAttention: 1,' },
  { name: 'the card prints no rows although the roster is flagged',
    label: ATTENTION,
    from: 'network.attention.length ? network.attention.map(x =>',
    to: 'network.attention.length ? [].map(x =>' },
  { name: 'the trade list goes back to four rows somebody maintained',
    label: TRADES,
    from: "  return Object.keys(by).map(k => ({ label: k, count: by[k] }))",
    to: "  return [{ label: 'Plumbing', count: 1 }, { label: 'Electrical', count: 1 }," +
      " { label: 'Cleaning', count: 1 }, { label: 'Appliance', count: 1 }]" },
  { name: 'the typed verdict sentence comes back under the bars',
    label: GONE,
    from: 'margin-top:10px;">${networkFlagSummary()}</div>',
    to: 'margin-top:10px;">Credential health and available capacity are the main network' +
      ' improvement opportunities.</div>' },
  { name: 'the empty roster is painted as dashes instead of an explanation',
    label: EMPTY,
    from: '  const empty = !network.roster;',
    to: '  const empty = false;' },
];

function plant(s, m) {
  const hits = s.split(m.from).length - 1;
  return hits === 1 ? { out: s.replace(m.from, m.to) } : { bad: hits };
}

function gateRun() {
  try {
    return { code: 0, out: execFileSync(process.execPath, [path.join(ROOT, 'tools', 'verify.cjs')],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (err) {
    return { code: err.status === undefined ? -1 : err.status, out: (err.stdout || '') + (err.stderr || '') };
  }
}

let caught = 0, applied = 0, unmatched = 0;
try {
  for (const m of MUTANTS) {
    const planted = plant(original, m);
    if (planted.bad !== undefined) {
      console.log('SKIP    ' + m.name + '  (needle matched ' + planted.bad + ', expected 1)');
      unmatched++; continue;
    }
    applied++;
    fs.writeFileSync(TARGET, planted.out);
    const run = gateRun();
    const failed = run.code !== 0 && run.out.includes('FAIL  ' + m.label);
    if (failed) { caught++; console.log('CAUGHT  ' + m.name); }
    else console.log('MISSED  ' + m.name + '  (exit ' + run.code + ', named check '
      + (run.code !== 0 ? 'not the one that failed: ' + (run.out.match(/FAIL  .*/g) || [''])[0].slice(0, 70)
        : 'passed anyway') + ')');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied; file restored.');
process.exit(caught === applied && unmatched === 0 ? 0 : 1);

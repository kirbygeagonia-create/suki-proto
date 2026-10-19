/* Proves the gate check "a search of nothing but spaces shows everyone, exactly as no search does"
   can fail, by taking the trim out from under it.

   The class: a field holding only spaces is truthy to JavaScript and empty to a person. The app
   already handles it — measured by `node tools/shot.cjs --probe=@tools/probe-blank-query.js
   --only=resident-results`, which types the query through the platform's own input path and clicks
   the magnifier the results screen paints, then waits for the simulated discovery to settle. What it
   answered: one space and three spaces both show all eight providers, the same list an empty query
   shows, while "xyzzy" shows none and says so.

   Two mutants, because the same line is written twice — once in the matcher, once in the screen that
   decides whether the search is "narrowing". They are not interchangeable, and the second needed a
   second half of the check to see it at all: the count line prints "8 of 8 providers" when something
   narrows and "8 smart matches" when nothing does, so a screen-local trim that stopped trimming
   would show a whole unfiltered list wearing the grammar of a constraint. The first run of this
   family printed that break as MISSED against a check that only counted providers, and the check was
   widened rather than the mutant deleted.

     node tools/falsify-blank-query.cjs    ~1 minute, no browser needed                          */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');
const EOL = original.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
const CHECK = 'a search of nothing but spaces shows everyone, exactly as no search does';
const QUERY = "  const query = (state.searchQuery || '').trim().toLowerCase();";
const UNTRIMMED = "  const query = (state.searchQuery || '').toLowerCase();";

/* Each break is anchored on the function that owns the line, because the line itself is written
   twice in this file and a needle matching two places applies to neither of them on purpose. */
const BREAKS = [
  { name: 'the matcher stops trimming, so a space becomes a search term',
    from: 'function providerMatches(){' + EOL + QUERY,
    to: 'function providerMatches(){' + EOL + UNTRIMMED },
  { name: 'the results screen stops trimming what it calls a narrowing search',
    from: 'function residentResults(){' + EOL + QUERY,
    to: 'function residentResults(){' + EOL + UNTRIMMED },
];

function runGate() {
  let out = '';
  let code = 0;
  try {
    out = execFileSync(process.execPath, [path.join(ROOT, 'tools', 'verify.cjs')],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) { out = (err.stdout || '') + (err.stderr || ''); code = err.status || 1; }
  const line = out.split(/\r?\n/).find(l => l.indexOf(CHECK) >= 0);
  /* A check that is not in the output at all is not a passing check. */
  if (!line) return { seen: false, failed: code !== 0, line: '' };
  return { seen: true, failed: /^FAIL/.test(line.trim()) || line.indexOf('FAIL') === 0, line: line.trim().slice(0, 150) };
}

let caught = 0, applied = 0, unmatched = 0;
const base = runGate();
if (!base.seen) { console.log('the named check is not in the gate output — nothing to prove'); process.exit(1); }
if (base.failed) { console.log('the gate is already red before any break: ' + base.line); process.exit(1); }
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
    const r = runGate();
    if (!r.seen) console.log('MISSED  ' + b.name + '  (the check vanished from the output)');
    else if (r.failed) { caught++; console.log('CAUGHT  ' + b.name + '  → ' + r.line); }
    else console.log('MISSED  ' + b.name + '  (the check still passes, so this rule is not what the check reads)');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied; file restored.');
process.exit(applied > 0 && caught === applied && unmatched === 0 ? 0 : 1);

/* Every probe and audit tool in tools/, run the way each one is actually meant to run.

   This exists because the suite has two kinds of probe and the file extension tells you which:
   `tools/probe-*.cjs` and any probe that requires harness.cjs boot the app in Node, while
   `tools/probe-*.js` files are a single expression that `shot.cjs --probe=@file` evaluates
   inside a real page. Run an in-page probe with plain node and it dies on `document is not
   defined`; run it through the camera and it answers the question it was written for. The first
   pass at this runner reported eleven of twenty-one tools broken, and ten of those were the
   runner's own mistake — which is the same lesson the count-pairs probe recorded: correct the
   instrument before concluding anything about the app.

   A probe that prints nothing is called out rather than counted as a pass, because an instrument
   whose result nobody reads is how the doubled-CR guard spent a week silently un-applied.

     node tools/probe-all.cjs            (~5 minutes: every in-page probe launches a browser)
     node tools/probe-all.cjs caret      # only probes whose name matches
*/
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TOOLS = path.join(ROOT, 'tools');
const filter = process.argv[2];

const probes = fs.readdirSync(TOOLS)
  .filter(f => /^(probe|audit)-[a-z-]+\.(cjs|js)$/.test(f))
  /* Not a probe: this file runs the probes. Its own name matches the pattern, and a runner that
     launches itself nests one browser per probe per pass. */
  .filter(f => f !== 'probe-all.cjs')
  .filter(f => !filter || f.includes(filter))
  .sort();

/* The invocation each probe documents in its own header, when it documents one. */
function kindOf(file) {
  const src = fs.readFileSync(path.join(TOOLS, file), 'utf8');
  const header = src.slice(0, 2000);
  if (/require\([^)]*harness/.test(src)) return { kind: 'node', src };
  if (/shot\.cjs --probe=@/.test(header)) {
    const only = (header.match(/--only=([A-Za-z0-9,_-]+)/) || [])[1] || '';
    const size = (header.match(/--width=(\d+)\s+--height=(\d+)/) || []).slice(1, 3).map(Number);
    return { kind: 'page', only, size: size.length === 2 ? size : null, src };
  }
  /* No header command naming the invocation. The remaining signal is the shape of the file: an
     in-page probe is ONE expression — the whole file is an IIFE ending `})()` — because that is
     what `--probe=@file` wraps in `(${expr})`. A Node probe is a program: statements, requires, a
     trailing call. Reading page globals was not enough to decide it, and probe-reputation.js is
     the proof: it never names `document`, it only reads records off the page, so the global test
     called it a Node script and it died on `bookingsForResident is not defined`. */
  const isOneExpression = /\}\)\(\s*\)\s*;?\s*$/.test(src.trim());
  const requiresNothing = !/\brequire\(/.test(src);
  if (isOneExpression && requiresNothing) {
    return { kind: 'page', only: '', size: null, src };
  }
  return { kind: 'node', src };
}

function runNode(file) {
  try {
    return { code: 0, out: execFileSync(process.execPath, [path.join(TOOLS, file)],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }) };
  } catch (err) {
    return { code: err.status === undefined ? -1 : err.status, out: (err.stdout || '') + (err.stderr || '') };
  }
}

function runPage(file, spec) {
  const args = [path.join(TOOLS, 'shot.cjs'), '--probe=@tools/' + file];
  if (spec.only) args.push('--only=' + spec.only);
  if (spec.size) args.push('--width=' + spec.size[0], '--height=' + spec.size[1]);
  try {
    return { code: 0, out: execFileSync(process.execPath, args,
      { encoding: 'utf8', cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024,
        timeout: 300000 }) };
  } catch (err) {
    return { code: err.status === undefined ? -1 : err.status, out: (err.stdout || '') + (err.stderr || '') };
  }
}

let silent = 0, failed = 0, unmeasured = 0, counted = 0;
for (const f of probes) {
  const spec = kindOf(f);
  const run = spec.kind === 'node' ? runNode(f) : runPage(f, spec);
  /* The answer is the probe's own value, not the camera's footer: an in-page probe's verdict
     arrives on the `probe → {…}` line, and printing the last line of the run instead would show
     where the PNGs went and read like a result.

     ALL of those lines, not the first. The camera evaluates a page probe once per screen of the
     walk, so the first answer belongs to whatever screen happens to be first — and for two probes
     that was the only answer ever read. `probe-nav-fit.js` says "no bottom nav painted" there,
     which is true of the sign-in page and nothing else: measured on 2026-10-19 it answered on all
     72 screens and 69 of them hold a nav (the counts from that day; the walk is longer now). `probe-chart-axis-coverage.js` answered `charts:[]` on
     the first screen and the runner called that an answer, while the question it exists to ask —
     does an axis name its tallest bar — went unasked for the whole pass. */
  const values = (run.out.match(/probe → (\S[^\n]*)/g) || []).map(s => s.replace(/^probe → /, ''));
  const probeValue = values[0] || '';
  const line = probeValue || (run.out.split(/\r?\n/).filter(l => l.trim() && !/^PASS\b/.test(l)).pop() || '').trim();
  const threw = /threw:/.test(run.out);
  const nothing = run.out.trim().length === 0;
  /* A probe refuses by saying `NO CONCLUSION`: an empty population is not a clean measurement.
     Refuse on it only when EVERY answer refused — one refusal among the screens of a long walk is the subject
     genuinely not existing on one screen, and flagging that would punish the honest probe. */
  const refused = values.filter(v => v.indexOf('NO CONCLUSION') > -1).length;
  const answered = values.length - refused;
  /* The second half of the contract. `NO CONCLUSION` answers "did this instrument measure anything";
     it says nothing about what the measurement SAID, which is how `probe-whitespace.js` came to print
     `ok … findings:1` — a defect count sitting inside a line the runner called clean, cut off after 78
     characters so the row that explained it never reached the page either. So a page probe that counts
     defects names its number `findings`, and any leg it could not complete `instrumentRows`, and this
     runner reads both. A probe that does not use the keys is still judged only on whether it answered —
     the convention is opt-in per probe, and `falsify-probe-population` plants probes to prove both the
     promotion and the boundary: a positive count must be flagged, an instrument row must be flagged
     separately, and neither may be inferred from a probe that reports no counts at all. */
  const count = (v, key) => {
    /* An answer is printed two ways, and the first version of this matcher only knew one of them.
       A probe that returns an object comes back as plain JSON; a probe that returns
       `JSON.stringify(…)` comes back as a JSON *string*, so every quote in it is printed escaped and
       `"findings"` is not in the text at all — which is how `findings:1` read clean to a rule whose
       whole job was to flag it. Unwrap both shapes rather than widen the regex, so a probe cannot
       choose its way out of the count by how it returns. */
    let parsed;
    try { parsed = JSON.parse(v); } catch (notJson) { return null; }
    if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch (stillText) { return null; } }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const n = parsed[key];
    return (typeof n === 'number' && isFinite(n)) ? n : null;
  };
  const sum = key => values.reduce((a, v) => a + (count(v, key) || 0), 0);
  const findings = sum('findings');
  const instrumentRows = sum('instrumentRows');
  const countsFindings = values.some(v => count(v, 'findings') !== null);
  const countsBlind = values.some(v => count(v, 'instrumentRows') !== null);
  if (countsFindings) counted++;
  const noPopulation = spec.kind === 'page' ? (values.length === 0 || answered === 0)
    : (line.indexOf('NO CONCLUSION') > -1);
  if (noPopulation && !threw && !nothing) unmeasured++;
  const trouble = run.code !== 0 || nothing || threw || noPopulation
    || (spec.kind === 'page' && probeValue === 'null')
    || findings > 0 || instrumentRows > 0;
  if (trouble) failed++;
  if (nothing) silent++;
  const head = (countsFindings || countsBlind)
    ? (countsFindings ? 'findings=' + findings : '') + (countsBlind ? (countsFindings ? ', ' : '') + 'instrumentRows=' + instrumentRows : '') + ' · '
    : '';
  console.log((trouble ? 'XX ' : 'ok ') + f.padEnd(34) + ('[' + spec.kind +
    (spec.kind === 'page' && spec.only ? ' ' + spec.only : '') + ']').padEnd(26)
    + (threw ? 'the page threw: ' + (probeValue || run.out).slice(0, 60)
      : nothing ? 'printed nothing — it proved nothing'
      : noPopulation && spec.kind === 'page'
        ? values.length + ' answers, none measured anything — ' + (probeValue || '').slice(0, 58)
        : head
          + ((values.length > 1 ? values.length + ' answers' + (refused ? ', ' + refused + ' refused' : '') + ' · ' : '')
          + (values.slice().sort((a, b) => b.length - a.length)[0] || line).replace(/^NO CONCLUSION[^\n]*/, 'refused'))
          .slice(0, 78) || '(no summary line)'));
  if (run.code !== 0 && !threw && !nothing) {
    console.log('     exit ' + run.code + ' · ' + (run.out.split(/\r?\n/).find(l => /Error/.test(l)) || '').slice(0, 90));
  }
}
console.log('─'.repeat(78));
console.log(probes.length + ' probes, ' + failed + ' needing attention'
  + (silent ? ' (' + silent + ' printed nothing at all)' : '')
  + (unmeasured ? ' (' + unmeasured + ' reached no population)' : '')
  + ' — ' + counted + ' of them report a findings count this runner reads'
  + (failed ? '' : ', and every instrument still answers its question'));
process.exit(failed ? 1 : 0);

/* Proves the P2 coherence sweep can fail: one rule for the figures a reader compares, and one scale
   token per spacing step.

   What the sweep removed: five `text-align:right` declarations scattered across a 1,600-line
   stylesheet — two in component rules (`.offer-line .ol-v`, `.chart-value`), one typed into a number
   input's inline style, two on markup blocks — and no numeral treatment anywhere. A receipt's money
   column and a fee table's were therefore aligned by different hands, and right alignment alone could
   not have made either of them line up, because Atkinson Hyperlegible Next paints proportional digits.

   The property was measured before it was claimed, in Chrome, on the face the app actually loads:
   "111111" is 78.16px against "000000" at 124.42px under `normal`, and both are 121.36px under
   `tabular-nums`. The face was identified by comparison, not by trust — `"Atkinson Next"` alone
   renders identically to the full stack and differently from Plus Jakarta Sans (90.06px), so the
   reading is of the shipped WOFF2 and not of a fallback (AGENTS.md §68).

   Seven breaks, each condemned by the check its own hazard names:
     1 the tabular property goes away → the shared-rule check refuses, because a rule that only
       right-aligns is the half-fix the measurement says is not enough;
     2 a component re-types its own alignment → the "exactly one" count refuses, which is the
       per-screen-override class returning;
     3 a markup block goes back to an inline style → the class check refuses;
     4 `.row > b` is dropped from the selector list → the shared-rule check refuses, because a rule
       that covers the charts but not the rows is a rule two thirds of the screens ignore;
     5 a scale step goes back to a literal → the token check refuses. No geometry tally can see this
       one, because the pixel is identical; only the count knows the token went unreached;
     6 a step is added to the scale and never asked for → the same check refuses, which is how a
       palette accumulates dead names one comfortable edit at a time;
     7 the named exception is deleted → the same check refuses, because an exception list that stops
       describing the file is the escape hatch this rule was written to avoid, not a clean pass.

   Every anchor is one line, because the page is checked out with CRLF and a needle carrying a bare \n
   matches nothing — the run would then report a healthy gate for a mutation that never landed.

     node tools/falsify-figures.cjs    ~4 minutes                                      */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

const SHARED = 'one stylesheet rule both aligns and tabulates the figures a reader compares';
const COUNT = 'no screen aligns its own numbers any more — one alignment and one numeral rule in the page';
const CLASS = 'the value blocks that typed their own alignment take the shared class';
const TOKENS = 'every :root token is reached, except the ones this file names and justifies';

const BREAKS = [
  { name: 'the tabular property is dropped, leaving right alignment alone to line up a column of proportional digits',
    check: SHARED,
    from: '    text-align:right; font-variant-numeric:tabular-nums;',
    to: '    text-align:right;' },
  { name: 'a component re-types its own alignment, so screens stop sharing the rule',
    check: COUNT,
    from: '  .chart-value{flex:0 0 auto; min-width:52px; font-size:var(--t-caption); color:var(--ink); font-weight:700;}',
    to: '  .chart-value{flex:0 0 auto; min-width:52px; text-align:right; font-size:var(--t-caption); color:var(--ink); font-weight:700;}' },
  { name: 'a value block goes back to an inline style instead of taking the class',
    check: CLASS,
    from: '          <div class="row-value" style="flex-shrink:0;">',
    to: '          <div style="text-align:right; flex-shrink:0;">' },
  { name: 'the rule stops covering the label-value rows, which is most of the money in the app',
    check: SHARED,
    from: '  .row > b, .row-value, .offer-line .ol-v,',
    to: '  .row-value, .offer-line .ol-v,' },
  /* The token half of the same sweep: a scale step that goes back to a literal is invisible to every
     geometry tally (the pixel is identical) and visible only to the count, which is why it is asserted
     here rather than left to `measure.cjs` and a human reading its output. */
  { name: 'a component re-types the 32px step, so the scale token goes unreached again',
    check: TOKENS,
    from: '    padding:var(--s-8) var(--s-3); min-height:100vh; min-height:100dvh;',
    to: '    padding:32px var(--s-3); min-height:100vh; min-height:100dvh;' },
  { name: 'a token is added to the scale and nothing ever asks for it',
    check: TOKENS,
    from: '    --s-5:20px; --s-6:24px; --s-7:28px; --s-8:32px;',
    to: '    --s-5:20px; --s-6:24px; --s-7:28px; --s-8:32px; --s-9:36px;' },
  { name: 'the named exception is deleted, so the exception list stops describing the file',
    check: TOKENS,
    from: '    --info:#0E4DFF;',
    to: '' },
];

function gateOutput() {
  let out = '';
  try {
    out = execFileSync(process.execPath, [path.join(ROOT, 'tools', 'verify.cjs')],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 420000 });
  } catch (err) { out = (err.stdout || '') + (err.stderr || ''); }
  return out;
}
function readCheck(out, name) {
  const line = out.split(/\r?\n/).find(l => l.indexOf(name) >= 0);
  if (!line) return { seen: false, failed: false, why: 'the check vanished from the output' };
  const t = line.trim();
  return { seen: true, failed: t.indexOf('FAIL') === 0, why: t.slice(0, 190) };
}

const CHECK_NAMES = [SHARED, COUNT, CLASS, TOKENS];
const out0 = gateOutput();
for (const name of CHECK_NAMES) {
  const r = readCheck(out0, name);
  if (!r.seen) { console.log('BROKEN  no gate check named "' + name + '"'); process.exit(1); }
  if (r.failed) { console.log('BROKEN  baseline already red: ' + r.why); process.exit(1); }
}
console.log('baseline: all ' + CHECK_NAMES.length + ' checks pass on the file as it stands');

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
    const r = readCheck(gateOutput(), b.check);
    if (!r.seen) console.log('MISSED  ' + b.name + '  (' + r.why + ')');
    else if (r.failed) { caught++; console.log('CAUGHT  ' + b.name + '  → ' + r.why); }
    else console.log('MISSED  ' + b.name + '  (the named check still passes)');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied; file restored.');
process.exit(applied > 0 && caught === applied && unmatched === 0 ? 0 : 1);

/* Proves the five visual contracts can fail. A check that cannot fail looks exactly like a check
   that passes, and a probe that has never been seen to refuse is decoration.

   Each break plants one defect into a COPY of the page (never the file the rest of the suite reads),
   runs tools/probe-visual-contract.js against the copy through shot.cjs --file=, and requires the
   tally it names to climb. The baseline run must be clean first, or a break that "passes" is only
   proving that the fixture was already broken.

     node tools/falsify-visual-contract.cjs
*/
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'Sukinnect-next.html');
const TMP = path.join(ROOT, '.scratch', 'falsify-visual-contract-copy.html');
const PRISTINE = fs.readFileSync(SRC, 'utf8');
/* The page is CRLF in this working copy and a needle written with \n matches nothing, which is how
   the first run of this family reported one break as SKIP while the rule it names was still being
   guarded — a stale-looking needle that was really the family's own newline assumption. */
const NL = PRISTINE.includes('\r\n') ? '\r\n' : '\n';
const nrm = s => s.split('\n').join(NL);

const BREAKS = [
  { label: 'entity text returns', only: 'resident-results',
    from: "'No provider matches “' + state.searchQuery + '”'",
    to: "'No provider matches &ldquo;' + state.searchQuery + '&rdquo;'",
    tally: 'entityText' },
  { label: 'a chip is allowed to wrap again', only: 'resident-bookings',
    from: 'white-space:nowrap; flex-shrink:0;\n  }\n  /* A chip you can tap is a control',
    to: 'white-space:normal; flex-shrink:1;\n  }\n  /* A chip you can tap is a control',
    tally: 'splitChips' },
  { label: 'a trade loses its glyph', only: 'resident-home',
    from: "{id:'plumbing',label:'Plumbing',short:'Plumbing',icon:'plumbing'}",
    to: "{id:'plumbing',label:'Plumbing',short:'Plumbing',icon:'glyph-nobody-draws'}",
    tally: 'undrawnTrades' },
  { label: 'the grid falls back below the fold', only: 'resident-home',
    from: '.catgrid{display:grid; grid-template-columns:repeat(4,1fr); gap:var(--s-2);}',
    to: '.catgrid{display:grid; grid-template-columns:repeat(4,1fr); gap:var(--s-2); margin-top:900px;}',
    tally: 'gridAboveFold' },
  { label: 'a pushed screen keeps the tab bar under its action bar', only: 'provider-detail',
    from: '#screen:not([data-root="1"]) + #navbar .bottomnav{ display:none; }',
    to: '#screen:not([data-root="1"]) + #navbar .bottomnav{ display:flex; }',
    tally: 'fixedBars' },
];

function runProbe(file, only) {
  const out = execFileSync(process.execPath,
    [path.join(ROOT, 'tools', 'shot.cjs'), '--file=' + file, '--probe=@tools/probe-visual-contract.js', '--only=' + only],
    { cwd: ROOT, encoding: 'utf8', timeout: 600000 });
  const m = out.match(/probe → (\{[\s\S]*?\})\s*\n/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch (e) { return null; }
}

function tallyOf(ans, key) {
  if (!ans) return null;
  const r = ans.report || {};
  if (key === 'gridAboveFold') return r.gridAboveFold === 1 ? 0 : 1;
  return typeof r[key] === 'number' ? r[key] : null;
}

let caught = 0, missed = 0, notApplied = 0, skipped = 0;
fs.writeFileSync(TMP, PRISTINE);
const base = runProbe(TMP, 'resident-home');
if (!base) { console.log('BROKEN — the probe answers nothing on the baseline; it cannot be judged'); process.exit(1); }
console.log('baseline resident-home:', 'findings=' + base.findings, 'entityText=' + tallyOf(base, 'entityText'),
  'splitChips=' + tallyOf(base, 'splitChips'), 'undrawn=' + tallyOf(base, 'undrawnTrades'),
  'gridAboveFold=' + tallyOf(base, 'gridAboveFold'));
if (base.findings !== 0) { console.log('BROKEN — the baseline is not clean, so a refusal proves nothing about the break'); process.exit(1); }

for (const b of BREAKS) {
  const FROM = nrm(b.from), TO = nrm(b.to);
  if (!PRISTINE.includes(FROM)) { console.log('SKIP  ' + b.label + ' — the needle no longer matches the file'); notApplied++; continue; }
  fs.writeFileSync(TMP, PRISTINE.split(FROM).join(TO));
  const ans = runProbe(TMP, b.only);
  const t = tallyOf(ans, b.tally);
  if (!ans || t === null) { console.log('QUIET ' + b.label + ' — the probe answered nothing for ' + b.only); missed++; continue; }
  if (t > 0 || (b.tally === 'fixedBars' && ans.report.fixedBars > 1)) {
    console.log('CAUGHT ' + b.label + ' → ' + b.tally + '=' + t + ' findings=' + ans.findings);
    caught++;
  } else {
    console.log('MISSED ' + b.label + ' → ' + b.tally + '=' + t + ' (expected a climb) findings=' + ans.findings);
    missed++;
  }
}
fs.writeFileSync(TMP, PRISTINE);
console.log('falsify-visual-contract → ' + caught + ' of ' + BREAKS.length +
  ' breaks caught, ' + missed + ' missed, ' + notApplied + ' not applied, ' + skipped + ' skipped');
/* The aggregate parses a summary anchored at line start; a verdict only this family's own name
   can read is a verdict the suite reports as unproven. */
console.log(caught + ' of ' + BREAKS.length + ' breaks caught, ' + notApplied + ' not applied');
fs.unlinkSync(TMP);
process.exit(missed + notApplied > 0 ? 1 : 0);

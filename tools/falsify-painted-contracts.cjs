/* Proves the three painted-page probes added by the mobile-app pass can actually fail, and that each
   one REFUSES rather than reporting a clean zero when its own subject is missing.

     node tools/falsify-painted-contracts.cjs    ~5 minutes, drives Chrome

   The probes ask questions a source grep cannot: what the computed style paints (the flat-palette
   ruling), what the pixels say about one job's state (the step-word class), and how many primary
   actions a screen offers. Each break plants the defect the probe names and requires `findings` to
   climb. The refusal breaks go the other way: they take the probe's own subject away and require it
   to answer NO CONCLUSION rather than 0, because a clean row from an instrument that measured
   nothing is the failure mode this repository has written down more than any other.

   A refusal break edits the PROBE, not the page — which is why this family restores two files and
   says so. `falsify-all.cjs` watches `git status` over tools/ for exactly this hazard and reports a
   tool left mutated; here the finally block puts it back and the last line proves it.

   The population is deliberately narrow (three screens) so the run costs minutes rather than an
   hour; the full 101-screen pass is what `probe-all.cjs` does. */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PAGE = path.join(ROOT, 'Sukinnect-next.html');
const pageOriginal = fs.readFileSync(PAGE, 'utf8');
const EOL = pageOriginal.indexOf('\r\n') >= 0 ? '\r\n' : '\n';

const PROBE_FLAT = 'tools/probe-flat-palette.js';
const PROBE_WORDS = 'tools/probe-step-words-agree.js';
const PROBE_ACTION = 'tools/probe-action-duplication.js';
const probeOriginals = {};
[PROBE_FLAT, PROBE_WORDS, PROBE_ACTION].forEach(p => { probeOriginals[p] = fs.readFileSync(path.join(ROOT, p), 'utf8'); });

const ONLY = 'provider-job,provider-job-path,booking-tracking,resident-home,admin-dash';
const POPULATION = ONLY.split(',').length;

function runProbe(probeFile) {
  let out = '';
  try {
    out = execFileSync(process.execPath,
      [path.join(ROOT, 'tools', 'shot.cjs'), '--probe=@' + probeFile, '--only=' + ONLY],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) { out = (err.stdout || '') + (err.stderr || ''); }
  const answers = out.split(/\r?\n/).filter(l => l.indexOf('probe →') >= 0);
  const findings = answers.reduce((n, l) => { const m = /"findings":(\d+)/.exec(l); return n + (m ? Number(m[1]) : 0); }, 0);
  const refusals = answers.filter(l => l.indexOf('NO CONCLUSION') >= 0).length;
  const scored = answers.filter(l => /"scored":1/.test(l)).length;
  return { answers: answers.length, findings, refusals, scored, raw: out.slice(0, 400) };
}

function countIn(text, needle) { return text.split(needle).length - 1; }

const BREAKS = [
  { name: 'a card paints a linear gradient',
    file: PAGE, probe: PROBE_FLAT, expect: 'findings',
    from: '.card{' + EOL + '    background:var(--md-sys-color-surface);',
    to: '.card{' + EOL + '    background:var(--md-sys-color-surface); background-image:linear-gradient(#0352AE, #0E4DFF);' },
  { name: 'the flat-palette probe loses the screen it reads',
    file: path.join(ROOT, PROBE_FLAT), probe: PROBE_FLAT, expect: 'refusals',
    from: "  const screen = document.getElementById('screen');",
    to: "  const screen = document.getElementById('no-such-surface');" },
  { name: 'the step line names the job differently from the stepper',
    file: PAGE, probe: PROBE_WORDS, expect: 'findings',
    from: '      <div class="stext"><div class="slabel">${esc(label(code))}</div>',
    to: '      <div class="stext"><div class="slabel">${code === \'ongoing\' ? esc(\'Working now\') : esc(label(code))}</div>' },
  { name: 'the step-word probe loses the vocabulary it compares against',
    file: path.join(ROOT, PROBE_WORDS), probe: PROBE_WORDS, expect: 'refusals',
    from: "  if (typeof label !== 'function' || typeof BOOKING_STATES === 'undefined') {",
    to: "  if (typeof BOOKING_STATES !== 'undefined') {" },
  { name: 'the job screen offers its moves twice',
    file: PAGE, probe: PROBE_ACTION, expect: 'findings',
    from: "  const moves = answerAbove ? allMoves.filter(m => m.kind === 'note') : allMoves;",
    to: '  const moves = allMoves;' },
  { name: 'the action probe stops recognising the path it scores',
    file: path.join(ROOT, PROBE_ACTION), probe: PROBE_ACTION, expect: 'scored',
    from: "  const paintsAPath = !!screen.querySelector('.stepper, .step-line, .mini-steps');",
    to: "  const paintsAPath = !!screen.querySelector('.no-such-path-marker');" },
];

const baseline = {};
[PROBE_FLAT, PROBE_WORDS, PROBE_ACTION].forEach(p => { baseline[p] = runProbe(p); });
console.log('baseline: ' + [PROBE_FLAT, PROBE_WORDS, PROBE_ACTION]
  .map(k => k.replace('tools/probe-', '').replace('.js', '') + ' answers=' + baseline[k].answers +
    ' findings=' + baseline[k].findings + ' refusals=' + baseline[k].refusals + ' scored=' + baseline[k].scored).join(' | '));
if ([PROBE_FLAT, PROBE_WORDS, PROBE_ACTION].some(k => baseline[k].answers !== POPULATION)) {
  console.log('the walk did not answer on all ' + POPULATION + ' screens — the instrument is not reaching its population');
  process.exit(1);
}
if ([PROBE_FLAT, PROBE_WORDS, PROBE_ACTION].some(k => baseline[k].findings !== 0)) {
  console.log('a probe already reports findings before any break');
  process.exit(1);
}
if (baseline[PROBE_ACTION].scored === 0) {
  console.log('the action probe scores no screen at baseline, so its zero means nothing');
  process.exit(1);
}

let caught = 0, applied = 0, unmatched = 0;
function restoreAll() {
  fs.writeFileSync(PAGE, pageOriginal);
  Object.keys(probeOriginals).forEach(p => fs.writeFileSync(path.join(ROOT, p), probeOriginals[p]));
}

try {
  for (const b of BREAKS) {
    const target = b.file === PAGE ? pageOriginal : probeOriginals[b.probe];
    const hits = countIn(target, b.from);
    if (hits !== 1) { unmatched++; console.log('SKIP  ' + b.name + '  (anchor matched ' + hits + ' times, needs exactly 1)'); continue; }
    applied++;
    restoreAll();
    fs.writeFileSync(b.file, target.replace(b.from, b.to));
    const r = runProbe(b.probe);
    restoreAll();
    if (r.answers === 0) { console.log('MISSED  ' + b.name + '  (no answer printed; camera said: ' + r.raw.replace(/\s+/g, ' ').slice(0, 120) + ')'); continue; }
    if (b.expect === 'findings') {
      if (r.findings > 0) { caught++; console.log('CAUGHT  ' + b.name + '  → findings=' + r.findings); }
      else console.log('MISSED  ' + b.name + '  (findings stayed 0 over ' + r.answers + ' answers)');
    } else if (b.expect === 'refusals') {
      if (r.refusals > 0) { caught++; console.log('CAUGHT  ' + b.name + '  → refusals=' + r.refusals); }
      else console.log('MISSED  ' + b.name + '  (answered ' + r.answers + ' times with no refusal, so a blind read looked clean)');
    } else {
      if (r.scored === 0 && r.findings === 0) { caught++; console.log('CAUGHT  ' + b.name + '  → nothing scored, so nothing was condemned'); }
      else console.log('MISSED  ' + b.name + '  (still scored ' + r.scored + ' screens)');
    }
  }
} finally {
  restoreAll();
}
const pageBack = fs.readFileSync(PAGE, 'utf8') === pageOriginal;
const probesBack = Object.keys(probeOriginals).every(p => fs.readFileSync(path.join(ROOT, p), 'utf8') === probeOriginals[p]);
console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied; page restored: ' + pageBack + ', probes restored: ' + probesBack);
process.exit(applied > 0 && caught === applied && unmatched === 0 && pageBack && probesBack ? 0 : 1);

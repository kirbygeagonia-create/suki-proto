/* Proves that `probe-all` refuses a probe whose population is empty, and refuses to refuse a probe
   that measured somewhere.

   Why this exists: the runner judged a page probe by its FIRST `probe →` line, and the camera
   evaluates a probe once per screen, so the first line belongs to whatever the walk happens to start
   with — the sign-in page. Two instruments died there silently. `probe-nav-fit.js` printed "no bottom
   nav painted", which is true of the sign-in screen and of nothing else: measured across the walk it
   answered on 72 screens and 69 hold a nav (that day’s walk; it is longer now). `probe-chart-axis-coverage.js` printed `charts:[]`, so
   the question it was written to ask — does a chart's axis name its tallest bar — went unasked while
   the pass reported the probe clean; the real answer, once pinned to the two screens that actually
   hold a `.chart-cols`, is that `provider-dash` names its tallest bar and `admin-dash` does not. And
   `probe-money-typing.js` answered `offer-unit ABSENT` because its own header named the resident's
   fruit sheet while the field belongs to the provider's offer sheet.

   So the family plants five probes and asserts them in both directions, then breaks each rule and
   requires the pair to flip. Two groups, one per half of the runner's contract:

   Rules about WHETHER an instrument answered:
     · the runner reads EVERY answer, not the first;
     · a refusal (`NO CONCLUSION`) condemns a probe only when every answer refused;
     · one refusal among many is the subject genuinely not existing on one screen, and flagging that
       would teach the next author to stop declaring refusals at all.

   Rules about WHAT the answer said — added 2026-10-23, because `ok … findings:1` was printed for a
   whole pass and nothing in the suite read the number it was already carrying:
     · a page probe that counts defects names its number `findings`, and a positive one is flagged;
     · a leg the probe could not complete is named `instrumentRows` and is flagged too, separately;
     · a probe that reports neither key is NOT condemned for it — the boundary the third break below
       crosses on purpose to show the rule stops where the convention stops.

   The planted files go into `tools/` because that is the directory the runner globs; they are deleted
   in the `finally`, and the family fails loudly if either the restore or the deletion did not happen.
   Nothing here touches the application file, so this family does not take the `falsify-all` mutex —
   but it does drive Chrome, so run it alone.

     node tools/falsify-probe-population.cjs    ~5 minutes, needs the machine's Chrome             */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const RUNNER = path.join(ROOT, 'tools', 'probe-all.cjs');
const PRISTINE = fs.readFileSync(RUNNER, 'utf8');
if (PRISTINE.indexOf('NO CONCLUSION') === -1) {
  throw new Error('the runner has no refusal rule to test — this family is checking a rule that is not there');
}

/* A probe that never reaches its subject. Its header documents one screen, so one answer comes back,
   and that answer is a refusal: the exact shape of `offer-unit ABSENT` before it was made a sentinel. */
const REFUSE = 'probe-plant-refuse.js';
const REFUSE_SRC = `/* One expression the camera evaluates inside a real page:
   node tools/shot.cjs --probe=@tools/${REFUSE} --only=resident-home
   Planted by tools/falsify-probe-population.cjs. Deliberately measures nothing. */
(() => 'NO CONCLUSION — planted probe with no population')()\n`;

/* A probe that refuses on the first screen and measures on the second. This is the case a naive
   "any refusal fails" rule would wrongly condemn, and the case a first-answer-only reader would
   wrongly condemn too. */
const MIXED = 'probe-plant-mixed.js';
const MIXED_SRC = `/* One expression the camera evaluates inside a real page:
   node tools/shot.cjs --probe=@tools/${MIXED} --only=resident-home,provider-dash
   Planted by tools/falsify-probe-population.cjs. Refuses on one screen, measures on the next. */
(() => (typeof state !== 'undefined' && state.tab === 'home')
  ? 'NO CONCLUSION — planted refusal on this screen'
  : JSON.stringify({ charts: 2, rows: 8, tallestBarNamed: true }))()\n`;

function write(p, s) { fs.writeFileSync(path.join(ROOT, 'tools', p), s); }
function wipe(p) { const f = path.join(ROOT, 'tools', p); if (fs.existsSync(f)) fs.unlinkSync(f); }

/* Two more planted probes for the SECOND half of the runner's contract: the defect count.
   FIND1 counts one finding on every screen it reaches, so the unmutated runner has to flag it — a
   `findings` number inside an `ok` line is the exact shape `probe-whitespace.js` shipped with.
   FIND0 counts nothing but reports one instrument row, a leg the probe could not complete. That is
   also not clean, and it must not be reported with the same word as an application defect. */
const FIND1 = 'probe-plant-findings.js';
const FIND1_SRC = `/* One expression the camera evaluates inside a real page:
   node tools/shot.cjs --probe=@tools/${FIND1} --only=resident-home
   Planted by tools/falsify-probe-population.cjs. Counts a defect and says so in the agreed key. */
(() => JSON.stringify({ screen: 'resident-home', findings: 1, report: ['planted: a figure that does not add up'] }))()\n`;

const FIND0 = 'probe-plant-blind.js';
const FIND0_SRC = `/* One expression the camera evaluates inside a real page:
   node tools/shot.cjs --probe=@tools/${FIND0} --only=resident-home
   Planted by tools/falsify-probe-population.cjs. App-clean, but one leg never reached its control. */
(() => JSON.stringify({ screen: 'resident-home', findings: 0, instrumentRows: 1, report: ['planted: NO CONTROL FOUND'] }))()\n`;

const NO_COUNT = 'probe-plant-nocount.js';
const NO_COUNT_SRC = `/* One expression the camera evaluates inside a real page:
   node tools/shot.cjs --probe=@tools/${NO_COUNT} --only=resident-home
   Planted by tools/falsify-probe-population.cjs. Answers a question with no defect key at all, which
   is most of the suite: the boundary the count rule must NOT cross. */
(() => JSON.stringify({ screen: 'resident-home', charts: 2, rows: 8 }))()\n`;

/* Run the runner over one planted probe. The exit code is the verdict: 0 means every instrument
   answered, 1 means it flagged something — and the flagged line has to name the planted probe, since
   "non-zero" alone could be any other failure. While a break is in place the runner on disk IS the
   mutant, so this execs the same path in both cases. */
function judge(filter) {
  let out = '', code = 0;
  try {
    out = execFileSync(process.execPath, [path.join(ROOT, 'tools', 'probe-all.cjs'), filter],
      { encoding: 'utf8', cwd: ROOT, maxBuffer: 64 * 1024 * 1024, timeout: 420000 });
  } catch (err) { out = (err.stdout || '') + (err.stderr || ''); code = err.status === undefined ? -1 : err.status; }
  const row = out.split(/\r?\n/).find(l => /^(ok|XX) probe-plant/.test(l)) || '';
  return { code: code || 0, flagged: /^\s*XX/.test(row), row: row.trim().slice(0, 100),
    counted: (out.match(/— (\d+) of them report/) || [])[1] || null, out: out };
}

/* One mutation, asserted to land before its verdict is believed. */
function plant(from, to) {
  const n = PRISTINE.split(from).length - 1;
  if (n !== 1) return { ok: false, why: 'anchor matched ' + n + ' times' };
  const next = PRISTINE.replace(from, to);
  if (next === PRISTINE) return { ok: false, why: 'the mutant equals the source' };
  fs.writeFileSync(RUNNER, next);
  return { ok: true };
}
function restore() { fs.writeFileSync(RUNNER, PRISTINE); }

const RULE_DROP = `  const noPopulation = spec.kind === 'page' ? (values.length === 0 || answered === 0)
    : (line.indexOf('NO CONCLUSION') > -1);`;
const RULE_ANY = `  const noPopulation = spec.kind === 'page' ? (values.length === 0 || refused > 0)
    : (line.indexOf('NO CONCLUSION') > -1);`;
const READ_FIRST = `  const values = (run.out.match(/probe → (\\S[^\\n]*)/g) || []).map(s => s.replace(/^probe → /, ''));`;
/* The count rule, in three pieces, so each half can be taken out alone. */
const COUNT_BOTH = `    || findings > 0 || instrumentRows > 0;`;
const COUNT_FINDINGS_ONLY = `    || findings > 0;`;
const COUNT_NONE = `    || false;`;
const SUM_LINE = `  const findings = sum('findings');`;

const BREAKS = [
  { name: 'the refusal rule is deleted, so an empty population reads clean',
    from: RULE_DROP, to: RULE_ANY.replace('refused > 0', 'false'),
    filter: 'plant-refuse', expect: 'flagged' },
  { name: 'any refusal condemns, so an honest one-screen gap is a finding',
    from: RULE_DROP, to: RULE_ANY,
    filter: 'plant-mixed', expect: 'clean' },
  { name: 'only the first answer is read, which is the screen the walk started on',
    from: READ_FIRST,
    to: `  const firstOnly = run.out.match(/probe → (\\S[^\\n]*)/);
  const values = firstOnly ? [firstOnly[1]] : [];`,
    filter: 'plant-mixed', expect: 'clean' },
  { name: 'the findings term is gone, so a probe that counted a defect still prints ok',
    from: COUNT_BOTH, to: COUNT_NONE,
    filter: 'plant-findings', expect: 'flagged' },
  { name: 'the instrument-row term is gone, so a leg that never reached its control reads clean',
    from: COUNT_BOTH, to: COUNT_FINDINGS_ONLY,
    filter: 'plant-blind', expect: 'flagged' },
  { name: 'a missing count is read as one, so a probe that reports no counts is condemned for it',
    from: SUM_LINE, to: `  const findings = Math.max(1, sum('findings'));`,
    filter: 'plant-nocount', expect: 'clean' },
];

let applied = 0, caught = 0, missed = 0, notPlanted = 0;
const PLANTS = [[REFUSE, REFUSE_SRC], [MIXED, MIXED_SRC], [FIND1, FIND1_SRC], [FIND0, FIND0_SRC], [NO_COUNT, NO_COUNT_SRC]];
try {
  PLANTS.forEach(([n, s]) => write(n, s));

  /* Positive controls first, in the unmutated runner: if the always-refusing probe is not flagged and
     the mixed probe is not clean HERE, the two breaks below measure nothing. Same argument for the
     three count controls: a planted defect must already be flagged, a planted blind leg must already be
     flagged, and a probe that reports no counts at all must already be clean. */
  const controls = [
    ['plant-refuse', 'flagged', 'the probe that never measures'],
    ['plant-mixed', 'clean', 'the probe that measures once'],
    ['plant-findings', 'flagged', 'the probe that counts a defect'],
    ['plant-blind', 'flagged', 'the probe that reports an unfinished leg'],
    ['plant-nocount', 'clean', 'the probe that reports no counts at all'],
  ];
  let blocked = null;
  for (const [filter, want, label] of controls) {
    const r = judge(filter);
    const got = r.flagged ? 'flagged' : 'clean';
    console.log('control  ' + label.padEnd(40) + got + '  ' + r.row.slice(0, 72));
    if (got !== want && !blocked) blocked = label + ' read ' + got + ' where the contract needs ' + want;
    if (filter === 'plant-findings' && r.counted !== null && Number(r.counted) === 0) {
      if (!blocked) blocked = 'the runner printed a findings-count total of zero while a planted probe reported findings';
    }
  }
  if (blocked) {
    console.log('ABORT — ' + blocked + '; nothing below this line is a test.');
    process.exitCode = 1;
  } else {
    for (const b of BREAKS) {
      const p = plant(b.from, b.to);
      if (!p.ok) { notPlanted++; console.log('NOT PLANTED  ' + b.name + '  (' + p.why + ')'); continue; }
      applied++;
      const r = judge(b.filter);
      /* The break is caught when the rule's absence flips the verdict the control established. */
      const flipped = b.expect === 'flagged' ? !r.flagged : r.flagged;
      if (flipped) { caught++; console.log('CAUGHT   ' + b.name + '\n         → ' + r.row.slice(0, 92)); }
      else { missed++; console.log('MISSED   ' + b.name + '  (verdict stayed ' + (r.flagged ? 'flagged' : 'clean') + ')'); }
      restore();
    }
    console.log('─'.repeat(78));
    /* The vocabulary is the runner's contract, not a style: `falsify-all.cjs` reads camera families as
       "N of M breaks caught, K not applied" and reports anything it cannot parse as UNPROVEN rather
       than as zero. This family printed "3 breaks applied, 3 caught" first and duly appeared as
       `0 0 0 0 <<< printed no summary — nothing was proven`, which is the runner working correctly
       and the family speaking the wrong dialect. */
    console.log(caught + ' of ' + applied + ' breaks caught, ' + notPlanted + ' not applied, '
      + missed + ' missed');
    process.exitCode = caught === applied && applied === BREAKS.length && notPlanted === 0 && missed === 0 ? 0 : 1;
  }
} finally {
  restore();
  PLANTS.forEach(([n]) => wipe(n));
  const left = PLANTS.map(([n]) => n).filter(f => fs.existsSync(path.join(ROOT, 'tools', f)));
  const back = fs.readFileSync(RUNNER, 'utf8') === PRISTINE;
  console.log('cleanup  runner restored: ' + back + ' · planted probes removed: ' + (left.length === 0
    ? 'yes' : 'NO — ' + left.join(', ')));
  if (!back || left.length) process.exitCode = 1;
}

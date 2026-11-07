/* Proves the ranking checks watch the computation rather than the words the fix added.

   Before slice S2a nothing in tools/ referenced smartMatch: eight typed scores, a header claiming an
   ordering the code never performed, and four hand-written reasons per provider naming facts no
   record holds ("Average response time under 20 mins", "300+ completed local parcel trips"). A claim
   nobody checks is the one that survives longest, so the breaks here are the specific ways that claim
   comes back:

     · a typed number in the chip while the kernel still computes one — the defect in its original
       form, and the reason two of the checks read the painted card rather than the returned object;
     · the sort removed, so the list is filtered and called ranked;
     · a weight table that no longer sums, which renormalises silently;
     · the rating prior withdrawn, so one 5.0 outranks two hundred 4.6s;
     · a signal with no record scored zero instead of leaving the denominator, which punishes a
       provider for this device having no history of them;
     · the method label replaced by the old magic name;
     · sentences in the fold that no signal produced, with the summary still counting the real ones;
     · the thin-score disclosure removed;
     · the reason floor removed, so a weakness is printed as a strength.

   Two breaks are judged by a verdict that must go red, and the family refuses to credit a crash: if
   the suite dies before printing the named label, the mutant condemned nothing about that check.

     node tools/falsify-matching.cjs                                                      */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

const REASON_DIV = '<div><span style="color:var(--success-ink); display:inline-flex; vertical-align:-2px;">';
const REASONS_LINE = '            ${m.reasons.map(r => `' + REASON_DIV + '${ic("check",12)}</span> ${esc(r)}</div>`).join(\'\')}';
const THIN_LINE = '            ${m.scoredOn < MATCH_SIGNALS.length ? `<div class="mut">Ranked on ${m.scoredOn} of the ${MATCH_SIGNALS.length} signals this build knows. The rest have no record for this provider on this device, so a thin score is a rule with little to go on, not a prediction of how your job will go.</div>` : \'\'}';

const MUTANTS = [
  { name: 'the chip prints a typed number while the kernel still computes one',
    needle: '${m.score} rule score',
    to: '${96} rule score',
    label: 'every card prints the score its own record produced' },

  { name: 'the list is filtered and called ranked',
    needle: '  return matched.sort((a, b) => (scoreOf.get(b.id) - scoreOf.get(a.id)) || a.name.localeCompare(b.name));',
    to: '  return matched;',
    label: 'the order is the score order, and every reason came from a signal' },

  { name: 'a weight is changed without the table still summing',
    needle: '    categoryFit: 0.28, areaServed: 0.20, distance: 0.12, availability: 0.14,',
    to: '    categoryFit: 0.48, areaServed: 0.20, distance: 0.12, availability: 0.14,',
    label: 'the weight table names every signal and adds to one' },

  { name: 'the rating prior is withdrawn',
    needle: '  const weight = Number(CONFIG.matchRatingPriorWeight);',
    to: '  const weight = 0;',
    label: 'one five-star rating does not outrank two hundred good ones' },

  { name: 'a provider with no history is scored zero for it',
    needle: '  if (closed > 0) {',
    to: '  if (true) {',
    label: 'a signal with no record leaves the denominator instead of scoring zero' },

  { name: 'the header goes back to naming a magic sort',
    needle: 'Ranked by a <b style="color:var(--ink);">rule-based score</b> from records on this device',
    to: 'Sorted by: <b style="color:var(--ink);">Smart Job Match</b>',
    label: 'the screen names the method instead of a magic name' },

  { name: 'the fold prints sentences no signal produced',
    needle: REASONS_LINE,
    to: '            ${[\'Available now (arrives in ~15 mins)\', \'Experienced with urgent pipe leaks\'].map(r => `' + REASON_DIV + '${ic("check",12)}</span> ${esc(r)}</div>`).join(\'\')}',
    label: 'and every sentence in its fold was one of the signals it was given' },

  { name: 'a thin score stops saying how thin it is',
    needle: THIN_LINE,
    to: '',
    label: 'a thin score says how many signals stood behind it' },

  { name: 'a weak signal is printed as a strength',
    needle: 'reason: clamped >= floor ? reason : null',
    to: 'reason: reason',
    label: 'the order is the score order, and every reason came from a signal' }
];

function gateOutput() {
  try {
    return { code: 0, out: execFileSync(process.execPath, [path.join(ROOT, 'tools', 'verify.cjs')],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (err) {
    return { code: err.status === undefined ? -1 : err.status,
      out: (err.stdout || '') + (err.stderr || '') };
  }
}

let caught = 0, applied = 0, unmatched = 0, crashed = 0;
try {
  for (const m of MUTANTS) {
    const hits = original.split(m.needle).length - 1;
    if (hits !== 1) {
      unmatched++;
      console.log('SKIP  ' + m.name + '  (needle matched ' + hits + ' times, needs exactly 1)');
      continue;
    }
    if (m.needle === m.to) {
      unmatched++;
      console.log('SKIP  ' + m.name + '  (the replacement is the needle: nothing would change)');
      continue;
    }
    applied++;
    fs.writeFileSync(TARGET, original.replace(m.needle, m.to));
    const run = gateOutput();
    if (run.code === -1) {
      crashed++;
      console.log('MISSED  ' + m.name + '  (the gate did not run: ' + run.out.split('\n')[0] + ')');
      continue;
    }
    const failed = run.code !== 0 && run.out.indexOf('FAIL  ' + m.label) >= 0;
    if (failed) { caught++; console.log('CAUGHT  ' + m.name); }
    else {
      const first = run.out.split('\n').find(l => l.indexOf('FAIL  ') === 0) || 'no FAIL line at all';
      console.log('MISSED  ' + m.name + '  (exit ' + run.code + '; nearest verdict: ' + first.trim() + ')');
    }
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' mutants caught, ' + unmatched + ' not applied, '
  + crashed + ' gate failures; file restored.');
process.exit(applied > 0 && caught === applied && unmatched === 0 && crashed === 0 ? 0 : 1);

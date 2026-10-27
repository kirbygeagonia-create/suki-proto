/* Proves the scroll gate on the sign-up acceptance can fail, one break per promise.

   The ruling (owner, 2026-10-27): "there should be a terms and conditions and privacy Policy, and the
   both will not enable the acceptance if did not scroll down to the bottom of these two." A box that is
   merely `disabled` is a picture — a script can still tick it — so the rule lives in `submitAuth`, and
   the family has to prove both halves separately: what the card paints, and what the handler refuses.

   Eight breaks, each aimed at one named check:
     A  the handler stops refusing an unread register   -> 'a register nobody has read is refused…'
     B  any scroll counts as reading it                 -> 'opening a document is not reading it…'
     C  the painted box never carries `disabled`        -> 'an unread register paints the box off…'
     D  the gate drops the notice it does not accept    -> 'the gate holds every document the card links…'
     E  the mount-time measurement is unreferenced      -> 'no function is defined that nothing references'
     F  the record writes rows for two of three docs    -> 'the acceptance record carries one row per…'
     G  the sheet foot goes back to one flex row        -> 'the document sheet foot stacks its line…'
     H  a document stops declaring how it is consented  -> 'every legal document declares whether…'

   B and C are the two this repository would otherwise have shipped: a check that only ever runs the
   happy path cannot see a gate that unlocks on the first scroll, and a check that only reads the state
   cannot see a card that paints the box on while the handler still refuses. G is the defect a
   screenshot caught and no tally did — a Close button painted one letter per line, which is not
   clipped, does not collide, is on the scale and clears contrast.

     node tools/falsify-scroll-gate.cjs    ~9 minutes                                                 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'Sukinnect-next.html');
const GATE = path.join(ROOT, 'tools', 'verify.cjs');
const PRISTINE = fs.readFileSync(APP, 'utf8');

/* The app file is CRLF; a needle written with \n matches nothing and the run reports a clean gate for a
   mutation that never landed. */
function crlf(s) { return s.replace(/\n/g, '\r\n'); }

const REFUSE = '  if (isRegister && !acceptanceUnlocked()) {';
const AT_END = '  if (!(short || atEnd)) return;';
/* Written in single quotes on purpose. A needle that carries `${` cannot be a template literal in this
   file: Node would interpolate it here, and the family died on load the first time — the same trap this
   repository records for a regex built inside a template literal, arriving one shape over. */
const DISABLED = '${acceptanceUnlocked() ? \'\' : \'disabled aria-disabled="true"\'}';
const GATE_IDS = '  return LEGAL_DOCUMENTS.map(d => d.id);';
const MOUNT_CALL = '  noteUnscrollableDocs();';
const RECORD_LOOP = '      LEGAL_DOCUMENTS.forEach(d => mine.push({ role: state.role, doc: d.id, version: LEGAL_VERSION, at }));';
const FOOT_TAG = '<div class="sheet-foot" style="flex-direction:column; align-items:stretch;">';
const KIND = "consent: 'read',";

[REFUSE, AT_END, DISABLED, GATE_IDS, MOUNT_CALL, RECORD_LOOP, FOOT_TAG, KIND].forEach(n => {
  if (PRISTINE.indexOf(crlf(n)) < 0) {
    throw new Error('pre-flight: a needle is not in the file — the gate or this family moved:\n  ' + n);
  }
});

function runGate() {
  let out = '';
  try { out = execFileSync(process.execPath, [GATE], { encoding: 'utf8', cwd: ROOT, maxBuffer: 64 * 1024 * 1024, timeout: 420000 }); }
  catch (err) { out = (err.stdout || '') + (err.stderr || ''); }
  return out;
}
function failures(out) {
  return out.split(/\r?\n/).filter(l => /^FAIL\b/.test(l)).map(l => l.replace(/^FAIL\s+/, ''));
}
function died(out, label, also) {
  return failures(out).some(f => f.indexOf(label) === 0 && (!also || f.indexOf(also) > -1));
}

const CHECK_REFUSE = 'a register nobody has read is refused before the box is even asked about, and writes nothing';
const CHECK_HALF = 'opening a document is not reading it: half-way geometry unlocks nothing';
const CHECK_PAINT = 'an unread register paints the box off and says what would turn it on';
const CHECK_ROW = 'the gate holds every document the card links, including the one that is only read';
const CHECK_DEAD = 'no function is defined that nothing references';
const CHECK_RECORD = 'the acceptance record carries one row per document the gate holds';
const CHECK_FOOT = 'the document sheet foot stacks its line above its button, so neither crushes the other';
const CHECK_KIND = 'every legal document declares whether the reader accepts it or has merely read it';

const BREAKS = [
  { name: 'the handler stops refusing a register whose documents were never read',
    from: REFUSE, to: '  if (isRegister && false && !acceptanceUnlocked()) {', expect: CHECK_REFUSE, detail: null },
  { name: 'any scroll at all counts as reading, so opening is agreeing',
    from: AT_END, to: '  if (false) return;', expect: CHECK_HALF, detail: null },
  { name: 'the painted box never carries disabled, whatever the state says',
    from: DISABLED, to: '', expect: CHECK_PAINT, detail: null },
  { name: 'the gate covers only the documents the reader accepts, not the notice',
    from: GATE_IDS, to: "  return LEGAL_DOCUMENTS.filter(d => d.consent !== 'read').map(d => d.id);",
    expect: CHECK_ROW, detail: null },
  { name: 'the mount-time measurement is never called, so a short document locks the reader out',
    from: MOUNT_CALL, to: '  void 0;', expect: CHECK_DEAD, detail: 'noteUnscrollableDocs' },
  { name: 'the record writes two rows while the gate holds three',
    from: RECORD_LOOP, to: "      mine.push({ role: state.role, doc: 'terms', version: LEGAL_VERSION, at });",
    expect: CHECK_RECORD, detail: null },
  { name: 'the sheet foot is one flex row again, which is the Close button crushed to one letter',
    from: FOOT_TAG, to: '<div class="sheet-foot">', expect: CHECK_FOOT, detail: null },
  { name: 'a document stops declaring how it is consented to, and reads as an agreement',
    from: KIND, to: '', expect: CHECK_KIND, detail: null },
];

let applied = 0, caught = 0, missed = 0, notPlanted = 0;
try {
  const base = runGate();
  const baseFails = failures(base);
  const total = (/all (\d+) checks passed/.exec(base) || [, ''])[1];
  console.log('control  unmutated gate: ' + (total ? total + ' checks passed' : 'no clean total')
    + (baseFails.length ? ' — already FAILING: ' + baseFails.join(' / ').slice(0, 80) : ''));
  if (baseFails.length || !total) { console.log('ABORT — a check that is already red proves nothing. NO CONCLUSION.'); process.exitCode = 1; }
  else {
    for (const b of BREAKS) {
      const src = fs.readFileSync(APP, 'utf8');
      const n = src.split(crlf(b.from)).length - 1;
      if (n !== 1) { notPlanted++; console.log('NOT PLANTED  ' + b.name + '  (anchor matched ' + n + ')'); continue; }
      const next = src.replace(crlf(b.from), crlf(b.to));
      if (next === src) { notPlanted++; console.log('NOT PLANTED  ' + b.name + '  (mutant equals source)'); continue; }
      fs.writeFileSync(APP, next);
      if (fs.readFileSync(APP, 'utf8') !== next) { notPlanted++; console.log('NOT PLANTED  ' + b.name + '  (write did not land)'); continue; }
      applied++;
      const out = runGate();
      if (died(out, b.expect, b.detail)) {
        caught++;
        console.log('CAUGHT   ' + b.name + '\n         -> ' + failures(out).find(f => f.indexOf(b.expect) === 0).slice(0, 96));
      } else {
        missed++;
        console.log('MISSED   ' + b.name + '  (wanted a red "' + b.expect + '"'
          + (b.detail ? ' naming ' + b.detail : '') + '; FAILs: ' + (failures(out).join(' / ') || 'none').slice(0, 70) + ')');
      }
      fs.writeFileSync(APP, PRISTINE);
    }
    console.log('─'.repeat(78));
    console.log(caught + ' of ' + applied + ' breaks caught, ' + notPlanted + ' not applied, ' + missed + ' missed');
    process.exitCode = (caught === applied && applied === BREAKS.length && notPlanted === 0) ? 0 : 1;
  }
} finally {
  fs.writeFileSync(APP, PRISTINE);
  const back = fs.readFileSync(APP, 'utf8') === PRISTINE;
  console.log('cleanup  app restored: ' + back);
  if (!back) process.exitCode = 1;
}

/* Proves the floating concierge door on Home can fail, one break per promise.

   The ruling (owner, 2026-10-27): "The AI in the Home page will be changed in design, instead of module
   there will be a chatbot at the bottom right." A design change of that sentence is three separate facts
   — the module is gone, the new control is a door to the real screen, and the dock that pins it there
   does not steal the screen underneath — and each is a different way for the build to look right and be
   wrong. The camera row `concierge-from-fab` clicks the painted control for real; this family proves the
   gate checks that watch the rest can go red.

     A  the dock is not painted at all            -> 'Home carries one floating concierge control…'
     B  a second control is painted               -> the same check, on the count
     C  the name is only in a glyph               -> 'the floating control says what it opens in words…'
     D  the door opens the screen it is already on -> 'clicking the floating control opens the concierge…'
     E  the dock takes every tap it overlaps      -> 'the dock passes taps through to what it overlaps…'
     F  the dock types its own stacking number    -> the same check, on the rung

     node tools/falsify-home-fab.cjs    ~7 minutes                                                  */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'Sukinnect-next.html');
const GATE = path.join(ROOT, 'tools', 'verify.cjs');
const PRISTINE = fs.readFileSync(APP, 'utf8');

function crlf(s) { return s.replace(/\n/g, '\r\n'); }

const DOCK_CALL = '    ${conciergeFab()}';
const LABEL = 'aria-label="Ask the AI Service Concierge to describe or photograph the problem"';
const DOOR = "function openConcierge(){ state.tab = 'concierge'; render(); }";
const PASSTHROUGH = 'pointer-events:none; margin-top:var(--s-4);';
const RUNG = 'z-index:var(--z-fab);';

[DOCK_CALL, LABEL, DOOR, PASSTHROUGH, RUNG].forEach(n => {
  if (PRISTINE.indexOf(crlf(n)) < 0) {
    throw new Error('pre-flight: a needle is not in the file — the door or this family moved:\n  ' + n);
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

const CHECK_PAINTED = 'Home carries one floating concierge control and no module card';
const CHECK_NAMED = 'the floating control says what it opens in words, not only in a glyph';
const CHECK_DOOR = 'clicking the floating control opens the concierge, which is the whole promise of it';
const CHECK_DOCK = 'the dock passes taps through to what it overlaps and keeps its own rung on the ladder';

const BREAKS = [
  { name: 'the dock is never painted, so Home has no door',
    from: DOCK_CALL, to: '    ${\'\'}', expect: CHECK_PAINTED, detail: null },
  { name: 'two doors are painted, which is the module and the floating control side by side',
    from: DOCK_CALL, to: DOCK_CALL + '\n    ${conciergeFab()}', expect: CHECK_PAINTED, detail: null },
  { name: 'the control is named only by its glyph',
    from: ' ' + LABEL, to: '', expect: CHECK_NAMED, detail: null },
  { name: 'the door opens the screen it sits on, so the tap does nothing a user can see',
    from: DOOR, to: "function openConcierge(){ state.tab = 'home'; render(); }", expect: CHECK_DOOR, detail: null },
  { name: 'the dock takes every tap that lands in its strip, eating the card under it',
    from: PASSTHROUGH, to: 'pointer-events:auto; margin-top:var(--s-4);', expect: CHECK_DOCK, detail: null },
  { name: 'the dock types a stacking number instead of asking the ladder',
    from: RUNG, to: 'z-index:40;', expect: CHECK_DOCK, detail: null },
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

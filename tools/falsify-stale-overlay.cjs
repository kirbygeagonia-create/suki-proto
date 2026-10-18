/* Proves the guard against an overlay flag that survives a navigation, and against the fix that
   looks right and is not.

   Two flags went stale in one pass (CHANGES.md §67). `state.isChatOpen` survived a tap on the bottom
   nav, so Home painted Home while `onRootTab()` answered false — the root-tab header treatment was
   replaced by the drill-in one and `syncBackHandles()` recorded a back step that no longer existed.
   `state.providerDeclineConfirm` survived because `clearModals()` named four fields by hand while
   `layerKeys()` already derived five.

   The third break is the one this family exists to keep honest: moving `state.isChatOpen = false`
   INTO `clearModals()` satisfies the same intuition and breaks the application, because render()
   calls `clearModals()` whenever the destination changes and opening a room IS a destination change
   — so the room closes the instant it opens. If only the named check fails, the suite has not been
   told what a chat room looks like when it paints, and that is a gap worth knowing about rather
   than hiding behind a green line.

   The camera half asks the instrument that found this in the first place:
   `tools/probe-stale-overlay.js` sets every overlay flag the STATE names, taps a real nav button,
   and reports which ones survive.

     node tools/falsify-stale-overlay.cjs    ~4 minutes, needs the machine's Chrome             */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');
const LABEL = 'a nav tap clears every overlay the state can name, by the rule each one needs';
const SCREENS = 'resident-home';

function gateRun() {
  try {
    return { code: 0, fails: [], out: execFileSync(process.execPath,
      [path.join(ROOT, 'tools', 'verify.cjs')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (err) {
    const out = (err.stdout || '') + (err.stderr || '');
    return { code: err.status === undefined ? -1 : err.status,
      fails: (out.match(/^FAIL  .*/gm) || []).map(l => l.slice(6).split('   ')[0]), out };
  }
}

function staleFlags() {
  let out = '';
  try {
    out = execFileSync(process.execPath,
      [path.join(ROOT, 'tools', 'shot.cjs'), '--probe=@tools/probe-stale-overlay.js',
        '--only=' + SCREENS], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) { out = (err.stdout || '') + (err.stderr || ''); }
  if (out.indexOf('STALE AFTER NAV') === -1 && out.indexOf('probe →') === -1) return null;
  /* Deduplicated: the probe tests all three roles, and the same forgotten flag reported three times
     reads like three findings and invites a fix to the wrong count. */
  return [...new Set((out.match(/state\.\w+ survived the tap/g) || [])
    .map(s => s.replace(' survived the tap', '')))];
}

/* Single-line needles only: the app file is CRLF, and a find-string carrying a bare \n misses every
   time and reports itself as SKIP — which looks like a clean run that simply tested less. */
const NAV_CLEAR = '      state.isChatOpen = false;';
const DERIVED = '  layerKeys().forEach(k => { state[k] = null; });';
const HAND_LIST = '  state.residentProfileModal = null; state.providerProfileModal = null;' +
  ' state.adminAccountModal = null; state.verificationModal = null;';

const BREAKS = [
  { name: 'the nav stops closing an open room, which is the defect as found',
    edits: [[NAV_CLEAR, '      /* the room stays flagged */']] },
  { name: 'clearModals() goes back to a hand-written list and forgets a confirm flag',
    edits: [[DERIVED, HAND_LIST]] },
  { name: 'the tempting wrong fix: clear the room inside clearModals(), where render() also calls it',
    edits: [[NAV_CLEAR, '      /* cleared by clearModals() instead */'],
            [DERIVED, DERIVED + ' state.isChatOpen = false;']] },
];

let caught = 0, applied = 0, unmatched = 0;
try {
  const base = gateRun();
  if (base.code !== 0 || !base.out.includes('PASS  ' + LABEL)) {
    console.log('BASELINE gate does not pass on the named check — nothing below means anything.');
    process.exit(1);
  }
  const baseStale = staleFlags();
  if (baseStale === null) {
    console.log('BASELINE probe printed no answer at all, so it cannot certify a clean run.');
    process.exit(1);
  }
  if (baseStale.length) {
    console.log('BASELINE probe already reports ' + baseStale.join(', ') + ' — the guard is not holding.');
    process.exit(1);
  }
  console.log('baseline: named check passes and the probe reports no stale flag');

  for (const b of BREAKS) {
    let mutated = original, bad = null;
    for (const [from, to] of b.edits) {
      const hits = mutated.split(from).length - 1;
      if (hits !== 1) { bad = hits; break; }
      mutated = mutated.replace(from, to);
    }
    if (bad !== null) {
      unmatched++;
      console.log('SKIP  ' + b.name + '  (a needle matched ' + bad + ' times, needs exactly 1)');
      continue;
    }
    applied++;
    fs.writeFileSync(TARGET, mutated);
    const run = gateRun();
    const named = run.fails.includes(LABEL);
    const others = run.fails.filter(f => f !== LABEL);
    const stale = staleFlags();
    const verdict = [];
    if (named) verdict.push('named check failed');
    if (others.length) verdict.push(others.length + ' other check(s) failed: ' + others[0].slice(0, 44));
    if (stale === null) verdict.push('probe silent');
    else if (stale.length) verdict.push('probe reports ' + stale.join(', '));
    if (named) { caught++; console.log('CAUGHT  ' + b.name + '  — ' + verdict.join('; ')); }
    else console.log('MISSED  ' + b.name + '  — ' + (verdict.join('; ') || 'gate still green'));
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied; file restored.');
process.exit(applied > 0 && caught === applied && unmatched === 0 ? 0 : 1);

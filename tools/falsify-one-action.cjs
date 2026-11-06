/* Proves the gate check "the provider's job screen offers exactly one primary action per state,
   named once" can fail.

   The finding behind it: the provider's job screen painted FOUR buttons for TWO decisions. The
   request card at the top offered "Accept request" and "Decline"; the action bar at the bottom
   offered "Accept this request" and "Decline this request" — the same two acts in two wordings, on
   one screen. Nothing in the camera suite can see this: every control is 44px, nothing is clipped,
   nothing collides, the contrast is fine. It surfaced only by printing the painted button list.

   Three breaks, and the first two condemn the same painting from two different doors — the bar
   ignoring the flag, and the caller forgetting to set it. That redundancy is recorded rather than
   smoothed over, because a fix that lives in one place can be undone in either. The third break is
   the one that reaches the OTHER half of the rule: it leaves exactly one primary button and gives
   two buttons the same wording, which only the duplicate-wording detector can see.

     node tools/falsify-one-action.cjs    ~2 minutes, no browser needed                          */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');
const EOL = original.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
const CHECK = 'offers exactly one primary action per state, named once';

const BREAKS = [
  { name: 'the action bar ignores the flag and offers its moves again',
    from: "  const moves = answerAbove ? allMoves.filter(m => m.kind === 'note') : allMoves;",
    to: '  const moves = allMoves;' },
  { name: 'the caller stops saying the answer is already above',
    from: '${jobActionBar(booking, { answerAbove: isOpen })}',
    to: '${jobActionBar(booking)}' },
  { name: 'one primary remains but two buttons carry the same words',
    from: "id=\"decline-request-btn\" ${busy ? 'disabled' : ''}>Decline</button>",
    to: "id=\"decline-request-btn\" ${busy ? 'disabled' : ''}>Accept this request</button>" },
];

function runGate() {
  let out = '';
  let code = 0;
  try {
    out = execFileSync(process.execPath, [path.join(ROOT, 'tools', 'verify.cjs')],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) { out = (err.stdout || '') + (err.stderr || ''); code = err.status || 1; }
  const line = out.split(/\r?\n/).find(l => l.indexOf(CHECK) >= 0);
  if (!line) return { seen: false, failed: code !== 0, line: '' };
  return { seen: true, failed: /^FAIL/.test(line.trim()), line: line.trim().slice(0, 170) };
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
const back = fs.readFileSync(TARGET, 'utf8') === original;
console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied; file restored: ' + back);
process.exit(applied > 0 && caught === applied && unmatched === 0 && back ? 0 : 1);

/* Proves the two bar-title checks can fail, and proves the camera repair that made the
   root-tab reading true.

   The defect this pass found was invisible to every sensor in the repository: a screen's name is
   its most repeated element, and 43 of the 83 bars the walk paints printed it at 16px — the body
   size, identical to the caption directly under it — while 40 printed it at 20px. Nothing flagged
   it because 16px is on the type scale and clears the 14px floor, so the off-scale walk and the
   floor walk both answered clean about a screen whose heading was not a heading. The cause was
   one selector: the size lived on `.topbar .title` while `h1` is reset to `font-size:inherit`, so
   a bar that remembered the class got a title and a bar that did not got body copy. One bar proved
   the mechanism by typing a full copy of the rule into its own inline style.

   Breaks 1-3 and 5-6 mutate the application and require a named gate check to go red: break 5 puts a
   typed style back on one of the six on-bar controls and break 6 deletes the rule they share, so
   the check cannot pass by matching nothing on either side. Break 4 is different
   in kind: it mutates the camera, because the pass also found that the walk was leaving a chat room
   flagged open (its per-screen setup ran clearModals() and the tab assignment but not the
   `state.isChatOpen = false` line the bottom navigation runs between them), which made
   onRootTab() answer false on six root tabs and photographed the drill-in title on screens a thumb
   reaches with the root treatment. With the line removed, the probe must count fewer root bars —
   the reading the walk produced before the repair — and with it in, 35.

   A seventh break was written and deleted as equivalent: dropping the `headings >= 10` positive
   control changes no verdict on this file, because the count measured 24 (`grep -o "<h1" | wc -l`).
   The control is what stops the pair passing on a build whose markup lost its headings, and a
   mutant that cannot change an answer raises the count without raising the coverage.

     node tools/falsify-bar-titles.cjs    ~12 minutes, break 4 needs the machine's Chrome          */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'Sukinnect-next.html');
const GATE = path.join(ROOT, 'tools', 'verify.cjs');
const CAMERA = path.join(ROOT, 'tools', 'shot.cjs');
const PROBE = path.join(ROOT, 'tools', 'probe-bar-titles.js');
const PRISTINE = {
  app: fs.readFileSync(APP, 'utf8'),
  gate: fs.readFileSync(GATE, 'utf8'),
  camera: fs.readFileSync(CAMERA, 'utf8'),
};

const CHECK_POS = 'a screen name is sized by the bar it sits in, not by a class a screen can forget';
const CHECK_SELF = 'no bar hand-types its own heading size';
const CHECK_ONBAR = 'a control that sits in the brand bar takes the class, not a typed style';
const CHECK_ROOT = 'every control painted for the brand bar has a root-tab variant, because that bar is white';

const POS_RULE = '  .topbar h1{font-family:var(--font-display); font-size:var(--t-title); font-weight:600;}';
const ROOT_RULE = '  .screen[data-root="1"] .topbar h1{ font-size:var(--t-title-lg); letter-spacing:-.3px; }';
const FIND_H1 = '      <h1>Find Services</h1>';
const ONBAR_USE = '<button id="mark-all-notifs-btn" class="btn sm onbar"';
const ONBAR_RULE = '  .btn.onbar{ background:rgba(255,255,255,0.12); color:var(--on-brand); box-shadow:none; }';
/* The exact statement the camera now runs between clearModals() and the walk's own navigation. */
const ROOT_ONBAR = '  .screen[data-root="1"] .btn.onbar{ background:var(--brand-tint-soft); color:var(--deep); }';
const CLEAR_CHAT = '         try { state.isChatOpen = false; } catch (e) {}';

[['app', POS_RULE], ['app', ROOT_RULE], ['app', FIND_H1], ['app', ONBAR_USE], ['app', ONBAR_RULE],
  ['app', ROOT_ONBAR],
  ['camera', CLEAR_CHAT]].forEach(([which, needle]) => {
  const n = PRISTINE[which].split(needle).length - 1;
  if (n !== 1) throw new Error('pre-flight: ' + JSON.stringify(needle.slice(0, 56)) + ' matched ' + n + ' times in ' + which);
});

function runGate() {
  let out = '';
  try { out = execFileSync(process.execPath, [GATE], { encoding: 'utf8', cwd: ROOT, maxBuffer: 64 * 1024 * 1024, timeout: 420000 }); }
  catch (err) { out = (err.stdout || '') + (err.stderr || ''); }
  return out;
}
function failedLabels(out) {
  return out.split(/\r?\n/).filter(l => /^FAIL\b/.test(l)).map(l => l.replace(/^FAIL\s+/, '').slice(0, 120));
}
const died = (out, label) => failedLabels(out).some(l => l.indexOf(label) === 0);

/* The walk's complete reading is its LAST answer, because the probe accumulates on the page. A run
   that produced no line, or a line with no root group, is refused rather than read as zero. */
function rootBars() {
  let out = '';
  try { out = execFileSync(process.execPath, [path.join(ROOT, 'tools', 'shot.cjs'), '--probe=@' + PROBE], { encoding: 'utf8', cwd: ROOT, maxBuffer: 64 * 1024 * 1024, timeout: 900000 }); }
  catch (err) { out = (err.stdout || '') + (err.stderr || ''); }
  const lines = out.split(/\r?\n/).filter(l => /BARS seen=/.test(l));
  if (!lines.length) return { ok: false, why: 'the probe printed no answer' };
  const m = /root:(\d+)×(\d+)/.exec(lines[lines.length - 1]);
  const seen = /seen=(\d+)/.exec(lines[lines.length - 1]);
  if (!m || !seen) return { ok: false, why: 'the last answer carries no root count: ' + lines[lines.length - 1].slice(0, 90) };
  return { ok: true, size: +m[1], count: +m[2], seen: +seen[1] };
}

const BREAKS = [
  { name: 'the title goes back under a class a screen can decline',
    file: 'app', from: POS_RULE, to: POS_RULE.replace('.topbar h1{', '.topbar .title{'), expect: CHECK_POS },
  { name: 'the root-tab step is deleted, so every bar shares one size regardless of destination',
    file: 'app', from: ROOT_RULE, to: '  /* no root step */', expect: CHECK_POS },
  { name: 'the results bar types its own heading size back into its markup',
    file: 'app', from: FIND_H1, to: '      <h1 style="font-family:var(--font-display); font-size:var(--t-title); font-weight:600;">Find Services</h1>',
    expect: CHECK_SELF },
  { name: 'the notifications action goes back to a style typed into its own markup',
    file: 'app', from: ONBAR_USE,
    to: '<button id="mark-all-notifs-btn" class="btn sm" style="background:rgba(255,255,255,0.12); color:var(--on-brand); box-shadow:none;"',
    expect: CHECK_ONBAR },
  { name: 'the on-bar rule is deleted, so the six controls that take it paint nothing',
    file: 'app', from: ONBAR_RULE, to: '  /* no on-bar rule */', expect: CHECK_ONBAR },
  /* The one this pass found in the pixels rather than the source: a root tab's bar is white,
     so the translucent-white pill with white text painted 1:1 on rgb(255,255,255) at seven
     screens. Deleting the inverted rule returns exactly that. */
  { name: 'the root-tab variant of the on-bar control is deleted, so its text matches its own bar',
    file: 'app', from: ROOT_ONBAR, to: '  /* no root variant */', expect: CHECK_ROOT },
];

let applied = 0, caught = 0, notApplied = 0, missed = 0;
const quiet = [];
const PATH = { app: APP, gate: GATE, camera: CAMERA };
try {
  for (const b of BREAKS) {
    const target = PATH[b.file];
    const pristine = PRISTINE[b.file];
    const next = pristine.replace(b.from, b.to);
    if (next === pristine) { console.log('SKIP  ' + b.name + '  (the mutant is byte-identical)'); notApplied++; continue; }
    fs.writeFileSync(target, next);
    if (fs.readFileSync(target, 'utf8') !== next) {
      console.log('SKIP  ' + b.name + '  (the write did not land)'); notApplied++; continue;
    }
    applied++;
    const out = runGate();
    const clean = /all \d+ checks passed/.test(out);
    if (!died(out, b.expect)) {
      missed++;
      console.log('MISSED ' + b.name + ' — ' + b.expect + ' stayed green' + (clean ? ' (whole gate passed)' : ''));
    } else {
      caught++;
      console.log('CAUGHT ' + b.name + '  →  ' + b.expect.slice(0, 62));
    }
    fs.writeFileSync(target, pristine);
  }

  /* Break 4: the instrument, not the app. */
  const camNext = PRISTINE.camera.replace(CLEAR_CHAT, '         /* walk does not clear the chat flag */');
  fs.writeFileSync(CAMERA, camNext);
  if (fs.readFileSync(CAMERA, 'utf8') === PRISTINE.camera) {
    console.log('SKIP  the walk leaves a chat open (the write did not land)');
    notApplied++;
  } else {
    applied++;
    const broken = rootBars();
    fs.writeFileSync(CAMERA, PRISTINE.camera);
    const fixed = rootBars();
    if (!broken.ok || !fixed.ok) {
      missed++;
      console.log('MISSED the walk-flag break could be read: ' + (broken.why || fixed.why || 'unknown'));
    } else if (broken.count >= fixed.count) {
      missed++;
      console.log('MISSED clearing the chat flag changed nothing: broken root=' + broken.count + ' fixed root=' + fixed.count);
    } else {
      caught++;
      console.log('CAUGHT the walk leaves a chat open → root bars fall ' + fixed.count + ' → ' + broken.count
        + ' (over ' + fixed.seen + ' bars); with the line the app\'s own nav runs, ' + fixed.count + ' get the root title');
    }
  }
  /* Baseline: the checks must be green on the unmutated file, or every verdict above is meaningless. */
  const base = runGate();
  if (!/all \d+ checks passed/.test(base)) {
    quiet.push('BASELINE NOT GREEN: the restored file does not pass its own gate');
    console.log(quiet[quiet.length - 1] + '  ' + failedLabels(base).slice(0, 3).join(' | '));
  }
} finally {
  fs.writeFileSync(APP, PRISTINE.app);
  fs.writeFileSync(GATE, PRISTINE.gate);
  fs.writeFileSync(CAMERA, PRISTINE.camera);
}

console.log('\nmutants applied ' + applied + ', caught ' + caught + ', not applied ' + notApplied + ', missed ' + missed);
if (quiet.length) console.log(quiet.join('\n'));
const restored = fs.readFileSync(APP, 'utf8') === PRISTINE.app && fs.readFileSync(CAMERA, 'utf8') === PRISTINE.camera;
console.log('target restored byte-for-byte: ' + restored);
process.exit(caught === applied && notApplied === 0 && missed === 0 && restored ? 0 : 1);

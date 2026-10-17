/* One command for the requirement "a mobile app must be responsive to any phone".
   The camera already measures every screen; what it cannot do is remember that a layout tuned at
   100% text on a 360px panel is not the phone a user holds. This runs the real instrument across
   the corners that Android actually produces — the handset's own text-size setting reaches 200%
   (settingslib's MAX_FONT_SCALE in the AOSP Settings app), and CSS px widths on real phones run
   from ~320 to the ~450 a 720px panel at density 256 lays out at — and fails if any of them
   paints a defect.

   It parses the camera's tally block rather than changing its exit code, because the camera is
   also a screenshot tool and `--measure` exiting 1 on a finding would break that use.

   A tally is a failure unless it is on the list below, so a tally added to tools/shot.cjs
   tomorrow is treated as "must be zero" by default: an unknown line failing closed is the safe
   direction, and the opposite (a new sensor silently counted as informational) is the failure
   mode this repository has been bitten by repeatedly.

     node tools/sweep-text-scale.cjs            6 cases, ~9 minutes
     node tools/sweep-text-scale.cjs --scale=1.5 --width=450
                                                 a single case                                                            */
'use strict';
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SHOT = path.join(ROOT, 'tools', 'shot.cjs');

/* Counted, not defects: tiles that legitimately leave the device (§81's decided exception),
   Leaflet's own controls (not ours to resize), truncations that are the intended single-line
   preview, placeholders flagged for review, and the scale inventory.
     `page` is the camera's own boot line ("page: … | providers 8 | …"), not a tally. It is here
   because the parser below refuses to read an unrecognised answer as clean, and that line is
   exactly the kind of thing such a rule would otherwise flag — the first version of this runner
   reported "0 of 4 corners clean" while every tally was zero, on nothing but this line. */
const NOT_A_TALLY = ['page'];
const INFORMATIONAL = [
  'requests that left the device for a network',
  'vendor-owned controls excluded',
  'single-line previews shortened with an ellipsis',
  'fields whose only name is a placeholder',
  'distinct painted font sizes across the app',
].concat(NOT_A_TALLY);

/* The corners, named for why each one is here. */
const DEFAULT_CASES = [
  { why: 'narrowest phone, largest text (the worst corner the platform allows)', scale: '2', width: '320' },
  { why: 'default panel width, largest text', scale: '2', width: '' },
  { why: 'vivo 1906 at 450 CSS px, the OPPO setting that started this (1.35)', scale: '1.35', width: '450' },
  /* Height is the other half of "any phone" and was never swept until §61: every figure in this
     repository, including the three above, was measured at the camera's default 844px. At 480px —
     an Android Go handset, or any phone in split-screen — a booking sheet put its own "Send
     request" 149px below the bottom edge of the device. */
  { why: 'short handset / split-screen at largest text (480px tall)', scale: '2', width: '320', height: '480' },
  /* The keyboard is not emulated anywhere in this repository — there is no flag for it — so the
     bench proxy is the height it leaves behind. On a 480px-tall phone a keyboard takes roughly
     half, and 300px is what a resident has left while typing into the booking sheet. */
  { why: 'a keyboard open on a short phone (300px of viewport left)', scale: '1', width: '320', height: '300' },
  { why: 'default width, default text — the anchor a clean run must also produce', scale: '1', width: '' },
];

const flag = name => {
  const hit = process.argv.find(a => a.startsWith('--' + name + '='));
  return hit ? hit.slice(name.length + 3) : '';
};
const only = process.argv.includes('--one');

const cases = flag('scale') || flag('width')
  ? [{ why: 'asked for on the command line', scale: flag('scale') || '1', width: flag('width'),
      height: flag('height') }]
  : (only ? DEFAULT_CASES.slice(0, 1) : DEFAULT_CASES);

let bad = 0;
for (const kase of cases) {
  const args = [SHOT, '--measure'];
  if (kase.scale) args.push('--font-scale=' + kase.scale);
  if (kase.width) args.push('--width=' + kase.width);
  if (kase.height) args.push('--height=' + kase.height);
  const shown = (kase.width || 'default') + 'x' + (kase.height || 'default') + ' @ ' +
    Math.round(Number(kase.scale || 1) * 100) + '% text';
  process.stdout.write('\n### ' + shown + ' — ' + kase.why + '\n');
  let out;
  try {
    out = execFileSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    bad++;
    console.log('  the camera itself failed: ' + (err.stderr || err.message).toString().trim().split('\n')[0]);
    continue;
  }
  const findings = [];
  let seen = 0;
  out.split(/\r?\n/).forEach(line => {
    /* The value is captured as the rest of the line, not as a number, because not every tally
       answers with one: "horizontal overflow (a screen wider than the phone)" prints "none" when
       it is clear and a list of screens with pixel amounts when it is not. A first version of this
       runner matched only `: <number>` and so walked straight past that line — a screen a whole
       12px wider than the phone would have passed the sweep that exists to catch it. Anything that
       is not a zero, not "none", and not on the informational list is a finding, so an unknown
       answer fails closed. */
    const m = line.match(/^([a-z][^:]*): (.+)$/);
    if (!m) return;
    if (INFORMATIONAL.some(k => m[1].startsWith(k))) return;
    seen++;
    const value = m[2].trim();
    if (value === '0' || value === 'none') return;
    if (/^\d+$/.test(value)) { findings.push('  ' + m[1] + ': ' + value); return; }
    findings.push('  ' + m[1] + ': ' + value.slice(0, 120));
  });
  /* A run that printed no tally lines did not measure anything, and silence here is the one
     answer that must never be read as a pass. */
  if (!seen) { bad++; console.log('  NO TALLIES PRINTED — the run measured nothing'); continue; }
  if (findings.length) { bad++; findings.forEach(f => console.log(f)); }
  else console.log('  ' + seen + ' tallies, all clear');
}
console.log('\n' + (cases.length - bad) + ' of ' + cases.length + ' phone corners measured clean.');
process.exit(bad ? 1 : 0);

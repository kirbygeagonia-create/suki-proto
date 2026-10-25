/* Proves the compatibility-floor audit can fail, by making it fail on purpose seven different ways.

   `tools/audit-compat-floor.cjs` answers which WebView can render this app, and it prints two numbers because the
   one everyone quotes is the wrong one: the raw floor (newest version among everything used) and the breaking floor
   (restricted to features whose drop removes geometry rather than cosmetics). A tool like that fails the way every
   scan here has failed — by reporting a clean number it did not compute. So each break below plants a real defect
   and requires the specific sentence that names it, and two of the seven are not about the application at all:
   one blinds the population scan (which must refuse, not print "no floor"), and one re-introduces the bug this
   audit was written with — reading exception declarations out of the comment-stripped text, where they cannot
   exist, so the tool silently stops honouring every exception it was extended to honour.

     1. plant `inset:0` back into a rule            → the breaking floor is 87 again and names the inset shorthand
     2. plant a `:has()` selector                   → the breaking floor is 105 and names :has()
     3. delete the `vh` fallback before a `dvh`     → the row stops reading `guarded` and reads `used`
     4. declare an exception for an absent feature  → refused: the excuse outlived the rule it excused
     5. shorten a declared exception's reason       → refused: an exception has to say what degrades and where
     6. blind the feature scan so nothing matches   → NO CONCLUSION, exit 1, never "no floor"
     7. parse exceptions from the stripped text     → the :where() exception vanishes and the floor rises to 88

   Targets are BOTH `Sukinnect-next.html` and the audit itself, so this family contends for the same mutex as every
   other mutating run: one pass at a time. It restores both files in a `finally`; after a cancelled run check
   `git status` on `Sukinnect-next.html` and `tools/audit-compat-floor.cjs`.
*/
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'Sukinnect-next.html');
const TOOL = path.join(ROOT, 'tools/audit-compat-floor.cjs');
const baseApp = fs.readFileSync(APP, 'utf8');
const baseTool = fs.readFileSync(TOOL, 'utf8');

function runAudit() {
  try {
    const out = execFileSync(process.execPath, [TOOL], { cwd: ROOT, encoding: 'utf8' });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status === undefined ? -1 : e.status, out: String(e.stdout || '') + String(e.stderr || '') };
  }
}

/* A break is a string edit, not a size change: `inset:0` and its replacement are different lengths here, but the
   same-length edits this suite has been bitten by before would be invisible to a byte count. */
const BREAKS = [
  { name: 'plant the inset shorthand back', file: 'app',
    from: '    position:fixed; top:0; right:0; bottom:0; left:0; background:var(--scrim); z-index:70;',
    to: '    position:fixed; inset:0; background:var(--scrim); z-index:70;',
    want: r => r.code === 1 && /inset shorthand/.test(r.out) && /breaking floor: Chromium 87/.test(r.out) },
  { name: 'plant a :has() selector', file: 'app',
    from: '  :root{', to: '  :root:has(> b){ color:red }\n  :root{',
    want: r => r.code === 1 && /breaking floor: Chromium 105/.test(r.out) && /:has\(\)/.test(r.out) },
  { name: 'delete the vh fallback that makes dvh safe', file: 'app',
    from: 'padding:32px 12px; min-height:100vh; min-height:100dvh;',
    to: 'padding:32px 12px; min-height:100dvh;',
    /* The row has to stop reading `guarded` and start reading `used`. dvh is a benign feature, so the exit code
       stays 0 either way — the only observable is the state word and the disappearance of the fallback count. */
    want: r => /dynamic viewport units \(dvh\/svh\/lvh\)\s+used/.test(r.out)
      && !/dynamic viewport units \(dvh\/svh\/lvh\)\s+guarded/.test(r.out)
      && !/\(2 with a fallback\)/.test(r.out) },
  { name: 'excuse a feature the file never uses', file: 'app',
    from: '  :root{', to: '  /* compat-exception: color-mix() — a reason long enough to satisfy the length check. */\n  :root{',
    want: r => r.code === 1 && /uses it nowhere/.test(r.out) },
  { name: 'excuse a feature with no reason', file: 'app',
    from: ['  /* compat-exception: :is() / :where() — this selector list styles the keyboard focus ring only.',
    '     Below Chromium 88 the rule is dropped and the user-agent ring still paints, so a Tab user sees a ring that is',
    '     not the brand one rather than no ring. tools/shot.cjs --focus is what checks that claim. */'].join('\n'),
    to: '  /* compat-exception: :is() / :where() — too short to be a reason. */',
    want: r => r.code === 1 && /-character reason/.test(r.out) },
  { name: 'blind the feature scan so nothing can match', file: 'tool',
    from: '  const hits = code.match(re) || [];', to: '  const hits = [];',
    want: r => r.code === 1 && /NO CONCLUSION/.test(r.out) && /the scan is blind/.test(r.out) },
  { name: 'read exceptions from the comment-stripped text', file: 'tool',
    from: 'for (const m of src.matchAll(DECL_RE)) {', to: 'for (const m of code.matchAll(DECL_RE)) {',
    want: r => r.code === 1 && /breaking floor: Chromium 88/.test(r.out) && /:is\(\)/.test(r.out) },
];

function applyTo(which, edit, on) {
  const file = which === 'app' ? APP : TOOL;
  const base = which === 'app' ? baseApp : baseTool;
  const text = on ? edit.to : edit.from;
  /* The repository checks out CRLF on Windows (`.gitattributes` says `* text=auto`), so a multi-line anchor written
     with \n matches nothing and the break reports NOT APPLIED while the tool still prints a healthy number. Normalise
     the anchor to whatever this file actually uses. */
  const eol = base.includes('\r\n') ? '\r\n' : '\n';
  const from = edit.from.split('\n').join(eol);
  const to = text.split('\n').join(eol);
  const hits = base.split(from).length - 1;
  if (hits !== 1) return { ok: false, why: 'anchor matched ' + hits + 'x' };
  fs.writeFileSync(file, base.split(from).join(to), 'utf8');
  return { ok: true };
}

let applied = 0, caught = 0, unmatched = 0;
const baseline = runAudit();
if (baseline.code !== 0 || !/findings: 0/.test(baseline.out)) {
  console.log('BROKEN — the audit does not pass on the file as it stands, so no break below can be credited:');
  console.log(baseline.out.split('\n').slice(-6).join('\n'));
  process.exit(1);
}
console.log('baseline: ' + (baseline.out.match(/raw floor:\s+Chromium \d+/) || ['?'])[0]
  + ', ' + (baseline.out.match(/breaking floor: [^\n]{0,40}/) || ['?'])[0]);

try {
  for (const b of BREAKS) {
    const put = applyTo(b.file, b, true);
    if (!put.ok) { unmatched++; console.log('SKIP  ' + b.name + '  (its ' + put.why + ', needs exactly 1)'); continue; }
    applied++;
    const r = runAudit();
    if (b.want(r)) { caught++; console.log('CAUGHT  ' + b.name + '  → exit ' + r.code + ', '
      + (r.out.match(/(FINDING|NO CONCLUSION)[^\n]{0,70}/) || ['?'])[0]); }
    else console.log('MISSED  ' + b.name + '  → exit ' + r.code + ', last line: '
      + String(r.out).trim().split('\n').pop());
  }
} finally {
  fs.writeFileSync(APP, baseApp, 'utf8');
  fs.writeFileSync(TOOL, baseTool, 'utf8');
}
console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied; both files restored.');

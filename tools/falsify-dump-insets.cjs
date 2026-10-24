/* Proves the dump inset reader can fail, on fixtures written by this file.

   `tools/device-dump-insets.cjs` was calibrated in the session that wrote it — true bands on a recorded handset dump
   read 0, a band planted 6px too deep read 21 — but that was a person running two commands, and a control nobody can
   re-run is a claim. So the fixtures are embedded here rather than read from `.scratch/`, which is gitignored and
   will not exist on the next machine: a dump of a correctly-inset app, a dump of somebody else's window, and a dump
   whose nodes carry no geometry. Each break removes one of the reader's defences and the required verdict is the
   OPPOSITE of what a naive harness would accept:

     1. stop excluding the window's own scaffolding   → the known-good dump must start reporting false insets
     2. disarm the status-band comparison             → the planted-deep band must stop being caught
     3. slice `--file=` one character short           → a valid file must stop being read (the real bug of the day)
     4. drop the "no band to test against" refusal    → a page-level dump must not answer "findings: 0"
     5. drop the "no node belongs to the package" test → somebody else's dump must not be judged as ours

   Target is the reader, not `Sukinnect-next.html`, so this family does not contend for the mutex every other family
   shares. It still restores in a `finally`.

     node tools/falsify-dump-insets.cjs
*/
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TOOL = path.join(ROOT, 'tools/device-dump-insets.cjs');
const original = fs.readFileSync(TOOL, 'utf8');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'suki-dumpinsets-'));

const node = (pkg, cls, id, b) => `  <node index="0" text="" resource-id="${id}" class="${cls}" package="${pkg}" `
  + `content-desc="" checkable="false" clickable="true" enabled="true" focusable="true" focused="false" `
  + `scrollable="false" long-clickable="false" password="false" selected="false" bounds="${b}" />\n`;
const OURS = 'com.sukinnect.app';

/* A WINDOW-level dump of a correctly-inset app: the framework's own bars appear as foreign nodes, and the app's
   content root starts at exactly the band floor. The decor and the two bar backgrounds belong to us and span the
   bars by design — that is what makes judging nodes rather than content produce three confident false findings. */
const SYSUI = 'com.android.systemui';
const GOOD = '<?xml version="1.0"?>\n<hierarchy rotation="0">\n'
  + node(SYSUI, 'android.widget.FrameLayout', '', '[0,0][720,54]')
  + node(SYSUI, 'android.widget.FrameLayout', '', '[0,1423][720,1544]')
  + node(OURS, 'android.widget.FrameLayout', '', '[0,0][720,1423]')
  + node(OURS, 'android.view.View', 'android:id/statusBarBackground', '[0,0][720,54]')
  + node(OURS, 'android.view.View', 'android:id/navigationBarBackground', '[0,1423][720,1544]')
  + node(OURS, 'android.widget.LinearLayout', 'android:id/content', '[0,54][720,1423]')
  + node(OURS, 'android.webkit.WebView', '', '[0,54][720,1423]')
  + node(OURS, 'android.view.View', '', '[0,1350][720,1423]')
  + '</hierarchy>\n';
/* Foreign nodes that touch neither edge: a window-level dump, but one from which no bar band can be derived. */
const NOBANDS = '<?xml version="1.0"?>\n<hierarchy rotation="0">\n'
  + node('com.android.shell', 'android.widget.TextView', '', '[100,700][600,760]')
  + node(OURS, 'android.widget.LinearLayout', 'android:id/content', '[0,54][720,1423]')
  + node(OURS, 'android.webkit.WebView', '', '[0,54][720,1423]')
  + '</hierarchy>\n';
/* A page-level dump: only our own package, so the bounds are relative to the WebView and not comparable to bars. */
const PAGE_LEVEL = '<?xml version="1.0"?>\n<hierarchy rotation="0">\n'
  + node(OURS, 'android.widget.LinearLayout', 'android:id/content', '[0,0][720,1369]')
  + node(OURS, 'android.webkit.WebView', '', '[0,0][720,1369]')
  + '</hierarchy>\n';
/* Somebody else's window entirely — the picker, say. */
const FOREIGN = '<?xml version="1.0"?>\n<hierarchy rotation="0">\n'
  + node('com.google.android.documentsui', 'android.widget.FrameLayout', '', '[0,0][720,1544]')
  + node('com.google.android.documentsui', 'android.widget.TextView', 'android:id/title', '[40,80][400,140]')
  + '</hierarchy>\n';
/* The null-root shape uiautomator produces when the caller does not own the focused window. */
const EMPTY = '<?xml version="1.0"?>\n<hierarchy rotation="0">\n'
  + node(OURS, 'android.widget.FrameLayout', '', '[0,0][0,0]')
  + '</hierarchy>\n';

const write = (name, xml) => { const p = path.join(tmp, name); fs.writeFileSync(p, xml, 'utf8'); return p; };
const F_GOOD = write('good.xml', GOOD), F_FOREIGN = write('foreign.xml', FOREIGN), F_EMPTY = write('empty.xml', EMPTY);
const F_NOBANDS = write('nobands.xml', NOBANDS), F_PAGE = write('page.xml', PAGE_LEVEL);

function run(args) {
  try { return { code: 0, out: execFileSync(process.execPath, [TOOL].concat(args), { encoding: 'utf8', cwd: ROOT }) }; }
  catch (e) { return { code: e.status === undefined ? -1 : e.status,
    out: String(e.stdout || '') + String(e.stderr || '') }; }
}
const TRUE_BANDS = ['--screen=720x1544', '--statusbar=54', '--navbar=121'];
const count = out => { const m = out.match(/findings:\s*(\d+)/); return m ? Number(m[1]) : -1; };

const BASELINE = run(['--file=' + F_GOOD].concat(TRUE_BANDS));
if (BASELINE.code !== 0 || count(BASELINE.out) !== 0) {
  console.log('BROKEN — the reader does not pass on the correctly-inset fixture, so no break below can be credited:');
  console.log(BASELINE.out.split(/\r?\n/).slice(0, 6).join('\n'));
  process.exit(1);
}
const CONTROL = run(['--file=' + F_GOOD, '--screen=720x1544', '--statusbar=60', '--navbar=121']);
if (CONTROL.code !== 1 || count(CONTROL.out) < 1) {
  console.log('BROKEN — the positive control (a band 6px too deep) did not report an intrusion, so the reader cannot '
    + 'observe the thing it exists to observe and every clean line below would be meaningless.');
  process.exit(1);
}
console.log('baseline: correct dump → findings 0; band planted 6px deep → findings ' + count(CONTROL.out));

const BREAKS = [
  { name: 'judge every node, scaffolding included',
    from: 'const content = rootInOurs >= 0 ? ours.slice(rootInOurs)\n  : ours.filter(n => !DECOR_IDS.test(n.id) && !(n.b.t === 0 && n.b.b >= allBottom));',
    to: 'const content = ours;',
    args: ['--file=' + F_GOOD].concat(TRUE_BANDS),
    want: r => r.code === 1 && count(r.out) >= 3 },
  { name: 'disarm the status-band comparison',
    from: 'if (statusBar && n.b.t < statusBar && n.b.b > 0) {', to: 'if (false) {',
    args: ['--file=' + F_GOOD, '--screen=720x1544', '--statusbar=60', '--navbar=121'],
    want: r => r.code === 0 && count(r.out) === 0 },
  { name: 'slice the --file= value one character short',
    from: 'return hit ? hit.slice(name.length + 3) : dflt;', to: 'return hit ? hit.slice(name.length + 2) : dflt;',
    args: ['--file=' + F_GOOD].concat(TRUE_BANDS),
    want: r => r.code === 1 && /NO CONCLUSION/.test(r.out) },
  { name: 'answer "clean" when there is no band to test against',
    from: 'if (!statusBar && !navFromBottom) {', to: 'if (false) {',
    args: ['--file=' + F_NOBANDS, '--screen=720x1544'],
    want: r => r.code === 0 && count(r.out) === 0 && !/NO CONCLUSION/.test(r.out) },
  { name: 'judge a dump that holds none of our app',
    from: 'if (ours.length === 0) {', to: 'if (false) {',
    args: ['--file=' + F_FOREIGN, '--screen=720x1544', '--statusbar=54', '--navbar=121'],
    want: r => r.code === 0 && /our nodes: 0/.test(r.out) && !/NO CONCLUSION/.test(r.out) },
  /* Two refusals that fire on the same input are one refusal wearing two names. The null-root guard is only
     observable if the message that comes out when it is disabled is the OTHER one — so the required verdict here is
     specifically the wrong diagnosis, which is what proves the two are separately live. */
  { name: 'confuse a null-root dump with a dump of another app',
    from: 'if (nodes.length === 0) {', to: 'if (false) {',
    args: ['--file=' + F_EMPTY, '--screen=720x1544', '--statusbar=54', '--navbar=121'],
    want: r => r.code === 1 && /no node belongs/.test(r.out) && !/zero nodes/.test(r.out) },
  { name: 'compare page-relative WebView bounds against window bands',
    from: 'if (others.length === 0) {', to: 'if (false) {',
    args: ['--file=' + F_PAGE, '--screen=720x1544', '--statusbar=54', '--navbar=121'],
    want: r => !/NO CONCLUSION/.test(r.out) },
];

let applied = 0, caught = 0, unmatched = 0;
try {
  for (const b of BREAKS) {
    const hits = original.split(b.from).length - 1;
    if (hits !== 1) { unmatched++; console.log('SKIP  ' + b.name + '  (its needle matched ' + hits + 'x, needs 1)'); continue; }
    fs.writeFileSync(TOOL, original.replace(b.from, b.to), 'utf8');
    applied++;
    const r = run(b.args);
    if (b.want(r)) { caught++; console.log('CAUGHT  ' + b.name + '  → exit ' + r.code + ', findings ' + count(r.out)); }
    else console.log('MISSED  ' + b.name + '  → exit ' + r.code + ', findings ' + count(r.out)
      + ', ' + String(r.out).trim().split(/\r?\n/).pop());
  }
} finally {
  fs.writeFileSync(TOOL, original, 'utf8');
  fs.rmSync(tmp, { recursive: true, force: true });
}
const restored = fs.readFileSync(TOOL, 'utf8') === original;
console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied; '
  + (applied === 0 ? 'NO CONCLUSION — nothing was applied, so nothing was tested' : 'reader restored byte-for-byte: ' + restored));
if (applied === 0 || !restored) process.exit(1);
process.exit(caught === applied ? 0 : 1);

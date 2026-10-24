/* The ColorOS picker leg, armed. DEVICE-PASS item 1 asks one question: the vivo's DocumentsUI accepted
   `input keyevent` and returned a document, so does ColorOS's picker, which refused four injected taps?

   What the tree saved from walk 6 says before this ever touches a phone: `grep -c focused="true"` over
   .scratch/docui.xml answers **0**. Nothing was focused in that picker. A blind DPAD_CENTER there
   activates nothing at best, and at worst the first row the platform happens to land on — which on a
   phone in daily use is one of the owner's own photographs. So this tool never sends a blind sequence:
   it sends **one key**, dumps the platform tree, and prints which node now holds focus, and only the
   next key is chosen from that reading. The centre of the picker's grid is never guessed at.

     node tools/device-picker-keys.cjs --tree=.scratch/docui.xml   # prove the parser on a saved tree
     node tools/device-picker-keys.cjs --dump                      # the picker as it is on screen now
     node tools/device-picker-keys.cjs --key=TAB                   # one key, then the tree, then the app
     node tools/device-picker-keys.cjs --fixture                   # push + index one test image
     node tools/device-picker-keys.cjs --open                       # raise the picker from the app's own control
     node tools/device-picker-keys.cjs --teardown                   # remove the fixture and clear the app

   The app keeps a name, not bytes (§75), so a wrong selection is bounded and reversible: the screen's
   own "Remove photo" control clears it. Every stage prints what the page holds afterwards, so a
   selection that was not the fixture cannot pass unnoticed. */
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const ADB = process.env.ADB || 'C:/Users/ADMIN/AppData/Local/Android/Sdk/platform-tools/adb.exe';
const ROOT = 'C:/Users/ADMIN/OneDrive/Desktop/Sukinnect/Suki-proto/';
const PKG = JSON.parse(fs.readFileSync(ROOT + 'Sukinnect-Android/app/build/outputs/apk/debug/output-metadata.json', 'utf8')).applicationId;
const FIXTURE_NAME = 'suki-leg9-test.png';
const FIXTURE_PATH = '/sdcard/Download/' + FIXTURE_NAME;

function adb() {
  const cf = process.argv.find(a => a.startsWith('--connect='));
  if (cf && !adb.done && Array.prototype.slice.call(arguments).join(' ') !== 'connect') { adb.done = true; execFileSync(ADB, ['connect', cf.slice(10)], { encoding: 'utf8' }); }
  try { return execFileSync(ADB, Array.prototype.slice.call(arguments), { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).replace(/\r/g, ''); }
  catch (e) { return 'ADB ERROR: ' + String((e.stdout || '') + (e.stderr || '')).replace(/\r/g, ''); }
}
function sleep(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }
function probe(args) {
  try {
    return execFileSync(process.execPath, [ROOT + 'tools/device-probe.cjs'].concat(args),
      { encoding: 'utf8', cwd: ROOT, env: Object.assign({}, process.env, { ADB }) }).replace(/\r/g, '');
  } catch (e) { return 'PROBE ERROR: ' + String((e.stdout || '') + (e.stderr || '')).split('\n').slice(-2).join(' ').trim(); }
}
function ask(expr) { const l = String(probe([expr])).trim().split('\n'); return (l[l.length - 1] || '(no answer)').trim(); }

/* ---------- the tree parser ---------- */
/* uiautomator writes one flat sequence of <node .../> attributes. Every row this leg could activate is a
   node that is clickable and lives inside the picker, named by its text or its content-desc. Bounds are
   DEVICE pixels — a different space from the page's CSS px, which is why the app-side reads below go
   through the page and the picker-side reads stay here. */
function parseTree(xml) {
  const nodes = [];
  const re = /<node\b([^>]*?)\/?>/g;
  let m;
  while ((m = re.exec(xml))) {
    const a = {};
    const ar = /(\w[\w-]*)="([^"]*)"/g;
    let k;
    while ((k = ar.exec(m[1]))) a[k[1]] = k[2];
    if (!a.package) continue;
    nodes.push({
      pkg: a.package,
      id: a['resource-id'] || '',
      cls: a.class || '',
      text: a.text || '',
      desc: a['content-desc'] || '',
      bounds: a.bounds || '',
      clickable: a.clickable === 'true',
      focusable: a.focusable === 'true',
      focused: a.focused === 'true'
    });
  }
  const picker = nodes.filter(n => /documentsui/.test(n.pkg));
  const named = picker.filter(n => (n.text || n.desc) && n.cls !== 'android.widget.ImageView' || (n.desc && /image|photo|png|jpg/i.test(n.desc)));
  const rows = picker.filter(n => n.clickable && (n.text || n.desc));
  return {
    total: nodes.length,
    pickerNodes: picker.length,
    focused: picker.filter(n => n.focused),
    /* The owed question is "does ColorOS accept the key route", and the platform answers the first half of
       it from a saved tree: a key event can only land on a node the platform marks focusable. If that count
       were zero, no sequence of TAB and DPAD could ever reach a document row and the answer would be
       structural rather than a matter of which key to press. */
    focusable: picker.filter(n => n.focusable),
    focusableRows: picker.filter(n => n.focusable && n.clickable && (n.text || n.desc)),
    rows: rows,
    named: named,
    fixture: picker.filter(n => (n.text + ' ' + n.desc).indexOf(FIXTURE_NAME) > -1)
  };
}
function reportTree(t, source) {
  console.log('tree: ' + source + ' — ' + t.total + ' nodes, ' + t.pickerNodes + ' inside the picker');
  if (!t.pickerNodes) { console.log('  NO PICKER IN THIS TREE: nothing from com.google.android.documentsui — the dump is of some other window, so no key verdict is available.'); return; }
  console.log('  focused: ' + (t.focused.length ? t.focused.map(n => (n.text || n.desc || n.cls) + ' @ ' + n.bounds).join(' ; ') : 'NOTHING FOCUSED'));
  console.log('  clickable named rows: ' + t.rows.length);
  console.log('  nodes the platform marks focusable: ' + t.focusable.length +
    ' (of which ' + t.focusableRows.length + ' are also clickable and named)');
  t.rows.slice(0, 8).forEach(n => console.log('    ' + (n.text || n.desc).slice(0, 34) + '  [' + n.cls.replace('android.widget.', '') + '] ' + n.bounds + (n.focused ? ' FOCUSED' : '')));
  console.log('  fixture visible: ' + (t.fixture.length ? 'YES — ' + t.fixture.map(n => n.bounds).join(',') : 'no'));
  if (t.focused.length === 0) console.log('  CONSEQUENCE: a DPAD_CENTER now activates nothing knowable. Send TAB or DPAD_DOWN and re-read before pressing centre.');
}

/* ---------- app-side reading: what does the page hold? ---------- */
const PAGE_STATE = '(function(){return JSON.stringify({attached:state.conciergePhotoAttached,name:state.conciergePhotoName,' +
  'error:state.conciergePhotoError,blobSrcs:[].slice.call(document.querySelectorAll("img")).map(function(i){return i.src})' +
  '.filter(function(s){return /^blob:|^data:/.test(s)}).length})})()';

function dump() {
  adb('shell', 'uiautomator', 'dump', '/sdcard/window_dump.xml');
  const xml = adb('exec-out', 'cat', '/sdcard/window_dump.xml');
  return xml;
}

/* ---------- the one rule that makes a key route safe on a phone in daily use ---------- */
/* Proven against the tree walk 6 saved: that picker shows two rows named
   "Preview the file IMG_20261020_1859" — the owner's own photographs, at [167,526] and [386,526].
   A key route activates whatever holds focus, so pressing centre is allowed only when the focused row
   is named for the fixture this tool pushed. Walk 7 selected a real photograph by accident; a guard that
   reads the name is the fix, not a smaller key sequence. */
function centerAllowed(t) {
  if (t.focused.length === 0) return { ok: false, why: 'NOTHING IS FOCUSED — centre would activate an unknown row' };
  if (t.focused.length > 1) return { ok: false, why: t.focused.length + ' nodes report focus at once — the tree does not say which one centre would press' };
  const f = t.focused[0];
  const names = (f.text + ' ' + f.desc).trim();
  /* An edit box is not a document row. Real trees proved this matters: in `d2.xml`–`d6.xml` — the walk 7
     sequence — the ONE focused node is `com.google.android.documentsui:id/search_src_text`, an EditText whose
     text is the fixture name, because that walk entered the file by name into the picker's own search field.
     A rule that only compared the name would answer "centre allowed" about a search box: the press would
     re-run the query, activate no document, and the leg would report a pick that never happened. */
  const isEditor = /EditText$/i.test(f.cls) || /search_src_text|input/i.test(f.id);
  if (isEditor) return { ok: false, why: 'focus is on an edit box (' + (f.id || f.cls) + ' = "' + names.slice(0, 40) + '"), not on a document row — centre would search, not select' };
  if (names.indexOf(FIXTURE_NAME) > -1) return { ok: true, why: 'focus is on the fixture row: ' + names.slice(0, 60) };
  return { ok: false, why: 'focus is NOT on the fixture — it is on "' + names.slice(0, 60) + '"' };
}

/* Run the rule over every saved picker tree. This is the guard's only honest test: a rule that refuses on
   real artifacts for the right reasons is proven, and one that refuses on everything is decoration — so one
   synthetic tree where the document row itself holds focus is carried alongside as the allow-control. */
if (process.argv.indexOf('--guard-real') > -1) {
  const dir = process.env.DUMP_DIR || '.scratch';
  const files = fs.readdirSync(dir).filter(f => /\.xml$/i.test(f));
  const trees = [];
  for (const f of files) {
    const t = parseTree(fs.readFileSync(dir + '/' + f, 'utf8'));
    if (!t.pickerNodes) continue;
    trees.push({ f, t, v: centerAllowed(t) });
  }
  if (!trees.length) { console.log('NO CONCLUSION: no picker tree in ' + dir + ' — nothing to test the rule against.'); process.exit(1); }
  const allowControl = { f: '(synthetic allow-control)', t: { focused: [{ text: FIXTURE_NAME, desc: '', cls: 'android.widget.FrameLayout', id: 'com.google.android.documentsui:id/item_root', bounds: '[0,0][1,1]' }] }, };
  allowControl.v = centerAllowed(allowControl.t);
  const rows = trees.concat([allowControl]);
  let allows = 0, editorRefusals = 0, otherRefusals = 0;
  for (const r of rows) {
    if (r.v.ok) allows++;
    else if (/edit box/.test(r.v.why)) editorRefusals++;
    else otherRefusals++;
    console.log((r.v.ok ? 'ALLOW ' : 'refuse') + '  ' + r.f.padEnd(24) + r.v.why.slice(0, 74));
  }
  console.log('trees tested: ' + trees.length + ' — allows ' + allows + ' (the allow-control must be exactly 1), ' +
    'edit-box refusals ' + editorRefusals + ', other refusals ' + otherRefusals);
  /* Findings: anything other than the control being the sole allowed row is a rule that stopped discriminating. */
  const findings = (allows === 1 && allowControl.v.ok) ? 0 : 1;
  console.log('findings: ' + findings);
  process.exit(findings ? 1 : 0);
}

if (process.argv.indexOf('--guard-test') > -1) {
  const wrap = (focused) => ({ total: 3, pickerNodes: 3,
    focused: focused, rows: [], named: [], fixture: focused.filter(n => (n.text + n.desc).indexOf(FIXTURE_NAME) > -1) });
  const cases = [
    ['nothing focused', wrap([]), false],
    ['an owners photograph focused', wrap([{ text: '', desc: 'Preview the file IMG_20261020_1859', bounds: '[167,526][244,603]', cls: 'FrameLayout' }]), false],
    ['the fixture focused', wrap([{ text: FIXTURE_NAME, desc: '', bounds: '[167,526][244,603]', cls: 'FrameLayout' }]), true]
  ];
  let bad = 0;
  for (const c of cases) {
    const v = centerAllowed(c[1]);
    if (v.ok !== c[2]) bad++;
    console.log((v.ok === c[2] ? 'ok   ' : 'WRONG') + ' ' + c[0] + ' — allowed=' + v.ok + ' want=' + c[2] + ' | ' + v.why);
  }
  console.log(bad ? 'GUARD TEST FAILED' : 'GUARD TEST PASSED: centre is allowed only when the fixture holds focus.');
  process.exit(bad ? 1 : 0);
}

/* ---------- stages ---------- */
const treeArg = process.argv.filter(a => a.startsWith('--tree='))[0];
if (treeArg) { reportTree(parseTree(fs.readFileSync(treeArg.slice(7), 'utf8')), treeArg.slice(7)); process.exit(0); }

if (process.argv.indexOf('--dump') > -1) {
  reportTree(parseTree(dump()), 'live device');
  console.log('page holds: ' + ask(PAGE_STATE));
  process.exit(0);
}

if (process.argv.indexOf('--key') > -1) {
  const name = process.argv[process.argv.indexOf('--key') + 1] || '';
  const CODES = { BACK: 4, DPAD_UP: 19, DPAD_DOWN: 20, DPAD_LEFT: 21, DPAD_RIGHT: 22, DPAD_CENTER: 23, ENTER: 66, TAB: 61, MENU: 82 };
  if (!(name in CODES)) { console.log('NO KEY — this tool sends one named key at a time: --key=TAB. Refusing to guess.'); process.exit(1); }
  const before = ask(PAGE_STATE);
  if (name === 'DPAD_CENTER' || name === 'ENTER') {
    const v = centerAllowed(parseTree(dump()));
    if (!v.ok) { console.log('REFUSED — ' + name + ' was not sent. ' + v.why); process.exit(1); }
    console.log('centre allowed: ' + v.why);
  }
  adb('shell', 'input', 'keyevent', String(CODES[name]));
  sleep(1600);
  console.log('key: ' + name + ' (' + CODES[name] + ')');
  reportTree(parseTree(dump()), 'after ' + name);
  console.log('page before: ' + before);
  console.log('page after:  ' + ask(PAGE_STATE));
  process.exit(0);
}

if (process.argv.indexOf('--fixture') > -1) {
  /* A one-pixel PNG generated here, not a file from the owner's library. Walk 5's lesson: `adb push` alone
     preserves the date and indexes nothing, so the picker's RECENT IMAGES never showed it — the file only
     appeared after `touch` plus a scan broadcast. */
  const local = ROOT + '.scratch/' + FIXTURE_NAME;
  fs.writeFileSync(local, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==', 'base64'));
  console.log('push: ' + adb('push', local, FIXTURE_PATH).trim().split('\n').pop());
  adb('shell', 'touch', FIXTURE_PATH);
  adb('shell', 'am', 'broadcast', '-a', 'android.intent.action.MEDIA_SCANNER_SCAN_FILE', '-d', 'file://' + FIXTURE_PATH);
  sleep(2500);
  const rows = adb('shell', 'content', 'query', '--uri', 'content://media/external/images/media', '--projection', '_id:_data:date_modified');
  const mine = String(rows).split('\n').filter(l => l.indexOf(FIXTURE_NAME) > -1);
  console.log('mediastore rows naming the fixture: ' + mine.length + (mine.length ? ' — ' + mine[0].trim().slice(0, 90) : ''));
  console.log('listing of /sdcard/Download: ' + adb('shell', 'ls', '/sdcard/Download/').split('\n').filter(n => /suki/i.test(n)).join(', '));
  process.exit(mine.length ? 0 : 1);
}

if (process.argv.indexOf('--open') > -1) {
  /* Raise the chooser the way a thumb does: the concierge's own painted button, tapped at the rect the
     page reports. element.click() carries no user activation and Chrome refuses a chooser without one. */
  ask("state.view='app';state.role='resident';state.tab='home';render();" +
    "(function(){var s=document.getElementById('screen');s.style.scrollBehavior='auto';" +
    "var b=[].slice.call(document.querySelectorAll('#screen [onclick]')).find(function(e){return /hidden-file-input/.test(e.getAttribute('onclick')||'')});" +
    "if(b){var q=b.getBoundingClientRect();s.scrollTop=Math.max(0,s.scrollTop+q.top-300);}return 1})()");
  const rect = ask("(function(){var b=[].slice.call(document.querySelectorAll('#screen [onclick]')).find(function(e){return /hidden-file-input/.test(e.getAttribute('onclick')||'')});" +
    "if(!b)return 'MISSING';var q=b.getBoundingClientRect();if(!q.height)return 'ZERO';return Math.round(q.left+q.width/2)+','+Math.round(q.top+q.height/2)})()");
  if (!/^ *\d+,\d+ *$/.test(rect)) { console.log('photo control rect: ' + rect + ' — refusing to tap a guess.'); process.exit(1); }
  probe(['--tap=' + rect.trim(), '1']);
  sleep(3500);
  console.log('tapped the photo control at page ' + rect.trim());
  console.log('top window: ' + adb('shell', 'dumpsys', 'window').split('\n').filter(l => /mCurrentFocus|mFocusedApp/.test(l)).map(s => s.trim()).join(' | '));
  reportTree(parseTree(dump()), 'the window that came up');
  process.exit(0);
}

if (process.argv.indexOf('--teardown') > -1) {
  console.log('remove from page: ' + ask("(function(){var b=[].slice.call(document.querySelectorAll('#screen [onclick]')).find(function(e){return /removeConciergePhoto/.test(e.getAttribute('onclick')||'')});" +
    "if(!b)return 'NO REMOVE CONTROL';b.click();return 'clicked'})()"));
  console.log('page after remove: ' + ask(PAGE_STATE));
  adb('shell', 'content', 'delete', '--uri', 'content://media/external/images/media', '--where', "_data LIKE '%suki-leg9-test%'");
  console.log('rm: ' + adb('shell', 'rm', FIXTURE_PATH).trim());
  adb('shell', 'am', 'broadcast', '-a', 'android.intent.action.MEDIA_SCANNER_SCAN_FILE', '-d', 'file://' + FIXTURE_PATH);
  console.log('listing now: ' + (adb('shell', 'ls', '/sdcard/Download/').split('\n').filter(n => /suki/i.test(n)).join(', ') || 'no suki* files'));
  console.log('window_dump left: ' + (adb('shell', 'ls', '/sdcard/window_dump.xml').indexOf('No such file') > -1 ? 'none' : 'present — removing') );
  adb('shell', 'rm', '/sdcard/window_dump.xml');
  console.log('app: ' + PKG);
  process.exit(0);
}

console.log('usage: --tree=FILE | --dump | --key=NAME | --fixture | --open | --teardown');

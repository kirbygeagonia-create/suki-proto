/* Which phone is a saved uiautomator tree from? Answered by mtime and package, never by filename.

   Walk 9's second leg asks whether ColorOS's document picker accepts `input keyevent`. On 2026-10-24 I
   read an answer into three documents from `.scratch/docui.xml` and attributed it to the OPPO because a
   neighbour file had a device-ish name. A directory scan said otherwise: that tree and `d2.xml`–`d8.xml`
   are all stamped 2026-10-22 16:43–16:58, the window in which walk 7 ran the key route on the **vivo** —
   so they corroborate a walk that had already passed, and they say nothing about ColorOS. This tool exists
   so the next reader asks the directory instead of guessing from a name.

     node tools/device-dump-provenance.cjs
     node tools/device-dump-provenance.cjs --dir=.scratch --window=2026-10-22

   Every tree that belongs to a document picker is listed with its timestamp, node count, and how many of
   its nodes are focused and focusable — focus counts are what decide whether a key route could have landed
   anywhere. Refuses with `NO CONCLUSION` when no picker tree is present at all, because an empty directory
   and a directory full of trees that never focused are different answers and must not print the same
   sentence. Named `device-*` rather than `probe-*`/`audit-*` on purpose: `probe-all.cjs` discovers those
   prefixes by filename and runs them against the app, and this reads files, not the application. */
'use strict';
const fs = require('fs');
const path = require('path');
const argv = process.argv.slice(2);
const dirFlag = argv.find(a => a.startsWith('--dir='));
const winFlag = argv.find(a => a.startsWith('--window='));
const DIR = dirFlag ? dirFlag.slice(6) : '.scratch';
const WINDOW = winFlag ? winFlag.slice(9) : null;
const PICKERS = ['com.google.android.documentsui', 'com.android.documentsui', 'com.mediatek.filemanager',
  'com.coloros.filemanager', 'com.oppo.filemanager', 'com.vivo.filemanager'];

const abs = path.resolve(DIR);
if (!fs.existsSync(abs)) { console.log('NO CONCLUSION: ' + DIR + ' does not exist, so no tree can be attributed to any device.'); process.exit(1); }
const files = fs.readdirSync(abs).filter(f => /\.xml$/i.test(f));
if (!files.length) { console.log('NO CONCLUSION: no XML in ' + DIR + ' — an empty directory is not evidence that no device ever focused a row.'); process.exit(1); }

const rows = [];
for (const f of files) {
  const p = path.join(abs, f);
  let xml;
  try { xml = fs.readFileSync(p, 'utf8'); } catch (e) { console.log('unreadable ' + f + ' — skipped and reported'); continue; }
  const pkgs = new Set((xml.match(/package="([^"]+)"/g) || []).map(s => s.slice(9, -1)));
  const picker = PICKERS.filter(x => pkgs.has(x));
  const focused = (xml.match(/focused="true"/g) || []).length;
  const focusable = (xml.match(/focusable="true"/g) || []).length;
  const nodes = (xml.match(/<node\b/g) || []).length;
  if (!picker.length && !focused) continue;
  rows.push({ f, mtime: fs.statSync(p).mtime, pkgs: [...pkgs], picker: picker.length > 0,
    pickerPkg: picker[0] || '', nodes, focused, focusable });
}
rows.sort((a, b) => a.mtime - b.mtime);

const shown = WINDOW ? rows.filter(r => r.mtime.toISOString().startsWith(WINDOW)) : rows;
if (!shown.length) {
  console.log('NO CONCLUSION: ' + (WINDOW ? 'no tree stamped ' + WINDOW + ' in ' + DIR : 'no picker tree and no focused node in ' + DIR) +
    ' — the scan ran over ' + files.length + ' XML file(s) and found nothing to attribute.');
  process.exit(1);
}
console.log('directory ' + abs + ' — ' + files.length + ' XML file(s), ' + rows.length +
  ' carry a picker window or a focused node' + (WINDOW ? ', ' + shown.length + ' stamped ' + WINDOW : ''));
for (const r of shown) {
  console.log('  ' + r.f.padEnd(16) + r.mtime.toISOString().slice(0, 16) + '  nodes=' + String(r.nodes).padStart(4) +
    '  picker=' + (r.picker ? 'yes' : 'no ') + '  focused=' + String(r.focused).padStart(3) +
    '  focusable=' + String(r.focusable).padStart(3) + '  [' + (r.pickerPkg || r.pkgs[0] || '?') + ']');
}
const pickerTrees = shown.filter(r => r.picker);
const withFocus = pickerTrees.filter(r => r.focused > 0);
console.log('picker trees: ' + pickerTrees.length + '  with a focused node: ' + withFocus.length +
  '  without: ' + (pickerTrees.length - withFocus.length));
if (pickerTrees.length) {
  const first = pickerTrees[0].mtime.toISOString().slice(0, 16), last = pickerTrees[pickerTrees.length - 1].mtime.toISOString().slice(0, 16);
  console.log('time span ' + first + ' → ' + last +
    ' — a tree\'s device comes from this span against the walk record, never from its file name.');
}
const pkgsSeen = new Set(pickerTrees.map(r => r.pickerPkg));
console.log('distinct picker packages: ' + pkgsSeen.size + ' [' + [...pkgsSeen].join(', ') + '] — ' +
  (pkgsSeen.size > 1
    ? 'MIXED: these trees come from more than one picker build, so a per-file attribution is required before any of them is cited as "the" picker'
    : 'one picker package, so the directory is not mixing OEMs — which is also why a filename can never tell the phones apart'));
process.exit(0);

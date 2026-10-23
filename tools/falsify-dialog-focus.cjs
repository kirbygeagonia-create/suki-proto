/* Proves the camera's layer tally can fail, and that each of its four reasons is separately
   observable — because a count that lumps them together would let a fix that only moves the caret
   read as a fix that also names the dialog.

   What it guards (AGENTS §77): measured on 2026-10-20 with tools/probe-layer-focus.js across the
   nine layer screens the camera can reach, every SHEET already declared role="dialog" with a name
   while every MODAL declared nothing, and eight of the nine held the caret on <body>. The app now
   labels the top layer and moves focus into it in the same render pass that marks everything else
   inert, and the tally `layers that opened without dialog semantics or the caret inside them`
   reads 0 across every screen in the walk — 73 as of 2026-10-23, and `node tools/shot.cjs --list`
   prints that count rather than this comment being trusted with it.

   Four breaks, one per guarantee:
     1  the label+focus call is removed from render        -> every modal screen reports role+modal+name+focus
     2  the focus move is disabled, semantics kept         -> findings name `focus` and nothing else
     3  the accessible name is not assigned                -> findings name `name`
     4  the tally's own selector is blinded                -> reads 0 WITH the defect present, which is
        the evidence that the clean run is the sensor answering, not the app being quiet

   The verdict is read from the camera's own lines and the mutated file is diffed before it is run:
   a mutation that silently fails to apply produces a 0, and a 0 reads exactly like a passing pass.

     node tools/falsify-dialog-focus.cjs    ~6 minutes, needs the machine's Chrome                */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'Sukinnect-next.html');
const CAM = path.join(ROOT, 'tools', 'shot.cjs');
const PRISTINE = fs.readFileSync(APP, 'utf8');
const TALLY = 'layers that opened without dialog semantics or the caret inside them: ';
const SCREENS = 'booking-sheet,resident-payment-modal,resident-edit-form,provider-edit-form,admin-edit-form,admin-security-modal,case-sheet,offer-sheet,admin-review-approve';

const NEEDLES = {
  call: '  setInertOutside(topLayerEl());\n  labelTopLayer(topLayerEl());',
  focus: 'function focusIntoLayer(box, layer){\n  const sig =',
  name: "      if (!head.id) head.id = 'layer-title-' + (++layerTitleSeq);",
  selector: "document.querySelectorAll('[data-layer], .modal-layer, .sheet-layer')",
};
for (const [k, needle] of Object.entries(NEEDLES)) {
  const target = k === 'selector' ? fs.readFileSync(CAM, 'utf8') : PRISTINE;
  const n = target.split(needle.replace(/\n/g, '\r\n')).length - 1;
  if (n !== 1) throw new Error('pre-flight: ' + k + ' matched ' + n + ' times, needs exactly 1');
}

function runCamera() {
  let out = '';
  try { out = execFileSync(process.execPath, [CAM, '--measure', '--only=' + SCREENS],
    { encoding: 'utf8', cwd: ROOT, maxBuffer: 64 * 1024 * 1024, timeout: 600000 }); }
  catch (err) { out = (err.stdout || '') + (err.stderr || ''); }
  const line = out.split(/\r?\n/).find(l => l.startsWith(TALLY));
  const count = line ? Number(line.slice(TALLY.length).trim()) : null;
  const reasons = new Set();
  out.split(/\r?\n/).forEach(l => {
    const m = l.match(/is missing ([a-z+]+)/);
    if (m) m[1].split('+').forEach(r => reasons.add(r));
  });
  return { count, reasons: [...reasons].sort().join(','), printed: !!line };
}

/* One mutation of one file, asserted to have landed before its verdict is believed. */
function mutate(file, from, to) {
  const p = file === 'cam' ? CAM : APP;
  const src = fs.readFileSync(p, 'utf8');
  const f = from.replace(/\n/g, '\r\n'), t = to.replace(/\n/g, '\r\n');
  const n = src.split(f).length - 1;
  if (n !== 1) return { ok: false, why: 'anchor matched ' + n + ' times' };
  const next = src.replace(f, t);
  if (next === src) return { ok: false, why: 'the mutant is byte-identical to the source' };
  fs.writeFileSync(p, next);
  return { ok: true, p, pristine: src };
}

const BREAKS = [
  { name: 'the render pass stops labelling and focusing the top layer',
    file: 'app', from: NEEDLES.call, to: '  setInertOutside(topLayerEl());',
    expect: { min: 6, reasons: 'focus,name,role' } },
  { name: 'the semantics are kept and only the caret is refused',
    file: 'app', from: NEEDLES.focus, to: 'function focusIntoLayer(box, layer){\n  return;\n  const sig =',
    expect: { min: 8, reasons: 'focus' } },
  { name: 'the dialog is named by nothing — the painted title is never pointed at',
    file: 'app', from: NEEDLES.name, to: '      if (!head.id) head.id = head.id;',
    expect: { min: 1, reasons: 'name' } },
  { name: 'the tally cannot see any layer at all, which is how a blind sensor prints 0',
    file: 'cam', from: NEEDLES.selector,
    to: "document.querySelectorAll('[data-layer=\"nothing-matches-this\"]')",
    expect: { count: 0, blinded: true } },
];

let applied = 0, caught = 0, missed = 0, notPlanted = 0;
const restore = [];
try {
  const base = runCamera();
  console.log('control  unmutated app, unblinded tally: count=' + base.count + ' reasons=[' + base.reasons + ']');
  if (!base.printed) { console.log('ABORT — the camera never printed the tally line. NO CONCLUSION.'); process.exitCode = 1; }
  else if (base.count !== 0) { console.log('ABORT — the tally is already firing at count ' + base.count + '; nothing below isolates a cause.'); process.exitCode = 1; }
  else {
    for (const b of BREAKS) {
      /* Break 4 needs the app defect in place as well, or a 0 proves only that the app is clean. */
      const first = b.expect.blinded ? mutate('app', NEEDLES.call, '  setInertOutside(topLayerEl());') : { ok: true };
      if (!first.ok) { notPlanted++; console.log('NOT PLANTED  ' + b.name + '  (' + first.why + ')'); continue; }
      if (first.p) restore.push({ p: first.p, s: first.pristine });
      const m = mutate(b.file, b.from, b.to);
      if (!m.ok) { notPlanted++; console.log('NOT PLANTED  ' + b.name + '  (' + m.why + ')'); continue; }
      restore.push({ p: m.p, s: m.pristine });
      applied++;
      const r = runCamera();
      let ok;
      if (b.expect.blinded) ok = r.printed && r.count === 0 && !r.reasons;
      else ok = r.printed && r.count >= b.expect.min && b.expect.reasons.split(',').every(x => r.reasons.includes(x));
      if (ok) { caught++; console.log('CAUGHT   ' + b.name + '\n         -> count=' + r.count + ' reasons=[' + r.reasons + ']'
        + (b.expect.blinded ? '  (the defect is present and the sensor is deaf — which is the point)' : '')); }
      else { missed++; console.log('MISSED   ' + b.name + '  (got count=' + r.count + ' reasons=[' + r.reasons + '], wanted '
        + (b.expect.blinded ? 'a silent 0' : '>= ' + b.expect.min + ' incl. ' + b.expect.reasons) + ')'); }
      /* Put every file back before judging the next break, or the pair of breaks below measures a
         compound defect instead of the one it names. */
      while (restore.length) { const it = restore.pop(); fs.writeFileSync(it.p, it.s); }
    }
    console.log('─'.repeat(78));
    console.log(caught + ' of ' + applied + ' breaks caught, ' + notPlanted + ' not applied, ' + missed + ' missed');
    process.exitCode = (caught === applied && applied === BREAKS.length && notPlanted === 0) ? 0 : 1;
  }
} finally {
  while (restore.length) { const it = restore.pop(); fs.writeFileSync(it.p, it.s); }
  fs.writeFileSync(APP, PRISTINE);
  const back = fs.readFileSync(APP, 'utf8') === PRISTINE;
  const camBack = fs.readFileSync(CAM, 'utf8').indexOf(NEEDLES.selector.replace(/\n/g, '\r\n')) > -1;
  console.log('cleanup  app restored: ' + back + ' · camera selector restored: ' + camBack);
  if (!back || !camBack) process.exitCode = 1;
}

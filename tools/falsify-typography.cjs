/* AGENTS.md §68 says the rebuild removed the decorative serif from headings and runs one
   sans family — Atkinson Hyperlegible Next in four self-hosted weights — everywhere. Nothing
   asserted it. A one-line `--font-display: "Fraunces", serif` would have reversed the redesign
   in silence, and a @font-face whose file is missing is worse: the browser does not error, it
   falls back, so every screenshot and every contrast figure in the repo gets measured on a face
   the app never loaded. This breaks each half of the rule in turn and requires the named gate
   check to fail.
     node tools/falsify-typography.cjs                                    */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'Sukinnect-next.html');
const FONTS = path.join(ROOT, 'fonts', 'fonts.css');
const files = { APP: fs.readFileSync(APP, 'utf8'), FONTS: fs.readFileSync(FONTS, 'utf8') };

/* Last-occurrence rename, because four @font-face blocks share one family line and a plain
   replace would move all of them, which is mutant 3's break rather than this one. */
const renameLastAtkinsonFace = s => {
  const needle = "font-family: 'Atkinson Next'";
  const at = s.lastIndexOf(needle);
  return at < 0 ? s : s.slice(0, at) + "font-family: 'Atkinson Next Extra'" + s.slice(at + needle.length);
};

/* Single-line needles: both files are CRLF, so a needle carrying \n matches nothing and the
   mutant prints SKIP while looking like a clean run. */
const MUTANTS = [
  { name: 'a woff2 the stylesheet promises is not on disk', where: 'FONTS', check:
    'every font the stylesheet promises is a file that exists',
    apply: s => s.replace('url(font-atkinson-next-semibold.woff2)', 'url(font-atkinson-next-900.woff2)') },
  { name: 'a font file becomes a 479-byte placeholder stub', where: 'FONTS', check:
    'and none of them is a placeholder stub',
    apply: s => s.replace('url(font-atkinson-next-semibold.woff2)', 'url(ATKINSON-AUTHORS.txt)') },
  { name: 'the stack asks for a family the stylesheet never declares', where: 'APP', check:
    'the face the app asks for first is one the stylesheet actually declares',
    apply: s => s.replace('--font-ui:"Atkinson Next"', '--font-ui:"Atkinson Alternate Next"') },
  { name: 'one of the four weights loses its face', where: 'FONTS', check:
    'the four weights the rebuild says it carries are really four',
    apply: renameLastAtkinsonFace },
  { name: 'a sheet titles itself in a family typed into the rule', where: 'APP', check:
    'no rule names a font family directly — every one goes through the two tokens',
    apply: s => s.replace('.sheet-title{ font-family:var(--font-display)', '.sheet-title{ font-family:"Plus Jakarta Sans"') },
  { name: 'the display alias goes back to the decorative serif', where: 'APP', check:
    'the display face is an alias, so the decorative serif stays out',
    apply: s => s.replace('--font-display:var(--font-ui);', '--font-display:"Fraunces", ui-serif, serif;') },
];

function gateRun() {
  try {
    return { code: 0, out: execFileSync(process.execPath, [path.join(ROOT, 'tools', 'verify.cjs')],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (err) {
    return { code: err.status === undefined ? -1 : err.status, out: (err.stdout || '') + (err.stderr || '') };
  }
}

let caught = 0, applied = 0, skipped = 0;
try {
  for (const m of MUTANTS) {
    const mutated = m.apply(files[m.where]);
    if (mutated === files[m.where]) {
      skipped++;
      console.log('SKIP    ' + m.name + '  (needle did not match ' + m.where + ')');
      continue;
    }
    applied++;
    fs.writeFileSync(m.where === 'APP' ? APP : FONTS, mutated);
    const run = gateRun();
    const failed = run.code !== 0 && run.out.includes('FAIL  ' + m.check);
    if (failed) { caught++; console.log('CAUGHT  ' + m.name); }
    else console.log('MISSED  ' + m.name + '  (exit ' + run.code + ', named check '
      + (run.code !== 0 ? 'not the one that failed' : 'passed anyway') + ')');
    fs.writeFileSync(m.where === 'APP' ? APP : FONTS, files[m.where]);
  }
} finally {
  fs.writeFileSync(APP, files.APP);
  fs.writeFileSync(FONTS, files.FONTS);
}
console.log('\nmutants applied ' + applied + ', caught ' + caught + ', not applied ' + skipped);
process.exit(caught === applied && applied > 0 ? 0 : 1);

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

/* Withdrawing one Poppins face, by renaming its family line. Eight @font-face blocks share that one
   line, so a plain string replace would move all eight — which is a different mutant than this one.
   `count` is how many blocks of that weight to withdraw: ONE is the case a set of distinct weights
   cannot see at all (every weight survives in its other subset), TWO removes the weight outright.
   Located by indexOf on the literal weight line rather than by a RegExp built from a string, because
   the regex form is one escaping layer away from silently matching nothing — a filter that answers
   zero blocks makes every break print SKIP while the run still looks like a clean suite. */
function withdrawPoppinsBlocks(s, count, weight) {
  const familyLine = "font-family: 'Poppins'";
  const weightLine = 'font-weight: ' + weight + ';';
  const blocks = (s.match(/@font-face\s*\{[^}]*\}/g) || []).filter(function (b) {
    return b.indexOf(familyLine) >= 0 && b.indexOf(weightLine) >= 0;
  });
  if (blocks.length < count) return s;
  let out = s;
  blocks.slice(0, count).forEach(function (b) {
    const at = out.indexOf(b);
    if (at < 0) return;
    out = out.slice(0, at) + b.replace(familyLine, "font-family: 'Poppins Withdrawn'") + out.slice(at + b.length);
  });
  return out;
}

/* Single-line needles: both files are CRLF, so a needle carrying a newline matches nothing and the
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
    apply: s => s.replace('--font-ui:"Poppins"', '--font-ui:"Atkinson Alternate Next"') },
  /* Re-pointed 2026-10-27. The break it replaces renamed the last ATKINSON face while naming a check
     that had been amended to count the weights of the UI family — which is Poppins — so the mutation
     could not move the number it was written to move. The family printed a survivor about a guard that
     had already gone stale, and it did so through a SEMANTIC change rather than a spelling change: the
     needle still matched, the mutant still applied, and only `caught === applied` hid the gap.
       One block per mutant, one mutant per guard. Poppins declares every weight in two subsets, so
     withdrawing ONE leaves four distinct weights and the weight-set check stays green — that is exactly
     what the new relational check exists to see. */
  { name: 'one subset of one weight is withdrawn while the weight set still reads four', where: 'FONTS', check:
    'every weight the interface family claims is declared the same number of times',
    apply: s => withdrawPoppinsBlocks(s, 1, '600') },
  { name: 'a whole weight loses both its subsets, so the UI family is a three-weight family', where: 'FONTS', check:
    'the four weights the rebuild says it carries are really four',
    apply: s => withdrawPoppinsBlocks(s, 2, '600') },
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

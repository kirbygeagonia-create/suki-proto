/* Proves the target-clean guards and the empty-selection guard in `tools/falsify-all.cjs` can fail.

   On 2026-10-22 a mutant-runner pass was cancelled while `falsify-double-tap` held its break in the
   application file (`if (changed.length) {` became `if (true) {` in `saveAdminProfile`), and the log
   simply stopped mid-table. The injected defect — the exact bug that family exists to catch — sat in
   the working file until someone asked `git status`. The runner's own header already said abandoning a
   run early is the one way to leave a mutant in the tree, and nothing in the suite checked.

   So the runner asks the tree before it starts and after it finishes, and refuses a filter that names no
   family. The rows below are the breaks; the count is whatever `node tools/falsify-all.cjs` prints for
   this family, because a number written here rots the day a fifth row is added and this file already
   shipped that drift once. The order matters: the positive control runs first, because a guard that
   refuses everything passes two of these tests by never running anything.

     1. clean tree           → the filtered pass must RUN (exit 0, a family row printed)
     2. filter names nothing → the pass must print NO MATCH and exit non-zero, not `0 families, 0 caught
                              — every rule is still being tested` and exit 0
     3. stranded needle      → the family applies fewer mutants and catches every one of them, so its
                              own arithmetic says `0 not applied`; the runner must read the SKIP line
                              instead, mark the row `NEEDLE MISSED`, and exit non-zero. Mounted third
                              because the two rows below leave the target dirty on purpose, and the
                              runner rightly refuses to run a family against a dirty target.
     4. dirty tree           → the pass must REFUSE before touching the file (exit 1, TARGET NOT CLEAN,
                              and no family row anywhere in its output)
     5. dirty tree, twice    → the refusal must not quietly restore the tree: reporting a hazard and
                              repairing it are different acts, and a guard that repairs hides the run
                              that made the mess

   DO NOT RUN THIS WHILE ANOTHER MUTANT PASS IS ALIVE. It writes a real line into
   Sukinnect-next.html to build its fixture, and the application file is the mutex — a pass reading a
   mid-mutation file reports both false survivals and false "not applied".

     node tools/falsify-preflight.cjs    ~90 seconds, no browser                            */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');
const EOL = original.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
/* A filter naming one cheap gate-only family, so the fixture runs one family instead of 44. The first
   version of this line copied `count-labes` from the runner's own header example, which matches no
   family at all — the nested pass ran nothing, printed a green zero, and this file's positive control
   refused to credit its own baseline. Both the typo and the silent zero are fixed, and the zero is now
   the third row below. */
const FILTER = 'count-labels';
const NEEDLE = '  if (changed.length) {' + EOL +
  '    adminLog(\'Admin profile updated\', state.adminProfileData.name,';
/* Only the guard changes, exactly as the interrupted family left it, so the fixture is valid JavaScript
   and a broken preflight would show up as a real gate failure rather than as a parse error. */
const MUTANT = '  if (true) {' + EOL +
  '    adminLog(\'Admin profile updated\', state.adminProfileData.name,';
if (original.split(NEEDLE).length - 1 !== 1) {
  console.log('the line this family dirties the tree with is not where it expects it (matched ' +
    (original.split(NEEDLE).length - 1) + ', expected 1) — nothing was written');
  process.exit(1);
}

function gitClean() {
  return execFileSync('git', ['status', '--porcelain', '--', 'Sukinnect-next.html'],
    { cwd: ROOT, encoding: 'utf8' }).trim() === '';
}
function runRunner(filter) {
  let out = '', code = 0;
  try {
    out = execFileSync(process.execPath, [path.join(ROOT, 'tools', 'falsify-all.cjs'), filter || FILTER],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) { out = (err.stdout || '') + (err.stderr || ''); code = err.status === undefined ? -1 : err.status; }
  return { code, out, refused: /TARGET NOT CLEAN/.test(out), ran: new RegExp(FILTER + '\\s+\\d').test(out),
    nomatch: /NO MATCH/.test(out) };
}

let caught = 0, applied = 0, unmatched = 0;
const results = [];
try {
  /* 1 — the positive control, first: on a clean tree the pass has to actually run. */
  if (!gitClean()) {
    console.log('BASELINE the tree is already dirty — recover it before testing the guard, because this');
    console.log('fixture must not overwrite somebody else\'s work.');
    process.exit(1);
  }
  const control = runRunner();
  if (control.code !== 0 || !control.ran || control.refused) {
    console.log('BASELINE the filtered pass did not run on a clean tree (exit ' + control.code +
      ', ran a family: ' + control.ran + ', refused: ' + control.refused + ') — the guard cannot be');
    console.log('credited with condemning a dirty tree until it is shown to permit a clean one.');
    process.exit(1);
  }
  console.log('control: clean tree → exit 0, `' + FILTER + '` row printed, no refusal');

  /* 2 — a filter that names no family must not print a green zero. */
  applied++;
  const none = runRunner('zz-no-such-family');
  if (none.code !== 0 && none.nomatch && !none.ran) {
    caught++; console.log('CAUGHT  a filter naming no family says so instead of passing → exit ' + none.code);
  } else {
    console.log('MISSED  a filter naming no family still looked clean (exit=' + none.code +
      ', NO MATCH printed=' + none.nomatch + ', ran a family=' + none.ran + ')');
  }

  /* 3 — a family that loses a needle applies fewer mutants and catches every one of them, so its own
     summary arithmetic says `0 not applied` and the old row read clean. The runner has to read the
     SKIP line the family printed instead. This plants the loss in the filtered family rather than
     asserting the marker exists, because a string inside the runner's row builder is decoration until
     a row carries it.
     It runs BEFORE the dirty-tree pair, and that is not cosmetic: the two breaks below leave the
     target dirty on purpose (that is their assertion), and the runner's own pre-flight refuses a
     dirty target without running a family. Mounted after them, this break got exit=1 and an empty
     flagged-row list, which is the guard working perfectly and reading as a missed mutant. A break
     that inherits another break's fixture is measuring the fixture. */
  applied++;
  if (!gitClean()) {
    console.log('MISSED  the stranded-needle break refuses to run on a dirty target — the pass below would');
    console.log('        answer TARGET NOT CLEAN, not NEEDLE MISSED, and that refusal is not this rule');
  } else {
  const FAM = path.join(ROOT, 'tools', 'falsify-' + FILTER + '.cjs');
  const pristineFam = fs.readFileSync(FAM);
  const FAM_NEEDLE = "'const open = agreed + waiting;'";
  const FAM_MUTANT = "'const open = agreed + waitingXX;'";
  const famText = pristineFam.toString('utf8');
  if (famText.split(FAM_NEEDLE).length - 1 !== 1) {
    console.log('MISSED  the stranded-needle break could not be planted (' +
      (famText.split(FAM_NEEDLE).length - 1) + ' matches for the family needle)');
  } else {
    fs.writeFileSync(FAM, famText.replace(FAM_NEEDLE, FAM_MUTANT));
    const r = runRunner();
    const marked = /NEEDLE MISSED/.test(r.out);
    const skipEchoed = r.out.split(/\r?\n/).some(l => l.indexOf('| SKIP') >= 0);
    fs.writeFileSync(FAM, pristineFam);
    if (r.code !== 0 && marked && skipEchoed && !/MUTANT SURVIVED/.test(r.out)) {
      caught++;
      console.log('CAUGHT  a stranded needle marks its own row → exit ' + r.code +
        ', NEEDLE MISSED printed=' + marked + ', the SKIP line echoed=' + skipEchoed +
        ', no survivor invented=' + !/MUTANT SURVIVED/.test(r.out));
    } else {
      /* Print what the nested pass actually said. This break reported MISSED once with exit=1 and no
         marker, and the four booleans could not say whether the plant never reached the child or the
         child refused for an unrelated reason — which is the same shape as a flagged aggregate row
         that carries a count and no verdict lines. */
      const rows = r.out.split(/\r?\n/).filter(l => /<<<|^\s+\||count-labels|no summary|family needs attention|TARGET NOT CLEAN/.test(l));
      console.log('MISSED  a stranded needle still read as a healthy row (exit=' + r.code +
        ', NEEDLE MISSED=' + marked + ', SKIP echoed=' + skipEchoed + ', tree clean before the plant=' + true +
        ')\n      nested pass said:\n      ' +
        (rows.join('\n      ').slice(0, 500) || '(no flagged row at all)'));
    }
  }
  }

  /* 4 and 5 — dirty the tree the way an interrupted family does, and leave it dirty while asking. */
  for (const b of [
    { name: 'a dirty target stops the pass before it mutates anything',
      expectRefusal: true },
    { name: 'the refusal reports the tree instead of repairing it',
      expectRefusal: true, checkRestore: true },
  ]) {
    applied++;
    fs.writeFileSync(TARGET, original.replace(NEEDLE, MUTANT));
    const r = runRunner();
    const stillDirty = !gitClean();
    if (b.checkRestore) {
      if (r.refused && stillDirty) { caught++; console.log('CAUGHT  ' + b.name + ' (tree still dirty after the refusal: true)'); }
      else console.log('MISSED  ' + b.name + ' (refused=' + r.refused + ', stillDirty=' + stillDirty + ')');
    } else {
      if (r.refused && !r.ran && r.code !== 0) { caught++; console.log('CAUGHT  ' + b.name + ' → exit ' + r.code + ', no family row'); }
      else console.log('MISSED  ' + b.name + ' (refused=' + r.refused + ', ran=' + r.ran + ', exit=' + r.code + ')');
    }
    results.push(stillDirty);
  }
} finally {
  fs.writeFileSync(TARGET, original);
}

const after = fs.readFileSync(TARGET, 'utf8');
if (after !== original) { console.log('the file did not come back identical — stop and look before trusting anything above'); process.exit(1); }
if (!gitClean()) { console.log('the tree is still dirty after the restore — `git status` will say what is left'); process.exit(1); }

console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied; file restored.');
process.exit(caught === applied && applied === 4 && unmatched === 0 ? 0 : 1);

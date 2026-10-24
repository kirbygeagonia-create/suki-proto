/* Proves the target-clean guards and the empty-selection guard in `tools/falsify-all.cjs` can fail.

   On 2026-10-22 a mutant-runner pass was cancelled while `falsify-double-tap` held its break in the
   application file (`if (changed.length) {` became `if (true) {` in `saveAdminProfile`), and the log
   simply stopped mid-table. The injected defect — the exact bug that family exists to catch — sat in
   the working file until someone asked `git status`. The runner's own header already said abandoning a
   run early is the one way to leave a mutant in the tree, and nothing in the suite checked.

   So the runner asks the tree before it starts and after it finishes, and refuses a filter that names no
   family. Three breaks, and the order matters: the positive control runs first, because a guard that
   refuses everything passes two of these tests by never running anything.

     1. clean tree           → the filtered pass must RUN (exit 0, a family row printed)
     2. filter names nothing → the pass must print NO MATCH and exit non-zero, not `0 families, 0 caught
                              — every rule is still being tested` and exit 0
     3. dirty tree           → the pass must REFUSE before touching the file (exit 1, TARGET NOT CLEAN,
                              and no family row anywhere in its output)
     4. dirty tree, twice    → the refusal must not quietly restore the tree: reporting a hazard and
                              repairing it are different acts, and a guard that repairs hides the run
                              that made the mess

   DO NOT RUN THIS WHILE ANOTHER MUTANT PASS IS ALIVE. It writes a real line into
   Sukinnect-next.html to build its fixture, and the application file is the mutex — a pass reading a
   mid-mutation file reports both false survivals and false "not applied".

     node tools/falsify-preflight.cjs    ~40 seconds, no browser                            */
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

  /* 3 and 4 — dirty the tree the way an interrupted family does, and leave it dirty while asking. */
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
process.exit(caught === applied && applied === 3 && unmatched === 0 ? 0 : 1);

/* Every falsifier family, in one run, with the totals printed as a table.

   This exists for the same reason tools/measure.cjs exists: the count of mutants the documents
   quote was kept by hand, and by the time this pass re-ran the families one of those figures had
   drifted (profile honesty was written as 9 and applies 11 today). A figure that has to be
   recomputed in prose is a figure that will be wrong in the next document that quotes it.

   It also reads the line a human skims past. `mutants applied 10, caught 10, not applied 0` is
   the only shape that proves the family tested anything: a family whose needle stopped matching
   the file reports a smaller applied count, and one that crashes mid-run reports nothing at all —
   both of which look like a clean run in a log of PASS lines. A stale needle silently un-guarded
   the doubled-CR check for a week, and a family that caught 0 of 9 mutants once coincided with
   four gate checks that could not fail.

   Sequential on purpose: each family rewrites Sukinnect-next.html and restores it in a finally,
   so two families at once would measure each other's mutants.

     node tools/falsify-all.cjs                (49 families on the tree as of 2026-10-24, counted as
                                                `ls tools/falsify-*.cjs | wc -l` minus this file, not
                                                remembered. The last full pass printed 49 families, 247
                                                mutants applied, 247 caught, 0 not applied in 52 minutes
                                                — wall clock from launch to summary line, not an estimate;
                                                earlier revisions advertised ~35, then ~53, then ~51, then
                                                ~44 minutes for the same machine, and all four were memory.
                                                An advertised cost that is wrong gets its runs abandoned
                                                early, which is the one way to leave a mutant in the tree.)
     node tools/falsify-all.cjs count-labels    # only families whose name matches
*/
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TOOLS = path.join(ROOT, 'tools');
const filter = process.argv[2];

/* The population is derived twice on purpose — once to build the list and once to check it — because the
   failure mode of a suite runner is never a wrong verdict, it is a scan that quietly sees fewer files.
   `onDisk` answers "how many families exist"; the list must equal it after the same filter, or the
   selection rule and the counting rule disagree and every row below the disagreement is about a subset. */
const ON_DISK = fs.readdirSync(TOOLS).filter(f => /^falsify-.*\.cjs$/.test(f) && f !== 'falsify-all.cjs');
const families = fs.readdirSync(TOOLS)
  .filter(f => /^falsify-.*\.cjs$/.test(f))
  /* The runner is not a family. Without this it finds itself, spawns itself, and every mutant
     in the suite runs twice nested one level per family. */
  .filter(f => f !== 'falsify-all.cjs')
  .filter(f => !filter || f.includes(filter))
  .sort();
const expected = ON_DISK.filter(f => !filter || f.includes(filter)).sort();

const TARGET = 'Sukinnect-next.html';
/* A filter that matches nothing must not print a green zero. Found by the family that tests the
   preflight guard: its fixture copied the example filter from this file's own header, which is
   `count-labes` — two letters short of `count-labels` — so the nested pass ran ZERO families, printed
   `0 families, 0 mutants applied, 0 caught, 0 not applied — every rule is still being tested`, and
   exited 0. The word "every" in that sentence is precisely the claim a zero-selection pass cannot make,
   and the positive control in `falsify-preflight` refused to credit its own baseline because of it,
   which is the only reason anyone noticed. */
if (filter && families.length === 0) {
  console.log('NO MATCH — the filter `' + filter + '` named no family, so nothing was tested. Family file names are');
  console.log('`falsify-<name>.cjs`; `node tools/falsify-all.cjs` with no argument runs all ' +
    fs.readdirSync(TOOLS).filter(f => /^falsify-.*\.cjs$/.test(f) && f !== 'falsify-all.cjs').length + '.');
  process.exit(1);
}
/* The selection rule and the counting rule are two ways of asking "which families exist", and they
   have to answer with the same list. 40 is the floor for a FULL pass — the number of families this
   repository has carried for weeks — so falling under it means the runner stopped seeing files rather
   than that someone deleted thirty families. Under a filter the equality against `expected` is the
   whole test, and it is the one a mutated pattern in the list-building expression breaks. */
const FAMILY_FLOOR = 40;
if (families.length !== expected.length) {
  console.log('NO CONCLUSION — the pass selected ' + families.length + ' families and the same directory answers ' +
    expected.length + (filter ? ' for the filter `' + filter + '`' : '') +
    '. The selection rule and the counting rule disagree, so every row below would describe a subset.');
  process.exit(1);
}
if (!filter && families.length < FAMILY_FLOOR) {
  console.log('NO CONCLUSION — the pass named ' + families.length + ' families, below the floor of ' + FAMILY_FLOOR +
    '. `ls tools/falsify-*.cjs | wc -l` is the real population; check the pattern and the directory before');
  console.log('quoting any row below a refusal like this one.');
  process.exit(1);
}
/* A pass that starts on a dirty target measures a file nobody has. Each family rewrites
   Sukinnect-next.html and restores it in a `finally`, so a family that is KILLED — not abandoned,
   killed — leaves its own mutant in the tree with nothing to say about it. This happened on
   2026-10-22: a pass was cancelled while `falsify-double-tap` held its break in place
   (`if (changed.length) {` → `if (true) {` in `saveAdminProfile`), the log simply stopped mid-table,
   and the injected defect — the exact bug that family exists to detect — sat in the working file
   until `git status` was asked. The header of this file already warns that abandoning a run early
   is the one way to leave a mutant in the tree; the warning was about the reader's patience and no
   instrument checked the tree afterwards.
   So ask the tree, before and after. `git status --porcelain` on the one path is the whole test. If
   git itself is unavailable the pass still runs and says so, because a guard that silently disables
   itself is the failure mode this repository has now written down four times. */
function dirtyTarget() {
  try {
    return execFileSync('git', ['status', '--porcelain', '--', TARGET],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (noGit) { return null; }
}
const gitUnavailable = dirtyTarget() === null;
const dirtyBefore = gitUnavailable ? '' : dirtyTarget();
if (dirtyBefore) {
  console.log('TARGET NOT CLEAN — nothing was mutated. `git status --porcelain -- ' + TARGET + '` answers:');
  console.log(dirtyBefore.split(/\r?\n/).map(l => '   ' + l).join('\n'));
  console.log('Either a previous pass was cancelled while a family held a mutant in the file, or another pass is');
  console.log('running right now and this is its live break — this runner is the only writer, so two of them read');
  console.log('each other\'s mutants. Find out which before doing anything: `tasklist | grep -i node` on Windows.');
  console.log('If nothing is running, recover by saving the current bytes somewhere, `git checkout -- ' + TARGET + '`,');
  console.log('then re-running `node tools/verify.cjs` before quoting any number from this runner.');
  process.exit(1);
}

/* The summary shapes the families print, plus the skip line each one emits when its needle no
   longer matches the file. A runner that mis-parses a result is worse than no runner, because it
   prints a confident total. The endings are written two ways across the suite — `not applied 0`
   and `failed to apply 0` — and a first version of this pattern matched only one of them, which
   made six families look like they had crashed when they had finished cleanly four lines earlier.
   A third spelling arrived with the camera families: they say "breaks" rather than "mutants"
   because they restore a defect that was measured on a phone rather than mutate a token, and the
   pattern now accepts either word. A family whose summary the runner cannot read still reports
   itself as unproven rather than as zero — which is exactly what happened on its first run here,
   and is the line to read rather than the headline count. */
/* Each shape carries its own reader, because the families do not agree on the order of their own
   numbers: the Node families print "applied N, caught M", the camera families print "N of M", so a
   single positional rule would read one of the two backwards and print a confident wrong total —
   which is the exact failure this runner exists to avoid, and the reason it reports an
   unparseable family as unproven rather than as zero. */
const SHAPES = [
  { re: /^mutants applied (\d+), caught (\d+), (?:not|failed to) appl(?:y|ied) (\d+)/m,
    read: m => ({ applied: +m[1], caught: +m[2], skipped: +m[3] }) },
  /* The camera families print "N of M mutants caught, K not applied". Without this shape the
     runner derives K as M − N, which conflates a mutant that survived with a needle that no longer
     matches the file — the two things most worth telling apart, because one is a bug in the app
     and the other is a bug in the family. Listed before the shorter shape so it wins. */
  { re: /^(\d+) of (\d+) (?:mutants|breaks) caught, (\d+) (?:not applied|skipped)/m,
    read: m => ({ applied: +m[2], caught: +m[1], skipped: +m[3] }) },
  { re: /^(\d+) of (\d+) (?:mutants|breaks) caught/m,
    read: m => ({ applied: +m[2], caught: +m[1], skipped: +m[2] - +m[1] }) },
];

function runOne(file) {
  let out = '';
  let crashed = null;
  try {
    out = execFileSync(process.execPath, [path.join(TOOLS, file)],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    /* A family exits 1 when a mutant survives, which is a result, not a crash. Only a signal or
       an uncaught exception leaves no summary behind. */
    out = (err.stdout || '') + (err.stderr || '');
    if (err.status === undefined || err.status === null) crashed = err.message;
  }
  /* The verdict lines a family prints about WHICH break survived. Without echoing them the runner
     reports a count and the reader has to re-run the family to learn anything — and a survivor that
     does not reproduce (as one did on 2026-10-21, inside this pass and not outside it) leaves no
     record at all of which rule was seen quiet. */
  const notes = out.split(/\r?\n/)
    /* A family that dies on an uncaught exception prints a Node stack and none of the verdict
       prefixes, so the row used to read `printed no summary` with the cause discarded — which is
       how a single killed child turned into fourteen unproven rows on 2026-10-27: the crash line
       was the only evidence of what actually happened, and it was thrown away. */
    .filter(l => /^(MISSED|PARTIAL|NOT APPLIED|SKIP|BROKEN|ABORT|QUIET|NOTED|BASELINE|the run|Error:|TypeError:|ReferenceError:|RangeError:|SyntaxError:|throw er|\s+at )/.test(l))
    .slice(0, 6)
    .map(l => l.slice(0, 158));
  /* Every family that cannot land a needle prints a SKIP or NOT APPLIED row, but only some of them
     fold that into the number their summary line prints. The third shape below derives `not applied`
     as applied − caught, which is 0 for a family whose loop `continue`s on a stranded needle without
     incrementing anything — so the coverage simply shrinks and the row reads healthy. Measured on
     2026-10-26: nine of the fifty-three families that print an `N of M caught` summary never name a
     skip count at all. `escaping` does count its own, and even then nothing marked its row, because
     the trouble predicate asked only about survivors — that is the row this comment was written from.
     The count is taken from the evidence the families already print rather than from their arithmetic,
     and the larger of the two wins so a family that counts its own skips is unchanged. */
  const skipLines = (out.match(/^(?:SKIP|NOT APPLIED)\b/gm) || []).length;
  for (const shape of SHAPES) {
    const m = out.match(shape.re);
    if (m) {
      const r = shape.read(m);
      return { ...r, skipped: Math.max(r.skipped, skipLines), crashed,
        missed: (out.match(/^MISSED\b/gm) || []).length, notes };
    }
  }
  return { applied: 0, caught: 0, skipped: skipLines, crashed, missed: 0, silent: true, notes };
}

/* Every family rewrites the target and restores it in a `finally`, so a family that never reaches
   its finally leaves the break in the working file — and the NEXT family snapshots that file as its
   own pristine copy, which locks the mutation in and turns one death into a cascade. On
   2026-10-27 one killed family left the Money screen's action card swapped back below the figures,
   the gate went red for every family that demands a green baseline, and fifteen rows printed no
   summary. The pass-level git check catches that at the END; this catches it at the family that
   caused it, keeps the bytes for reading, and restores from the commit rather than from a snapshot
   that may already be the mutant. */
function strand(file) {
  let dirty = '';
  try {
    dirty = execFileSync('git', ['status', '--porcelain', '--', file], { encoding: 'utf8', cwd: ROOT }).trim();
  } catch (e) { return { git: false }; }
  if (!dirty) return { git: true, stranded: false };
  const keep = path.join(ROOT, '.scratch', 'strand-' + file.replace(/[^a-z0-9-]/gi, '_') + '-' + Date.now() + '.html');
  try {
    fs.mkdirSync(path.dirname(keep), { recursive: true });
    fs.copyFileSync(path.join(ROOT, file), keep);
    execFileSync('git', ['checkout', '--', file], { cwd: ROOT });
    return { git: true, stranded: true, keep: path.relative(ROOT, keep) };
  } catch (e) { return { git: true, stranded: true, unrecoverable: String(e.message).slice(0, 80) }; }
}

/* The same hazard, one directory over, and this one cost a whole reading of the suite. Several families
   mutate an instrument as well as the page — `falsify-compat-floor` blinds `audit-compat-floor.cjs`'s
   feature scan to prove the scan can be blind, `falsify-camera-surfaces` edits `tools/shot.cjs`,
   `falsify-dialog-focus` both. When one of those runs died between the edit and its restore, the fixture
   stayed in the TOOL, and every family that demands a green gate then reported its own baseline as
   broken: `camera-surfaces` and `dialog-focus` both read as stale needles and were nearly "repaired"
   into new bugs, when the needles were fine and the gate was red because a scan had been switched off
   three families earlier. The app file is watched; the tools directory was not.
   It is REPORTED, never auto-restored. A tool file is where a session's live work legitimately lives,
   and `git checkout -- tools/` would delete it — the same reason the pass refuses a dirty target at the
   start rather than cleaning it for the reader. Reporting a hazard and repairing it are different acts. */
function dirtyTools() {
  try {
    return execFileSync('git', ['status', '--porcelain', '--', 'tools/'], { encoding: 'utf8', cwd: ROOT })
      .split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  } catch (e) { return null; }
}
const toolsBefore = gitUnavailable ? [] : dirtyTools() || [];

let A = 0, C = 0, S = 0, bad = 0;
console.log('family'.padEnd(40) + 'applied  caught  not applied  missed');
for (const f of families) {
  const r = runOne(f);
  const st = strand(TARGET);
  const toolsNow = gitUnavailable ? [] : (dirtyTools() || []);
  const newly = toolsNow.filter(l => !toolsBefore.includes(l));
  const removed = toolsBefore.filter(l => !toolsNow.includes(l));
  toolsBefore.length = 0; toolsNow.forEach(l => toolsBefore.push(l));
  A += r.applied; C += r.caught; S += r.skipped;
  const trouble = r.silent || r.caught !== r.applied || r.applied === 0 || r.skipped > 0
    || st.stranded || st.git === false || newly.length > 0;
  if (st.git === false) console.log('      | NOTED git is unavailable, so a stranded mutant could not be detected or repaired');
  if (st.unrecoverable) console.log('      | BROKEN the target was mutated and could not be restored: ' + st.unrecoverable);
  if (trouble) bad++;
  console.log(f.replace(/^falsify-|\.cjs$/g, '').padEnd(40)
    + String(r.applied).padStart(6) + String(r.caught).padStart(9)
    + String(r.skipped).padStart(13) + String(r.missed).padStart(8)
    + (r.silent ? '   <<< printed no summary — nothing was proven' : '')
    + (!r.silent && r.applied === 0 ? '   <<< NOTHING APPLIED — every needle missed, so this family tested nothing'
      : '')
    + (!r.silent && r.caught !== r.applied && r.applied > 0 ? '   <<< MUTANT SURVIVED' : '')
    /* A needle that stopped matching is the quietest coverage loss there is: every mutant the family
       DID apply can be caught, the row prints healthy, and one rule has gone untested. On
       2026-10-27 the aggregate carried exactly one such row (`escaping`, 5 applied / 5 caught / 1 not
       applied, orphaned by the header convergence) and nothing about it was marked, because the
       predicate asked only about survivors — while this file's own standing advice is to READ the
       not-applied column. A column nobody is forced to look at is a column that goes unread. */
    + (!r.silent && r.skipped > 0 ? '   <<< NEEDLE MISSED — ' + r.skipped + ' needle'
        + (r.skipped === 1 ? ' no longer matches' : 's no longer match')
        + ' the target, so that coverage is gone' : '')
    + (r.crashed ? '   <<< exited on a signal: ' + String(r.crashed).slice(0, 40) : '')
    + (st.stranded ? '   <<< LEFT THE TARGET MUTATED — restored from the commit (' + st.keep + '); every row after this one ran against a repaired file' : '')
    + (newly.length ? '   <<< LEFT AN INSTRUMENT MUTATED — ' + newly.length + ' file(s) under tools/ changed and were not put back' : ''));
  if (newly.length) newly.forEach(l => console.log('      | BROKEN ' + l + ' — every family after this one ran against it'));
  if (trouble) (r.notes || []).forEach(n => console.log('      | ' + n));
}
console.log('─'.repeat(72));
const dirtyAfter = gitUnavailable ? '' : dirtyTarget();
console.log(families.length + (families.length === 1 ? ' family, ' : ' families, ') + A + ' mutants applied, ' + C + ' caught, '
  + S + ' not applied' + (bad ? ' — ' + bad + ' family needs attention' : ' — every rule is still being tested'));
if (gitUnavailable) console.log('NOTED the target was never checked against git — no git on PATH, so a leftover mutant would not have been seen');
if (dirtyAfter) {
  console.log('BROKEN the tree is not clean after the pass, so this table is a measurement of a file nobody has:');
  console.log(dirtyAfter.split(/\r?\n/).map(l => '   ' + l).join('\n'));
  bad++;
}
/* The pass-end read of the tools directory, distinct from the per-family one above. It is a NOTED, not a
   BROKEN: a session legitimately carries uncommitted work in its instruments, and this runner does not
   restore files it did not mutate. What it must never do is stay silent about them, because a fixture
   left in a tool redens the gate and every family after it then reports its own baseline as broken. */
const toolsLeft = gitUnavailable ? [] : (dirtyTools() || []);
if (toolsLeft.length) {
  console.log('NOTED ' + toolsLeft.length + ' file(s) under tools/ are modified after the pass — never restored by this runner, so read them before quoting the rows above:');
  console.log(toolsLeft.map(l => '   ' + l).join('\n'));
}
process.exit(bad ? 1 : 0);


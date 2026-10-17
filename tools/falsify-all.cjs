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

     node tools/falsify-all.cjs                (~15 minutes: every mutant is a fresh gate run)
     node tools/falsify-all.cjs count-labes    # only families whose name matches
*/
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TOOLS = path.join(ROOT, 'tools');
const filter = process.argv[2];

const families = fs.readdirSync(TOOLS)
  .filter(f => /^falsify-.*\.cjs$/.test(f))
  /* The runner is not a family. Without this it finds itself, spawns itself, and every mutant
     in the suite runs twice nested one level per family. */
  .filter(f => f !== 'falsify-all.cjs')
  .filter(f => !filter || f.includes(filter))
  .sort();

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
  for (const shape of SHAPES) {
    const m = out.match(shape.re);
    if (m) {
      const r = shape.read(m);
      return { ...r, crashed, missed: (out.match(/^MISSED\b/gm) || []).length };
    }
  }
  return { applied: 0, caught: 0, skipped: 0, crashed, missed: 0, silent: true };
}

let A = 0, C = 0, S = 0, bad = 0;
console.log('family'.padEnd(40) + 'applied  caught  not applied  missed');
for (const f of families) {
  const r = runOne(f);
  A += r.applied; C += r.caught; S += r.skipped;
  const trouble = r.silent || r.caught !== r.applied || r.applied === 0;
  if (trouble) bad++;
  console.log(f.replace(/^falsify-|\.cjs$/g, '').padEnd(40)
    + String(r.applied).padStart(6) + String(r.caught).padStart(9)
    + String(r.skipped).padStart(13) + String(r.missed).padStart(8)
    + (r.silent ? '   <<< printed no summary — nothing was proven' : '')
    + (!r.silent && r.caught !== r.applied ? '   <<< MUTANT SURVIVED' : '')
    + (r.crashed ? '   <<< exited on a signal: ' + String(r.crashed).slice(0, 40) : ''));
}
console.log('─'.repeat(72));
console.log(families.length + ' families, ' + A + ' mutants applied, ' + C + ' caught, '
  + S + ' not applied' + (bad ? ' — ' + bad + ' family needs attention' : ' — every rule is still being tested'));
process.exit(bad ? 1 : 0);

/* Proves the duplicate-subject audit can fail, by checking it against a second, dumber computation.

   `tools/audit-commit-subjects.cjs` lists commit subjects used more than once on this branch, a class that
   happened to me three times in two days — messages written while the previous one was still on screen, so
   the subject described a different diff than the body. It happened a FOURTH time on 2026-10-24, five minutes
   after PR #9 merged, and the audit did not see it: its scope was `origin/main..HEAD`, which by construction
   excludes every commit that has already merged, so a subject reused from one of those was invisible and the
   line printed "every subject in this range is unique" over a real collision four entries away in `git log`.
   That is why the scope is now the branch's recent history and why this family judges the scope itself.

   An audit like that fails the way every scan here has failed: silently, by reporting nothing. So the control
   does not ask whether the tool answered; it recomputes the duplicate set with its own `git log --format=%s`
   pass over the number of commits the tool declared reading, and requires the two sets to be EQUAL, and it
   requires the tool's stated count to equal `git rev-list --count`. Coverage is checked against a second
   derivation rather than the tool's own word — a checker whose population is self-reported is measuring its own
   parser. The scope is taken FROM the tool's output (not hard-coded a second time) so the two sides agree on a
   population by measurement; the floor below it is what stops a shrunken scope being mirrored and forgiven.

     1. control, unbroken  → sets equal, counts equal, scope >= 60 commits, empty range refused, exit 0
     2. dedup predicate made never-true            → the tool reports 0 while the shell reports 4
     3. predicate widened to every subject         → the tool reports all of them, so the sets differ
     4. empty-range refusal forced dead            → an empty scan now answers like a clean branch
     5. default history re-rooted onto origin/main → the population stops including merged commits
     6. default count shrinks to 3                 → the floor condemns a scope too small to find anything

   Target is the audit file, not `Sukinnect-next.html`: this family never touches the app, so it does not
   contend for the mutex every other family shares. It still restores in a `finally`; after a cancelled run
   check `git status` on `tools/audit-commit-subjects.cjs`.

     node tools/falsify-commit-subjects.cjs
*/
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'tools', 'audit-commit-subjects.cjs');
const original = fs.readFileSync(TARGET, 'utf8');

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });
}
/* The second, independent computation. Control characters and colour codes are not in play because the
   format is one subject per line, which is also how the tool's own list is read back.
   The scope is taken from the tool's own declared population — the "N commits read" it prints — and the shell
   recomputes over that same number of commits from HEAD. Judging a range the family also hard-codes would let
   the two agree by construction, which is how the first version of this file missed the defect it now proves:
   its control read `origin/main..HEAD` (3 commits) while the widened tool read the branch's last 120, and the
   disagreement is exactly what made it ABORT rather than report green. */
function shellDupes(n) {
  const all = git(['log', '--format=%s', '-n', String(n), 'HEAD', '--']).split('\n').filter(Boolean);
  const counts = new Map();
  all.forEach(s => counts.set(s, (counts.get(s) || 0) + 1));
  return new Set([...counts.entries()].filter(([, c]) => c > 1).map(([s]) => s));
}
function shellCount(n) {
  return Number(git(['rev-list', '--count', '-n', String(n), 'HEAD', '--']).trim());
}
/* A floor on the scope, not on the duplicates. The tool's whole purpose is to see collisions across recent
   history including merged commits; if its population quietly shrinks to a handful, "no duplicates" is a lie
   about an empty-ish scan. Without this line a break that reduces the default count survives, because the
   shell would mirror the shrunk scope. */
const SCOPE_FLOOR = 60;
function run() {
  try {
    return { code: 0, out: execFileSync(process.execPath, [TARGET],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (e) {
    return { code: e.status === undefined ? -1 : e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}
function toolDupes(out) {
  const set = new Set();
  out.split('\n').forEach(l => {
    const m = l.match(/^\s+(\d+)x\s+(.+?)\s+\[[0-9a-f, ]+\]$/);
    if (m) set.add(m[2]);
  });
  return set;
}
function toolCount(out) {
  const m = out.match(/(\d+) commits read/);
  return m ? Number(m[1]) : null;
}
function same(a, b) { return a.size === b.size && [...a].every(x => b.has(x)); }
function plant(from, to) {
  const cur = fs.readFileSync(TARGET, 'utf8');
  const n = cur.split(from).length - 1;
  if (n !== 1) return { ok: false, why: 'needle matched ' + n };
  fs.writeFileSync(TARGET, cur.replace(from, to));
  return { ok: true };
}
function restore() { fs.writeFileSync(TARGET, original); }

const BREAKS = [
  { name: 'the dedup predicate is made never-true, so a known duplicate is reported as none',
    from: '.filter(([, shas]) => shas.length > 1)', to: '.filter(([, shas]) => false)' },
  { name: 'the predicate is widened to every subject, so the set no longer means duplicates',
    from: '.filter(([, shas]) => shas.length > 1)', to: '.filter(([, shas]) => shas.length > 0)' },
  { name: 'the refusal on an empty range is forced dead',
    from: 'if (rows.length === 0) {', to: 'if (false) {', emptyRange: true },
  { name: 'the default scope is quietly re-rooted onto origin/main, so post-merge history stops being read',
    from: "['-n', String(DEFAULT_COUNT), 'HEAD']",
    to: "['-n', String(DEFAULT_COUNT), 'origin/main']" },
  { name: 'the default scope shrinks to three commits, which is the population defect that let a reused subject through',
    from: 'const DEFAULT_COUNT = 120;', to: 'const DEFAULT_COUNT = 3;' },
];

function runArgs(args) {
  try {
    return { code: 0, out: execFileSync(process.execPath, [TARGET].concat(args),
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (e) {
    return { code: e.status === undefined ? -1 : e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}
const lastLine = out => (String(out).split('\n').filter(Boolean).pop() || '');

let applied = 0, caught = 0, missed = 0, unmatched = 0;
try {
  const base = run();
  const gotDupes = toolDupes(base.out), gotCount = toolCount(base.out);
  /* The shell recomputes over the population the tool itself declared, so the two are independent methods on
     the same scope rather than two copies of one hard-coded range. */
  const scopeN = gotCount || 0;
  const expectDupes = shellDupes(scopeN);
  const expectCount = shellCount(scopeN);
  const scopeBigEnough = scopeN >= SCOPE_FLOOR;
  /* Second control, in the same unbroken file: an empty range must be REFUSED. Without this line the break
     below has no baseline, and "it answered clean" would be indistinguishable from "it always answers
     clean" — which is the whole defect the guard exists to prevent. */
  const empty = runArgs(['HEAD..HEAD']);
  const emptyRefused = empty.code !== 0 && /^NO CONCLUSION/.test(lastLine(empty.out));
  console.log('control  unbroken audit, empty range → exit ' + empty.code + ', refused: '
    + (emptyRefused ? 'yes' : 'NO'));
  console.log('control  unbroken audit → exit ' + base.code + ', scope ' + scopeN + ' commits (floor '
    + SCOPE_FLOOR + '): ' + (scopeBigEnough ? 'ok' : 'TOO SMALL') + ', set matches shell: '
    + (same(expectDupes, gotDupes) ? 'yes' : 'NO') + ', commits ' + gotCount + '/' + expectCount
    + ', duplicates seen: ' + expectDupes.size);
  if (base.code !== 0 || !emptyRefused || !scopeBigEnough || expectDupes.size === 0
    || !same(expectDupes, gotDupes) || gotCount !== expectCount) {
    console.log('ABORT — the unbroken audit does not agree with the shell, so nothing below this line'
      + ' measures anything. Two ways that is the truth rather than a defect: the branch has no duplicate'
      + ' subjects to find (the control requires at least one, because a family cannot prove a rule that'
      + ' has no instance), or the tool and the shell disagree, which is the bug this family exists to catch.');
    process.exitCode = 1;
  } else {
    for (const b of BREAKS) {
      const p = plant(b.from, b.to);
      if (!p.ok) { unmatched++; console.log('SKIP    ' + b.name + '  (' + p.why + ', needs exactly 1)'); continue; }
      applied++;
      let verdict, detail;
      if (b.emptyRange) {
        /* The first version of this break asserted the OPPOSITE: it required the mutated tool to refuse, so
           it printed MISSED against the very behaviour it existed to condemn. The catch is that with the
           refusal branch dead an empty scan answers "every subject in this range is unique" and exits 0 —
           which is exactly what a clean branch answers, and the reason the guard is there. */
        const r = runArgs(['HEAD..HEAD']);
        const tail = lastLine(r.out);
        verdict = r.code === 0 && !/^NO CONCLUSION/.test(tail);
        detail = 'answered clean about nothing: exit ' + r.code + ' · ' + tail.slice(0, 58);
      } else {
        const r = run();
        const d = toolDupes(r.out), c = toolCount(r.out);
        verdict = r.code !== 0 || !same(expectDupes, d) || c !== expectCount;
        detail = 'set ' + d.size + ' vs ' + expectDupes.size + ', count ' + c + '/' + expectCount;
      }
      console.log((verdict ? 'CAUGHT  ' : 'MISSED  ') + b.name + '  → ' + detail);
      if (verdict) caught++; else missed++;
      restore();
    }
    console.log('─'.repeat(78));
    console.log(caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied, ' + missed + ' missed');
    process.exitCode = (caught === applied && applied === BREAKS.length && unmatched === 0) ? 0 : 1;
  }
} finally {
  restore();
  const back = fs.readFileSync(TARGET, 'utf8') === original;
  console.log('cleanup  audit restored byte-for-byte: ' + back);
  if (!back) process.exitCode = 1;
}

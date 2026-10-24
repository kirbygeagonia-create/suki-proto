/* Proves the duplicate-subject audit can fail, by checking it against a second, dumber computation.

   `tools/audit-commit-subjects.cjs` lists commit subjects used more than once on this branch, a class that
   happened to me three times in two days — messages written while the previous one was still on screen, so
   the subject described a different diff than the body. An audit like that fails the way every scan here
   has failed: silently, by reporting nothing. So the control does not ask whether the tool answered; it
   recomputes the duplicate set with `git log --format=%s | sort | uniq -d` and requires the two sets to be
   EQUAL, and it requires the tool's stated commit count to equal `git rev-list --count`. Coverage is
   checked against a second derivation rather than the tool's own word — a checker whose population is
   self-reported is measuring its own parser.

     1. control, unbroken  → the tool's duplicate set equals the shell's, its count equals rev-list's, exit 0
     2. dedup predicate made never-true            → the tool reports 0 while the shell reports 3
     3. predicate widened to every subject         → the tool reports all of them, so the sets differ
     4. empty-range refusal forced dead            → an empty scan now answers like a clean branch
     5. default range rewritten to a symmetric difference → the population itself changes, and the count
        equality is what notices

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
   format is one subject per line, which is also how the tool's own list is read back. */
function shellDupes(range) {
  const all = git(['log', '--format=%s', range, '--']).split('\n').filter(Boolean);
  const counts = new Map();
  all.forEach(s => counts.set(s, (counts.get(s) || 0) + 1));
  return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([s]) => s));
}
function shellCount(range) {
  return Number(git(['rev-list', '--count', range, '--']).trim());
}
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

const RANGE_DEFAULT = 'origin/main..HEAD';
const BREAKS = [
  { name: 'the dedup predicate is made never-true, so a known duplicate is reported as none',
    from: '.filter(([, shas]) => shas.length > 1)', to: '.filter(([, shas]) => false)' },
  { name: 'the predicate is widened to every subject, so the set no longer means duplicates',
    from: '.filter(([, shas]) => shas.length > 1)', to: '.filter(([, shas]) => shas.length > 0)' },
  { name: 'the refusal on an empty range is forced dead',
    from: 'if (rows.length === 0) {', to: 'if (false) {', emptyRange: true },
  { name: 'the range it reads is quietly the symmetric difference instead of the commits ahead',
    from: "const RANGE = process.argv[2] || 'origin/main..HEAD';",
    to: "const RANGE = process.argv[2] || 'origin/main...HEAD';" },
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
  const expectDupes = shellDupes(RANGE_DEFAULT);
  const expectCount = shellCount(RANGE_DEFAULT);
  const base = run();
  const gotDupes = toolDupes(base.out), gotCount = toolCount(base.out);
  /* Second control, in the same unbroken file: an empty range must be REFUSED. Without this line the break
     below has no baseline, and "it answered clean" would be indistinguishable from "it always answers
     clean" — which is the whole defect the guard exists to prevent. */
  const empty = runArgs(['HEAD..HEAD']);
  const emptyRefused = empty.code !== 0 && /^NO CONCLUSION/.test(lastLine(empty.out));
  console.log('control  unbroken audit, empty range → exit ' + empty.code + ', refused: '
    + (emptyRefused ? 'yes' : 'NO'));
  console.log('control  unbroken audit → exit ' + base.code + ', set matches shell: '
    + (same(expectDupes, gotDupes) ? 'yes' : 'NO') + ', commits ' + gotCount + '/' + expectCount
    + ', duplicates seen: ' + expectDupes.size);
  if (base.code !== 0 || !emptyRefused || expectDupes.size === 0
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

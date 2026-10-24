/* Lists every commit subject this branch uses more than once, so a message written from memory can be
   caught by a command rather than by a reader.

   Found three times on `feat/domain-kernel` on 2026-10-23–24, all of them mine, all of them the same
   mistake: writing a commit message while the previous one is still in the terminal's scrollback and
   re-using its subject. Twice the body described the change accurately while the subject described a
   DIFFERENT change, which is worse than a vague message — a reader scanning `git log` is handed a true
   sentence about the wrong commit, and one of the two was already disclosed in an earlier commit's body
   as a known defect rather than fixed.

   This is a list, not a gate: a duplicate subject is a record-keeping smell, not a build failure, and the
   branch carries four of them in its last 120 commits, so refusing to push would be refusing history rather than
   protecting it. It refuses instead when it read NO commits, because a bad range and a clean branch would
   otherwise answer with the same line — the rule every scan in this repository has re-learned. The set it
   prints is checked a second way by `tools/falsify-commit-subjects.cjs`, which recomputes the duplicates from
   the same population and condemns this tool when the two disagree: a checker whose coverage is self-reported is
   measuring its own parser.

   The fourth duplicate is what rewrote this file's default. On 2026-10-24, minutes after PR #9 merged, the tool
   read `origin/main..HEAD` — three commits — and printed "every subject in this range is unique" while the new
   commit's subject duplicated one that had just entered `main`. **A range defined as "what is not yet merged"
   cannot see a collision with anything already merged**, which is precisely the case a reused subject produces
   once the branch it was reused on has landed. The population was narrower than the claim, and the green line is
   what made that invisible.

     node tools/audit-commit-subjects.cjs                    # HEAD, last 120 commits (merged ones included)
     node tools/audit-commit-subjects.cjs origin/main..HEAD   # only what is not yet on main
     node tools/audit-commit-subjects.cjs HEAD~10..HEAD
*/
'use strict';
const { execFileSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
/* The default used to be `origin/main..HEAD`, and that population is narrower than the claim the tool prints:
   a subject reused from a commit that has ALREADY been merged is invisible in it. Measured 2026-10-24 — five
   minutes after PR #9 merged, this tool read the 3 unmerged commits and printed "every subject in this range is
   unique" while the new commit's subject duplicated one already sitting in `main`, four commits apart in
   `git log`. A check that cannot see the case it exists for is worse than no check, because its green line is
   what stops a reader looking. So the default is now the branch's recent history (`-n 120 HEAD`), merged commits
   included; pass a range explicitly to judge something narrower. */
const DEFAULT_COUNT = 120;
const RANGE = process.argv[2] || '';
const ARGS = ['log', '--format=%h\x1f%s'].concat(RANGE ? [RANGE] : ['-n', String(DEFAULT_COUNT), 'HEAD']).concat(['--']);

let raw;
try {
  raw = execFileSync('git', ARGS,
    { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch (gitProblem) {
  console.log('NO CONCLUSION: `git ' + ARGS.join(' ') + '` could not be read — '
    + String(gitProblem.stderr || gitProblem.message).split('\n')[0]);
  process.exit(1);
}

const rows = raw.split('\n').filter(Boolean).map(l => {
  const i = l.indexOf('\x1f');
  return { sha: l.slice(0, i), subject: l.slice(i + 1) };
});

const SCOPE = RANGE ? RANGE : ('HEAD, last ' + DEFAULT_COUNT + ' commits');
console.log('duplicate commit subjects across ' + SCOPE + ' — ' + rows.length + ' commits read');
if (rows.length === 0) {
  console.log('NO CONCLUSION: the range matched no commits, so "no duplicates" would be a lie about '
    + 'an empty scan rather than a verdict about a clean branch.');
  process.exit(1);
}

const seen = new Map();
for (const r of rows) {
  if (!seen.has(r.subject)) seen.set(r.subject, []);
  seen.get(r.subject).push(r.sha);
}
const dupes = [...seen.entries()].filter(([, shas]) => shas.length > 1).sort((a, b) => b[1].length - a[1].length);
for (const [subject, shas] of dupes) {
  console.log('  ' + shas.length + 'x  ' + subject + '   [' + shas.join(', ') + ']');
}
console.log('─'.repeat(78));
console.log(dupes.length + ' duplicated subjects over ' + seen.size + ' distinct ones'
  + (dupes.length ? ' — the subject of a commit is a claim about its diff; check it against `git show --stat`'
    : ' — every subject in scope is unique (scope: ' + SCOPE + ')'));

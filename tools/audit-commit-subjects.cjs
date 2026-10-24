/* Lists every commit subject this branch uses more than once, so a message written from memory can be
   caught by a command rather than by a reader.

   Found three times on `feat/domain-kernel` on 2026-10-23–24, all of them mine, all of them the same
   mistake: writing a commit message while the previous one is still in the terminal's scrollback and
   re-using its subject. Twice the body described the change accurately while the subject described a
   DIFFERENT change, which is worse than a vague message — a reader scanning `git log` is handed a true
   sentence about the wrong commit, and one of the two was already disclosed in an earlier commit's body
   as a known defect rather than fixed.

   The list form is not a gate: a duplicate subject is a record-keeping smell, not a build failure, and the reachable
   history carries more than one — how many is this tool's answer, not this header's, because a count kept in prose here
   is the exact drift the tool exists to catch. Refusing to push would be refusing history rather than protecting it.
   The `--check-message` form IS a gate, and the difference is its scope: one message about to be written, not the
   history already published. It refuses instead when it read NO commits or could not read the message, because a bad
   range, an empty file and a clean branch would otherwise answer with the same line — the rule every scan in this
   repository has re-learned. The set the list prints is checked a second way by `tools/falsify-commit-subjects.cjs`,
   which recomputes the duplicates from the same population and condemns this tool when the two disagree: a checker
   whose coverage is self-reported is measuring its own parser.

   The fourth duplicate is what rewrote this file's default. On 2026-10-24, minutes after PR #9 merged, the tool
   read `origin/main..HEAD` — three commits — and printed "every subject in this range is unique" while the new
   commit's subject duplicated one that had just entered `main`. **A range defined as "what is not yet merged"
   cannot see a collision with anything already merged**, which is precisely the case a reused subject produces
   once the branch it was reused on has landed. The population was narrower than the claim, and the green line is
   what made that invisible.

     node tools/audit-commit-subjects.cjs                       # every commit reachable from HEAD
     node tools/audit-commit-subjects.cjs origin/main..HEAD     # only what is not yet on main (narrow by design)
     node tools/audit-commit-subjects.cjs HEAD~10..HEAD
     node tools/audit-commit-subjects.cjs --check-message .git/COMMIT_EDITMSG   # judge a message BEFORE committing

   The `--check-message` mode is what turned this from a list into a guard. All six duplicates were found after the
   commit by a reader, twice in one session, and the cause is mechanical — the previous subject is still on the screen
   when the new one is typed. A list cannot intervene in that; a refusal at the moment of writing can. It compares the
   FIRST non-comment line of the file against the same population the list walks, so it inherits the merged history the
   narrow range could not see, and it exits 1 naming the hash it collided with. Run it before the commit: after the
   commit the new row is in the population and the tool correctly reports the subject is already in use — by that
   commit. Prove it on an existing duplicate instead: pass a file holding a subject from `git log` and it must refuse.
   `tools/falsify-commit-subjects.cjs` does exactly that.
*/
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
/* The default used to be `origin/main..HEAD`, and that population is narrower than the claim the tool prints:
   a subject reused from a commit that has ALREADY been merged is invisible in it. Measured 2026-10-24 — five
   minutes after PR #9 merged, this tool read the 3 unmerged commits and printed "every subject in this range is
   unique" while the new commit's subject duplicated one already sitting in `main`, four commits apart in
   `git log`. A check that cannot see the case it exists for is worse than no check, because its green line is
   what stops a reader looking. So the default became the branch's recent history.

   The recent-history default then failed the SAME way one level up, and that is what widened it to everything.
   Measured 2026-10-25: over all reachable commits the branch carries SEVEN duplicated subjects, not six — the
   seventh pair, `f830bd9` and `6f9bf45`, both dated 2026-10-10, sits at position 233 of 337 in `git log HEAD`, so
   a 120-commit window simply never reads it, and `--check-message` would have let a new subject reuse it.
   **Any fixed count is a bet about how much history the branch has written since the mistake happened**, which is
   exactly the premise this file keeps recording as expiring. The population is therefore all of `HEAD`; pass a
   range explicitly to judge something narrower. */
/* The flag and its value must come out of the positional slot that holds the range. Reading `process.argv[2]`
   straight meant `--check-message` was itself handed to `git log` as a revision, and the file argument meant a path
   was handed to it as a second one — which fails, but fails as NO CONCLUSION about a bad range rather than as a
   verdict about the message. */
const ARGV = process.argv.slice(2);
const CHECK_AT = ARGV.indexOf('--check-message');
const MSG_FILE = CHECK_AT < 0 ? '' : (ARGV[CHECK_AT + 1] || '');
/* `CHECK_AT + 1` is ZERO when the flag is absent, so writing the exclusion bare would drop the first positional
   argument — the range — from every plain `audit-commit-subjects.cjs HEAD..HEAD` call and quietly substitute the
   default population. The family's empty-range control is what caught it: a range that reads no commits must refuse,
   and instead it answered "every subject in this range is unique" over 120 commits. Only exclude a value slot when
   there is a flag to be a value OF. */
const RANGE = ARGV.filter((a, i) => !a.startsWith('--') && !(CHECK_AT >= 0 && i === CHECK_AT + 1))[0] || '';
/* Declared AFTER RANGE on purpose: this line used to sit above it, and `node --check` passed on the file anyway
   while running it threw `Cannot access 'RANGE' before initialization` — a temporal dead zone is valid syntax, so
   the only instrument that sees it is the one that executes the branch. */
const ARGS = ['log', '--format=%h\x1f%s'].concat(RANGE ? [RANGE] : ['HEAD']).concat(['--']);

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

const SCOPE = RANGE ? RANGE : 'all commits reachable from HEAD';
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

/* The gate half. Judges a message that is not in the population yet, which is the only moment the collision can
   still be prevented rather than recorded. Exact equality on purpose: "similar" is a judgement a person makes, and a
   tool that guessed at near-misses would be the thing a reader learns to ignore. Comment lines are dropped the way
   `git commit` drops them, so a subject is not read off a `#` banner. */
if (CHECK_AT >= 0) {
  const refuse = why => {
    console.log('─'.repeat(78));
    console.log('NO CONCLUSION: ' + why);
    process.exit(1);
  };
  if (!MSG_FILE) refuse('--check-message was given no file, so there is no message to judge — answering '
    + '"unique" about nothing is how a guard becomes a green line nobody reads.');
  let msg;
  try {
    msg = fs.readFileSync(MSG_FILE, 'utf8');
  } catch (readProblem) {
    refuse('the message file `' + MSG_FILE + '` could not be read — '
      + String(readProblem.message).split('\n')[0]);
  }
  const subject = msg.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))[0] || '';
  if (!subject) refuse('`' + MSG_FILE + '` holds no subject line once comment lines are dropped.');
  console.log('checking the subject of `' + MSG_FILE + '` against ' + rows.length + ' commits (' + SCOPE + ')');
  console.log('  subject: ' + subject);
  const collides = rows.filter(r => r.subject === subject);
  console.log('─'.repeat(78));
  if (collides.length) {
    console.log('COLLIDES with ' + collides.map(c => c.sha).join(', ') + ' — this subject is already in use.'
      + '\n  The cause recorded on this branch is writing a message while the previous one is still on screen;'
      + '\n  the consequence is a true sentence about the wrong commit. Title THIS one from its own diff:'
      + '\n  `git show --stat ' + collides[0].sha + '` says what the other commit did; say what yours did.');
    process.exit(1);
  }
  console.log('unique — no commit in ' + SCOPE + ' carries this subject.');
  process.exit(0);
}

const dupes = [...seen.entries()].filter(([, shas]) => shas.length > 1).sort((a, b) => b[1].length - a[1].length);

/* The six collisions that are already history, recorded so a SEVENTH can be a failure instead of another line in a
   list nobody reads. Repairing these needs a force-push over merged history: measured 2026-10-25, rewriting from the
   oldest changes 104 commit SHAs and invalidates 11 of the 17 commit hashes this repository's own documents cite —
   including the three PR merge commits. So the owner ruled: leave the history, close the door behind it.
   Keyed by subject, because the subject IS the collision and SHAs move if history is ever rewritten. Each entry is
   checked against reality on every run: a baseline pair whose hashes no longer collide is reported as drift, and a
   live collision absent from the baseline is reported as new. A grandfather list that is trusted rather than verified
   would become the thing that hides the next one. */
const BASELINE = [
  { subject: 'docs: the suite figure is re-derived from the pass that actually ran all 51 families', shas: ['6cc1ad5', '916ff74'] },
  { subject: "tools: three instruments hardcoded this machine's path, and a fresh checkout of main found it", shas: ['0269f4d', 'e07a57c'] },
  { subject: 'docs: two deployment rulings, and the sentence that was almost wrong — merging is not promoting', shas: ['560bf66', 'c32f845'] },
  { subject: 'docs: stop carrying the totals a command already prints', shas: ['5ee3554', '6ce7a34'] },
  { subject: "fix: read a probe's count through both print shapes, and convert the nav floor upward", shas: ['b7af181', 'aa19fdd'] },
  { subject: "docs: re-run the layout sweep to the day rather than carry §85's figure", shas: ['cab1696', '33639fc'] },
  /* The seventh pair, and the reason the default population is no longer a fixed count. Both commits are dated
     2026-10-10 — two weeks before this gate existed — and they sit at position 233 of 337 in `git log HEAD`, so the
     120-commit window never read them and reported six. Measured 2026-10-25 by `node tools/audit-commit-subjects.cjs
     HEAD`, which is the command that answers seven. Excused, not repaired: like the other six this is published
     history, and the repair cost is a force-push over every commit after it. */
  { subject: 'docs: the captures were reviewed and cleared, so the plan says so and names the command', shas: ['f830bd9', '6f9bf45'] },
];

const findings = [];
let excused = 0;
for (const [subject, shas] of dupes) {
  const known = BASELINE.find(b => b.subject === subject);
  if (!known) findings.push('NEW collision, not in the baseline: ' + subject + '   [' + shas.join(', ') + ']');
  else if (shas.slice().sort().join(' ') !== known.shas.slice().sort().join(' ')) {
    findings.push('the baseline records ' + known.shas.join('/') + ' for this subject but the branch now shows '
      + shas.join(', ') + ' — history moved, so the entry is stale: ' + subject);
  } else excused++;
}
for (const b of BASELINE) {
  if (!dupes.some(([s]) => s === b.subject)) {
    findings.push('the baseline excuses "' + b.subject.slice(0, 48) + '…", which no longer collides in '
      + SCOPE + ' — either the scope shrank (a reader limit, not a fix) or the entry should be deleted');
  }
}

for (const [subject, shas] of dupes) {
  /* Three marks, because two words would lie about the middle case: an entry whose hashes no longer match is not
     "recorded" in the sense the reader takes from that word — it is a collision the baseline failed to excuse. */
  const known = BASELINE.find(b => b.subject === subject);
  const mark = !known ? 'NEW'
    : (shas.slice().sort().join(' ') === known.shas.slice().sort().join(' ') ? 'recorded' : 'DRIFT');
  console.log('  ' + shas.length + 'x  [' + mark + ']  ' + subject + '   [' + shas.join(', ') + ']');
}
console.log('─'.repeat(78));
console.log(dupes.length + ' duplicated subjects over ' + seen.size + ' distinct ones; '
  + excused + ' of ' + BASELINE.length + ' baseline entries excused in ' + SCOPE + ', '
  + findings.length + ' findings');
findings.forEach(f => console.log('  FINDING ' + f));
/* The advice is per-kind, because the fix for a stale entry is not the fix for a new collision. Printing "title the
   commit from its own diff" over a scope that merely shrank tells a reader to go write a commit — there is nothing to
   write, the history is fine, and the range they passed is the whole problem. */
if (findings.some(f => f.startsWith('NEW collision'))) {
  console.log('  A new collision is a failure, not a footnote: title the commit from its own diff with '
    + '`git show --stat HEAD` before writing the message, and run `--check-message` on it first.');
}
if (findings.some(f => f.startsWith('the baseline excuses'))) {
  console.log('  A baseline entry that stopped colliding is a SCOPE reading, not a repair: this run read '
    + SCOPE + '. Re-run with no argument (the default walks the branch\'s recent history) before deleting anything.');
}
if (findings.some(f => f.startsWith('the baseline records'))) {
  console.log('  A drifted pair means the hashes beside a subject moved — re-derive the entry from '
    + '`git log --format=%h%s HEAD | sort` and never edit a baseline by hand.');
}
process.exit(findings.length ? 1 : 0);

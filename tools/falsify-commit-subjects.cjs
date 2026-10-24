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

     1. control, unbroken  → sets equal, counts equal, scope >= 60 commits, empty range refused, baseline
                            reports zero findings, the gate refuses three fixtures and passes two, exit 0
     2. dedup predicate made never-true            → the tool reports 0 while the shell reports 6
     3. predicate widened to every subject         → the tool reports all of them, so the sets differ
     4. empty-range refusal forced dead            → nothing on the page names the empty scan as the cause
     5. default history re-rooted onto origin/main → the walk loses merged commits; since PR #13 merged, main holds
        them all, so today the mutant empties the population and the refusal is what proves it
     6. default count shrinks to 3                 → the floor condemns a scope too small to find anything
     7. the baseline stops matching                → six excused collisions become six findings

   Breaks 8-10 judge the gate half, `--check-message`, which is what turned a list a reader consults after the commit
   into a refusal at the moment the message is written. All six duplicates on this branch were found by a person, twice
   in one session, and the cause is mechanical — the previous subject is still on the screen — so the only place a check
   can intervene is before the commit exists. Those three breaks need a message to judge, so the family writes its own
   fixtures into a temp directory, and takes the duplicate subject out of the shell's own recomputed set rather than
   hard-coding one: a pinned phrase stops being a duplicate the next time history moves, and a break whose premise can
   expire is the class break 5 was re-pointed off of. The baseline asserts four refusals and one clean pass, so a mode
   that refuses EVERYTHING is caught as a broken control rather than mistaken for a working guard — a guard that always
   refuses and a guard that works both exit 1, and only the positive control tells them apart.

     8. collision predicate made never-true         → a reused subject is reported unique and exits 0
     9. subject read from the last line             → the body is judged instead of the title
    10. no-subject refusal forced dead              → an empty message passes the gate
    11. the --check-message literal renamed         → verify.cjs's shape check goes red
    12. the empty-message refusal forced dead       → verify.cjs's shape check goes red
    13. the index-0 range filter restored           → verify.cjs's shape check goes red

   Breaks 11-13 are judged by a different instrument: they plant a hazard into the audit and ask `tools/verify.cjs`
   whether its own `hygiene` check notices. A shape rule that only this family can see is a comment the next reader
   inherits, and the hazard being pinned is one where the audit keeps working perfectly — a renamed flag literal leaves
   the list printing every duplicate it always printed, and only the gate quietly stops ever being asked to run.
   Break 13 is not hypothetical: it is the bug this session shipped, caught by this family's own empty-range control
   within one run of writing it.

   Breaks 14-16 judge the three finding kinds the grandfather baseline can produce, and they are judged over three
   DIFFERENT git populations because each kind needs a different world to exist in. That was not the plan: the first
   version of this family recorded in prose that two of the three branches "have no instance", so a mutant against
   either would be equivalent, and left them unproved. Widening the scope found the instances on the branch as it
   stands — a SEVENTH duplicate pair sits 213 and 219 commits back, outside the 120-commit default (`node
   tools/audit-commit-subjects.cjs HEAD` names it over all 318), and a 20-commit range contains one collision, orphaning
   the other five entries — so an unproved branch turned out to be an unASKED question, the same shape as a tally that
   never looked at a surface. The drift break is the one case with no natural instance, because history has not moved,
   and so the family plants the moved pair in the audit's own source: a fixture in the target file, restored in the
   `finally`, and preceded by its own control row that requires the unbroken logic to notice the drift at all.

    14. the NEW-collision report is forced dead       → over all 318 commits, a seventh pair prints no finding
    15. the orphaned-entry report is forced dead      → over a 20-commit scope, five stale excuses print no finding
    16. the hash comparison made always-equal,        → a planted drift pair is excused and the audit exits 0
        with the drift planted

   Each of those three is caught by its kind's SENTENCE going missing, not by the summary total going to zero: the
   other two kinds keep printing, so a blinded branch shows up as a wrong count of one finding where there should be
   six, which a total-only reader would pass as "still refusing, therefore working".

   Target is the audit file, not `Sukinnect-next.html`: this family never touches the app, so it does not
   contend for the mutex every other family shares. It still restores in a `finally`; after a cancelled run
   check `git status` on `tools/audit-commit-subjects.cjs`.

     node tools/falsify-commit-subjects.cjs
*/
'use strict';
const fs = require('fs');
const os = require('os');
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
/* Two extra populations, chosen by measurement rather than by taste, because each of the audit's three finding kinds
   needs a different world to exist in. `HEAD` reads every commit the branch can reach (318 as of 2026-10-25) and is
   the only scope in which the SEVENTH duplicate pair — 213 and 219 commits back — is visible at all; the default
   120-commit window cannot see it, which is what made the NEW branch unproveable until the scope was widened.
   NARROW is the reverse: a window so short that five of the six baseline pairs fall outside it, which is the only
   way the orphan branch produces a sentence. Both are asserted to hold their instance before any mutant runs. */
const WIDE = ['HEAD'];
const NARROW = ['HEAD~20..HEAD'];
/* A baseline entry whose hash pair no longer matches reality. There is no such entry in the branch as it stands —
   history has not moved — so the drift branch has to be given a fixture, planted in the audit's own source and
   restored in the `finally`, exactly as the check-mode fixtures are planted in temp. */
const DRIFT_FIXTURE = {
  from: "{ subject: 'docs: stop carrying the totals a command already prints', shas: ['5ee3554', '6ce7a34'] },",
  to: "{ subject: 'docs: stop carrying the totals a command already prints', shas: ['5ee3554', 'aabbccd'] },",
};
/* The hygiene check that pins the audit's SHAPE lives in verify.cjs, so proving it is a rule rather than a comment
   means planting a hazard and asking a DIFFERENT instrument whether it noticed. The label is one constant shared by
   the control and the three breaks: typing it twice is how a check gets renamed and a family keeps passing. */
const GATE_LABEL = 'the commit-subject audit reads merged history, and its gate refuses for a named reason';
function runVerify() {
  try {
    return { code: 0, out: execFileSync(process.execPath, [path.join(ROOT, 'tools', 'verify.cjs')],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (e) {
    return { code: e.status === undefined ? -1 : e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}
function gateVerdict(out, word) {
  return String(out).split('\n').some(l => l.trim().indexOf(word) === 0 && l.indexOf(GATE_LABEL) > -1);
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
    /* The optional `[…]\s` group is the baseline mark the audit prints ahead of the subject. Reading it as part of
       the subject turned all six excused collisions into strings the shell's `%s` never produces, and the control
       then reported "set matches shell: NO" over a build that was fine — a reader that captures presentation
       inventory is comparing two different quantities. Measured 2026-10-25, found by the control refusing to run. */
    const m = l.match(/^\s+(\d+)x\s+(?:\[(?:recorded|NEW|DRIFT)\]\s+)?(.+?)\s+\[[0-9a-f, ]+\]$/);
    if (m) set.add(m[2]);
  });
  return set;
}
function toolFindings(out) {
  const m = out.match(/(\d+) findings/);
  return m ? Number(m[1]) : null;
}
/* Did the child actually produce its page? A mutant that fails to COMPILE also exits nonzero, and a verdict written
   as `r.code !== 0` cannot tell a changed answer from no answer — which is how one break here credited itself eleven
   times over a SyntaxError. Any verdict that wants "the tool answered differently" first wants "the tool answered". */
const producedSummary = out => /duplicated subjects over \d+ distinct ones/.test(String(out));
/* The three finding kinds, counted out of the tool's own ROWS rather than from its summary number, so a break that
   deletes one branch is measured by the absence of that branch's SENTENCE and not by arithmetic that happens to fall
   to zero for a different reason. The prefixes are the tool's own wording, matched after its FINDING marker. A
   summary-count reader alone cannot tell "no new collision" from "no orphaned entry" — both print 0 findings, and a
   guard that has lost one of its three branches still prints the right total for the other two. */
function findingKinds(out) {
  const rows = out.split('\n').filter(l => /^ {2}FINDING /.test(l));
  return {
    newCollision: rows.filter(l => /FINDING NEW collision/.test(l)).length,
    orphan: rows.filter(l => /FINDING the baseline excuses/.test(l)).length,
    drift: rows.filter(l => /FINDING the baseline records/.test(l)).length,
    all: rows.length,
  };
}
function toolCount(out) {
  const m = out.match(/(\d+) commits read/);
  return m ? Number(m[1]) : null;
}
function same(a, b) { return a.size === b.size && [...a].every(x => b.has(x)); }
function restore() { fs.writeFileSync(TARGET, original); }
/* One edit per break was enough while every break deleted a single guard. The drift break needs two: one to move a
   baseline pair away from reality (the fixture) and one to delete the comparison that would have noticed. Each
   needle is counted on the text the PREVIOUS edit produced, so a pair whose second needle is destroyed by the first
   still refuses to run rather than planting half a mutant. */
function plant(from, to) {
  const pairs = Array.isArray(from) ? from : [{ from, to }];
  let cur = fs.readFileSync(TARGET, 'utf8');
  for (let i = 0; i < pairs.length; i++) {
    const n = cur.split(pairs[i].from).length - 1;
    if (n !== 1) {
      return { ok: false, why: 'needle ' + (i + 1) + ' of ' + pairs.length + ' matched ' + n };
    }
    cur = cur.replace(pairs[i].from, pairs[i].to);
  }
  fs.writeFileSync(TARGET, cur);
  return { ok: true };
}

const BREAKS = [
  { name: 'the dedup predicate is made never-true, so a known duplicate is reported as none',
    from: '.filter(([, shas]) => shas.length > 1)', to: '.filter(([, shas]) => false)' },
  { name: 'the predicate is widened to every subject, so the set no longer means duplicates',
    from: '.filter(([, shas]) => shas.length > 1)', to: '.filter(([, shas]) => shas.length > 0)' },
  { name: 'the refusal on an empty range is forced dead',
    from: 'if (rows.length === 0) {', to: 'if (false) {', emptyRange: true },
  { name: 'the default scope is quietly re-rooted onto origin/main, so post-merge history stops being read',
    /* Re-pointed 2026-10-25. This used to mutate the rev in `['-n', N, 'HEAD']` to `'origin/main'`, which was a real
       shrink when the branch ran far ahead of main. Two merges later, origin/main sits four commits behind HEAD, so
       walking 120 back from either rev lands on nearly the same 120 commits — the mutant became EQUIVALENT and the
       break printed MISSED while the guard it represents was still needed. The faithful form is the one the audit's
       own header records as the original defect: defaulting the RANGE to `origin/main..HEAD`, which is four commits
       and is condemned by SCOPE_FLOOR. */
    from: "&& !(CHECK_AT >= 0 && i === CHECK_AT + 1))[0] || '';",
    to: "&& !(CHECK_AT >= 0 && i === CHECK_AT + 1))[0] || 'origin/main..HEAD';" },
  { name: 'the default scope shrinks to three commits, which is the population defect that let a reused subject through',
    from: 'const DEFAULT_COUNT = 120;', to: 'const DEFAULT_COUNT = 3;' },
  { name: 'the baseline stops excusing, so six recorded collisions become six findings',
    /* The grandfather list is only honest because it is verified against reality on every run. This is the one
       baseline break with a live instance today: inverting the guard turns all six recorded collisions into findings
       and the audit exits 1. Inverted rather than deleted because the lookup now exists at TWO byte-identical sites —
       one raises findings, one picks the printed mark — and a needle naming the shared line matches 2, which plant
       rightly refuses. Only the findings site can change the exit code, so that is the one this break points at; in
       the mutant the two sites disagree and the line still prints [recorded] above a finding that says NEW, which is
       itself the observation worth keeping: the audit computes its verdict and its presentation from two copies of
       one predicate. The branches that notice a MOVED baseline pair and an excused subject that stopped colliding
       have no instance — history currently matches the list — so a mutant against either would be equivalent, and an
       equivalent mutant is recorded in prose rather than kept to inflate the count. */
    from: "if (!known) findings.push('NEW collision, not in the baseline: '",
    to: "if (known) findings.push('NEW collision, not in the baseline: '", listFindings: true },
  /* Three breaks whose observer is the GATE, not this family. `hygiene` pins the audit's shape because both halves
     of that tool fail by printing something reassuring, and a shape rule needs a mutation that proves it is a rule
     and not a comment. Each plants a hazard, then requires verify.cjs to report the named check FAILing. */
  { name: 'the pre-commit flag literal is renamed, so the gate exists but can never be asked to run',
    from: "ARGV.indexOf('--check-message')", to: "ARGV.indexOf('--no-such-mode')", gateCheck: GATE_LABEL },
  { name: 'the empty-message refusal is forced dead, so a message with no subject is certified unique',
    from: 'if (!subject) refuse(', to: 'if (false) refuse(', gateCheck: GATE_LABEL },
  { name: 'the range filter is restored to dropping index 0 unconditionally — the bug this session actually shipped',
    /* Written from the defect, not from imagination: the first version of the arg filter used a bare
       `i !== CHECK_AT + 1`, and with the flag absent that index is 0, so a plain `HEAD..HEAD` range was silently
       replaced by the default population and the empty-scan refusal never fired. The family's own empty-range
       control caught it within one run. Pinned here so a future rewrite that re-introduces it goes red in the gate
       as well as in this family. */
    from: '!(CHECK_AT >= 0 && i === CHECK_AT + 1)', to: 'i !== CHECK_AT + 1', gateCheck: GATE_LABEL },
  /* The three gate breaks. Each is judged by running the tool in --check-message mode against an embedded fixture and
     asking whether the refusal that should fire still fires; caught means the message was allowed through, which is
     exit 0, not a crash — so a mutant that throws is NOT credited as caught, the same direction rule break 4 taught
     this family when it asserted the mutated tool must refuse. */
  { name: 'the collision predicate is made never-true, so a subject already in use is certified unique',
    from: 'const collides = rows.filter(r => r.subject === subject);',
    to: 'const collides = rows.filter(() => false);', check: 'dup' },
  { name: 'the subject is read from the last line, so the body is judged instead of the title',
    from: "!l.startsWith('#'))[0] || '';", to: "!l.startsWith('#')).slice(-1)[0] || '';", check: 'withBody' },
  { name: 'the refusal on a message with no subject line is forced dead',
    from: 'if (!subject) refuse(', to: 'if (false) refuse(', check: 'empty' },
  /* The three baseline-branch breaks. Each is judged over the population where its own kind has an instance, and
     caught means that kind's SENTENCE disappears while the tool still prints a plausible-looking total — a summary
     count of 0 is what a blinded branch looks like from outside, and it is indistinguishable from cleanliness. */
  { name: 'the new-collision report is forced dead, so a seventh pair is another line in a list',
    from: 'if (!known) findings.push(', to: 'if (false) findings.push(',
    over: { args: WIDE, kind: 'newCollision' } },
  { name: 'the orphaned-entry report is forced dead, so a scope that shrank answers like a repaired baseline',
    from: 'if (!dupes.some(([s]) => s === b.subject)) {', to: 'if (false) {',
    over: { args: NARROW, kind: 'orphan' } },
  { name: 'the hash comparison is made always-equal over a planted drift pair, so a moved entry is excused',
    /* Two edits: the fixture that makes a drift exist, then the guard that would have named it. `else if (false)`
       keeps the `else excused++` arm valid JS, so the mutant is a dead branch rather than a syntax error — a break
       that throws is not credited by any verdict in this family. */
    pairs: [DRIFT_FIXTURE,
      { from: "else if (shas.slice().sort().join(' ') !== known.shas.slice().sort().join(' ')) {",
        to: 'else if (false) {' }],
    over: { args: [], kind: 'drift' } },
];

function runArgs(args) {
  try {
    return { code: 0, out: execFileSync(process.execPath, [TARGET].concat(args),
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (e) {
    return { code: e.status === undefined ? -1 : e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}
/* The gate half runs against a message file, so the family writes its own fixtures — into a temp directory rather
   than the repository, because a fixture left in the tree becomes a file the next build ships or a reader deletes.
   The duplicate subject is taken from the shell's recomputed set, never typed here: a hard-coded phrase stops being
   a duplicate the next time history moves, and the break would then be judging nothing while still printing CAUGHT. */
let FIXTURE_DIR = '';
function runCheck(fixtureName) {
  return runArgs(['--check-message', path.join(FIXTURE_DIR, fixtureName + '.txt')]);
}
const lastLine = out => (String(out).split('\n').filter(Boolean).pop() || '');

let applied = 0, caught = 0, missed = 0, unmatched = 0;
try {
  const base = run();
  const gotDupes = toolDupes(base.out), gotCount = toolCount(base.out);
  /* The audit is a gate now, not a list: it exits 1 when a collision falls outside the baseline. So `base.code !== 0`
     is not automatically a broken build — but the control still requires zero findings, because this family judges an
     unbroken tool, and a seventh collision is a fact the reader has to settle before the mutants mean anything.
     Naming the reason matters: "the tool and shell disagree" and "history has a new collision" both exit 1, and one
     of them is the tool doing its job. */
  const baseFindings = toolFindings(base.out);
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
  const emptyRefused = empty.code !== 0 && /^NO CONCLUSION/m.test(empty.out);
  /* The gate's own baseline, in the same unbroken file. Five verdicts: a reused subject refused, the same subject
     refused when it sits under a comment banner, an invented subject passed, a one-line message whose BODY is unique
     passed because the TITLE is what is judged, and an empty file refused. The pass is as load-bearing as the
     refusals — a mode that refused every message would exit 1 on all four refusal cases and look entirely healthy. */
  FIXTURE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'suki-subjects-'));
  const dupSubject = expectDupes.size ? [...expectDupes][0] : '';
  const uniqueSubject = 'tools: a subject invented for this positive control, which no commit has ever used';
  const fixture = (name, text) => fs.writeFileSync(path.join(FIXTURE_DIR, name + '.txt'), text, 'utf8');
  fixture('dup', dupSubject + '\n');
  fixture('withBody', dupSubject + '\n\nThe body is a sentence, and this one is not a commit subject.\n');
  fixture('unique', uniqueSubject + '\n\nbody\n');
  fixture('empty', '');
  fixture('banner', '# Please enter the commit message for your changes.\n' + dupSubject + '\n\nbody\n');
  const gate = { dup: runCheck('dup'), withBody: runCheck('withBody'), unique: runCheck('unique'),
    empty: runCheck('empty'), banner: runCheck('banner') };
  /* Anchored on the WHOLE output, not the last line. The COLLIDES refusal prints its explanation after the verdict,
     so a tail-only reader — the habit every earlier control in this file has — reported "reused refused: NO" against
     a gate that was refusing perfectly. Measured, not reasoned: the by-hand run had already printed COLLIDES with
     both hashes for this exact fixture. */
  const refuses = (r, word) => r.code === 1 && new RegExp('^' + word, 'm').test(r.out);
  const gateOk = refuses(gate.dup, 'COLLIDES') && refuses(gate.withBody, 'COLLIDES')
    && refuses(gate.banner, 'COLLIDES') && refuses(gate.empty, 'NO CONCLUSION')
    && gate.unique.code === 0 && /^unique/m.test(gate.unique.out);
  console.log('control  unbroken gate → reused refused: ' + (refuses(gate.dup, 'COLLIDES') ? 'yes' : 'NO')
    + ', under a banner: ' + (refuses(gate.banner, 'COLLIDES') ? 'yes' : 'NO')
    + ', body-only-unique refused: ' + (refuses(gate.withBody, 'COLLIDES') ? 'yes' : 'NO')
    + ', empty refused: ' + (refuses(gate.empty, 'NO CONCLUSION') ? 'yes' : 'NO')
    + ', unique PASSED: ' + (gate.unique.code === 0 ? 'yes' : 'NO'));
  console.log('control  unbroken audit, empty range → exit ' + empty.code + ', refused: '
    + (emptyRefused ? 'yes' : 'NO'));
  /* Third control, and the one the three gateCheck breaks depend on: verify.cjs must report the named shape check
     PASSING on the unbroken file. Without it a break could "catch" a FAIL that was already there — or that is there
     because the check was renamed and matches nothing at all, which is the shape a dead check keeps. */
  const gateBase = runVerify();
  const gateCheckAlive = gateVerdict(gateBase.out, 'PASS') && !gateVerdict(gateBase.out, 'FAIL');
  console.log('control  verify.cjs on the unbroken audit → exit ' + gateBase.code + ', shape check '
    + (gateCheckAlive ? 'PASS' : 'NOT PASSING (renamed, or already red)'));
  /* One control per finding kind, and each asserts that its population CONTAINS the instance before any mutant is
     credited with deleting it. This is the rule the first version of this family broke in the other direction: it
     wrote "no instance today, so a mutant would be equivalent" about two branches and left them unproved, and both
     instances existed the whole time — one outside the default scope, one inside a deliberately short one. A branch
     with no instance is a legitimate finding to record; a branch nobody went looking for is not. */
  const wideRun = runArgs(WIDE), narrowRun = runArgs(NARROW);
  const wideKinds = findingKinds(wideRun.out), narrowKinds = findingKinds(narrowRun.out);
  let driftRun = { code: -1, out: '' }, driftKinds = { drift: 0, all: 0 };
  /* Fixed 2026-10-25. This read `plant(DRIFT_FIXTURE)` — one object handed to a function whose first parameter is the
     needle STRING — so `Array.isArray` was false, the pair became `{ from: <object>, to: undefined }`,
     `cur.split(<object>)` coerced the needle to "[object Object]", matched 0, and the return value was DISCARDED.
     The tool then ran unmutated: zero drift findings, exit 0, and the control read "planted drift: 0" — which is this
     repository's oldest failure, an instrument that could not see answering like a world with nothing to see. The
     missing instance was the family's, not the branch's. Planting is now checked, and a failed plant is printed as
     SUCH rather than as a count, because "no instance exists" and "the fixture never landed" need different fixes. */
  const driftPlant = plant(DRIFT_FIXTURE.from, DRIFT_FIXTURE.to);
  if (driftPlant.ok) {
    try { driftRun = run(); driftKinds = findingKinds(driftRun.out); } finally { restore(); }
  }
  const kindsOk = wideRun.code !== 0 && wideKinds.newCollision > 0
    && narrowRun.code !== 0 && narrowKinds.orphan > 0
    && driftPlant.ok && driftRun.code !== 0 && driftKinds.drift > 0;
  console.log('control  the three finding kinds have instances → all history: ' + wideKinds.newCollision
    + ' new (exit ' + wideRun.code + ') · ' + NARROW[0] + ': ' + narrowKinds.orphan + ' orphaned (exit '
    + narrowRun.code + ') · planted drift: '
    + (driftPlant.ok ? driftKinds.drift + ' (exit ' + driftRun.code + ')' : 'FIXTURE NOT PLANTED — ' + driftPlant.why));
  console.log('control  unbroken audit → exit ' + base.code + ', scope ' + scopeN + ' commits (floor '
    + SCOPE_FLOOR + '): ' + (scopeBigEnough ? 'ok' : 'TOO SMALL') + ', set matches shell: '
    + (same(expectDupes, gotDupes) ? 'yes' : 'NO') + ', commits ' + gotCount + '/' + expectCount
    + ', duplicates seen: ' + expectDupes.size + ', baseline findings: ' + baseFindings);
  if (base.code !== 0 || !emptyRefused || !scopeBigEnough || expectDupes.size === 0
    || !same(expectDupes, gotDupes) || gotCount !== expectCount || !gateOk || baseFindings !== 0
    || !gateCheckAlive || !kindsOk) {
    console.log('ABORT — the unbroken audit does not agree with the shell, or its gate does not agree with its'
      + ' fixtures, so nothing below this line measures anything. Four ways that is the truth rather than a'
      + ' defect: the branch has no duplicate subjects to find (the control requires at least one, because a family'
      + ' cannot prove a rule that has no instance), or the tool and the shell disagree, which is the bug this family'
      + ' exists to catch, or the gate let a reused subject through / condemned a unique one, which means the'
      + ' verdict the three check-mode breaks depend on is not trustworthy, or a finding kind has no instance. '
      + 'Read the control line before touching the baseline: it now distinguishes "0" from "FIXTURE NOT PLANTED", and '
      + 'the first time it fired, the cause was this family handing an object to a needle parameter — not history '
      + 'moving. Believing an instrument\'s zero is how a broken reader certifies a clean world.');
    process.exitCode = 1;
  } else {
    for (const b of BREAKS) {
      const p = plant(b.pairs || b.from, b.to);
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
        /* Re-pointed 2026-10-25, because it printed MISSED and the guard was still needed. Asking "did it answer
           clean" stopped working the moment the baseline acquired its own drift loop: with the empty-range refusal
           dead, that loop notices that none of the six excused subjects collide across zero commits, so the tool
           still exits 1 — for a different reason. A status code cannot separate "the guard fired" from "the guard is
           gone and a neighbour complained". What this guard promises specifically is the CAUSE on the page: a reader
           whose revision walk matched nothing is told six baseline entries went stale, which sends them to fix
           history that is fine. Two guards overlapping is a fact about the instrument, and the break now measures
           the one it names. */
        verdict = producedSummary(r.out) && !/^NO CONCLUSION/m.test(r.out);
        detail = 'no refusal of its own: exit ' + r.code + ' · ' + tail.slice(0, 58);
      } else if (b.listFindings) {
        /* Caught = the excused set stops being excused, which the audit reports as findings and a nonzero exit.
           Requiring a RISE over the control's own count rather than a fixed six is what keeps this break true when
           the baseline is repaired or the scope moves. */
        const r = run();
        const f = toolFindings(r.out);
        /* A COUNT is required, not an exit code. This break was credited for every run since it was written and the
           mutant never behaved at all: its replacement string carried a closing paren that the needle did not have,
           so the audit died with a SyntaxError, `r.code !== 0` was true, and the line printed CAUGHT. Measured, not
           argued — six identical runs of the mutated child, each 958 bytes ending `Node.js v24.13.0`, summary parsed
           null. The defect class is this repository's own (a mutant that fires every check except the one it was
           written for) arriving from the opposite side: a break that cannot fail also cannot guard, and a crash is
           not a behaviour. Printing the captured tail is what gave it away, so that stays. */
        verdict = f !== null && baseFindings !== null && f > baseFindings;
        detail = 'findings ' + f + ' against the control\'s ' + baseFindings + ', exit ' + r.code
          + (f === null
            ? ' — SUMMARY NOT READ, ' + r.out.length + ' bytes captured, tail: '
              + JSON.stringify((r.out.split('\n').filter(Boolean).slice(-1)[0] || '').slice(0, 60))
            : '');
      } else if (b.gateCheck) {
        /* Caught = verify.cjs prints the named shape check as FAIL. Asking for that label rather than for a nonzero
           exit is the whole point: 567 other checks also fail when something unrelated breaks, and a family that
           credited any red at all would pass on a build where its own check had been renamed away. */
        const r = runVerify();
        verdict = gateVerdict(r.out, 'FAIL');
        detail = 'verify exit ' + r.code + ', shape check '
          + (verdict ? 'FAILED as required'
            : gateVerdict(r.out, 'PASS') ? 'still PASSING' : 'ABSENT from the output');
      } else if (b.check) {
        /* Caught = the message was ALLOWED THROUGH. The three mutations each delete a guard, so the faithful verdict
           is the guarded behaviour appearing, not an error being thrown — the direction rule this family learned the
           hard way on break 4. A crash (exit -1 or 2) is therefore not credited. */
        const r = runCheck(b.check);
        const tail = lastLine(r.out);
        verdict = r.code === 0 && !/^NO CONCLUSION/.test(tail);
        detail = b.check + '.txt allowed through: exit ' + r.code + ' · ' + tail.slice(0, 52);
      } else if (b.over) {
        /* Caught = this kind's sentence is GONE from the population that holds its instance. The exit code cannot
           carry this verdict: the other two kinds keep printing, so a blinded branch still refuses and still prints a
           plausible "N findings" line — for reasons that no longer include the one the deleted guard was for. */
        const r = runArgs(b.over.args);
        const k = findingKinds(r.out);
        const controlKinds = b.over.kind === 'newCollision' ? wideKinds
          : b.over.kind === 'orphan' ? narrowKinds : driftKinds;
        verdict = k[b.over.kind] === 0 && toolCount(r.out) !== null;
        detail = b.over.kind + ' rows ' + controlKinds[b.over.kind] + ' → ' + k[b.over.kind]
          + ', all findings ' + controlKinds.all + ' → ' + k.all + ', exit ' + r.code
          + (r.code === 0 ? ' (and the whole refusal went quiet)' : ' (refusing, but not for this)');
      } else {
        const r = run();
        const d = toolDupes(r.out), c = toolCount(r.out);
        /* A run that refuses BECAUSE IT READ NO COMMITS is a scope verdict, not a crash. Re-added 2026-10-25 after
           PR #13 merged: `origin/main..HEAD` became empty, so the re-rooted default printed "0 commits read" then
           `NO CONCLUSION`, produced no page, and `producedSummary` alone judged the break MISSED. The guard earned
           its keep — it converted a break that had been crediting a SyntaxError into one that reported honestly —
           and the fix is not to loosen it but to accept the refusal the tool itself prints, which a crashing child
           never produces. Two shapes, told apart by whether `NO CONCLUSION` is on the page. */
        const refusedEmpty = r.code !== 0 && /^NO CONCLUSION/m.test(r.out);
        verdict = refusedEmpty
          || (producedSummary(r.out) && (r.code !== 0 || !same(expectDupes, d) || c !== expectCount));
        detail = 'set ' + d.size + ' vs ' + expectDupes.size + ', count ' + c + '/' + expectCount
          + (refusedEmpty ? ', refused for reading NO commits — the merged premise emptied'
            : producedSummary(r.out) ? '' : ' — NO PAGE AND NO REFUSAL, not credited');
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
  if (FIXTURE_DIR) fs.rmSync(FIXTURE_DIR, { recursive: true, force: true });
  const back = fs.readFileSync(TARGET, 'utf8') === original;
  console.log('cleanup  audit restored byte-for-byte: ' + back
    + ', fixtures removed: ' + (FIXTURE_DIR ? !fs.existsSync(FIXTURE_DIR) : 'none written'));
  if (!back) process.exitCode = 1;
}

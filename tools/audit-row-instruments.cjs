'use strict';
/* Row→instrument traceability. The plan answers "is everything implemented?" with a class-level sentence
   ("AR — 21. Each is still backed by a named honesty/machine/storage check…") that names evidence for none
   of the 21. This asks the question per row: can a reader get from this id to something runnable?

   It is a census, not a verdict: a row in NA or PD may legitimately need no assertion, and a row whose
   guard exists but is never named beside the id is a traceability gap, not a missing feature. What this
   tool refuses to do is answer about a subset — see the population guard, which has already caught two
   of this file's own scanning defects.

     node .scratch/audit-row-instruments.js            # or, once promoted, tools/audit-row-instruments.cjs */
const cp = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const PLAN = process.env.ARI_PLAN || path.join(ROOT, 'SUKINNECT_UX_RELIABILITY_MVP_PLAN.md');
const VERIFY = process.env.ARI_VERIFY || path.join(ROOT, 'tools', 'verify.cjs');
const MATRIX_TOOL = process.env.ARI_MATRIX || 'tools/audit-matrix-coverage.cjs';

const plan = fs.readFileSync(PLAN, 'utf8');
const verify = fs.readFileSync(VERIFY, 'utf8');

/* 1 — the population: §4's matrix. A class cell may carry an annotation inside the bold
   (`**CD (now measured)**`), and that is the difference between 47 rows and 38. */
const sec4 = plan.slice(plan.search(/^## 4\./m), plan.search(/^## 5\./m));
if (!sec4.length) { console.log('NO CONCLUSION: §4 not found in ' + PLAN); process.exit(1); }
const idRow = /^\|\s*([GRAP]\d?[0-9a-z]*|P1[a-z])\s*\|/;
const lines = sec4.split(/\r?\n/);
const rows = [];
for (let i = 0; i < lines.length; i++) {
  const m = idRow.exec(lines[i]);
  if (!m) continue;
  let text = lines[i];
  for (let j = i + 1; j < lines.length; j++) {
    if (lines[j].trim() === '' || idRow.test(lines[j])) break;
    if (!/^\|/.test(lines[j]) && !/^\s{2,}\S/.test(lines[j])) break;
    text += '\n' + lines[j];
  }
  const cls = (/\*\*(AR|CD|PR|PD|CV|NA)\b[^\]]*\*\*/.exec(text) || [])[1];
  if (!cls) { console.log('NO CONCLUSION: row ' + m[1] + ' carries no class cell'); process.exit(1); }
  rows.push({ id: m[1], cls: cls, row: text });
}
const EXPECT = Number((process.env.ARI_EXPECT || '47'));
if (rows.length !== EXPECT) {
  console.log('NO CONCLUSION: read ' + rows.length + ' matrix rows, expected ' + EXPECT +
    ' — reporting on a subset would read like a complete answer');
  process.exit(1);
}
const ids = new Set(rows.map(r => r.id));
if (ids.size !== rows.length) {
  console.log('NO CONCLUSION: ' + (rows.length - ids.size) + ' duplicate id(s) in §4');
  process.exit(1);
}

/* 2 — what counts as a runnable instrument. Tokens are matched against the repository, not against
   prose: a cited family must exist as a file. The gate-label set is read out of verify.cjs itself. */
const labels = new Set();
(verify.match(/c\.check\(\s*'([^']+)'/g) || []).forEach(s => labels.add(/'([^']+)'/.exec(s)[1]));
(verify.match(/verdict\(\s*'([^']+)'/g) || []).forEach(s => labels.add(/'([^']+)'/.exec(s)[1]));
const labelList = [...labels];

const TOOLS = /(?:falsify|probe|audit|sweep|measure|device)-[a-z0-9-]+|[a-z-]+\.cjs/g;
function resolve(tok) {
  if (/\.cjs$/.test(tok)) return fs.existsSync(path.join(ROOT, 'tools', tok)) || fs.existsSync(path.join(ROOT, tok));
  const fam = 'tools/' + tok + '.cjs', js = 'tools/' + tok + '.js';
  return fs.existsSync(path.join(ROOT, fam)) || fs.existsSync(path.join(ROOT, js)) ||
    fs.existsSync(path.join(ROOT, 'Sukinnect-Android', fam));
}

const s17 = plan.slice(plan.search(/^## 17\./m));
/* §17 disposes in multi-line bullets. Line-adjacency was the wrong unit: a guard named three lines under
   the id it backs is still named, and a reader sees it. A disposition block is the bullet that names the
   id plus its continuation lines, up to the next bullet. Same for §4's row, which wraps. */
const s17Lines = s17.split(/\r?\n/);
/* A block naming several ids is the plan's CLASS LIST, not a disposition: reading it as evidence let one
   sentence about the whole AR class credit 21 rows, so the census rose 15 → 27 when §17 gained real tool
   names. An id counts as disposed only by a block about that row — at most two ids in it. */
function blocksNaming(id) {
  const rx = new RegExp('\\b' + id + '\\b');
  const ALL_IDS = /\b([GRAP]\d?[0-9a-z]*|P1[a-z])\b/g;
  const got = [];
  for (let i = 0; i < s17Lines.length; i++) {
    if (!rx.test(s17Lines[i])) continue;
    let block = s17Lines[i];
    for (let j = i + 1; j < s17Lines.length; j++) {
      if (/^- /.test(s17Lines[j]) || /^#{2,} /.test(s17Lines[j]) || s17Lines[j].trim() === '') break;
      block += '\n' + s17Lines[j];
    }
    const named = new Set((block.match(ALL_IDS) || []));
    if (named.size > 2) {
      /* A class list is not a disposition — but it can still hold real shared evidence. `falsify-figures`
         guards G7 and G8, and its citation sits inside the CD bullet, so a blanket skip threw away a
         pointer that exists. Credit such a block only from lines carrying BOTH this id and a tool token:
         a bullet-wide credit is exactly what let one sentence about all 21 AR ids lift the census from 15
         to 27, which is the measurement tracking the prose instead of the rows. */
      const TOK = /(?:falsify|probe|audit|sweep|measure|device)-[a-z0-9-]+|[a-z-]+\.cjs/;
      /* The same test at line level. Without it the rule still flattered: §17's AR sentence names
         `A8` `A10` `A12` `A13` and a tool token on one line, so four ids were credited by the very
         sentence written to be honest about them. A line is evidence about a row only when it is about
         that row — at most two ids on it. */
      const sameLine = s17Lines.filter(l => {
        if (!(rx.test(l) && TOK.test(l))) return false;
        return new Set((l.match(ALL_IDS) || [])).size <= 2;
      });
      if (sameLine.length) got.push(sameLine.join('\n'));
      continue;
    }
    got.push(block);
    i = s17Lines.length;               /* one block per id is enough; the rest are prose mentions */
  }
  return got.join('\n');
}
function evidenceFor(id) {
  const raw = rows.find(r => r.id === id).row + '\n' + blocksNaming(id);
  /* A sentence that NAMES a file to say the row is not guarded by anything is not evidence that it is.
     This was caught by my own §17 disclaimer about G6 — "Withheld appears zero times in
     `tools/verify.cjs`" — which credited G6 and moved the census to 42 traced with zero built-class rows
     unpointed: a perfect score manufactured by a negation. A line is dropped when it denies rather than
     declares, and tools/falsify-row-instruments.cjs now carries the break that plants exactly that
     sentence and requires the row to stay in the untraced list. */
  const NEG = /zero times|no pointer|no instrument|does not appear|never appears|not enforced|cannot trace|no resolving|nothing runnable/i;
  const hay = raw.split(/\r?\n/).filter(l => !NEG.test(l)).join('\n');
  const out = [];
  (hay.match(TOOLS) || []).forEach(t => { if (resolve(t) && !out.includes('tool:' + t)) out.push('tool:' + t); });
  (hay.match(/\*\*([^*]{12,})\*\*/g) || []).forEach(b => {
    const label = b.slice(2, -2).trim();
    /* Markdown wraps prose, so a bold-quoted label routinely spans physical lines with two spaces of
       indentation in the middle. Comparing raw bytes made every wrapped pointer unresolved — three of the
       five rows this file exists to credit read as naming nothing. Normalise whitespace on both sides. */
    const flat = label.replace(/\s+/g, ' ').trim();
    if (labelList.includes(flat)) out.push('check:' + flat.slice(0, 46));
  });
  if (/\bhonesty\b|\bmachine\b|\bstorage\b|\bhygiene\b|\bletter\b|\blogin\b|\bback\b|\breschedule\b|\blegal\b|\bdates\b|\bweighing\b/.test(hay))
    out.push('suite-name (not a specific check)');
  return out;
}

/* 3 — report. Built classes are held to a runnable name; PD/NA are not, and say so. */
/* CV is excluded from the rows that must name an instrument: the class means the check cannot be performed
   on this machine at all (a thumb, a soft keyboard, a phone's text inflation), and a row in it that named a
   tool would be claiming an instrument the plan already says does not exist. NA and PD stay out for the same
   reason: nothing was built, so nothing is guarded. */
const NEEDS = ['AR', 'CD', 'PR'];
const bare = [], traced = [];
rows.forEach(r => {
  const ev = evidenceFor(r.id);
  const strong = ev.filter(e => e.startsWith('tool:') || e.startsWith('check:'));
  if (strong.length) traced.push([r, ev]);
  else if (NEEDS.includes(r.cls)) bare.push([r, ev]);
  else bare.push([r, ev]);
});

console.log('rows: ' + rows.length + '   gate labels read from verify.cjs: ' + labels.size +
  '   §17 starts at line ' + (plan.slice(0, plan.search(/^## 17\./m)).split(/\r?\n/).length));
/* Which channel did the tracing come from? Printed because a falsifier exposed one of these as dead
   weight: making every gate label unmatchable left the traced count unchanged, which can only mean the
   label channel contributes nothing today. A scanner with an unused channel looks like a stronger
   scanner than it is, so the split is printed on every run and a mutant has to be able to move it. */
const chan = { tool: 0, check: 0, both: 0 };
traced.forEach(([, ev]) => {
  const t = ev.some(e => e.startsWith('tool:')), c = ev.some(e => e.startsWith('check:'));
  if (t && c) chan.both++; else if (t) chan.tool++; else chan.check++;
});
console.log('traced via a tool file only: ' + chan.tool + '   via a resolved gate label only: ' + chan.check +
  '   via both: ' + chan.both);
console.log('traced to a runnable name: ' + traced.length +
  '   not traced: ' + bare.length + '  (of which built-class rows: ' +
  bare.filter(x => NEEDS.includes(x[0].cls)).length + ')');
console.log('\n=== built-class rows a reader cannot trace to anything runnable ===');
bare.filter(x => NEEDS.includes(x[0].cls)).forEach(([r, ev]) =>
  console.log('  ' + r.id.padEnd(5) + '[' + r.cls + ']  ' + (ev.length ? 'only: ' + ev.join(', ') : 'nothing named')));
console.log('\n=== rows whose class makes an assertion optional ===');
bare.filter(x => !NEEDS.includes(x[0].cls)).forEach(([r]) => console.log('  ' + r.id.padEnd(5) + '[' + r.cls + ']'));
console.log('\nThis tool exits 1 only when it cannot see the whole matrix. A listed row is a pointer missing, ' +
  'not a feature missing — that distinction is the whole point, and only a person can settle it.');

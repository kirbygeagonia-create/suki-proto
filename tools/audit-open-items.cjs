/* Lists every deferral claim the documents that speak in the present tense still make, so a pass that
   closes an item can see whether the sentence saying "not yet" was updated.

   Found by hand on 2026-10-23, four times in one sweep. AGENTS.md still said the admin Insights screen
   "needs §76 applied to it, and that is the next pass" three sections after the pass that applied it;
   CHANGES.md §81 recorded de-typing as found-not-fixed without saying §82 had since fixed it;
   DEVICE-PASS.md's walk-4 list still owed a thumb to a screen two handset walks had already read; and
   README.md told a reviewer the app has "never" been measured on a handset after six walks across two
   phones. §90 of CHANGES.md caught hand-kept *numbers* drifting. These are hand-kept *states*, and no
   count can catch them: every one of those sentences was true when written and false by the next commit.

   This is a census, not a verdict. An open item is legitimate — the concierge's picker really does owe
   a thumb — so the tool prints the list and exits 0, and the reader dispositions each line: still owed,
   or stale. What it refuses to do is answer with a clean zero. Every marker prints with its own count
   including zero, because a scan whose vocabulary rotted would otherwise look like a document with
   nothing outstanding, and if NO marker hits anything at all the answer is `NO CONCLUSION` — which
   `tools/probe-all.cjs` flags rather than counts as a pass. Proved by
   `node tools/falsify-open-items.cjs`.

     node tools/audit-open-items.cjs
     node tools/audit-open-items.cjs CHANGES.md      # one document, e.g. to audit a section's history
*/
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
/* Scope is the documents that claim PRESENT state. `CHANGES.md` is a dated log — its sections describe
   what was true on the day each was written, and the house rule for a superseded one is the dated note
   §87 and §81 now carry, not a rewrite — so it is out of scope by design and available on the command
   line for anyone auditing one section's history. */
const DOCS = process.argv[2] ? process.argv.slice(2) : ['AGENTS.md', 'DEVICE-PASS.md', 'README.md'];

/* Vocabulary, not grammar: the phrase a sentence uses when it declines to finish something. Each one is
   counted separately and printed even at zero, so a marker that has rotted into silence is visible as a
   zero beside the others rather than as a smaller total. Every marker here is a PRESENT-tense deferral —
   a bare `owed` matched 80 lines of history, most of them sentences about a pass that owed something
   and then paid it, which is a list nobody reads. */
const MARKERS = [
  'is owed', 'are owed', 'still owed', 'remains owed',
  'is the next pass', "next pass's subject",
  'stays open', 'stays OPEN', 'remains open', 'left open',
  'not built', 'rather than built', 'found-not-fixed',
  'unverified', 'not handset-verified', 'untested on hardware',
];

const rows = [];
const hits = {};
let readable = 0;
for (const doc of DOCS) {
  const abs = path.join(ROOT, doc);
  let text;
  try { text = fs.readFileSync(abs, 'utf8'); readable++; }
  catch (missing) { rows.push({ doc, line: 0, marker: 'MISSING', window: 'the document is not on disk' }); continue; }
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const m of MARKERS) {
      if (line.indexOf(m) === -1) continue;
      hits[m] = (hits[m] || 0) + 1;
      const window = [lines[i - 1], line, lines[i + 1]].filter(Boolean).join(' ').replace(/\s+/g, ' ');
      rows.push({ doc, line: i + 1, marker: m, window: window.slice(0, 230) });
    }
  });
}

console.log('open-item census — ' + DOCS.join(', ') + ' — a list to read, not a verdict to pass');
let last = '';
for (const r of rows) {
  if (r.doc !== last) { console.log('─'.repeat(78) + '\n' + r.doc); last = r.doc; }
  console.log(':' + String(r.line).padEnd(6) + '[' + r.marker + ']  ' + r.window);
}
const tally = MARKERS.map(m => m + '=' + (hits[m] || 0)).join(' ');
if (readable === 0 || rows.length === 0) {
  console.log('NO CONCLUSION: no deferral claim was read — '
    + (readable === 0 ? 'none of the documents could be opened' : 'every marker matched nothing, so the vocabulary is dead')
    + '. A clean census is not the same as an empty scan.');
  process.exitCode = 1;
} else {
  console.log('─'.repeat(78));
  console.log(rows.length + ' deferral claims across ' + readable + ' of ' + DOCS.length
    + ' documents; disposition each as still-owed or stale. markers: ' + tally);
}

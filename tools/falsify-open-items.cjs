/* Proves the open-item census can fail, and that its refusal is what condemns a dead scan.

   `tools/audit-open-items.cjs` lists the deferral claims AGENTS.md, DEVICE-PASS.md and README.md make in
   the present tense, because on 2026-10-23 four such sentences were found still saying "next pass" after
   the pass that closed them. A census like that fails in the one way every scan in this repository has
   failed: its vocabulary rots, matches nothing, and reports a clean document. So the family's first job
   is to prove that a vacuous scan is REFUSED rather than counted — which is why the breaks are composed
   rather than independent.

     1. positive control, unbroken census → a nonzero list, `3 of 3 documents`, no refusal, exit 0
     2. the scan fed phrases that cannot occur → the census must print `NO CONCLUSION` and exit 1
     3. the per-marker tally filtered to markers that hit → the zeros vanish, and the summary line must
        still name every marker, because "8 of the 16 markers were silent" is the only signal a reader
        gets that the list is short because the vocabulary is dead rather than because the docs are clean
     4. one default document renamed to a path that does not exist → the census must say `MISSING` and
        must NOT claim to have read three of three
     5. the refusal branch forced dead WHILE the markers are dead → the vacuous scan now prints a tidy
        zero and exits 0. This is the blind-sensor break: it proves break 2 is caught by the refusal and
        not by a count the census happens to print.

   The target file is the census itself, so nothing here touches `Sukinnect-next.html` — the app file stays
   the mutex every other family shares, and this one can run inside the aggregate without joining that
   queue. It still restores in a `finally`, and a cancelled run leaves a rewritten tool in the tree exactly
   the way a cancelled mutant pass leaves a rewritten app, so check `git status` on
   `tools/audit-open-items.cjs` after an interrupted one.

     node tools/falsify-open-items.cjs
*/
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'tools', 'audit-open-items.cjs');
const original = fs.readFileSync(TARGET, 'utf8');

function run() {
  try {
    return { code: 0, out: execFileSync(process.execPath, [TARGET], { encoding: 'utf8', cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (err) {
    return { code: err.status === undefined ? -1 : err.status, out: (err.stdout || '') + (err.stderr || '') };
  }
}

/* The census's own verdict is its LAST printed line, which is never `pop()` of a split on a string that
   ends in a newline — that answers the empty string, and an empty string reads as "no markers here". */
const last = out => { const l = String(out || '').split(/\r?\n/).filter(x => x.trim()); return l.pop() || ''; };
/* The refusal is the census's OWN last line, so test it there. `/NO CONCLUSION/.test(whole output)` was
   true before anything was mutated, because AGENTS.md and DEVICE-PASS.md quote that sentinel in prose —
   and the census prints those sentences as its rows. A needle that matches the text under inspection
   rather than the inspector's verdict condemns every document that ever mentions the rule. */
const refuses = out => /^NO CONCLUSION/.test(last(out));

const BREAKS = [
  { name: 'the scan is left holding phrases no document contains', expect: 'refuses',
    /* One line, and it empties the WHOLE vocabulary. The first version prefixed four of the sixteen
       markers with `zzz `, which left twelve live markers still matching 22 claims — a partly-dead scan
       is not a dead one, and the census was right to keep answering. */
    from: "    for (const m of MARKERS) {",
    to: "    for (const m of ['zzz no document says this']) {" },
  { name: 'the per-marker tally hides the markers that matched nothing', expect: 'names-all',
    from: "const tally = MARKERS.map(m => m + '=' + (hits[m] || 0)).join(' ');",
    to: "const tally = MARKERS.filter(m => hits[m]).map(m => m + '=' + hits[m]).join(' ');", },
  { name: 'a document the census no longer reads is still counted as read', expect: 'reports-missing',
    from: "['AGENTS.md', 'DEVICE-PASS.md', 'README.md']",
    to: "['AGENTS.md', 'DEVICE-PASS.md', 'README-does-not-exist.md']" },
];

let applied = 0, caught = 0, missed = 0, unmatched = 0;
function plant(from, to) {
  const cur = fs.readFileSync(TARGET, 'utf8');
  const n = cur.split(from).length - 1;
  if (n !== 1) return { ok: false, why: 'needle matched ' + n + ' times' };
  fs.writeFileSync(TARGET, cur.replace(from, to));
  return { ok: true };
}
function restore() { fs.writeFileSync(TARGET, original); }

try {
  const base = run();
  const baseAll = MARKER_NAMES_PRESENT(base.out);
  console.log('control  unbroken census            exit ' + base.code + ' · every marker named: '
    + (baseAll ? 'yes' : 'NO') + ' · ' + last(base.out).slice(0, 74));
  if (base.code !== 0 || refuses(base.out) || !baseAll || !/3 of 3 documents/.test(base.out)) {
    console.log('ABORT — the census does not read its own documents today, so nothing below this line'
      + ' measures anything.');
    process.exitCode = 1;
  } else {
    for (const b of BREAKS) {
      const p = plant(b.from, b.to);
      if (!p.ok) { unmatched++; console.log('SKIP    ' + b.name + '  (' + p.why + ', needs exactly 1)'); continue; }
      applied++;
      let verdict;
      if (b.expect === 'refuses') {
        const r = run();
        verdict = refuses(r.out) && r.code !== 0;
        console.log((verdict ? 'CAUGHT  ' : 'MISSED  ') + b.name
          + '  → exit ' + r.code + ' · ' + last(r.out).slice(0, 60));
      } else if (b.expect === 'names-all') {
        const r = run();
        verdict = !MARKER_NAMES_PRESENT(r.out);
        console.log((verdict ? 'CAUGHT  ' : 'MISSED  ') + b.name
          + '  → silent markers no longer printed');
      } else {
        const r = run();
        verdict = /MISSING\]  the document is not on disk/.test(r.out)
          && /2 of 3 documents/.test(last(r.out));
        console.log((verdict ? 'CAUGHT  ' : 'MISSED  ') + b.name
          + '  → ' + last(r.out).slice(0, 60));
      }
      if (verdict) caught++;
      else missed++;
      restore();
    }

    /* The blind-sensor break: two changes at once, because its question is whether the CHECK reads the
       refusal or merely a number. With the markers dead AND the refusal dead, the census prints a tidy
       zero and exits 0 — which is exactly what a rotted vocabulary looks like to whoever runs it. */
    const dead1 = plant(BREAKS[0].from, BREAKS[0].to);
    const dead2 = dead1.ok && plant("if (readable === 0 || rows.length === 0) {", "if (false) {");
    if (!dead1.ok || !dead2.ok) {
      unmatched++;
      console.log('SKIP    the refusal branch is forced dead under a vacuous scan  (needle matched'
        + ' ' + (!dead1.ok ? dead1.why : dead2.why) + ')');
    } else {
      applied++;
      const r = run();
      const blinded = r.code === 0 && !refuses(r.out);
      if (blinded) { caught++; console.log('CAUGHT  the refusal branch is forced dead under a vacuous scan'
        + '  → the census answered `clean` about a scan that read nothing'); }
      else { missed++; console.log('MISSED  the refusal branch is forced dead under a vacuous scan'
        + '  → exit ' + r.code); }
      restore();
    }
    console.log('─'.repeat(78));
    console.log(caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied, '
      + missed + ' missed');
    process.exitCode = (caught === applied && applied === BREAKS.length + 1 && unmatched === 0) ? 0 : 1;
  }
} finally {
  restore();
  const back = fs.readFileSync(TARGET, 'utf8') === original;
  console.log('cleanup  census restored byte-for-byte: ' + back);
  if (!back) process.exitCode = 1;
}

/* Every marker name has to appear in the summary line, including the ones at zero. The list is read out of
   the census's own MARKERS array literal — not by scanning the whole file for quoted strings, which an
   apostrophe in prose would happily satisfy with a fragment of a sentence. If the census stops printing a
   marker, the names it declares still have to show up. */
function MARKER_NAMES_PRESENT(out) {
  const src = fs.readFileSync(TARGET, 'utf8');
  const block = (src.match(/const MARKERS = \[([\s\S]*?)\n\];/) || [])[1] || '';
  /* ONE alternation, not two scans. Matching `'…'` and `"…"` separately lets the single-quote pass start
     inside `next pass's subject`, which is written in double quotes precisely because it carries an
     apostrophe, and the "names" it extracts are fragments of punctuation that no summary line can hold. */
  const names = (block.match(/'[^']*'|"[^"]*"/g) || []).map(s => s.slice(1, -1));
  const line = last(out) || '';
  return names.length >= 10 && line.indexOf('markers:') > -1
    && names.every(n => line.indexOf(n) > -1);
}

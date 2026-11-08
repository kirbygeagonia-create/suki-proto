/* Do the tools this plan cites actually exist?

   Written because a session that spent its time auditing claims about code kept making false ones about
   instruments: `falsify-status-duplication`, a `login`-suite role check, §85's declared-state check on the
   lock dialog — each typed as fact and each caught by `ls` or `grep` only because the author stopped to
   check. That is not a discipline, it is luck. This is the check.

   It reads the plan's markdown, pulls every backticked token that looks like a file this repository would
   own (`*.cjs`, `*.js`, `*.md`, `*.html`, `*.css`) or a `node tools/...` command, and asks whether the path
   resolves. It also collects the gate-check labels the plan quotes in bold-quoted form and asks whether each
   string appears in tools/verify.cjs — a quoted check name that is not in the file is the same defect wearing
   a different hat.

   Refuses with NO CONCLUSION when it parses nothing: an empty citation list is not a clean one.

     node tools/audit-citations.cjs [path-to-plan]                        */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PLAN = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'SUKINNECT_UX_RELIABILITY_MVP_PLAN.md');
let doc;
try { doc = fs.readFileSync(PLAN, 'utf8'); }
catch (err) { console.log('NO CONCLUSION  the plan could not be read: ' + err.message); process.exit(1); }

/* Strip code fences' language tags and comments-in-prose is not a risk here: a citation is a citation
   wherever it appears, and the point is that a reader may follow any of them. */
const files = new Set();
for (const m of doc.matchAll(/`([^`\s]*\.(?:cjs|js|md|html|css|gradle|json))`/g)) files.add(m[1]);
for (const m of doc.matchAll(/node\s+((?:tools|Sukinnect-Android\/tools)\/[A-Za-z0-9._/-]+\.cjs)/g)) files.add(m[1]);
/* A glob is not a citation. `tools/falsify-*.cjs` and `probe-*.js` name a family of files to list, and a
   resolver that reports them as missing is inventing findings — the direction this repository has decided
   is worse than a miss. */
const cmdFiles = [];
for (const m of doc.matchAll(/node\s+(tools\/[A-Za-z0-9._/-]+\.cjs)/g)) cmdFiles.push(m[1]);
for (const f of [...files]) if (f.includes('*')) files.delete(f);
/* An ellipsis is not a glob: `…-reschedule.cjs` names nothing a reader can run, so it is reported — under
   its own heading, because the fix is to spell the name out, not to delete the citation. */
/* An ellipsis is only a broken citation when it stands in for part of a *name*. `Math.max(0, …)` and
   `setTimeout(…, 900)` are elisions inside quoted code — legitimate, and the first version of this rule
   flagged 39 of them across two documents, which is the tool inventing work instead of finding it. So: no
   whitespace inside the token, and it must look like a path or a filename. */
const unrunnable = [...new Set([...doc.matchAll(/`([^\s`]*…[^\s`]*)`/g)]
  .map((m) => m[1])
  /* Extension only. `clickPainted(/…/)` and `…/legislative+issuances/…` are elisions inside a call and a URL
     respectively — a reader who needs them has the surrounding sentence, and a rule that flags them is a
     rule that will be ignored within a week. `…-reschedule.cjs` is different in kind: it names a file. */
  .filter((t) => /\.(cjs|js|md|html|css|json|gradle)$/.test(t)))];

if (files.size === 0 && cmdFiles.length === 0) {
  console.log('NO CONCLUSION  no file citations parsed — the scan is blind, not the plan clean.');
  process.exit(1);
}

const missing = [];
/* A bare filename is only checkable if it is unique in tools/, or is one of the tracked root files. */
function existsAnywhere(f) {
  /* The shell tree is written about from inside itself — `app/build.gradle`, `tools/falsify-assets.cjs` — and
     the same file is also named with the `--probe=@` prefix the camera's flag carries. Both resolve; neither
     is a phantom. */
  const candidates = [f, f.replace(/^--probe=@/, ''),
    'Sukinnect-Android/' + f, path.join('Sukinnect-Android', f)];
  for (const c of candidates) if (c.includes('*')) return true;
  for (const c of candidates) if (fs.existsSync(path.join(ROOT, c))) return true;
  if (f.includes('/')) return false;
  /* Root-level files are not the only ones a doc names: `ASSET-LICENSES.md` lives under the art directory,
     and a resolver that cannot see it reports a real file as a phantom — the false-positive direction this
     repository has repeatedly called the worse one. So search the tracked tree, skipping build output. */
  const stack = [ROOT];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (err) { continue; }
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist' || e.name === '.shots' ||
          e.name === '.scratch') continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.name === f) return true;
    }
  }
  return false;
}
for (const f of [...files].sort()) {
  if (!existsAnywhere(f)) missing.push(f);
}

/* Quoted gate-check labels: the plan quotes a check by name in double quotes; if no such check exists,
   the sentence is citing an instrument that was never written. */
/* A bold-quoted string is only a check label if the prose around it says so. Without that, `"Analyze the
   text and photo"` — a button caption AGENTS.md quotes while explaining why it was wrong — reads as a
   citation of a check nobody wrote. The tool would then be in the business of inventing findings. */
const quoted = [];
for (const m of doc.matchAll(/\*\*"([^"]{25,140})"\*\*/g)) {
  const window = doc.slice(Math.max(0, m.index - 220), m.index + m[0].length + 220);
  if (/\b(check|checks|gate|assert|assertion|fails|refus|pin[sned]?)\b/i.test(window)) quoted.push(m[1]);
}
/* A quoted label is a phantom only if no instrument anywhere carries it. Searching verify.cjs alone made
   device-tool strings read as invented checks, so the whole of tools/ is the haystack. */
let toolSrc = '';
try {
  for (const f of fs.readdirSync(path.join(ROOT, 'tools'))) {
    if (!/\.(cjs|js)$/.test(f)) continue;
    try { toolSrc += fs.readFileSync(path.join(ROOT, 'tools', f), 'utf8'); } catch (err) { /* unreadable tool */ }
  }
} catch (err) { console.log('NO CONCLUSION  tools/ could not be read, so no citation can be checked.'); process.exit(1); }
const phantomChecks = quoted.filter((q) => toolSrc.indexOf(q) < 0);

/* `CHANGES.md` is a dated log: a file it names may have been renamed or deleted since the entry was written,
   and the house rule for a superseded row is a dated note, not a rewrite. So its unresolved citations are
   reported but do not fail the run — the same scoping `audit-open-items.cjs` applies to the log by design.
   `DEVICE-PASS.md` speaks in the present tense and stays strict. */
const isLog = /(^|[\/\\])CHANGES\.md$/.test(PLAN);

console.log('plan: ' + path.relative(ROOT, PLAN));
console.log('file citations: ' + files.size + ' distinct, plus ' + cmdFiles.length + ' `node tools/...` commands');
console.log('quoted gate-check labels: ' + quoted.length);
for (const m of missing) console.log('  MISSING FILE  ' + m);
for (const q of phantomChecks) console.log('  PHANTOM CHECK  "' + q.slice(0, 90) + '" is not a string in tools/verify.cjs');
/* A cited file that is deliberately absent — the brief this plan was written under, which was never
   committed — is exempt only when the plan says so beside it, in the same idiom `audit-compat-floor.cjs`
   uses for a CSS feature the page keeps on purpose. An exemption that no longer matches a missing file is
   itself a finding, so the list cannot rot into a way of silencing the audit. */
const exempt = new Set([...doc.matchAll(/citation-exempt:\s*([A-Za-z0-9._-]+)/g)].map((m) => m[1]));
const unexplained = missing.filter((f) => exempt.has(f) || unrunnable.indexOf(f) >= 0);
const staleExemptions = [...exempt].filter((f) => missing.indexOf(f) < 0);
const findings = (missing.length - unexplained.length) + staleExemptions.length + phantomChecks.length + unrunnable.length;
for (const u of unrunnable) console.log('  UNRUNNABLE CITATION  `' + u + '` has an ellipsis in it — no reader can run or open it');
for (const f of unexplained) console.log('  EXEMPT  ' + f + ' — absent, and the plan says why');
for (const f of staleExemptions) console.log('  STALE EXEMPTION  ' + f + ' is exempted but is not missing');
console.log('findings: ' + findings + (isLog && findings ? '  (dated log — reported, not gated)' : ''));
console.log(findings
  ? (isLog
      ? 'the log names files that no longer resolve. A dated entry is allowed to, so this does not fail the run.'
      : 'the document cites something that is not there and has not said why.')
  : 'every file and every quoted check the document cites resolves, or is absent with a stated reason.');
process.exit(findings && !isLog ? 1 : 0);

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
const cmdFiles = [];
for (const m of doc.matchAll(/node\s+(tools\/[A-Za-z0-9._/-]+\.cjs)/g)) cmdFiles.push(m[1]);

if (files.size === 0 && cmdFiles.length === 0) {
  console.log('NO CONCLUSION  no file citations parsed — the scan is blind, not the plan clean.');
  process.exit(1);
}

const missing = [];
/* A bare filename is only checkable if it is unique in tools/, or is one of the tracked root files. */
function existsAnywhere(f) {
  if (f.startsWith('tools/') || f.startsWith('Sukinnect-Android/') || f.startsWith('assets/') ||
      f.startsWith('fonts/') || f.startsWith('avatars/') || f.startsWith('leaflet/') || f.includes('/'))
    return fs.existsSync(path.join(ROOT, f));
  if (fs.existsSync(path.join(ROOT, 'tools', f)) || fs.existsSync(path.join(ROOT, f))) return true;
  /* Root-level files are not the only ones a plan names: `ASSET-LICENSES.md` lives under the art directory,
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
const verifySrc = fs.readFileSync(path.join(ROOT, 'tools', 'verify.cjs'), 'utf8');
const quoted = [...doc.matchAll(/\*\*"([^"]{25,140})"\*\*/g)].map((m) => m[1]);
const phantomChecks = quoted.filter((q) => verifySrc.indexOf(q) < 0);

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
const unexplained = missing.filter((f) => exempt.has(f));
const staleExemptions = [...exempt].filter((f) => missing.indexOf(f) < 0);
const findings = (missing.length - unexplained.length) + staleExemptions.length + phantomChecks.length;
for (const f of unexplained) console.log('  EXEMPT  ' + f + ' — absent, and the plan says why');
for (const f of staleExemptions) console.log('  STALE EXEMPTION  ' + f + ' is exempted but is not missing');
console.log('findings: ' + findings);
console.log(findings ? 'the plan cites something that is not there and has not said so.'
  : 'every file and every quoted check the plan cites resolves, or is absent with a stated reason.');
process.exit(findings ? 1 : 0);

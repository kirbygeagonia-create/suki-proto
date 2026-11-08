/* The reference schema and the running kernel have to name the same accounts.

   Why this is a tool and not a sentence in a document. Slice S1 gave the money model a new account,
   `gateway_fee_payable`, and the schema is the artefact a backend team copies. A schema that omits
   it silently re-invents the defect the account exists to prevent — the fee gets folded into a
   payout line and reads as provider earnings. The first draft of that block was written from memory
   and got three of ten accounts wrong (it called `escrow_held` a liability, `customer_deposit` an
   asset, and invented `gateway_fee_expense`, which nothing posts). That draft is the reason this
   audit exists: the list is read out of the kernel and compared against the list in the file, in
   both directions, so a hand-written copy cannot pass.

   Two answers this tool refuses rather than misreports:
     · NO CONCLUSION when the schema cannot be read, when no CREATE TABLE parsed, or when the kernel
       boots without an ACCOUNTS map — an empty scan reads exactly like a clean one.
     · a population floor on each side, so shrinking either list to nothing is a finding rather than
       an agreement between two zeroes.

     node tools/audit-schema-parity.cjs                       both sides printed, findings count
     node tools/audit-schema-parity.cjs --quiet                findings only (exit code still honest) */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
/* --schema exists so the reader itself can be proved against a damaged copy without touching the
   file it normally audits. Both spellings are accepted: a tool that silently ignores the form it
   did not parse audits the wrong file and prints a confident finding about it. The first draft of
   this one read `--schema=…` as no argument at all and reported 19 tables about the file it had
   just patched to 34. */
const inline = process.argv.map((a, i) => a.indexOf('--schema=') === 0 ? { i, v: a.slice('--schema='.length) } : null)
  .filter(Boolean)[0];
const spaceAt = process.argv.indexOf('--schema');
if (spaceAt >= 0 && !process.argv[spaceAt + 1]) fail('`--schema` was given with no path after it');
const given = inline ? inline.v : (spaceAt >= 0 ? process.argv[spaceAt + 1] : null);
const SCHEMA = given ? path.resolve(ROOT, given) : path.join(ROOT, 'schema', 'sukinnect.reference.sql');
const MIN_TABLES = 30;          // the file carried 19 before the Stage B tables landed
const MIN_ACCOUNTS = 8;         // the kernel has held ten since slice S1

function fail(msg) { console.log('NO CONCLUSION: ' + msg); process.exit(1); }

if (!fs.existsSync(SCHEMA)) fail('the reference schema is not at ' + SCHEMA);
const sql = fs.readFileSync(SCHEMA, 'utf8');
if (!sql.trim()) fail('the reference schema is empty');

/* ---- 1. the tables the file declares, and the statements that must balance ---- */
const tables = [];
const tRe = /CREATE TABLE (\w+) \(/g;
let m;
while ((m = tRe.exec(sql))) {
  let depth = 1, i = tRe.lastIndex;
  for (; i < sql.length && depth > 0; i++) {
    if (sql[i] === '(') depth++;
    else if (sql[i] === ')') depth--;
  }
  if (depth !== 0) fail('CREATE TABLE ' + m[1] + ' never closes its parenthesis');
  tables.push({ name: m[1], body: sql.slice(tRe.lastIndex, i - 1) });
}
if (tables.length < MIN_TABLES) {
  console.log('NO CONCLUSION: read ' + tables.length + ' CREATE TABLE statements from ' + SCHEMA
    + ' against a floor of ' + MIN_TABLES + ' — the parse is broken, the schema is not clean');
  process.exit(1);
}
const declared = new Set(tables.map(t => t.name));

/* ---- 2. foreign keys point at tables that exist ------------------------------- */
const findings = [];
const fkRe = /REFERENCES (\w+)\s*\(/g;
while ((m = fkRe.exec(sql))) {
  if (!declared.has(m[1])) findings.push('foreign key targets `' + m[1] + '`, which no CREATE TABLE declares');
}

/* ---- 3. the accounts the INSERT lists, and the accounts the kernel holds ------- */
const insertAt = sql.indexOf('INSERT INTO accounts');
if (insertAt < 0) findings.push('the schema declares an accounts table but seeds no rows, so nothing can be compared');
const listed = [];
if (insertAt >= 0) {
  const chunk = sql.slice(insertAt, sql.indexOf(';', insertAt) + 1);
  const rowRe = /\(\s*'([a-z_]+)'\s*,\s*'(asset|liability|revenue|expense)'\s*,\s*'(none|booking|provider|customer|gateway)'/g;
  let r;
  while ((r = rowRe.exec(chunk))) listed.push({ key: r[1], kind: r[2], scope: r[3] });
}
if (listed.length < MIN_ACCOUNTS && insertAt >= 0) {
  findings.push('only ' + listed.length + ' account rows parsed from the INSERT against a floor of '
    + MIN_ACCOUNTS + ' — the reader is blind, not the file');
}

let kernel = null, kernelError = '';
try {
  const { boot } = require('./harness.cjs');
  const app = boot();
  kernel = app && app.ACCOUNTS ? Object.keys(app.ACCOUNTS) : null;
  if (!kernel) kernelError = 'the booted application exposes no ACCOUNTS map';
  else if (kernel.length < MIN_ACCOUNTS) kernelError = 'the kernel holds ' + kernel.length
    + ' accounts against a floor of ' + MIN_ACCOUNTS;
} catch (err) { kernelError = 'the kernel would not boot: ' + err.message.split('\n')[0]; }

const kindsMatch = [];
if (kernel) {
  const { boot } = require('./harness.cjs');
  const A = boot().ACCOUNTS;
  Object.keys(A).forEach(k => {
    const row = listed.find(l => l.key === k);
    if (!row) { findings.push('the kernel posts through `' + k + '` and the schema does not list it'); return; }
    if (row.kind !== A[k].kind) kindsMatch.push(k + ' (kernel ' + A[k].kind + ' / schema ' + row.kind + ')');
    const scope = A[k].scope || 'none';
    if (row.scope !== scope) kindsMatch.push(k + ' (kernel scope ' + scope + ' / schema ' + row.scope + ')');
  });
  listed.forEach(l => {
    if (!A[l.key]) findings.push('the schema lists `' + l.key + '` which the kernel does not hold');
  });
}
if (kindsMatch.length) findings.push('account kind or scope disagrees: ' + kindsMatch.join(', '));

/* ---- 4. the enum the ledger's own foreign key depends on ---------------------- */
const accountsTable = tables.find(t => t.name === 'accounts');
if (accountsTable) {
  const enumRe = /kind\s+ENUM\(([^)]*)\)/;
  const e = accountsTable.body.match(enumRe);
  if (!e) findings.push('accounts.kind has no ENUM, so no comparison to the kernel is possible');
  else {
    const allowed = new Set((e[1].match(/'(\w+)'/g) || []).map(s => s.replace(/'/g, '')));
    listed.forEach(l => { if (!allowed.has(l.kind)) findings.push('the INSERT writes kind `' + l.kind + '` on ' + l.key + ', outside accounts.kind'); });
  }
  const scopeRe = /scope\s+ENUM\(([^)]*)\)/;
  const s = accountsTable.body.match(scopeRe);
  if (s) {
    const allowed = new Set((s[1].match(/'(\w+)'/g) || []).map(x => x.replace(/'/g, '')));
    listed.forEach(l => { if (!allowed.has(l.scope)) findings.push('the INSERT writes scope `' + l.scope + '` on ' + l.key + ', outside accounts.scope'); });
  }
}

/* ---- report ------------------------------------------------------------------ */
if (kernelError) { console.log('NO CONCLUSION: ' + kernelError); process.exit(1); }
const quiet = process.argv.indexOf('--quiet') >= 0;
if (!quiet) {
  console.log('schema ' + path.relative(ROOT, SCHEMA) + ' | tables ' + tables.length
    + ' | account rows ' + listed.length + ' | kernel accounts ' + kernel.length);
  console.log('kernel:  ' + kernel.join(' '));
  console.log('schema:  ' + listed.map(l => l.key).join(' '));
}
findings.forEach(f => console.log('  · ' + f));
console.log('findings: ' + findings.length);
process.exit(findings.length ? 1 : 0);

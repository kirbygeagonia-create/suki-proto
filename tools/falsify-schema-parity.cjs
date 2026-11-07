/* Proves the schema-parity audit can fail, can refuse, and cannot be silenced.

   The audit exists because the first draft of the Stage B account list was written from memory and
   got three of ten rows wrong — it called escrow_held a liability, customer_deposit an asset, and
   invented a gateway_fee_expense nothing posts. A comparison tool whose failure paths have never
   been reached is a number nobody has tested, so each break below plants one of the mistakes the
   audit was written to catch, or removes one of its defences and requires the run to say so.

   Two of the breaks are about the reader rather than the file, and both were met in the session
   that wrote the audit:
     · `--schema=PATH` was parsed as no argument at all, so the tool audited the real schema while
       printing a count about the copy it had been pointed at. Two breaks are judged in that
       direction — the argument form and the exit code — because what proves those guards matter is
       the refusal *disappearing* while the planted defect is still there; a break removed a guard
       and the run going on to report the finding would mean the guard was never load-bearing.
     · the population floor is the only thing that separates "the parse found nothing" from "the
       file is clean", because the parity loop happens to be loud on its own. That redundancy is
       recorded rather than papered over: of the three floors this tool has, the accounts floor is
       covered twice over by the comparison it protects, so no break here can move it alone.

   Target is the audit and a fixture under .scratch/, never Sukinnect-next.html, so this family does
   not contend for the mutex every other family shares. It restores in a finally and re-reads the
   file to prove it, because a tool's own sentence about itself is not evidence.

     node tools/falsify-schema-parity.cjs                                                 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'tools', 'audit-schema-parity.cjs');
const SCHEMA = path.join(ROOT, 'schema', 'sukinnect.reference.sql');
const DAMAGED = path.join(ROOT, '.scratch', 'schema-parity-fixture.sql');

const original = fs.readFileSync(TARGET, 'utf8');

/* One deleted row is the S1 regression itself: the fee account the schema must carry. */
const MISSING_ACCOUNT = { from: "  ('gateway_fee_payable', 'liability', 'booking', 'the processing fee the payer funded",
  to: "  -- ('gateway_fee_payable', …) removed by this fixture" };

const BREAKS = [
  { name: 'the schema stops listing the account the fee settles through',
    scope: 'schema', mutate: MISSING_ACCOUNT,
    expect: 'the kernel posts through' },

  { name: 'an account is stored under the wrong kind',
    scope: 'schema',
    mutate: { from: "('escrow_held', 'asset', 'none'", to: "('escrow_held', 'liability', 'none'" },
    expect: 'account kind or scope disagrees' },

  { name: 'a foreign key points at a table no CREATE TABLE declares',
    scope: 'schema',
    mutate: { from: "CONSTRAINT price_barangay FOREIGN KEY (barangay_id) REFERENCES service_areas(id)",
              to: "CONSTRAINT price_barangay FOREIGN KEY (barangay_id) REFERENCES service_areaz(id)" },
    expect: 'foreign key targets' },

  { name: 'the table scan matches nothing, and the floor refuses',
    scope: 'audit',
    mutate: { from: "const tRe = /CREATE TABLE (\\w+) \\(/g;", to: "const tRe = /CREATE TABLEZZ (\\w+) \\(/g;" },
    expect: 'NO CONCLUSION' },

  { name: 'the audit stops honouring the --schema= form it was given',
    scope: 'audit+fixture', reverse: true,
    mutate: { from: "const given = inline ? inline.v : (spaceAt >= 0 ? process.argv[spaceAt + 1] : null);",
              to: "const given = (spaceAt >= 0 ? process.argv[spaceAt + 1] : null);" },
    fixture: MISSING_ACCOUNT,
    expect: 'schema schema' },

  { name: 'the quiet flag swallows the verdict',
    scope: 'quiet', reverse: true,
    mutate: { from: "process.exit(findings.length ? 1 : 0);", to: "process.exit(0);" },
    fixture: MISSING_ACCOUNT,
    expect: 'findings: 1' }
];

function runAudit(schemaArg, extra) {
  const args = [TARGET];
  if (schemaArg) args.push('--schema=' + path.relative(ROOT, schemaArg));
  if (extra) args.push(extra);
  try {
    return { code: 0, out: execFileSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (err) {
    return { code: err.status === undefined ? -1 : err.status,
      out: (err.stdout || '') + (err.stderr || '') };
  }
}

/* The fixture is the schema as it stands with one edit applied, so no break ever writes to the real
   file while another tool is reading it. */
function makeFixture(mutate) {
  const sql = fs.readFileSync(SCHEMA, 'utf8');
  if (!mutate) { fs.writeFileSync(DAMAGED, sql, 'utf8'); return DAMAGED; }
  const c = sql.split(mutate.from).length - 1;
  if (c !== 1) throw new Error('fixture anchor matched ' + c + ' times: ' + mutate.from.slice(0, 60));
  fs.writeFileSync(DAMAGED, sql.split(mutate.from).join(mutate.to), 'utf8');
  return DAMAGED;
}

function applyToAudit(mutate) {
  const c = original.split(mutate.from).length - 1;
  if (c !== 1) return 'anchor matched ' + c + ' times in the audit';
  fs.writeFileSync(TARGET, original.split(mutate.from).join(mutate.to), 'utf8');
  return null;
}

let caught = 0, applied = 0, missed = 0, skipped = 0;
try {
  /* Positive control first. Every break below reads as a verdict about the audit, and a baseline
     that is already red would let any of them "catch" on somebody else's finding. */
  const base = runAudit(null);
  if (base.code !== 0 || base.out.indexOf('findings: 0') < 0) {
    console.log('ABORT — the audit does not answer clean on the unmutated schema, so nothing below '
      + 'isolates a cause. Its own first lines:\n' + base.out.split('\n').slice(0, 6).join('\n'));
    process.exit(1);
  }
  console.log('baseline  the audit reads schema and kernel and agrees (findings: 0)');

  /* And the fixture control: a copy with one row removed must be reported by the unmutated audit,
     or the breaks that use it are measuring the fixture rather than the guard. */
  const fixtureRun = runAudit(makeFixture(MISSING_ACCOUNT));
  if (fixtureRun.code === 0 || fixtureRun.out.indexOf('the kernel posts through') < 0) {
    console.log('ABORT — the unmutated audit does not report the fixture\'s missing row, so the '
      + 'fixture is not a defect: exit ' + fixtureRun.code);
    process.exit(1);
  }
  console.log('control   the unmutated audit reports the fixture\'s deleted account row');

  /* And the same through --quiet, because the break below is judged by a refusal disappearing: if
     the flag already silenced the verdict on the unmutated tool, the break would be crediting the
     flag with a removal it did not perform. */
  const quietBase = runAudit(DAMAGED, '--quiet');
  if (quietBase.code === 0) {
    console.log('ABORT — --quiet already answers clean on the unmutated audit, so the exit-code '
      + 'guard it is supposed to test was never there');
    process.exit(1);
  }
  console.log('control   --quiet trims the report and keeps the refusal');

  for (const b of BREAKS) {
    let auditWasMutated = false;
    applied++;
    let run;
    try {
      if (b.scope === 'schema') {
        run = runAudit(makeFixture(b.mutate));
      } else if (b.scope === 'audit') {
        const why = applyToAudit(b.mutate);
        if (why) { skipped++; console.log('SKIP  ' + b.name + '  (' + why + ')'); continue; }
        auditWasMutated = true;
        run = runAudit(null);
      } else if (b.scope === 'audit+fixture') {
        const why = applyToAudit(b.mutate);
        if (why) { skipped++; console.log('SKIP  ' + b.name + '  (' + why + ')'); continue; }
        auditWasMutated = true;
        run = runAudit(makeFixture(b.fixture));
      } else if (b.scope === 'quiet') {
        const why = applyToAudit(b.mutate);
        if (why) { skipped++; console.log('SKIP  ' + b.name + '  (' + why + ')'); continue; }
        auditWasMutated = true;
        /* --quiet must trim the report, not the exit code: a reader who asks only for findings has
           to get the same verdict, or the flag becomes a way to pass. */
        run = runAudit(makeFixture(b.fixture), '--quiet');
      }
    } finally {
      if (auditWasMutated) fs.writeFileSync(TARGET, original, 'utf8');
    }

    const named = run.out.indexOf(b.expect) >= 0;
    const refused = run.code !== 0;
    /* `reverse` is the direction a break has to be judged in. Every other break plants a defect and
       requires the audit to refuse it; the --quiet break removes the refusal itself, so the thing
       that proves the guard was load-bearing is the refusal disappearing while the finding is still
       printed. A break judged in the wrong direction reads as coverage while condemning nothing. */
    const ok = b.reverse ? (named && !refused) : (refused && named);
    if (ok) { caught++; console.log('CAUGHT  ' + b.name); }
    else {
      missed++;
      console.log('MISSED  ' + b.name + '  (exit ' + run.code + '; looked for "' + b.expect
        + '"' + (b.reverse ? ' and expected the refusal to vanish' : ' and expected a refusal')
        + '; got: ' + run.out.split('\n').slice(0, 3).join(' / ').slice(0, 190) + ')');
    }
  }

  /* The two argument refusals, which are how a reader silently audits the wrong file. */
  applied++;
  try {
    const out = execFileSync(process.execPath, [TARGET, '--schema'], { cwd: ROOT, encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'] });
    console.log(out.indexOf('NO CONCLUSION') >= 0 ? 'CAUGHT  `--schema` with no path is refused'
      : 'MISSED  `--schema` with no path was accepted');
    if (out.indexOf('NO CONCLUSION') >= 0) caught++; else missed++;
  } catch (err) {
    const out = (err.stdout || '') + (err.stderr || '');
    console.log(out.indexOf('NO CONCLUSION') >= 0 ? 'CAUGHT  `--schema` with no path is refused'
      : 'MISSED  `--schema` with no path did not refuse cleanly: ' + out.split('\n')[0]);
    if (out.indexOf('NO CONCLUSION') >= 0) caught++; else missed++;
  }

  applied++;
  try {
    execFileSync(process.execPath, [TARGET, '--schema=.scratch/no-such-schema.sql'], { cwd: ROOT,
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    console.log('MISSED  a missing schema path was accepted'); missed++;
  } catch (err) {
    const out = (err.stdout || '') + (err.stderr || '');
    const names = /not at .*sukinnect|no-such-schema/.test(out);
    console.log(names ? 'CAUGHT  a missing schema path is refused with the path it looked for'
      : 'MISSED  a missing schema path refused without naming the path');
    if (names) caught++; else missed++;
  }
} finally {
  fs.writeFileSync(TARGET, original, 'utf8');
  if (fs.existsSync(DAMAGED)) fs.unlinkSync(DAMAGED);
}

const restored = fs.readFileSync(TARGET, 'utf8') === original;
const schemaUntouched = fs.readFileSync(SCHEMA, 'utf8').indexOf('removed by this fixture') < 0;
console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + missed + ' missed, ' + skipped
  + ' not applied; audit ' + (restored ? 'restored byte-for-byte' : 'LEFT MUTATED — git checkout -- tools/audit-schema-parity.cjs')
  + ', schema ' + (schemaUntouched ? 'untouched' : 'LEFT MUTATED'));
process.exit(caught === applied && missed === 0 && skipped === 0 && restored && schemaUntouched ? 0 : 1);

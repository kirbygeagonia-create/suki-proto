/* Throwaway: break each trust-record rule in the real source and require the gate to notice.
   Pristine bytes are held in memory; restored in a finally. */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'Sukinnect-next.html');
const pristine = fs.readFileSync(FILE);

function gate() {
  try { return { code: 0, out: execFileSync(process.execPath, [path.join(ROOT, 'tools/verify.cjs')], { encoding: 'utf8', stdio: 'pipe', cwd: ROOT }) }; }
  catch (e) { return { code: e.status, out: (e.stdout || '') + (e.stderr || '') }; }
}

const mutants = [
  { name: 'bookingsForProvider goes back to ignoring its argument',
    /* Scoped by anchor, not by widening the threshold. The body line this break edits is declared
       identically by loyaltyTier() since the wallet landed, so a plain occurrence count matched 2 and
       the mutant printed NOT APPLIED for a rule that was still very much in the file — the quietest
       shape of coverage loss, because every other row read healthy. Asking for the first match inside
       the function that owns it makes exactly one site eligible, and the loop refuses if the anchor
       moves or the count is not one, so a future rename shows up as NOT APPLIED about the anchor
       rather than as a silent skip. */
    from: '  const id = providerId || CURRENT_PROVIDER_ID;',
    to: '  const id = CURRENT_PROVIDER_ID;',
    after: 'function bookingsForProvider(',
    expect: 'bookingsForProvider honours the id it is handed' },
  { name: 'the credential warning window loses its boundary',
    from: "if (days <= CONFIG.credentialWarnDays) return { code:'expiring', days };",
    to: "if (days < CONFIG.credentialWarnDays) return { code:'expiring', days };",
    expect: 'a credential reads its state from its own expiry date' },
  { name: 'the verified roster goes back to a positional slice',
    from: 'function verifiedProviderList(){ return PROVIDERS.filter(isVerifiedProvider); }',
    to: 'function verifiedProviderList(){ return PROVIDERS.slice(0, 6); }',
    expect: 'the verified roster is a record, not a slice of the array' },
  { name: 'the expiring badge stops following the documents',
    from: "  return PROVIDERS.filter(p => ['expired', 'expiring'].includes(worstCredentialState(p.id))).length;",
    to: '  return 4;',
    expect: 'the expiring-credential badge counts documents' },
  { name: 'an unsourced verdict comes back on the admin profile',
    from: '    reasons: [',
    to: "    performance: 'Normal',\n    reasons: [",
    expect: 'the admin profile states reasons rather than a verdict' },
  { name: 'an invented document state comes back',
    from: 'No credentials recorded yet.',
    to: 'Expires in 23 days.',
    expect: 'no screen asserts a security or document state nothing records' },
];

const base = gate();
if (base.code !== 0) { console.log('BASELINE NOT GREEN:\n' + base.out.split('\n').filter(l => l.startsWith('FAIL')).join('\n')); process.exit(1); }
console.log('baseline: green (' + (base.out.match(/all (\d+) checks passed/) || [])[1] + ' checks)\n');

let applied = 0, caught = 0;
try {
  for (const m of mutants) {
    const text = pristine.toString('utf8').replace(/\r\n/g, '\n');
    /* One eligible site, either anywhere in the file or after a named anchor. A needle counted over the
       whole file cannot tell "this line is unique" from "two functions declare the same line", and the
       second reading silently retires the break. */
    let hits = 0, at = -1;
    if (m.after) {
      const anchor = text.indexOf(m.after);
      if (anchor < 0) { console.log('NOT APPLIED  ' + m.name + ' (anchor ' + JSON.stringify(m.after) + ' is not in the file)'); continue; }
      /* Scope to the function's OWN body, not to everything after its name. Counting from the anchor to
         the end of the file still matched 2, because loyaltyTier() declares the same line further down —
         which is the very ambiguity this break was stranded on. The scope ends at the first top-level
         closing brace after the anchor. */
      const bodyEnd = text.indexOf('\n}', anchor);
      if (bodyEnd < 0) { console.log('NOT APPLIED  ' + m.name + ' (no closing brace found after the anchor)'); continue; }
      const scope = text.slice(anchor, bodyEnd);
      hits = scope.split(m.from).length - 1;
      if (hits === 1) at = anchor + scope.indexOf(m.from);
    } else {
      hits = text.split(m.from).length - 1;
      if (hits === 1) at = text.indexOf(m.from);
    }
    if (hits !== 1) {
      console.log('NOT APPLIED  ' + m.name + ' (needle matched ' + hits + ' times' +
        (m.after ? ' inside the anchored function body' : ' in the file') + ', expected exactly 1)');
      continue;
    }
    fs.writeFileSync(FILE, (text.slice(0, at) + m.to + text.slice(at + m.from.length)).replace(/\n/g, '\r\n'));
    applied++;
    const r = gate();
    const failedLines = r.out.split('\n').filter(l => l.startsWith('FAIL'));
    if (r.code !== 0 && failedLines.some(l => l.includes(m.expect))) {
      caught++; console.log('CAUGHT       ' + m.name);
    } else if (r.code !== 0) {
      console.log('PARTIAL      ' + m.name + ' — red, but not on the named check:\n               ' + failedLines.join(' / ').slice(0, 150));
    } else console.log('MISSED       ' + m.name + ' — stayed green with the rule broken');
  }
} finally {
  fs.writeFileSync(FILE, pristine);
  const after = gate();
  console.log('\nrestored: ' + (after.code === 0 ? 'gate green again' : 'STILL FAILING\n' + after.out.split('\n').filter(l => l.startsWith('FAIL')).join('\n')));
  console.log('mutants applied ' + applied + ', caught ' + caught + ', not applied ' + (mutants.length - applied));
}

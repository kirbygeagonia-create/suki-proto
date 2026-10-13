/* Throwaway: break the tap-floor and credential-summary rules and require the gate to notice. */
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
  { name: 'the search input stops declaring the tap floor',
    from: 'min-height:var(--tap); background:transparent; color:var(--ink);',
    to: 'background:transparent; color:var(--ink);',
    expect: 'every control raised to the tap floor still declares it' },
  { name: 'a style attribute declares its width twice again',
    from: '<button class="back-btn" onclick="state.tab=\'admin_verifications\'; render();" aria-label="Back to pending providers">',
    to: '<button class="back-btn" style="width:var(--tap); height:var(--tap); width:30px; height:30px;" onclick="state.tab=\'admin_verifications\'; render();" aria-label="Back to pending providers">',
    expect: 'a style attribute does not declare the same size twice' },
  { name: 'the profile card goes back to asserting a fixed credential state',
    from: 'Credentials: <b style="color:${credentialSummaryFor(CURRENT_PROVIDER_ID).tone};">${esc(credentialSummaryFor(CURRENT_PROVIDER_ID).label)}</b>',
    to: 'Credentials: <b style="color:var(--success-ink);">All Valid</b>',
    expect: 'the profile card no longer asserts a fixed credential state' },
  { name: 'the credential summary always says the same thing',
    from: `  if (!flagged) return { label: 'All ' + creds.length + ' valid', tone: 'var(--success-ink)' };`,
    to: `  if (!flagged) return { label: 'All ' + creds.length + ' valid', tone: 'var(--warning-ink)' };`,
    expect: 'the credential summary distinguishes clean, expiring and expired' },
];
const base = gate();
if (base.code !== 0) { console.log('BASELINE NOT GREEN:\n' + base.out.split('\n').filter(l => l.startsWith('FAIL')).join('\n')); process.exit(1); }
console.log('baseline: green (' + (base.out.match(/all (\d+) checks passed/) || [])[1] + ' checks)\n');
let applied = 0, caught = 0;
try {
  for (const m of mutants) {
    const text = pristine.toString('utf8').replace(/\r\n/g, '\n');
    const hits = text.split(m.from).length - 1;
    if (hits !== 1) { console.log('NOT APPLIED  ' + m.name + ' (needle matched ' + hits + ', expected 1)'); continue; }
    fs.writeFileSync(FILE, text.replace(m.from, m.to).replace(/\n/g, '\r\n'));
    applied++;
    const r = gate();
    const fl = r.out.split('\n').filter(l => l.startsWith('FAIL'));
    if (r.code !== 0 && fl.some(l => l.includes(m.expect))) { caught++; console.log('CAUGHT       ' + m.name); }
    else if (r.code !== 0) console.log('PARTIAL      ' + m.name + ' — red elsewhere:\n               ' + fl.join(' / ').slice(0, 140));
    else console.log('MISSED       ' + m.name);
  }
} finally {
  fs.writeFileSync(FILE, pristine);
  const after = gate();
  console.log('\nrestored: ' + (after.code === 0 ? 'gate green again' : 'STILL FAILING'));
  console.log('mutants applied ' + applied + ', caught ' + caught + ', not applied ' + (mutants.length - applied));
}

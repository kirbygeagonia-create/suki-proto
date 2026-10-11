/* Throwaway: mutate Sukinnect-next.html and require the new escaping checks to notice.
   Every mutation is applied to an in-memory copy and the pristine bytes are restored from
   that copy in a finally — a backup re-read while a mutant is live would certify a mutated
   file as green. */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'Sukinnect-next.html');
const pristine = fs.readFileSync(FILE);

function gate(checkName) {
  try {
    const out = execFileSync(process.execPath, [path.join(ROOT, 'tools/verify.cjs')],
      { encoding: 'utf8', stdio: 'pipe', cwd: ROOT });
    return { code: 0, out };
  } catch (e) { return { code: e.status, out: (e.stdout || '') + (e.stderr || '') }; }
}

const mutants = [
  { name: 'one profile field goes back to being painted raw',
    from: '${esc(rp.name)}</div><div s', to: '${rp.name}</div><div s',
    expect: 'no keyboard-writable field is painted without escaping' },
  { name: 'settingsRow stops escaping the text it paints',
    from: '<span class="jr-t">${esc(title)}</span>', to: '<span class="jr-t">${title}</span>',
    expect: 'settingsRow escapes what it paints' },
  { name: 'esc() loses the apostrophe',
    from: '.replace(/[&<>"\']/g', to: '.replace(/[&<>"]/g',
    expect: "esc() covers the apostrophe as well as the double quote" },
  { name: 'the handler goes back to patching quotes by hand',
    from: "'${jsStr(title)}','${jsStr(detail)}'", to: "'${title}','${detail}'",
    expect: 'settingsRow quotes its handler instead of patching quotes into it' },
  { name: 'the on-dark rating goes back to the value that measures 3.14:1',
    from: '.stars.on-dark .fill{ color:var(--rating-on-dark); }',
    to: '.stars.on-dark .fill{ color:var(--gold); }',
    expect: 'the on-dark rating uses the tint derived for it' },
  /* The first version of this mutant used preferredPayment and the gate correctly ignored it:
     that field is never assigned from an input, so it is outside the rule. This one uses a
     direct object read rather than the alias, which is the spelling the check originally
     missed when it only knew `rp.x`. */
  { name: 'a direct read of a typed field is painted without escaping',
    from: "${esc(state.profileData.name.split(' ')[0])}",
    to: "${state.profileData.name.split(' ')[0]}",
    expect: 'no keyboard-writable field is painted without escaping' },
];

const base = gate();
if (base.code !== 0) {
  console.log('BASELINE IS NOT GREEN — a mutant result would mean nothing.\n' +
    base.out.split('\n').filter(l => l.startsWith('FAIL')).join('\n'));
  process.exit(1);
}
console.log('baseline: green (' + (base.out.match(/all (\d+) checks passed/) || [])[1] + ' checks)\n');

let applied = 0, caught = 0;
try {
  for (const m of mutants) {
    const text = pristine.toString('utf8').replace(/\r\n/g, '\n');
    const hits = text.split(m.from).length - 1;
    if (hits !== 1) {
      console.log('NOT APPLIED  ' + m.name + ' (needle matched ' + hits + ' times, expected 1)');
      continue;
    }
    fs.writeFileSync(FILE, text.replace(m.from, m.to).replace(/\n/g, '\r\n'));
    applied++;
    const r = gate();
    const failed = r.out.split('\n').filter(l => l.startsWith('FAIL'));
    const hit = failed.some(l => l.includes(m.expect));
    if (r.code !== 0 && hit) { caught++; console.log('CAUGHT       ' + m.name + '\n               → ' + failed[0].slice(0, 100)); }
    else if (r.code !== 0) { console.log('PARTIAL      ' + m.name + ' — gate failed, but not on the expected check:\n               ' + failed.join('\n               ').slice(0, 160)); }
    else console.log('MISSED       ' + m.name + ' — the gate stayed green with the rule broken');
  }
} finally {
  fs.writeFileSync(FILE, pristine);
  const after = gate();
  console.log('\nrestored: ' + (after.code === 0 ? 'gate green again' : 'STILL FAILING\n' + after.out.split('\n').filter(l => l.startsWith('FAIL')).join('\n')));
  console.log('mutants applied ' + applied + ', caught ' + caught + ', failed to apply ' + (mutants.length - applied));
}

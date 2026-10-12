/* Which profile actions and profile sections have no branch?
   All three hubs end their ternary with a generic success body, so an action nobody
   wired still opens a modal — and that modal says "Changes saved successfully" about
   a change that never happened. A section with no branch renders an empty card.
   Neither is visible to a grep for the action name: the call site exists, the hub
   exists, and only the match between them is missing. */
const fs = require('fs');
const src = fs.readFileSync(process.argv[2] || 'Sukinnect-next.html', 'utf8');
const lines = src.split(/\r?\n/);

function bodyOf(fnName) {
  const i = lines.findIndex(l => l.startsWith('function ' + fnName + '('));
  if (i < 0) return null;
  let body = '';
  for (let j = i; j < lines.length; j++) {
    if (j > i && /^function /.test(lines[j])) break;
    body += lines[j] + '\n';
  }
  return { i: i + 1, body };
}

function names(re, text) {
  const out = new Set();
  let m;
  while ((m = re.exec(text))) out.add(m[1]);
  re.lastIndex = 0;
  return out;
}

/* ── modal actions: every xxxProfileAction('x') vs the branches of its hub ── */
const HUBS = [
  ['providerProfileAction', 'providerProfileHub', 'providerProfileModal'],
  ['adminAccountAction', 'adminAccountHub', 'adminAccountModal'],
  ['residentProfileAction', 'residentProfileHub', 'residentProfileModal'],
];
for (const [caller, fnName, stateKey] of HUBS) {
  const hub = bodyOf(fnName);
  if (!hub) { console.log(caller + ': hub function ' + fnName + ' not found'); continue; }
  const called = names(new RegExp(caller + "\\( *'([a-z_]+)'", 'g'), src);
  const branched = names(/modal *=== *'([a-z_]+)'/g, hub.body);
  console.log(caller + ' -> ' + fnName + ' (line ' + hub.i + '): '
    + called.size + ' actions, ' + branched.size + ' branches');
  console.log('   opens the generic success instead of a screen -> '
    + ([...called].filter(a => !branched.has(a)).join(', ') || 'none'));
  console.log('   branch nobody can reach                      -> '
    + ([...branched].filter(b => !called.has(b) && b !== 'saved').join(', ') || 'none'));
}

/* ── profile sections: settingsRow ids vs the section body's branches ── */
const SECTIONS = [
  ['providerProfileSection', 'providerSectionBody'],
  ['adminAccountSection', 'adminSectionBody'],
  ['residentProfileSection', 'residentSectionBody'],
];
for (const [setter, fnName] of SECTIONS) {
  const body = bodyOf(fnName);
  if (!body) { console.log(fnName + ' not found'); continue; }
  const rows = names(new RegExp(setter + ", *'([a-z_]+)'", 'g'), src);
  const branched = names(/section *=== *'([a-z_]+)'/g, body.body);
  console.log(setter + ' -> ' + fnName + ' (line ' + body.i + '): '
    + rows.size + ' rows, ' + branched.size + ' bodies');
  console.log('   row opens an empty card   -> ' + ([...rows].filter(r => !branched.has(r)).join(', ') || 'none'));
  console.log('   body unreachable from app -> ' + ([...branched].filter(b => !rows.has(b)).join(', ') || 'none'));
}

/* Two owner decisions, pinned: the page declares itself light-only (so Chrome for Android's Auto Dark
   Theme cannot rewrite the brand palette on the published surface with no media query for any
   instrument to catch), and the provider role is named one word everywhere (the sign-in chip said
   "Service Pro" while every screen inside the app and the master prompt's role model say "provider").

   Six breaks. The fifth is the one worth keeping an eye on: it does not reintroduce a defect, it
   deletes the comment that records the old word — which is the only thing proving the check's
   exemption is real rather than the check passing because the string vanished from both halves. The
   sixth is the defect the wording hunt turned up: the provider dashboard typed one provider's name,
   trade and barangay into the header every sign-in paints.

     node tools/falsify-declared-state.cjs                                                */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

const LIGHT = 'the page declares itself light-only and asks for no dark treatment';
const CHIP = 'the sign-in card names the roles the rest of the app names';
const WORD = 'no code, label or painted string calls a provider "Pro"';
const HEADER = 'the dashboard header is the signed-in record’s identity, not a typed one';

const MUTANTS = [
  { name: 'the declaration goes away, and the published surface is darkenable again',
    label: LIGHT,
    from: '  color-scheme: only light;',
    to: '  /* colour scheme left undeclared */' },
  { name: 'a half-built dark block returns — UA-darkened widgets beside authored light text',
    label: LIGHT,
    from: '  color-scheme: only light;',
    to: '  color-scheme: only light;\n  @media (prefers-color-scheme: dark){ :root{ --surface:#101010; } }' },
  { name: 'the sign-in chip goes back to the other word for the same role',
    label: CHIP,
    from: "const AUTH_ROLE_LABEL = { resident:'Resident', provider:'Provider', admin:'Admin' };",
    to: "const AUTH_ROLE_LABEL = { resident:'Resident', provider:'Service Pro', admin:'Admin' };" },
  { name: 'a demo notification revives the word the screens do not use',
    label: WORD,
    from: "{id:'n2', title:'Verified provider nearby',",
    to: "{id:'n2', title:'Verified Pro Nearby'," },
  { name: 'the comment recording the old word is deleted, so the exemption is untested',
    label: WORD,
    from: 'used to read "Service Pro" —',
    to: 'used to read the old word —' },
  { name: 'the provider dashboard types one provider’s identity onto every sign-in',
    label: HEADER,
    from: '        <h1>${esc(dashPp.name || me.name)}</h1>',
    to: '        <h1>Ramil Odiada (Pro)</h1>' },
];

function plant(s, m) {
  const hits = s.split(m.from).length - 1;
  return hits === 1 ? { out: s.replace(m.from, m.to) } : { bad: hits };
}

function gateRun() {
  try {
    return { code: 0, out: execFileSync(process.execPath, [path.join(ROOT, 'tools', 'verify.cjs')],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (err) {
    return { code: err.status === undefined ? -1 : err.status, out: (err.stdout || '') + (err.stderr || '') };
  }
}

let caught = 0, applied = 0, unmatched = 0;
try {
  for (const m of MUTANTS) {
    const planted = plant(original, m);
    if (planted.bad !== undefined) {
      console.log('SKIP    ' + m.name + '  (needle matched ' + planted.bad + ', expected 1)');
      unmatched++; continue;
    }
    applied++;
    fs.writeFileSync(TARGET, planted.out);
    const run = gateRun();
    const failed = run.code !== 0 && run.out.includes('FAIL  ' + m.label);
    if (failed) { caught++; console.log('CAUGHT  ' + m.name); }
    else console.log('MISSED  ' + m.name + '  (exit ' + run.code + ', named check '
      + (run.code !== 0 ? 'not the one that failed: ' + (run.out.match(/FAIL  .*/g) || [''])[0].slice(0, 70)
        : 'passed anyway') + ')');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied; file restored.');
process.exit(caught === applied && unmatched === 0 ? 0 : 1);

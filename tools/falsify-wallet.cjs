/* Proves the twelve wallet checks watch the rules they claim to. Four of the eight breaks below are
   the defects this pass actually found, and three of those four came from a screenshot rather than an
   instrument: a heading deleted by a stylesheet rule written for a different family of sheets, a
   balance figure wrapped in a class that is itself a card, and a caption promising eight rows over one.
   The other four are the hazards the sheet exists to refuse — a typed balance, a dropped hold, a cash
   seam that records, and a chain that cannot see an edited amount.
     node tools/falsify-wallet.cjs                                                      */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

/* Single-line needles: the file is CRLF, so a needle carrying \n never matches and the mutant reports
   itself as SKIP while looking like a pass. */
const MUTANTS = [
  { name: 'the wallet types its own balance instead of reading the books',
    needle: 'availableCentavos: b.availableCentavos,',
    to: 'availableCentavos: 250000,',
    label: 'the wallet prints what the records add up to, field by field' },
  { name: 'the payout hold is dropped, so held money reads as payable',
    needle: 'if (Date.parse(b.pricing.frozenAt || b.createdAt) + hold <= now) available += share; else pending += share;',
    to: 'available += share;',
    label: 'the wallet prints what the records add up to, field by field' },
  { name: 'one released job moves the wallet by the wrong amount',
    needle: 'if (Date.parse(b.pricing.frozenAt || b.createdAt) + hold <= now) available += share; else pending += share;',
    to: 'if (Date.parse(b.pricing.frozenAt || b.createdAt) + hold <= now) available += share * 2; else pending += share;',
    label: 'releasing one held job moves the wallet by exactly that job share' },
  { name: 'the cash seam claims a movement it did not make',
    needle: 'available: false, recorded: false,',
    to: 'available: true, recorded: true,',
    label: 'both cash movements are seams that record nothing' },
  { name: 'a tier starts handing out privileges nothing can honour',
    needle: 'privileges: [],',
    to: "privileges: ['Priority dispatch'],",
    label: 'the tier is computed from jobs and payouts, and attaches no privilege' },
  { name: 'the chain stops reading the amount, so an edited figure stays invisible',
    needle: "l.account + ':' + l.scope + ':' + l.direction + ':' + l.amountCentavos",
    to: "l.account + ':' + l.scope + ':' + l.direction",
    label: 'the chain covers every event, and an edited amount moves its head' },
  { name: 'the blanket sheet rule returns and deletes every card heading but the first',
    needle: '.sheet-body > .card:first-child > b:first-child{ display:none; }',
    to: '.sheet-body .card > b:first-child{ display:none; }',
    label: 'only the card a sheet header duplicates loses its title, not every card on the page' },
  { name: 'the balance figure goes back inside a class that is itself a card',
    needle: '<div style="font-size:var(--t-display); font-weight:800; line-height:1.15;">',
    to: '<div class="stat" style="font-size:var(--t-display); font-weight:800; line-height:1.15;">',
    label: 'and the balance figure is a figure, not a card nested inside its own card' },
  { name: 'the entry caption goes back to promising eight rows over one',
    needle: "${shown.length ? ' Its newest ' + (shown.length === w.entryCount ? shown.length : shown.length + ' of ' + w.entryCount) + ':' : ''}",
    to: ' The newest eight:',
    label: 'the entry list names the rows it actually painted, never a count it did not reach' },
  /* The two seams landed after the wallet: an exchange feed and a bot check. Each answers with the gap,
     so the break that matters is the seam starting to answer with a value it does not have. */
  { name: 'the exchange seam invents a rate and a date for it',
    needle: 'available: false, rate: null, asOf: null,',
    to: "available: true, rate: 58.4, asOf: '2026-10-27',",
    label: 'the exchange feed is a seam that answers no rate rather than estimating one' },
  { name: 'the bot check reports a verdict no provider gave it',
    needle: 'available: false, passed: null, provider: null,',
    to: 'available: true, passed: true, provider: "recaptcha",',
    label: 'the bot check is a seam that names all three things it does not have' },
  { name: 'the exchange sentence goes back inside the band branch, where the other branch goes quiet',
    needle: '${rail}${body}${feed}${confirm}${err}',
    to: '${rail}${body}${confirm}${err}',
    label: 'the pricing wizard says where a foreign rate would have come from, in every band state' },
  { name: 'the register card stops saying that no bot check ran',
    needle: '<div style="font-size:var(--t-caption); color:var(--mist); margin-top:6px; line-height:1.5;">${esc(spamCheckSeam().reason)}</div>',
    to: '',
    label: 'the register card states that no bot check ran, and the sign-in card does not carry the claim' }
];

function gateOutput() {
  try {
    const out = execFileSync(process.execPath, [path.join(ROOT, 'tools', 'verify.cjs')],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status === undefined ? -1 : e.status, out: String(e.stdout || '') + String(e.stderr || '') };
  }
}

const baseline = gateOutput();
if (baseline.code !== 0 || !/all \d+ checks passed/.test(baseline.out)) {
  console.log('BROKEN: the gate is not green before any mutation, so nothing below is a measurement.');
  console.log(baseline.out.split('\n').filter(l => /^FAIL|Error|crashed/.test(l)).slice(0, 6).join('\n'));
  process.exit(1);
}

let applied = 0, caught = 0, unmatched = 0;
try {
  for (const m of MUTANTS) {
    const hits = original.split(m.needle).length - 1;
    if (hits !== 1) {
      unmatched++;
      console.log('SKIP  NOT APPLIED  ' + m.name + '  (needle matched ' + hits + ' times)');
      continue;
    }
    applied++;
    fs.writeFileSync(TARGET, original.replace(m.needle, m.to));
    const run = gateOutput();
    if (run.code !== 0 && run.out.includes('FAIL  ' + m.label)) {
      caught++; console.log('CAUGHT  ' + m.name);
    } else {
      console.log('MISSED  ' + m.name + '  (exit ' + run.code + ', named check '
        + (run.out.includes('FAIL  ' + m.label) ? 'failed' : 'did not') + ')');
    }
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
const restored = fs.readFileSync(TARGET, 'utf8') === original;
console.log('\n' + caught + ' of ' + applied + ' mutants caught, ' + unmatched
  + ' not applied; file restored ' + (restored ? 'byte-for-byte.' : 'FAILED — check the tree.'));
process.exit(applied > 0 && caught === applied && unmatched === 0 && restored ? 0 : 1);

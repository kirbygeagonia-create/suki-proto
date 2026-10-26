/* Proves the six coherence rules the P2 pass and the §13 re-audit built can fail: the icon semantic
   table (A3), the attention queue that must be the shared filter and not a second one (A4), the booking
   detail's six named groups (R7/A9), the help desk's ordering caption (A14), and the card head that has
   to wrap rather than let a count crush its title.

   Each break is the way the rule actually rots, not a cartoon of it:
     1 the shield goes back to work as a Dashboard icon — one mark meaning a document promise and a wall
       of figures at once, which is the defect the brief named;
     2 the shield's row leaves the table while the nav keeps pointing at it, so the map stops describing
       the app and a reader trusts a table with a hole in it;
     3 the reasons and their kinds come apart: every provider still reads as flagged for something, but
       nothing is filed under any kind, so the chips count zero while the card lists names. A count alone
       passes; the per-provider equality and the per-kind set comparison both fire;
     4 the queue stops asking the shared filter and computes its own membership, which is how two screens
       start disagreeing about one question again — the exact drift the filter was created to close;
     5 the receipt keeps its card and loses its heading, so the six groups are no longer six;
     6 one heading is renamed, which breaks the order assertion rather than the presence assertion — the
       half that a screen full of labels can satisfy while reading in the wrong sequence;
     7 the help desk keeps ordering open-then-closed and stops saying so. §13 asked for a priority, the
       records carry none, and the plan's instruction was to say "unranked" rather than invent one, so the
       sentence IS the implementation and this break proves the check notices when it goes;
     8 a `priority` is typed onto the case record anyway — the §76 defect arriving as a field instead of a
       number. The caption above the list is now false, and the check reads the BUILDER's text to catch it;
     9 one card head loses the wrapping class while its chip keeps `white-space:nowrap` — the way the
       defect actually returns, which is a card written tomorrow rather than a stylesheet edited today. The
       check counts the title+chip pairs the markup paints and requires every one to be allowed to wrap;
    10 the row is told to shrink the chip instead of wrap. This is not a cartoon: it is the first fix, the
       one that stopped "ACCEPTE / D" and put "Waitin / g for / the / residen / t to / answer" in its
       place. No camera tally sees either wording — the text is not clipped, collides with nothing, sits
       on the scale and clears contrast — so the only assertion available is the shape of the rule.

   Breaks 9 and 10 are deliberately separate because the two halves of the rule fail apart: with the
   class gone from one row the pair count speaks, and with `flex-wrap` gone from the class the CSS
   speaks while all 22 rows still carry a name for a rule that no longer exists.

   Break 8 printed MISSED on this family's first run, and the break was right. The check had asked whether
   any record in `DISPUTES` carries a priority field — but the list is seeded empty on purpose (a sample
   case would be a written record of a complaint nobody raised), so `some()` over it cannot fail whatever
   the code writes. That is this repository's named class of a check that passes by being blind, arriving
   the usual way: a green family, a red column nobody read. The assertion now scans `openDispute` itself,
   with a positive control that the scan found the function, and the family re-runs to prove it.

   Anchors are single lines: the page is checked out with CRLF, so a needle carrying a bare newline
   matches nothing and the run reports a healthy gate for a mutation that never landed.

     node tools/falsify-coherence.cjs    ~8 minutes                                 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

const ICONS = 'a glyph means one thing, and every glyph the app navigates by is written down';
const QUEUE = 'the attention queue is the shared filter with a label on it, never a second list';
const GROUPS = 'the booking detail names the six groups in order';
const HELPDESK = 'the help desk orders by case state';
const HEADS = 'every card head with a count beside its title is allowed to wrap';
const HEAD_CSS = 'the class that grants it is flex-wrap, not a chip that shrinks';

/* The anchors are read out of the file rather than typed a second time, because this family edits lines
   carrying template literals and nested quotes: a needle copied by hand is a needle that can go stale in
   silence, and a break whose anchor matches nothing reports "not applied" for a mutation that never
   landed. Each anchor is found by the one fragment that identifies it, then edited. */
function findLine(needle) {
  const line = original.split(/\r?\n/).find(l => l.indexOf(needle) >= 0);
  return line === undefined ? null : line;
}

const navLine = findLine(`navItem('admin_dashboard'`);
const shieldRow = findLine(`  shield: 'a trust promise`);
const kindsTail = findLine('].filter(k => k),');
const queueHead = findLine('const list = networkAttentionList();');
const receiptLine = findLine('const r = receiptCard(b); return r ?');
const contactLine = findLine('<div class="section-label">Contact</div>');
const captionLine = findLine('Open cases first, then closed');
const claimLine = findLine('amountInClaimCentavos: b.pricing');
const headLine = findLine('<b class="card-title">Why a provider is here</b>');
const headCss = findLine('.card-head{flex-wrap:wrap;');

const REAL = [
  { name: 'the shield is hired as a Dashboard icon again, so one mark means a document promise and a wall of figures',
    check: ICONS,
    from: navLine, to: navLine ? navLine.replace("'chart'", "'shield'") : '' },
  { name: 'the shield leaves the meaning table while something still points at it',
    check: ICONS,
    from: shieldRow, to: '' },
  { name: 'the reasons keep their sentences and lose their kinds, so the chips count zero beside a full card',
    check: QUEUE,
    from: kindsTail, to: kindsTail ? kindsTail.replace('k => k', '() => false') : '' },
  { name: 'the queue stops asking the shared filter and computes its own membership',
    check: QUEUE,
    from: queueHead, to: queueHead ? queueHead.replace('networkAttentionList()', 'PROVIDERS.map(p => ({ provider: p, reasons: [] }))') : '' },
  { name: 'the receipt keeps its card and loses its heading',
    check: GROUPS,
    from: receiptLine, to: '      ${receiptCard(b)}' },
  { name: 'one heading is renamed, so the six no longer read in the declared order',
    check: GROUPS,
    from: contactLine, to: contactLine ? contactLine.replace('>Contact<', '>Payment<') : '' },
  { name: 'the help desk keeps ordering cases and stops saying on what basis',
    check: HELPDESK,
    from: captionLine, to: captionLine ? captionLine.replace('open.length + closed.length', 'false') : '' },
  { name: 'a priority is invented on the case record, which makes the caption a lie',
    check: HELPDESK,
    from: claimLine, to: claimLine ? claimLine.replace('amountInClaimCentavos:', "priority: 'High', amountInClaimCentavos:") : '' },
  { name: 'one card head is written without the wrapping class — the chip holds its word and the title loses hers',
    check: HEADS,
    from: headLine, to: headLine ? headLine.replace('class="row card-head"', 'class="row"') : '' },
  { name: 'the row is told to shrink the chip instead of wrap, which is the fix that moved the break',
    check: HEAD_CSS,
    from: headCss, to: headCss ? headCss.replace('flex-wrap:wrap; ', '') : '' },
];

function gateOutput() {
  let out = '';
  try {
    out = execFileSync(process.execPath, [path.join(ROOT, 'tools', 'verify.cjs')],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 420000 });
  } catch (err) { out = (err.stdout || '') + (err.stderr || ''); }
  return out;
}
function readCheck(out, name) {
  const line = out.split(/\r?\n/).find(l => l.indexOf(name) >= 0);
  if (!line) return { seen: false, failed: false, why: 'the check vanished from the output' };
  const t = line.trim();
  return { seen: true, failed: t.indexOf('FAIL') === 0, why: t.slice(0, 200) };
}

const missing = REAL.filter(b => b.from === null).map(b => b.name);
if (missing.length) {
  console.log('BROKEN  ' + missing.length + ' break(s) have no anchor in the file: ' + missing.join(' | '));
  process.exit(1);
}

const out0 = gateOutput();
for (const name of [ICONS, QUEUE, GROUPS, HELPDESK, HEADS, HEAD_CSS]) {
  const r = readCheck(out0, name);
  if (!r.seen) { console.log('BROKEN  no gate check named "' + name + '"'); process.exit(1); }
  if (r.failed) { console.log('BROKEN  baseline already red: ' + r.why); process.exit(1); }
}
console.log('baseline: all six coherence checks pass on the file as it stands');

let caught = 0, applied = 0, unmatched = 0;
try {
  for (const b of REAL) {
    const hits = original.split(b.from).length - 1;
    if (hits !== 1) {
      unmatched++;
      console.log('SKIP  ' + b.name + '  (its anchor matched ' + hits + ' times, needs exactly 1)');
      continue;
    }
    if (b.from === b.to) {
      unmatched++;
      console.log('SKIP  ' + b.name + '  (the break would write identical bytes)');
      continue;
    }
    applied++;
    fs.writeFileSync(TARGET, original.replace(b.from, b.to));
    if (fs.readFileSync(TARGET, 'utf8') === original) {
      unmatched++; applied--;
      console.log('SKIP  ' + b.name + '  (the write did not land)');
      continue;
    }
    const r = readCheck(gateOutput(), b.check);
    if (!r.seen) console.log('MISSED  ' + b.name + '  (' + r.why + ')');
    else if (r.failed) { caught++; console.log('CAUGHT  ' + b.name + '  → ' + r.why); }
    else console.log('MISSED  ' + b.name + '  (the named check still passes)');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied; file restored.');
process.exit(applied > 0 && caught === applied && unmatched === 0 ? 0 : 1);

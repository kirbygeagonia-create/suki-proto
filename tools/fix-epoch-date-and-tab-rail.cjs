/* Two defects the instrument reported as clean and a screenshot showed plainly:
   1. shortDate() returns '' for an epoch number, so every decision line and every action
      entry in the activity list painted a time with no date — the timestamps this pass
      introduced are Date.now() values, not ISO strings.
   2. The provider tabs were built for three labels; the fourth is clipped mid-word at
      360px with no affordance that the rail scrolls.
   Dry run by default; --write to apply. */
const fs = require('fs');
const PATH = 'Sukinnect-next.html';
const src = fs.readFileSync(PATH, 'utf8');
const write = process.argv.includes('--write');
const edits = [];
const E = (name, find, replace, expect) => edits.push({ name, find, replace, expect });

E('parseDay reads an epoch stamp as itself',
`function parseDay(value){
  const m = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(String(value || ''));`,
`function parseDay(value){
  /* A timestamp from Date.now() is already an instant, not a day to be read in a
     calendar. It arrived here as a number, fell through to Date.parse, which stringified
     it, and answered NaN — so shortDate() returned '' and the review screen's decision
     line painted "7:49 PM by …" with no date in front of it. */
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const m = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(String(value || ''));`, 1);

E('the tab rail keeps its labels whole',
  '  .seg{ display:flex; gap:6px; background:var(--brand-tint-soft); padding:4px; border-radius:14px; }\n'
  + '  .seg-btn{ flex:1; min-height:var(--tap);',
  '  /* Four tabs no longer fit in a phone width with flex:1 and a shrinking basis: the\n'
  + '     last label was cut mid-word with nothing to say the rail scrolls. The buttons now\n'
  + '     take the width their own text needs and still grow to fill the row when they can,\n'
  + '     and the rail scrolls when they cannot. */\n'
  + '  .seg{ display:flex; gap:6px; background:var(--brand-tint-soft); padding:4px; border-radius:14px; overflow-x:auto; scrollbar-width:none; }\n'
  + '  .seg::-webkit-scrollbar{ display:none; }\n'
  + '  .seg-btn{ flex:1 0 auto; white-space:nowrap; min-height:var(--tap);', 1);

let out = src, bad = 0;
for (const e of edits) {
  const find = e.find.replace(/\n/g, '\r\n'), replace = e.replace.replace(/\n/g, '\r\n');
  const n = out.split(find).length - 1;
  if (n !== e.expect) { console.log('COUNT ' + n + ' (want ' + e.expect + ')  ' + e.name); bad++; continue; }
  out = out.split(find).join(replace);
}
if (bad) { console.log('\n' + bad + ' edit(s) did not match — nothing written.'); process.exit(1); }
for (const e of edits) console.log('ok  ' + e.name);
out = out.replace(/\r\r\n/g, '\r\n');
if (!write) { console.log('\ndry run'); process.exit(0); }
fs.writeFileSync(PATH, out);
const chk = fs.readFileSync(PATH, 'utf8');
console.log('wrote — lines ' + chk.split(/\r\n/).length + ', CRLF ' + (chk.match(/\r\n/g) || []).length
  + ', LF ' + (chk.match(/\n/g) || []).length + ', doubled CR ' + (chk.match(/\r\r\n/g) || []).length);

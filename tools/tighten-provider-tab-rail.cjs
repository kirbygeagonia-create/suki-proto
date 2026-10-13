/* The provider rail has four tabs and the active one was still half out of view at 360px:
   scrolling fixes reachability, not arrival. Tightening this rail's padding and gaps keeps
   all four labels on screen, and the scroll stays as the fallback for a longer locale. */
const fs = require('fs');
const PATH = 'Sukinnect-next.html';
let src = fs.readFileSync(PATH, 'utf8');
const write = process.argv.includes('--write');
const edits = [];
const E = (name, find, replace, expect) => edits.push({ name, find, replace, expect });

E('the tight rail rule exists',
  '  .seg-count{ display:inline-flex;',
  '  /* Four tabs, one phone width. The rail scrolls now, which fixes reaching the last one\n'
  + '     but not arriving at it half cut off — so this rail takes the space back from the\n'
  + '     padding instead of from the labels. */\n'
  + '  .seg-4{ gap:3px; }\n'
  + '  .seg-4 .seg-btn{ padding:9px 5px; gap:4px; }\n'
  + '  .seg-count{ display:inline-flex;', 1);

E('the provider tabs use it',
  '<div class="seg" style="margin-bottom:14px;">\n'
  + "      <button class=\"seg-btn ${category === 'verified' ? 'on' : ''}\"",
  '<div class="seg seg-4" style="margin-bottom:14px;">\n'
  + "      <button class=\"seg-btn ${category === 'verified' ? 'on' : ''}\"", 1);

let out = src, bad = 0;
for (const e of edits) {
  const f = e.find.replace(/\n/g, '\r\n'), r = e.replace.replace(/\n/g, '\r\n');
  const n = out.split(f).length - 1;
  if (n !== e.expect) { console.log('COUNT ' + n + ' (want ' + e.expect + ')  ' + e.name); bad++; continue; }
  out = out.split(f).join(r);
}
if (bad) { console.log('\n' + bad + ' edit(s) did not match — nothing written.'); process.exit(1); }
for (const e of edits) console.log('ok  ' + e.name);
out = out.replace(/\r\r\n/g, '\r\n');
if (!write) { console.log('\ndry run'); process.exit(0); }
fs.writeFileSync(PATH, out);
const chk = fs.readFileSync(PATH, 'utf8');
console.log('wrote — lines ' + chk.split(/\r\n/).length + ', doubled CR ' + (chk.match(/\r\r\n/g) || []).length);

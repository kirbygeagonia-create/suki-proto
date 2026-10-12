/* The three controls the instrument found under the 44px floor once the modals behind
   the profile sheets were finally photographed, and one generic renderer that reads a
   hard-coded field instead of the key it was handed.
   Dry run by default; --write to apply. Every count is asserted. */
const fs = require('fs');
const PATH = 'Sukinnect-next.html';
const src = fs.readFileSync(PATH, 'utf8');
const write = process.argv.includes('--write');

const edits = [];
const E = (name, find, replace, expect) => edits.push({ name, find, replace, expect });

/* The × sits in a transparent, borderless box that measures 24x25. The glyph stays the
   same size; only the area that answers the tap grows — the sheet's own close control
   already takes var(--tap) this way. */
E('the modal close button takes the tap floor',
  `style="border:0; background:transparent; font-size:var(--t-title);">&times;</button>`,
  `style="border:0; background:transparent; font-size:var(--t-title); min-width:var(--tap);`
  + ` min-height:var(--tap); display:inline-flex; align-items:center; justify-content:center;">`
  + `&times;</button>`, 3);

/* 42px: the row is two pixels short, and the checkbox inside it is 18px, so the label is
   the only thing that can carry the tap. */
E('the fruit ownership row reaches the tap floor',
  '    display:flex; gap:9px; align-items:flex-start; margin-top:12px; cursor:pointer;\n'
  + '    font-size:var(--t-caption); color:var(--ink-soft); line-height:1.5;',
  '    display:flex; gap:9px; align-items:flex-start; margin-top:12px; cursor:pointer;\n'
  + '    min-height:var(--tap); padding:2px 0;\n'
  + '    font-size:var(--t-caption); color:var(--ink-soft); line-height:1.5;', 1);

/* Only one bool field exists today, so the hard-coded key has never shown its cost: add a
   second and every checkbox on the form reads and writes the first one. */
E('the bool row renders and writes the key it was given',
  `      ${'${'}f.ownershipConfirmed ? 'checked' : ''} onchange="toggleFruitBool('ownershipConfirmed', this.checked)">`,
  `      ${'${'}f[key] ? 'checked' : ''} onchange="toggleFruitBool('${'${'}key}', this.checked)">`, 1);

let out = src, bad = 0;
for (const e of edits) {
  const find = e.find.replace(/\n/g, '\r\n');
  const replace = e.replace.replace(/\n/g, '\r\n');
  const n = out.split(find).length - 1;
  if (n !== e.expect) {
    console.log('COUNT ' + n + ' (want ' + e.expect + ')  ' + e.name);
    console.log('  looking for: ' + JSON.stringify(find.slice(0, 80)));
    bad++; continue;
  }
  out = out.split(find).join(replace);
}
if (bad) { console.log('\n' + bad + ' edit(s) did not match — nothing written.'); process.exit(1); }
for (const e of edits) console.log('ok  ' + e.name + '  (' + e.expect + ' site' + (e.expect > 1 ? 's' : '') + ')');
if (!write) { console.log('\ndry run'); process.exit(0); }
fs.writeFileSync(PATH, out);
const chk = fs.readFileSync(PATH, 'utf8');
console.log('wrote — lines ' + chk.split(/\r\n/).length + ', CRLF ' + (chk.match(/\r\n/g) || []).length
  + ', LF ' + (chk.match(/\n/g) || []).length);

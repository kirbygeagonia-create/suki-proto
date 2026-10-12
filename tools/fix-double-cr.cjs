/* Collapse the doubled carriage returns a patch script left behind.
   The scripts here write LF and convert to CRLF on the way in; any literal that already
   spelled \r\n came out as \r\r\n. JavaScript does not care, so the gate stayed green and
   the "pure CRLF" tally still balanced — the file just had a stray CR at the end of a few
   lines, which is the kind of thing that shows up later as an unexplainable diff. */
const fs = require('fs');
const PATH = process.argv.slice(2).find(a => !a.startsWith('--')) || 'Sukinnect-next.html';
const src = fs.readFileSync(PATH);
const text = src.toString('utf8');
const doubled = (text.match(/\r\r\n/g) || []).length;
const cr = (text.match(/\r/g) || []).length, lf = (text.match(/\n/g) || []).length;
console.log(PATH);
console.log('  \\r\\r\\n sequences : ' + doubled);
console.log('  CR ' + cr + ' / LF ' + lf + (cr === lf ? ' (balanced)' : ' (UNBALANCED — a bare LF or bare CR somewhere)'));
if (!doubled) { console.log('nothing to repair'); process.exit(0); }
if (!process.argv.includes('--write')) { console.log('dry run — pass --write to collapse them'); process.exit(0); }
const out = text.replace(/\r\r\n/g, '\r\n');
fs.writeFileSync(PATH, out);
const chk = fs.readFileSync(PATH).toString('utf8');
console.log('wrote — \\r\\r\\n now ' + (chk.match(/\r\r\n/g) || []).length + ', CR '
  + (chk.match(/\r/g) || []).length + ', LF ' + (chk.match(/\n/g) || []).length
  + ', lines ' + chk.split(/\r\n/).length);

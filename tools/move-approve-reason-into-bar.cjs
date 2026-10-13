/* The reason approval is unavailable was painted *below* the sticky action bar, so the
   one moment it is needed is the moment it is off screen. Move it inside the bar.
   Spliced by two unique anchors rather than a literal: the lines run past 1,200
   characters and one drifted quote would fail the match for the wrong reason. */
const fs = require('fs');
const PATH = 'Sukinnect-next.html';
let src = fs.readFileSync(PATH, 'utf8');
const write = process.argv.includes('--write');

const A = '$' + "{decided ? '' : '<div style=\"position:sticky;";
const B = "is outstanding.</div>' : ''}";
const i = src.indexOf(A), j = src.indexOf(B);
if (i < 0 || j < 0 || j < i) { console.log('anchors not found: ' + i + ', ' + j); process.exit(1); }
if (src.split(A).length - 1 !== 1 || src.split(B).length - 1 !== 1) {
  console.log('an anchor is not unique'); process.exit(1);
}
const removed = src.slice(i, j + B.length);
const mustHave = ['verificationAction(\\\'reject\\\')', 'verificationAction(\\\'request\\\')',
  'verificationAction(\\\'approve_confirm\\\')', 'approve-why', 'grid-template-columns:repeat(3, minmax(0, 1fr))'];
const missing = mustHave.filter(s => !removed.includes(s));
if (missing.length) { console.log('the block being replaced is missing: ' + missing.join(' | ')); process.exit(1); }
console.log('found ' + removed.length + ' chars of sticky bar; every expected control is in it');

/* @@ stands in for the app's own template opener: String.raw keeps backslashes but still
   interpolates ${…}, and this block is one single interpolation of app source. */
const NEW = String.raw`@@decided ? '' : '<div style="position:sticky; bottom:0; width:100%; margin:0 -16px; padding:10px 16px; box-sizing:content-box; background:var(--surface); border-top:1px solid var(--line); z-index:25; box-shadow:0 -4px 12px rgba(0,0,0,0.08);">'
    + (!complete ? '<div id="approve-why" style="font-size:var(--t-caption); color:var(--mist); margin-bottom:8px; line-height:1.45;">Approval is unavailable while ' + esc(outstanding.map(d => d.label).join(', ')) + ' ' + (outstanding.length === 1 ? 'is' : 'are') + ' outstanding.</div>' : '')
    + '<div style="display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:8px; align-items:stretch;">'
    + '<button class="btn sm secondary" style="width:100%; min-width:0; height:52px; color:var(--error-ink); border-color:var(--error-ink);" onclick="verificationAction(\'reject\')">Reject</button>'
    + '<button class="btn sm secondary" style="width:100%; min-width:0; height:52px;" onclick="verificationAction(\'request\')">Request update</button>'
    + '<button class="btn sm" style="width:100%; min-width:0; height:52px; opacity:' + (complete ? '1' : '0.5') + ';" ' + (complete ? 'onclick="verificationAction(\'approve_confirm\')"' : 'disabled aria-describedby="approve-why"') + '>Approve</button>'
    + '</div></div>'}`.split('@@').join('$' + '{');

src = src.slice(0, i) + NEW.replace(/\n/g, '\r\n') + src.slice(j + B.length);
const doubled = (src.match(/\r\r\n/g) || []).length;
console.log('doubled CR after splice: ' + doubled);
if (doubled) { console.log('nothing written'); process.exit(1); }
if (!write) { console.log('dry run'); process.exit(0); }
fs.writeFileSync(PATH, src);
const chk = fs.readFileSync(PATH, 'utf8');
console.log('wrote — lines ' + chk.split(/\r\n/).length + ', CRLF ' + (chk.match(/\r\n/g) || []).length
  + ', LF ' + (chk.match(/\n/g) || []).length);

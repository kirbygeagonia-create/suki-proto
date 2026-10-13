/* The notice has to be a real element. Two gate checks refused a state key no screen
   reads, and they were right: a toast that fades while the condition that raised it
   still holds is a warning nobody acts on. This puts it above the screen in the flow,
   so it never covers content, with a dismiss that the next failed write raises again.
     node tools/render-storage-notice.cjs                                               */
const fs = require('fs');
const path = require('path');

const TARGET = path.join(__dirname, '..', 'Sukinnect-next.html');
const src = fs.readFileSync(TARGET, 'utf8');
const wasCRLF = src.indexOf('\r\n') >= 0;
let lf = src.replace(/\r\n/g, '\n');

function sub(needle, replacement, expected) {
  const hits = lf.split(needle).length - 1;
  if (hits !== expected) {
    throw new Error('needle matched ' + hits + ' time(s), expected ' + expected + ' :: '
      + needle.slice(0, 70).replace(/\n/g, '\\n'));
  }
  lf = lf.split(needle).join(replacement);
}

const D = '$' + '{';   // the app's own interpolation, which Node would otherwise run

sub('  <div class="screen" id="screen"></div>',
  '  <div id="notice-root" aria-live="polite"></div>\n  <div class="screen" id="screen"></div>',
  1);

sub('  .modal-card{ width:100%; max-width:350px; }',
  [
    '  .modal-card{ width:100%; max-width:350px; }',
    '  /* In the flow above the screen rather than fixed over it: a storage warning that',
    '     covered content would be the second thing on this device hiding the first. */',
    '  .storage-notice{',
    '    display:flex; align-items:center; gap:10px; padding:10px 12px;',
    '    background:var(--warning-100); color:var(--warning-ink);',
    '    border-bottom:1px solid var(--line); font-size:var(--t-body-sm); line-height:1.45;',
    '  }',
    '  .storage-notice .sn-ic{ flex-shrink:0; display:inline-flex; }',
    '  .storage-notice .sn-text{ flex:1; min-width:0; }',
    '  .storage-notice .sn-x{',
    '    flex-shrink:0; min-width:var(--tap); min-height:var(--tap); border:0; background:transparent;',
    '    color:inherit; font-size:var(--t-title); line-height:1; cursor:pointer;',
    '  }',
  ].join('\n'),
  1);

sub(
  [
    'function render(){',
    "  const screen = document.getElementById('screen');",
  ].join('\n'),
  [
    '/* Painted from state.storageNotice, which storageNotice() sets when a write is',
    '   refused or a dump is rejected. Kept out of render()\'s per-role branches so there',
    '   is one place that decides whether the device is telling the truth about saving. */',
    'function renderNotice(){',
    "  const root = document.getElementById('notice-root');",
    '  if (!root) return;',
    "  const text = state.storageNotice || '';",
    '  if (root._notice === text) return;',
    '  root._notice = text;',
    '  root.innerHTML = text ? `<div class="storage-notice">',
    '    <span class="sn-ic">' + D + "ic('alert-triangle', 16)}</span>",
    "    <span class=\"sn-text\">" + D + "esc(text)}</span>",
    '    <button type="button" class="sn-x" aria-label="Dismiss this notice"',
    '      onclick="state.storageNotice=null; renderNotice();">&times;</button>',
    '  </div>` : \'\';',
    '}',
    '',
    'function render(){',
    "  const screen = document.getElementById('screen');",
  ].join('\n'),
  1);

sub('  renderSheet();', '  renderSheet();\n  renderNotice();', 1);

fs.writeFileSync(TARGET, wasCRLF ? lf.replace(/\n/g, '\r\n') : lf);
console.log('notice layer, styles and render hook added; '
  + (wasCRLF ? 'CRLF' : 'LF') + ' preserved.');

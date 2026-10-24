/* Which layer-raising controls has the camera's walk never opened?

   Handset walk 8 found the fourth instance of a class this repository keeps meeting by accident: the
   resident's Log Out confirmation was a modal the app builds, the gate proves it paints, and no screen
   in `tools/shot.cjs` ever opened it — so the caret reading the phone produced had nothing on the bench
   to compare against. `admin-account`, the audit log and the verification review were found the same way
   (AGENTS §31, §62, §64), each by a person noticing rather than by a measurement, which is how the same
   defect survives four passes.

   This asks the question directly, in the one place the answer exists in both halves: the app can say
   which profile controls raise a layer (the gate already enumerates them from the PAINTED rows and
   section cards, so the set cannot go stale), and the camera's table says which ones it clicks. The
   difference is a destination the walk does not have.

     node tools/audit-camera-dialog-coverage.cjs

   Both halves are population-controlled: a hub that enumerates no actions, and a table that yields no
   clicked names, each answer `NO CONCLUSION` with exit 1, because an instrument that matched nothing and
   one that found nothing wrong must not print the same sentence. */
'use strict';
const fs = require('fs');
const path = require('path');
const { boot } = require('./harness.cjs');

const ROOT = path.join(__dirname, '..');
const CAM = fs.readFileSync(path.join(ROOT, 'tools', 'shot.cjs'), 'utf8');
const a = boot({});

const HUBS = [['resident', 'residentProfileAction', 'residentProfileModal', a.residentSectionBody],
              ['provider', 'providerProfileAction', 'providerProfileModal', a.providerSectionBody],
              ['admin', 'adminAccountAction', 'adminAccountModal', a.adminSectionBody]];

/* The set the APP owns: every action name painted by a profile section of the hub, and whether it
   raises a layer when state asks for it. */
function appActions() {
  const out = [];
  for (const [role, caller, modalKey, sectionBody] of HUBS) {
    a.state.view = 'app'; a.state.role = role; a.state.tab = 'profile';
    a.state[modalKey] = null; a.state.profileSheet = null;
    a.render();
    const hub = a._document.getElementById('screen').innerHTML;
    const ids = [...new Set((hub.match(/openProfileSection\('[a-z]+', *'([a-z_]+)'/g) || [])
      .map(s => /'([a-z_]+)'$/.exec(s)[1]))];
    const actions = new Set();
    /* Two places a control is painted, not one. The section cards hold most of them; the hub itself
       carries the ones that are not inside a section — Log Out is a button under the rail, so a scan
       that only read section bodies never enumerated it, and the audit happily reported full coverage
       for a dialog the walk had just been given. This is the same sharing-of-assumption the gate
       documents for the camera's own sensors, arrived at from the population side. */
    const harvest = (text) => { (text.match(new RegExp(caller + "\\('([a-z_]+)'", 'g')) || [])
      .forEach(s => actions.add(/'([a-z_]+)'$/.exec(s)[1])); };
    harvest(hub);
    for (const id of ids) harvest(sectionBody(id) || '');
    for (const name of actions) {
      a.state[modalKey] = name;
      a.render();
      const painted = a._document.getElementById('screen').innerHTML;
      /* A control that raises nothing is not a destination; `saved` is the branch that closes. */
      const raisesLayer = /class="modal-layer"/.test(painted);
      const titled = (/modal-card"[^>]*><div class="row"><b>([^<]*)</.exec(painted) || [])[1] || '';
      out.push({ role, name, raisesLayer, titled });
    }
    a.state[modalKey] = null;
  }
  return out;
}

/* The set the CAMERA owns: every action name its table clicks.

   Read out of the RAW source, where each pattern is a template-literal body, so it arrives escaped
   (`residentProfileAction\\('edit'\\)`). And the table does not have one shape: three rows abbreviate
   the caller so one regular expression serves every role (`ProfileAction\\(.add_payment.\\)`), and the
   verification rows abbreviate further still (`Action\\(.request.\\)`). A reader that only recognises
   the tidy shape reports three walked dialogs as unwalked — which is how this tool's first run printed
   seven findings, three of them its own. So the names are taken from inside each `clickPainted(/…/)`
   body, whatever the caller is spelled like, and the role comes from the row's own `state.role=`, which
   is authoritative and does not depend on how much of the caller survived into the pattern. */
function tableActions() {
  const names = new Set();
  const rows = [];
  /* Scope to the SCREENS array itself, and to its own rows only. Counting every `['x',` in the file read
     82 where `node tools/shot.cjs --list` counts 78, because four setup scripts inside the rows carry
     nested literals of the same shape (`['upcoming', …]`) — an over-count that still satisfies a `< 40`
     guard is a population control that lies. A row of the table is the entry whose id is followed by the
     template literal that walks it, which is what `--list` prints and nothing else. */
  const block = (/const SCREENS = \[([\s\S]*?)\n\];/.exec(CAM) || [])[1] || '';
  const rowStarts = [...block.matchAll(/\n *\['([a-z0-9-]+)',\s*`/g)];
  const parts = [];
  for (let i = 0; i < rowStarts.length; i++) {
    const from = rowStarts[i].index + rowStarts[i][0].length;
    const to = i + 1 < rowStarts.length ? rowStarts[i + 1].index : block.length;
    parts.push({ id: rowStarts[i][1], body: block.slice(from, to) });
  }
  for (const row of parts) {
    const role = (/state\.role='([a-z]+)'/.exec(row.body) || [])[1] || '';
    const clicked = row.body.match(/clickPainted\(\/[^/]+\//g) || [];
    for (const c of clicked) {
      /* Only punctuation may sit between the caller and the name. The first reader allowed up to four
         non-digits, which is why it claimed to see a name through a renamed caller: `ActionRenamed\\
         ('logout')` still yielded "logout", so the tool reported coverage for a walk that no longer
         performs the click. Letters are now a hard stop. */
      const n = /Action[^a-zA-Z0-9_]{0,4}([a-z_]+)/.exec(c);
      if (n && role) names.add(role + ':' + n[1]);
    }
    rows.push(row);
  }
  return { names, rows: rows.length };
}

const acts = appActions();
const table = tableActions();
const raisers = acts.filter(x => x.raisesLayer);
const missing = raisers.filter(x => !table.names.has(x.role + ':' + x.name));

/* Second population: the sheets, which the profile hubs cannot see at all.

   The authoritative set is the app's own branch list — `sheetHTML()` asks `state.sheet === '<name>'` for
   every sheet it can raise — so the list is derived from the code rather than maintained beside it, the
   same way `layerKeys()` derives the modal fields from `state`. This section exists because the resident's
   Filter providers sheet is one of those six branches and no row of the walk had ever opened it: widening
   the population found it on the first run, and the sheet held sixteen controls under the 44px tap floor
   (§99).

   What this section cannot do is *prove* a sheet paints, the way the hub section proves a modal paints:
   `renderSheet()` mounts into `#sheet-root`, which is outside the `#screen` fragment the Node harness
   assembles, so setting `state.sheet` and rendering answers "nothing painted" for every sheet, walked or
   not. That is recorded rather than papered over — the behavioural half of this claim belongs to the
   camera, which paints the sheet and prints its title in the shot line. So: population from the app,
   coverage from the table, and the sentence tells a reader which command settles the rest. */
const appSrc = fs.readFileSync(require('./harness.cjs').APP, 'utf8').replace(/\r\n/g, '\n');
const sheetNames = [...new Set((appSrc.match(/state\.sheet\s*===\s*'([A-Za-z_]+)'/g) || [])
  .map(s => /'([A-Za-z_]+)'$/.exec(s)[1]))];
const sheetBlock = (/const SCREENS = \[([\s\S]*?)\n\];/.exec(CAM) || [])[1] || '';

/* Which function raises a sheet, so coverage is tested by opener rather than by one spelling of the call.
   The first version asked only whether the table contains `openSheet('name')`, and it reported five
   "unopened" sheets — including the booking, offer, case and finalise sheets, each of which has an obvious
   row — because the app raises them through named handlers (`openCaseSheet`, `openMakeOffer`, …) and, for
   the profile sections, through `openSheet(`profileSection`)` with a **backtick**. A coverage test that
   recognises one spelling of a call is a coverage test that reports the shape of its own regex. */
function sheetOpeners(name) {
  const out = [];
  const re = /\nfunction ([A-Za-z_]+)\(/g;
  let m;
  while ((m = re.exec(appSrc)) !== null) {
    let depth = 0, i = appSrc.indexOf('{', m.index);
    for (; i < appSrc.length; i++) {
      const c = appSrc[i];
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (!depth) break; }
    }
    const body = appSrc.slice(m.index, i);
    if (new RegExp("openSheet\\(\\s*['`\"]" + name + "['`\"]\\)|state\\.sheet\\s*=\\s*['`\"]" + name + "['`\"]").test(body)) out.push(m[1]);
  }
  return out;
}
const sheetRows = sheetNames.map(n => {
  const openers = sheetOpeners(n);
  /* The table's patterns live inside template literals, so the bytes are `openSheet\\('name'\\)` while the
     runtime string is `openSheet\('name'\)`. Asking for one backslash reported the filter sheet as unopened
     on the row that opens it — §97's shape lesson again, arrived at from the other side of the same file.
     Match on "non-word characters between the call and the quoted name" instead of a spelling. */
  const clicked = new RegExp("openSheet[^A-Za-z0-9]{0,6}'" + n + "'").test(sheetBlock) ||
    new RegExp("state\\.sheet\\s*=\\s*'" + n + "'").test(sheetBlock);
  const byOpener = openers.some(f => sheetBlock.includes(f + '('));
  return { name: n, openers, covered: clicked || byOpener };
});
const unopenedSheets = sheetRows.filter(r => !r.covered);

console.log('sheets the app can raise: ' + sheetNames.length +
  '  · opened by a row of the walk: ' + (sheetNames.length - unopenedSheets.length));
if (sheetNames.length === 0) { console.log('NO CONCLUSION: no `state.sheet ===` branch parsed — the sheet scan matched nothing.'); process.exit(1); }
if (sheetBlock.length < 2000) { console.log('NO CONCLUSION: the SCREENS block is ' + sheetBlock.length + ' chars — the table is not being read.'); process.exit(1); }
for (const r of unopenedSheets) console.log('  unopened    sheet:' + r.name +
  '  (raised by [' + r.openers.join(', ') + '] — no row of the table names them or clicks them)');

console.log('profile controls that raise a layer: ' + raisers.length +
  '  · clicked by the camera: ' + (raisers.length - missing.length) +
  '  · table rows: ' + table.rows);
if (raisers.length === 0) { console.log('NO CONCLUSION: the hubs enumerated no layer-raising action — the app-side scan matched nothing.'); process.exit(1); }
if (table.names.size === 0) { console.log('NO CONCLUSION: the camera table yielded no clicked action name — the tool-side scan matched nothing.'); process.exit(1); }
if (table.rows < 40) { console.log('NO CONCLUSION: only ' + table.rows + ' SCREENS rows parsed; the table is not being read.'); process.exit(1); }
for (const x of missing) console.log('  uncovered  ' + x.role + ':' + x.name + '  (paints "' + x.titled + '")');
const findings = missing.length + unopenedSheets.length;
console.log('findings: ' + findings);
console.log(findings ? 'UNWALKED DESTINATIONS — a control raises a layer, or a sheet branch exists, and no screen of the walk opens it.'
  : 'every layer-raising profile control and every sheet the app can raise is opened by a screen of the walk.');

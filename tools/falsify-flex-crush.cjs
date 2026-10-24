/* Proves the two tallies that watch a flex row taking a fixed-size element's width can actually
   fail — and why they are camera runs rather than gate checks: the harness has no layout, so
   `getBoundingClientRect` there answers 0 for everything and a rule that only holds in a browser
   is invisible to the gate.

   Both defects were read off a screenshot of the worst corner the platform allows (320px panel,
   the phone's text at 200%), not off the source:
     - the resident's bottom navigation needed 456px of a 320px row and "Profile" painted 132px
       past the right edge of the device — a destination nobody could tap;
     - the provider dashboard's 8px "requests waiting" dot painted 1.8px wide beside a heading
       that had taken the row, and the 44px round notification button painted 31x44.
   A flex item's default min-width is `auto`, so it cannot shrink below its content — and, the
   other way round, an item with a declared width still shrinks *below* it when a sibling grows.
   The two are the same rule seen from either side, so they share one family.

   Mutant 3 is the one that changed while being written. It removed the notification button's
   flex-shrink:0 and survived, because §61 gave the top bar `flex-wrap:wrap` — an action group on a
   line of its own has room to keep its 44px. Two independent guards of one geometry, so the break
   now removes both; a single-rule break would have reported a rule that does not exist alone. The
   survivor was still worth having: it is the measurement that says the wrap fixed more than the
   clipped button label that break was written for.

   The two dot mutants are named separately, and had to be. Both 8px circles open with the identical
   `display:inline-block; flex-shrink:0; width:8px;`, so when §69 gave the live dot the declaration
   the waiting dot had always carried, that needle stopped matching once and the mutant reported
   SKIP. The family then printed 3 applied, 3 caught, 1 not applied and looked healthy while its
   coverage had fallen by one — and `node tools/falsify-all.cjs` is what caught it, not a run of this
   file alone. A shared substring is not a shared rule: each cut is located inside its own selector
   now, and the live dot gets its own mutant on the one screen that paints it.

     node tools/falsify-flex-crush.cjs    ~4 minutes, needs the machine's Chrome                */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

const TALLIES = {
  nav: 'bottom-nav items pushed off the panel: ',
  circle: 'round markers painted as a sliver (a flex row took their width): ',
};
/* One screen per rule, at the corner where both defects painted. `booking-tracking` and
   `fruit-weighed-record` were added for the live dot, found by asking every screen how many
   `.live-dot` nodes it holds rather than by reading the markup — the two booking-detail screens that
   look like the obvious hosts both answer 0, because the dot is a status condition. And the dot is
   crushed on only ONE of those two screens: with the guard removed the sliver tally stays 0 on
   `booking-tracking` and fires on `fruit-weighed-record`, where the status label beside it is the
   one long enough to take the row. A rule proven on the wrong screen reads as a rule that does
   nothing, which is how this declaration nearly got deleted. */
const ARGS = [path.join(ROOT, 'tools', 'shot.cjs'), '--measure', '--width=320', '--font-scale=2',
  '--only=resident-home,provider-dash,admin-dash,booking-tracking,fruit-weighed-record'];

/* Each mutant is a list of steps. A step is either a single-line needle/to pair — the file is CRLF,
   so a needle carrying a bare \n never matches and the mutant reports itself as SKIP while looking
   like a pass — or a shape-scoped `apply`. Any step that does not land exactly once aborts the
   mutant: a needle applied to the wrong rule reads as a pass. */
const MUTANTS = [
  { name: 'the nav item keeps the flex default min-width, so it cannot shrink below its own word',
    tally: 'nav',
    steps: [{ needle: '    min-width:0;', to: '    /* min-width left at auto */' }] },
  { name: 'the nav row stops sharing its width and sizes to content instead',
    tally: 'nav',
    steps: [{ needle: 'flex:1; text-align:center; padding:6px 4px 7px; min-height:var(--tap);',
      to: 'flex:0 0 auto; text-align:center; padding:6px 4px 7px; min-height:var(--tap);' }] },
  { name: 'the notification button is left to shrink and the bar is left unable to wrap',
    tally: 'circle',
    steps: [
      { apply: src => cutInside(src, '.notif-btn{', 'flex-shrink:0;') },
      { needle: '  .topbar{ flex-wrap:wrap; }', to: '  /* no wrap */' },
    ] },
  { name: 'the waiting dot is crushed to a sliver by the heading it sits beside',
    tally: 'circle',
    steps: [{ apply: src => cutInside(src, '.wait-dot{', 'flex-shrink:0;') }] },
  { name: 'the live dot is crushed to a sliver by the status label it sits beside',
    tally: 'circle',
    steps: [{ apply: src => cutInside(src, '.live-dot{', 'flex-shrink:0;') }] },
];

/* Remove `what` from the one rule that starts at `start` and actually declares it, or null when
   that shape is ambiguous or absent. Located by shape rather than by position because the selector
   is not unique in this file — `.notif-btn{` is written twice, once as the rule and once as
   `[data-root="1"] .notif-btn` — and because a four-space `flex-shrink:0;` appears five times. */
function cutInside(src, start, what) {
  const sites = [];
  for (let i = src.indexOf(start); i >= 0; i = src.indexOf(start, i + 1)) {
    const end = src.indexOf('}', i);
    const j = src.indexOf(what, i);
    if (j >= 0 && (end < 0 || j < end)) sites.push(j);
  }
  /* Only the declaration is removed, never the line break: the file is CRLF and slicing one
     extra character would splice a lone LF into it, which the gate's line-ending check is right
     to call damage. */
  return sites.length === 1 ? src.slice(0, sites[0]) + src.slice(sites[0] + what.length) : null;
}

function readTally(out, key) {
  const line = out.split(/\r?\n/).find(l => l.startsWith(TALLIES[key]));
  /* No line is not a zero. A camera that never reached its tally block measured nothing, and
     reading that as clean is the failure mode this repository keeps documenting. */
  if (!line) return null;
  return Number(line.slice(TALLIES[key].length).trim());
}

function measure() {
  let out = '';
  try {
    out = execFileSync(process.execPath, ARGS, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    out = (err.stdout || '') + (err.stderr || '');
  }
  return { nav: readTally(out, 'nav'), circle: readTally(out, 'circle') };
}

let caught = 0, applied = 0, unmatched = 0;
try {
  const base = measure();
  if (base.nav !== 0 || base.circle !== 0) {
    console.log('BASELINE is nav=' + base.nav + ' circles=' + base.circle +
      ' — both tallies must read 0 on the unmutated file before any mutant means anything.');
    process.exit(1);
  }
  console.log('baseline: 0 items off the panel, 0 slivers at 320px @ 200% text');
  for (const m of MUTANTS) {
    let mutated = original, why = null;
    for (const step of m.steps) {
      if (step.apply) {
        const next = step.apply(mutated);
        if (!next || next === mutated) {
          why = 'a rule the step targets is not where this file expects it';
          break;
        }
        mutated = next;
      } else {
        const hits = mutated.split(step.needle).length - 1;
        if (hits !== 1) { why = 'a needle matched ' + hits + ' times, needs exactly 1'; break; }
        mutated = mutated.replace(step.needle, step.to);
      }
    }
    if (why) {
      unmatched++;
      console.log('SKIP  ' + m.name + '  (' + why + ')');
      continue;
    }
    applied++;
    fs.writeFileSync(TARGET, mutated);
    const n = measure()[m.tally];
    if (n === null) console.log('MISSED  ' + m.name + '  (the camera printed no such tally)');
    else if (n > 0) { caught++; console.log('CAUGHT  ' + m.name + '  (' + n + ' on the ' + m.tally + ' tally)'); }
    else console.log('MISSED  ' + m.name + '  (the geometry still holds, so this rule is not what holds it)');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' mutants caught, ' + unmatched + ' not applied; file restored.');
process.exit(applied > 0 && caught === applied && unmatched === 0 ? 0 : 1);

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

     node tools/falsify-flex-crush.cjs    ~3 minutes, needs the machine's Chrome               */
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
/* Three screens, one per role, at the corner where both defects painted. The subset is enough
   because every finding this family breaks is a row-level geometry, not a data-dependent one. */
const ARGS = [path.join(ROOT, 'tools', 'shot.cjs'), '--measure', '--width=320', '--font-scale=2',
  '--only=resident-home,provider-dash,admin-dash'];

/* Single-line needles where one line can identify the site; a scoped `apply` where the string is
   not unique (flex-shrink:0 appears five times in the file, and a needle that matches more than
   once is a mutant applied to the wrong rule — which reads as a pass). */
const MUTANTS = [
  { name: 'the nav item keeps the flex default min-width, so it cannot shrink below its own word',
    tally: 'nav', needle: '    min-width:0;', to: '    /* min-width left at auto */' },
  { name: 'the nav row stops sharing its width and sizes to content instead',
    tally: 'nav',
    needle: 'flex:1; text-align:center; padding:6px 4px 7px; min-height:var(--tap);',
    to: 'flex:0 0 auto; text-align:center; padding:6px 4px 7px; min-height:var(--tap);' },
  { name: 'the notification button lets the title beside it take its declared width',
    tally: 'circle',
    apply: src => cutInside(src, '.notif-btn{', 'flex-shrink:0;'),
  },
  { name: 'the waiting dot is crushed to a sliver by the heading it sits beside',
    tally: 'circle',
    needle: 'display:inline-block; flex-shrink:0; width:8px;',
    to: 'display:inline-block; width:8px;' },
];

/* Remove `what` from the one rule that starts at `start` and actually declares it, or null when
   that shape is ambiguous or absent. Located by shape rather than by position because the
   selector is not unique in this file — `.notif-btn{` is written twice, once as the rule and once
   as `[data-root="1"] .notif-btn` — and a mutant applied to the wrong rule reads as a pass. */
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
    let mutated = null;
    if (m.apply) {
      mutated = m.apply(original);
      if (mutated === original) mutated = null;
      unmatched += mutated === null ? 1 : 0;
    } else {
      const hits = original.split(m.needle).length - 1;
      if (hits !== 1) {
        unmatched++;
        console.log('SKIP  ' + m.name + '  (needle matched ' + hits + ' times, needs exactly 1)');
        continue;
      }
      mutated = original.replace(m.needle, m.to);
    }
    if (mutated === null) {
      console.log('SKIP  ' + m.name + '  (the rule the mutant targets is not where this file expects it)');
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

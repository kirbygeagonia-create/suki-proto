/* The deck's provider promise is a reputation that compounds from completed work
   (slides 3, 7), and the rebuild could not demonstrate it: provider.rating and
   provider.jobs were literals that nothing ever wrote, so a resident could rate a job
   five and the provider's published figure would not move. Both are now recomputed from
   the seed plus this device's records, and recomputed rather than accumulated so a
   reload cannot drift the number upward.
     node tools/reputation-compounds.cjs                                                */
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

/* 14 → 15: a dump written before this change carries a rating that was a literal, not a
   derived figure, and there is no way to tell the two apart once it is on disk. */
sub('const SCHEMA_VERSION = 14;', 'const SCHEMA_VERSION = 15;', 1);

sub(
  [
    'function bookingsForProvider(providerId){',
    '  const id = providerId || CURRENT_PROVIDER_ID;',
    '  return BOOKINGS.filter(b => b.providerId === id);',
    '}',
  ].join('\n'),
  [
    'function bookingsForProvider(providerId){',
    '  const id = providerId || CURRENT_PROVIDER_ID;',
    '  return BOOKINGS.filter(b => b.providerId === id);',
    '}',
    '',
    '/* A reputation that never moves is a photograph, not a reputation. The seed figures',
    '   are sample data, so they are held aside as seeds and every published figure is',
    '   recomputed from the seed plus what this device recorded — recomputed, never',
    '   accumulated, because a stored dump that carried an already-blended average would',
    '   blend it again on every reload and walk a 4.9 to 5.0 in a week. */',
    'const SEED_RATING_RATIO = 0.6;',
    'function reputationSeeds(){',
    '  PROVIDERS.forEach(p => {',
    '    if (p.seedRating === undefined) {',
    '      p.seedRating = p.rating;',
    '      p.seedJobs = p.jobs || 0;',
    '      /* How many of the sample jobs sit behind the sample average. A convention of',
    '         the demo data — about six completed jobs in ten leave a rating — derived from',
    '         a figure that is already sample data rather than a second number invented',
    '         beside it. Without a population an average cannot be weighted, and one review',
    '         would swing 4.9 to 5.0, which is theatre rather than reputation. */',
    '      p.seedRatings = Math.max(1, Math.round(p.seedJobs * SEED_RATING_RATIO));',
    '    }',
    '  });',
    '}',
    'function deviceRatingsOf(providerId){',
    '  return BOOKINGS.filter(b => b.providerId === providerId && b.myRating).map(b => b.myRating);',
    '}',
    'function deviceJobsDone(providerId){',
    '  return BOOKINGS.filter(b => b.providerId === providerId && b.status === \'completed\'',
    '    && b.source !== \'demo\').length;',
    '}',
    'function refreshReputation(){',
    '  reputationSeeds();',
    '  PROVIDERS.forEach(p => {',
    '    const mine = deviceRatingsOf(p.id);',
    '    const count = p.seedRatings + mine.length;',
    '    const blended = (p.seedRating * p.seedRatings) + mine.reduce((t, s) => t + s, 0);',
    '    p.rating = count ? Math.round(blended / count * 10) / 10 : p.seedRating;',
    '    p.ratingsFromDevice = mine.length;',
    '    p.jobs = p.seedJobs + deviceJobsDone(p.id);',
    '    p.jobsFromDevice = deviceJobsDone(p.id);',
    '  });',
    '}',
  ].join('\n'),
  1);

/* Recomputed before every write and once at boot, so no screen has to remember to ask. */
sub('  const ok = Store.write(snapshot());', '  refreshReputation();\n  const ok = Store.write(snapshot());', 1);
sub('applyDueTransitions();\nrender();', 'applyDueTransitions();\nrefreshReputation();\nrender();', 1);

fs.writeFileSync(TARGET, wasCRLF ? lf.replace(/\n/g, '\r\n') : lf);
console.log('reputation derives from records; schema v15; '
  + (wasCRLF ? 'CRLF' : 'LF') + ' preserved.');

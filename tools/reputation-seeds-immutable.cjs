/* The seeds now live in a module-level map captured once at definition time, before
   hydrate() ever runs, rather than as fields copied onto the provider records. A copy on
   the record is cloned into the stored dump, so a future edit that re-derived the seed
   from the blended figure would be invisible at one decimal place — two of the four
   mutants written against this feature were exactly that, and passed.
     node tools/reputation-seeds-immutable.cjs                                          */
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

sub(
  [
    'const SEED_RATING_RATIO = 0.6;',
    'function reputationSeeds(){',
    '  PROVIDERS.forEach(p => {',
    '    if (p.seedRating === undefined) {',
    '      p.seedRating = p.rating;',
    '      p.seedJobs = p.jobs || 0;',
  ].join('\n'),
  [
    'const SEED_RATING_RATIO = 0.6;',
    '/* Captured once, from the literals, before hydrate() has a chance to put a derived',
    '   figure where the seed was. Held apart from the records for that reason: a seed',
    '   stored on the record is cloned into the dump and becomes indistinguishable from',
    '   the average it produced. */',
    'const REPUTATION_SEED = {};',
    'function reputationSeeds(){',
    '  PROVIDERS.forEach(p => {',
    '    if (REPUTATION_SEED[p.id] === undefined) {',
    '      REPUTATION_SEED[p.id] = { rating: p.rating, jobs: p.jobs || 0 };',
  ].join('\n'),
  1);

sub(
  [
    "      /* How many of the sample jobs sit behind the sample average. A convention of",
    "         the demo data — about six completed jobs in ten leave a rating — derived from",
    "         a figure that is already sample data rather than a second number invented",
    "         beside it. Without a population an average cannot be weighted, and one review",
    "         would swing 4.9 to 5.0, which is theatre rather than reputation. */",
    '      p.seedRatings = Math.max(1, Math.round(p.seedJobs * SEED_RATING_RATIO));',
    '    }',
    '  });',
    '}',
  ].join('\n'),
  [
    '    }',
    '  });',
    '}',
    '/* How many of the sample jobs sit behind the sample average: a convention of the',
    '   demo data — about six completed jobs in ten leave a rating — derived from a figure',
    '   that is already sample data rather than a second number invented beside it. Without',
    '   a population an average cannot be weighted, and one review would swing 4.9 to 5.0,',
    '   which is theatre rather than reputation. */',
    'function reputationSeedOf(providerId){',
    '  const s = REPUTATION_SEED[providerId] || { rating: 0, jobs: 0 };',
    '  return { rating: s.rating, jobs: s.jobs,',
    '    ratings: Math.max(1, Math.round(s.jobs * SEED_RATING_RATIO)) };',
    '}',
    'reputationSeeds();',
  ].join('\n'),
  1);

sub(
  [
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
  [
    'function refreshReputation(){',
    '  reputationSeeds();',
    '  PROVIDERS.forEach(p => {',
    '    const seed = reputationSeedOf(p.id);',
    '    const mine = deviceRatingsOf(p.id);',
    '    const done = deviceJobsDone(p.id);',
    '    const count = seed.ratings + mine.length;',
    '    const blended = (seed.rating * seed.ratings) + mine.reduce((t, s) => t + s, 0);',
    '    p.rating = count ? Math.round(blended / count * 10) / 10 : seed.rating;',
    '    p.ratingsFromDevice = mine.length;',
    '    p.jobs = seed.jobs + done;',
    '    p.jobsFromDevice = done;',
    '    /* Display-only copies of the seed, rewritten from the immutable map on every',
    '       refresh so no screen reads a stale one and none can write back into it. */',
    '    p.seedRating = seed.rating; p.seedJobs = seed.jobs; p.seedRatings = seed.ratings;',
    '  });',
    '}',
  ].join('\n'),
  1);

fs.writeFileSync(TARGET, wasCRLF ? lf.replace(/\n/g, '\r\n') : lf);
console.log('seeds moved to an immutable map captured before hydrate; '
  + (wasCRLF ? 'CRLF' : 'LF') + ' preserved.');

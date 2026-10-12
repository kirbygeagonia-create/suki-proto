/* Throwaway: put each of the verification-console defects back, in the shape it actually
   had, and require the gate to notice. */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'Sukinnect-next.html');
const pristine = fs.readFileSync(FILE);

function gate() {
  try {
    return { code: 0, out: execFileSync(process.execPath, [path.join(ROOT, 'tools/verify.cjs')],
      { encoding: 'utf8', stdio: 'pipe', cwd: ROOT }) };
  } catch (e) { return { code: e.status, out: (e.stdout || '') + (e.stderr || '') }; }
}

const QUEUE = 'the verification queue is a record, not a screen state';
const CLOCK = 'a review action is stamped with the time it happened';
const QUAL = 'each applicant is shown the qualification they hold';
const COUNT = 'the document count moves with the rows behind it';
const CRLF = 'the file carries no doubled carriage return';

const mutants = [
  /* The bug this replaces: one qualification row painted for three people. */
  { name: 'the cleaner is handed the electrician’s certificate again',
    from: "{appId:'liza',  kind:'qualification', detail:'Household cleaning practice certificate'",
    to: "{appId:'liza',  kind:'qualification', detail:'TESDA Electrical Installation and Maintenance NC II'",
    expect: QUAL },
  { name: 'the document count goes back to a number the screen chose',
    from: 'function applicationDocsSubmitted(appId){ return applicationDocs(appId).filter(d => d.submittedAt).length; }',
    to: 'function applicationDocsSubmitted(appId){ return appId === \'joel\' ? 4 : 3; }',
    expect: COUNT },
  { name: 'an action is stamped with a typed half-past-two',
    from: 'function logReview(appId, text){\r\n  reviewOf(appId).activity.push({ at: Date.now(), text });',
    to: 'function logReview(appId, text){\r\n  reviewOf(appId).activity.push({ at: Date.parse(\'2026-09-09T14:45:00\'), text });',
    expect: CLOCK },
  { name: 'approving leaves the applicant in the queue',
    from: 'function pendingApplicantList(){\r\n  return PENDING_APPLICANTS.filter(a => reviewOf(a.id).status !== \'verified\');',
    to: 'function pendingApplicantList(){\r\n  return PENDING_APPLICANTS.slice();',
    expect: QUEUE },
  { name: 'the decision is never written down',
    from: 'reopened. */\r\n  persist();\r\n  render();',
    to: 'reopened. */\r\n  render();',
    expect: QUEUE },
  /* The defect the patch scripts introduced and this gate now catches: a literal that
     already spelled CRLF, converted once more into a stray carriage return. `raw` keeps the
     CRLF below from being normalised away, which is the whole point of the mutant. */
  { name: 'a patch script leaves a doubled carriage return',
    raw: true,
    from: 'const SCHEMA_VERSION = 14;',
    to: 'const SCHEMA_VERSION = 14;\r\n',
    expect: CRLF },
  /* The count the dashboard prints, and the two places a decision has to reach. */
  { name: 'the verified tile goes back to the whole roster',
    from: '  const verified = verifiedProviderList().length;',
    to: '  const verified = PROVIDERS.length;',
    expect: 'the console counts what is actually there' },
  { name: 'the pending tile stops following the queue',
    from: '  const pendingVerification = pendingApplicantList().length;',
    to: '  const pendingVerification = PENDING_APPLICANTS.length;',
    expect: 'approving moves the dashboard tile with the queue' },
  { name: 'the decided list loses its branch and the approved applicant vanishes',
    from: " : category === 'decided' ? adminDecidedSection(decidedList)",
    to: " : category === 'decidedX' ? adminDecidedSection(decidedList)",
    expect: 'a decided application still has a place in the console' },
  /* An epoch that falls through parseDay formats as nothing at all. */
  { name: 'parseDay stops recognising an instant',
    from: '  if (typeof value === \'number\' && Number.isFinite(value)) return value;',
    to: '  if (typeof value === \'number\' && false) return value;',
    expect: 'an epoch stamp formats as the day it falls on' },
];

const base = gate();
if (base.code !== 0) {
  console.log('BASELINE NOT GREEN:\n' + base.out.split('\n').filter(l => l.startsWith('FAIL')).join('\n'));
  process.exit(1);
}
console.log('baseline: green (' + (base.out.match(/all (\d+) checks passed/) || [])[1] + ' checks)\n');

let applied = 0, caught = 0;
try {
  for (const m of mutants) {
    const text = pristine.toString('utf8').replace(/\r\n/g, '\n');
    const from = m.from.replace(/\r\n/g, '\n');
    const to = m.raw ? m.to : m.to.replace(/\r\n/g, '\n');
    const hits = text.split(from).length - 1;
    if (hits !== 1) { console.log('NOT APPLIED  ' + m.name + ' (needle matched ' + hits + ', expected 1)'); continue; }
    fs.writeFileSync(FILE, text.replace(from, to).replace(/\n/g, '\r\n'));
    applied++;
    const r = gate();
    const fl = r.out.split('\n').filter(l => l.startsWith('FAIL'));
    if (r.code !== 0 && fl.some(l => l.includes(m.expect))) {
      caught++;
      console.log('CAUGHT       ' + m.name);
      console.log('             ' + fl.join(' / ').slice(0, 150));
    } else if (r.code !== 0) console.log('PARTIAL      ' + m.name + ' — red elsewhere:\n               ' + fl.join(' / ').slice(0, 150));
    else console.log('MISSED       ' + m.name);
  }
} finally {
  fs.writeFileSync(FILE, pristine);
  const after = gate();
  console.log('\nrestored: ' + (after.code === 0 ? 'gate green again' : 'STILL FAILING'));
  console.log('mutants applied ' + applied + ', caught ' + caught + ', not applied ' + (mutants.length - applied));
}

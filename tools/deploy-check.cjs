/* The deployed artifact is the fifth copy of the page, and until today no instrument read it.
   `tools/audit-build-bytes.cjs` proves source == dist == staged asset == APK bundle; all four can agree
   while the bytes a reviewer actually receives are from a different build entirely. Measured 2026-10-24:
   production's `/` is 791,713 bytes, its hash matches NO revision of `Sukinnect-next.html` in any ref (115
   revisions scanned), and it lacks documented fixes the local file carries.

     node tools/deploy-check.cjs              # fetch, compare, print markers and findings
     node tools/deploy-check.cjs --selftest   # prove the matchers offline, no network
     node tools/deploy-check.cjs --file=X     # judge a saved copy instead of fetching
     node tools/deploy-check.cjs --url=https://…   # point at a preview instead

   Named `deploy-check.cjs`, deliberately NOT `probe-*`/`audit-*`: `tools/probe-all.cjs` discovers those
   prefixes by filename and would then make the instrument total depend on whether this machine has a network.
   The rule list is asserted against the LOCAL file on every run, so a fix that gets renamed or deleted shows
   up as a broken marker rather than as evidence the deployment is behind — the false-accusation shape a
   marker list would otherwise produce. */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
/* ROOT comes from this file's own location, not from a path typed into it: the first version pinned
   C:/Users/ADMIN/OneDrive/… which meant the one instrument that exists to check what OTHER people receive
   could not run in another checkout of the repository. `harness.cjs` has always done it this way. */
const ROOT = path.join(__dirname, '..') + path.sep;
const LOCAL = path.join(__dirname, '..', 'Sukinnect-next.html');
const BASE = process.argv.find(a => a.startsWith('--url=')) ? process.argv.find(a => a.startsWith('--url=')).slice(6) : 'https://sukinnecct.netlify.app';

/* Each of these is a fix this branch documents by section number. They are chosen to be strings that only
   the shipped code carries, not prose. */
const MARKERS = [
  ['daysBetween', '§12 day counts read both ends as days'],
  ['requestChoices', '§the-draft-index requestChoices clamp'],
  ['storageNotice', '§storage-truth refused writes raise a banner'],
  ['providerServes', '§service-area coverage is a record'],
  ['overflow-wrap:anywhere', '§long-input unbreakable word guard'],
  ['min-height:var(--tap)', '§tap-floor control inherits the floor'],
  ['REPUTATION_SEED', '§reputation seed held outside the records'],
  ['verifiedProviderList', '§admin-counts verified from records'],
  ['networkAttentionList', '§82 Insights single filter'],
  ['STEP_STAMPS', '§83 one act one moment'],
  ['isoDayAgo', '§seed-dates relative day builder'],
  ['fitNavLabels', '§nav-labels measured to fit'],
  ['navFontScale', '§handset-px platform factor measured'],
  ['labelTopLayer', '§dialog-semantics role name caret'],
];

/* Netlify adds a HUD script tag to every page it serves. It is not part of the artifact, so the byte
   comparison strips it first; leaving it in would report a mismatch on every run forever. */
function stripPlatform(html) {
  return String(html).replace(/<script[^>]*\.netlify[^>]*><\/script>/g, '').replace(/\s+$/, '');
}
function markerReport(html) {
  const present = [], absent = [];
  for (const [needle, why] of MARKERS) {
    (String(html).includes(needle) ? present : absent).push([needle, why]);
  }
  return { present, absent };
}
/* A leak is a repository file that answers 200 at a guessable URL. 404/410 is the required answer.
   A status of 0 means the request never got an answer, and that is NOT a leak: the first run of this tool
   counted seven unanswered HEADs as seven leaks — curl's `/dev/null` does not resolve when curl.exe is
   spawned outside MSYS — and printed `findings: 15` about a deployment that was in fact answering 404 to
   every one of them. An instrument that cannot see must refuse, exactly like a page probe naming
   `NO CONCLUSION`: reporting a defect from your own outage is worse than reporting nothing. */
function isLeakClean(status) { return status === 404 || status === 410; }
function isAnswered(status) { return status >= 200 && status <= 599; }
/* A page read that returns null says only "I could not use this response", which is not the same statement as
   "the host did not answer". The status is kept so the refusal can name it: PR #11's deploy preview answers 401
   because Netlify protects previews, and reporting that as offline sends a reader to debug their network.
   Pure, so the selftest can drive it without a socket. */
let pageStatus = 0;
function readOutcome(status) {
  if (status === 0) return 'no answer at all — offline, DNS, or a TLS failure';
  if (status === 401 || status === 403) return 'PROTECTED — it answered ' + status + ' — the deployment is there and locked, not missing';
  if (status >= 400) return 'answered ' + status + ' — an error, but an answer';
  return 'answered ' + status;
}

async function fetchStatus(url) {
  try {
    const r = await fetch(url, { method: 'GET', redirect: 'manual' });
    await r.body.cancel().catch(() => {});
    return r.status;
  } catch (e) { return 0; }
}
async function fetchBody(url) {
  try {
    const r = await fetch(url, { method: 'GET', redirect: 'manual' });
    if (!r.ok && r.status !== 200) { pageStatus = r.status; return null; }
    return await r.text();
  } catch (e) { return null; }
}

if (process.argv.indexOf('--selftest') > -1) {
  let fail = 0;
  const t = (label, ok, extra) => { console.log((ok ? '  ok   ' : '  FAIL ') + label + (extra ? ' — ' + extra : '')); if (!ok) fail++; };
  const hud = '<html><body>x<script async src="/.netlify/scripts/hud?variant=public"></script></body></html>';
  t('the HUD script line is stripped', stripPlatform(hud) === '<html><body>x</body></html>');
  t('a page without the HUD is untouched', stripPlatform('<p>plain</p>') === '<p>plain</p>');
  t('404 is a clean leak answer', isLeakClean(404) && isLeakClean(410));
  t('200 on a repo file is a leak', !isLeakClean(200) && !isLeakClean(301));
  /* The rule that the first live run got wrong: a request that never got an answer is not a status code. */
  t('an unanswered request is not a clean answer either', !isAnswered(0) && !isLeakClean(0));
  t('a real 5xx is answered, so it is judged rather than refused', isAnswered(503));
  t('a 401 is never called a silence', /PROTECTED/.test(readOutcome(401)) && !/offline/.test(readOutcome(401)), true);
  t('only status 0 is reported as no answer', /^no answer/.test(readOutcome(0)), true);
  t('a 500 is an error but still an answer', /answered 500/.test(readOutcome(500)) && !/PROTECTED/.test(readOutcome(500)), true);
  const local = fs.readFileSync(LOCAL, 'utf8');
  const mr = markerReport(local);
  /* The positive control: every marker must exist in the file the deployment is supposed to carry. A marker
     that matches nothing in the local build cannot accuse the deployment of anything. */
  t('every marker is findable in the local artifact', mr.absent.length === 0,
    mr.absent.length ? 'not in local file: ' + mr.absent.map(m => m[0]).join(', ') : MARKERS.length + ' markers');
  const synthetic = '<html>' + MARKERS.slice(0, 4).map(m => m[0]).join('') + '</html>';
  const sm = markerReport(synthetic);
  t('a partial artifact reports the missing fixes by name', sm.absent.length === MARKERS.length - 4,
    'absent ' + sm.absent.length + ' of ' + MARKERS.length);
  console.log('selftest: ' + (fail ? fail + ' FAILURES' : 'all cases pass'));
  process.exit(fail ? 1 : 0);
}

const localHtml = fs.readFileSync(LOCAL, 'utf8');
const localMr = markerReport(localHtml);
if (localMr.absent.length) {
  console.log('NO CONCLUSION — ' + localMr.absent.length + ' marker(s) do not exist in the local artifact either (' +
    localMr.absent.map(m => m[0]).join(', ') + '), so nothing can be said about the deployment. Fix the marker list first.');
  process.exit(1);
}

async function main() {
  let deployed;
  const fileArg = process.argv.find(a => a.startsWith('--file='));
  if (fileArg) deployed = fs.readFileSync(fileArg.slice(7), 'utf8');
  else deployed = await fetchBody(BASE + '/');
  if (deployed === null || deployed.length < 1000) {
    console.log('NO CONCLUSION — the deployed page could not be read from ' + BASE + ': ' + readOutcome(pageStatus) + '. ' +
      'An unreachable host must never print a clean line.');
    process.exit(1);
  }

  const stripped = stripPlatform(deployed);
  console.log('local artifact   : ' + Buffer.byteLength(localHtml) + ' bytes, ' + localHtml.split('\n').length + ' lines');
  console.log('deployed page    : ' + Buffer.byteLength(deployed) + ' bytes as served, ' +
    Buffer.byteLength(stripped) + ' after the platform HUD line is removed');
  console.log('agreement        : ' + (stripped === localHtml ? 'IDENTICAL to the local artifact' : 'DIFFERENT from the local artifact'));

  /* Is the live page any revision at all? This is the question "never infer an artifact from the repository"
     answered in the other direction: the repository can be searched for the deployed bytes. */
  let searched = 'not searched (no git)';
  try {
    const revs = execFileSync('git', ['log', '--all', '--format=%H', '--', 'Sukinnect-next.html'], { encoding: 'utf8', cwd: ROOT }).trim().split('\n').filter(Boolean);
    let match = '';
    for (const c of revs) {
      try {
        const blob = execFileSync('git', ['show', c + ':Sukinnect-next.html'], { encoding: 'utf8', cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
        if (stripPlatform(blob) === stripped) { match = c; break; }
      } catch (e) { /* a revision without the file */ }
    }
    searched = match ? 'MATCHES commit ' + match : 'MATCHES NO revision — ' + revs.length + ' revisions of that file were compared';
  } catch (e) { searched = 'not searched (no git)'; }
  console.log('provenance       : ' + searched);

  const dMr = markerReport(stripped);
  console.log('fixes on the live page: ' + dMr.present.length + ' present, ' + dMr.absent.length + ' absent');
  dMr.absent.forEach(m => console.log('  not deployed: ' + m[0] + '   (' + m[1] + ')'));

  const LEAKS = ['/AGENTS.md', '/CHANGES.md', '/README.md', '/netlify.toml', '/.gitignore', '/schema/sukinnect.reference.sql', '/tools/verify.cjs'];
  let leaked = 0, answered = 0, unanswered = [];
  let entry = 0;
  if (!fileArg) {
    entry = await fetchStatus(BASE + '/');
    console.log('entry point /    -> ' + entry + (isAnswered(entry) ? '' : '  (no answer)'));
    console.log('repo files at guessable URLs (each must 404):');
    for (const p of LEAKS) {
      const s = await fetchStatus(BASE + p);
      if (!isAnswered(s)) { unanswered.push(p + ' -> ' + s); console.log('  ' + p + ' -> ' + s + '  NOT ANSWERED'); continue; }
      answered++;
      const clean = isLeakClean(s);
      if (!clean) leaked++;
      console.log('  ' + p + ' -> ' + s + (clean ? '  ok' : '  LEAK'));
    }
  }

  /* Refuse before reporting anything about leaks: a host that stops answering mid-run would otherwise print
     "0 leaks" over the handful of paths that did answer, and a partial clean is exactly a false all-clear. */
  if (unanswered.length || (!fileArg && !isAnswered(entry))) {
    console.log('NO CONCLUSION — ' + (unanswered.length ? unanswered.length + ' path(s) were not answered (' + unanswered.join(', ') + ')' : 'the entry point was not answered') +
      '; ' + answered + ' of ' + LEAKS.length + ' leak paths answered. The leak verdict is not computed from a partial scan.');
    process.exit(1);
  }

  const findings = dMr.absent.length + leaked + (stripped === localHtml ? 0 : 1);
  console.log('findings: ' + findings);
  if (stripped !== localHtml) console.log('  NOTE the byte disagreement is the deployment being a different build, not a corrupted file: the four on-disk copies are proved by tools/audit-build-bytes.cjs.');
  if (fileArg) console.log('  NOTE judged from a saved file — the URL checks were skipped, so the leak count below is 0 of ' + LEAKS.length + ' paths, not a clean scan.');
  if (fileArg) console.log('  NOTE leak paths checked this run: 0 of ' + LEAKS.length + ' — no leak verdict is available from --file=.');
  process.exit(findings ? 1 : 0);
}
main();

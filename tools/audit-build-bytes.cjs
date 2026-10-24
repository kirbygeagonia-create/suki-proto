/* Does every copy of the page hold the same bytes?

   The rebuild exists in four places at once — `Sukinnect-next.html`, the copy `dist/` publishes,
   `Sukinnect-Android/app/src/main/assets/Sukinnect.html` that the shell loads, and the built APK's
   bundled entry — and today three of them were re-synced by hand after each of the session's two page
   changes, verified each time with an ad-hoc `md5sum` and an `unzip -p`. An invariant checked by
   remembering to check it is the §90 class waiting to happen again: `DEVICE-PASS.md` has rows telling
   the reader to run that comparison, and the installed build drifting behind the tree is the exact
   state this file keeps having to write down.

   So the comparison is a tool now. It prints one row per artifact with its hash and answers
   `findings: N` where N is the number of copies that disagree with the source. It refuses — exit 1,
   `NO CONCLUSION` — when an artifact is missing entirely, because a check that skips an artifact and
   reports zero findings is the failure this repository has written down three times today.

     node tools/audit-build-bytes.cjs        # also run by tools/probe-all.cjs

   The APK row is the interesting one: it reads the bundle out of the archive rather than trusting the
   file on disk that was copied into it, which is the difference between "I staged the page" and "the
   artifact a phone would run holds these bytes". */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'Sukinnect-next.html');
const ANDROID = path.join(ROOT, 'Sukinnect-Android');

const md5 = (buf) => crypto.createHash('md5').update(buf).digest('hex');
const rows = [];
const missing = [];

function hashFile(p) {
  if (!fs.existsSync(p)) return null;
  return md5(fs.readFileSync(p));
}

/* the page as published for the web */
const dist = path.join(ROOT, 'dist', 'Sukinnect-next.html');
/* the page staged for a device build — untracked, so `git status` cannot see it drift */
const staged = path.join(ANDROID, 'app', 'src', 'main', 'assets', 'Sukinnect.html');

const want = hashFile(SRC);
if (!want) { console.log('NO CONCLUSION: the source page is not on disk; nothing can be compared.'); process.exit(1); }
rows.push(['source Sukinnect-next.html', want]);
for (const [label, p] of [['dist/Sukinnect-next.html', dist], ['android asset', staged]]) {
  const h = hashFile(p);
  if (h === null) { missing.push(label + ' (absent: ' + path.relative(ROOT, p) + ')'); continue; }
  rows.push([label, h]);
}

/* newest debug APK, read from inside the archive */
const apkDir = path.join(ANDROID, 'app', 'build', 'outputs', 'apk', 'debug');
let apk = null;
if (fs.existsSync(apkDir)) {
  const found = fs.readdirSync(apkDir).filter(f => /\.apk$/.test(f))
    .map(f => ({ f, t: fs.statSync(path.join(apkDir, f)).mtimeMs }))
    .sort((x, y) => y.t - x.t)[0];
  apk = found ? path.join(apkDir, found.f) : null;
}
if (apk) {
  let h = null;
  try {
    h = md5(execFileSync('unzip', ['-p', apk, 'assets/Sukinnect.html'], { encoding: 'buffer', maxBuffer: 256 * 1024 * 1024 }));
  } catch (err) {
    missing.push('APK bundle could not be read (' + String(err.message).slice(0, 40) + ')');
  }
  if (h) rows.push([path.basename(apk) + ' → assets/Sukinnect.html', h]);
} else {
  missing.push('no debug APK under ' + path.relative(ROOT, apkDir));
}

/* An artifact that could not be read is not an artifact that agrees. */
const disagree = rows.filter(r => r[1] !== want);
for (const r of rows) console.log('  ' + (r[1] === want ? 'same  ' : 'DIFFER') + '  ' + r[0].padEnd(52) + r[1]);
if (missing.length) {
  console.log('NO CONCLUSION: ' + missing.length + ' artifact(s) not read — ' + missing.join('; '));
  process.exit(1);
}
if (rows.length < 4) {
  console.log('NO CONCLUSION: only ' + rows.length + ' artifact(s) hashed; the comparison needs source, dist, asset and APK.');
  process.exit(1);
}
console.log('findings: ' + disagree.length);
console.log(disagree.length
  ? 'STALE COPIES — the page exists in ' + rows.length + ' reads and ' + disagree.length + ' disagree with the source.'
  : 'every copy of the page — source, dist, staged asset, and the bundle inside the APK — holds identical bytes.');
process.exit(disagree.length ? 1 : 0);

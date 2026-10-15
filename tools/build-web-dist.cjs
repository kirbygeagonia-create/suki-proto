/* Build the directory Netlify publishes, and refuse to build it wrong.

   The repository root also holds the pitch deck (26 MB of PDF and PPTX), AGENTS.md, the change log,
   the three prompt documents, the reference schema and all of tools/. `publish = "."` served all of
   that at guessable URLs so the app's relative asset paths kept working. This copies only what the
   application asks for, so the exposure is structurally impossible rather than blocked by a list
   someone has to remember — a blocklist leaks by default the first time a new file lands at root.

   The check at the end is the reason to trust the output: every quoted `.css/.js/.png/.woff2` path
   in BOTH html files — including the ones painted from SERVICE_ART, PRO_PHOTOS and VERIF_PHOTOS,
   which are literals in those maps — must resolve inside dist. A trade's artwork added to the app
   but not to the copy list fails the build instead of shipping a site with blank tiles.

     node tools/build-web-dist.cjs                                              */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

/* The served surface. Everything at the repository root that is not here stays unpublished.

   `reicon.js` is in the list because the check put it there: `Sukinnect.html` loads it as a script
   and draws its icons through the custom element it registers, so publishing the subset without the
   8.3 MB library would have shipped the shipped prototype with no icons anywhere — and the whole
   point of publishing `Sukinnect.html` next to the rebuild is that a reviewer can run the same flow
   in two tabs. The rebuild loads nothing of the sort: it draws 43 glyphs inline, which is why this
   weight is the older page's price, not the application's. */
const SERVE = ['Sukinnect-next.html', 'Sukinnect.html', 'Sukinnect_Logo.png', 'reicon.js', 'assets', 'avatars', 'fonts', 'leaflet'];

const REMOTE = /^(https?:|data:|#|tel:|mailto:|\/\*|blob:)/;

function copy(rel) {
  const from = path.join(ROOT, rel);
  if (!fs.existsSync(from)) throw new Error('the serve list names something that is not in the repo: ' + rel);
  const to = path.join(DIST, rel);
  const stat = fs.statSync(from);
  if (stat.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const child of fs.readdirSync(from)) copy(path.join(rel, child));
  } else {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }
}

function list(dir, base) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(base, e.name);
    if (e.isDirectory()) out.push(...list(path.join(dir, e.name), rel));
    else out.push(rel);
  }
  return out;
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
for (const rel of SERVE) copy(rel);

const files = list(DIST, '.');
const bytes = files.reduce((n, f) => n + fs.statSync(path.join(DIST, f)).size, 0);

/* Every path either html file can ask for, taken from the quoted references rather than from a
   hand-written list, so a new avatar or category scene is covered automatically. */
const wanted = new Set();
for (const html of ['Sukinnect-next.html', 'Sukinnect.html']) {
  const src = fs.readFileSync(path.join(ROOT, html), 'utf8');
  for (const m of src.matchAll(/['"]([^'"\s]+?\.(?:css|js|png|jpg|jpeg|svg|woff2))['"]/g)) {
    const p = m[1];
    if (REMOTE.test(p) || p.startsWith('.')) continue;
    wanted.add(p.replace(/^\.\/?/, ''));
  }
}
const missing = [...wanted].filter(p => !fs.existsSync(path.join(DIST, p))).sort();

/* A file can be present and still be nothing. `reicon.js` is under Git LFS, and a clone made
   without `git lfs install` leaves a ~130-byte pointer where the 8.3 MB library should be —
   `existsSync` is satisfied by a pointer, `Sukinnect.html` loses every icon, and the page still
   boots. So the build looks at what the bytes actually are, the same way the gate's font check
   refuses a face whose file is a placeholder. */
const pointers = files.filter(f => {
  const abs = path.join(DIST, f);
  if (fs.statSync(abs).size > 4096) return false;
  return fs.readFileSync(abs).slice(0, 40).toString('utf8').startsWith('version https://git-lfs');
});

const rootNames = fs.readdirSync(ROOT).filter(n => !n.startsWith('.') && !n.startsWith('dist'));
const excluded = rootNames.filter(n => !SERVE.includes(n)).sort();

console.log('dist/ — ' + files.length + ' files, ' + (bytes / 1024).toFixed(0) + ' KB');
console.log('referenced by the two html files: ' + wanted.size + ' paths, ' +
  (missing.length ? missing.length + ' MISSING' : 'all resolve inside dist'));
if (missing.length) missing.slice(0, 12).forEach(p => console.log('  missing: ' + p));
console.log('LFS pointers standing in for real files: ' +
  (pointers.length ? pointers.length + ' — ' + pointers.join(', ') : 'none'));
console.log('left unpublished at the repository root: ' + excluded.join(', '));

if (missing.length) {
  console.error('\nthe built site would paint a hole — add the path to the app or its directory to SERVE');
  process.exit(1);
}
if (pointers.length) {
  console.error('\nrun `git lfs install` and re-clone: a copied file is a pointer, not its content');
  process.exit(1);
}

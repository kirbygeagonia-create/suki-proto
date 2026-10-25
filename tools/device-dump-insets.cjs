/* Does any pixel of this app's own UI sit underneath a system bar? Read from a uiautomator dump.

   `tools/device-edge-leg.cjs` answers the edge-to-edge question through the WebView inspector, which needs the page
   to run script. This answers the same user-visible question from the PLATFORM side — the accessibility tree the
   framework builds from real view bounds — so it works on a handset whose renderer is wedged, on an OEM shell that
   refuses synthetic taps, and on a dump captured days ago. That is what makes it the low-end reader: below API 35
   the framework insets the window itself, so the question a 2016 handset can answer is not "did the shell pad the
   content view" but "is anything painted under the status bar or the gesture area", and that is a bounds question.

   The bar bands are derived from the dump rather than typed in: a non-our-package node touching the top edge
   establishes the status band, one touching the bottom edge establishes the nav band, and the screen size comes
   from `--screen=WxH` (the same `wm size` line the leg reads). A dump that names no screen, holds none of our nodes,
   or yields neither band is REFUSED — an overlap count of zero from a scan that found no bars is the same silence
   this repository has learned to distrust.

     node tools/device-dump-insets.cjs --file=.scratch/after-payments.xml --screen=720x1544
     adb -s <serial> shell uiautomator dump /sdcard/wd.xml && adb -s <serial> pull /sdcard/wd.xml .scratch/wd.xml
*/
'use strict';
const fs = require('fs');
const path = require('path');

const arg = (name, dflt) => {
  const hit = process.argv.find(a => a.startsWith('--' + name + '='));
  return hit ? hit.slice(name.length + 3) : dflt;
};
const FILE = arg('file', ''), PKG = arg('package', 'com.sukinnect.app');
const SCREEN = arg('screen', '').match(/^(\d+)x(\d+)$/);

if (!FILE || !fs.existsSync(FILE)) {
  console.log('NO CONCLUSION: --file is missing or unreadable, so no bounds were examined.'); process.exit(1);
}
if (!SCREEN) {
  console.log('NO CONCLUSION: --screen=WxH is required (read it from `adb shell wm size`). Without a display size a '
    + 'dump cannot say where a bar band starts, and "no overlaps" would be a statement about nothing.');
  process.exit(1);
}
const [screenW, screenH] = [+SCREEN[1], +SCREEN[2]];
const xml = fs.readFileSync(FILE, 'utf8');

const NODE_RE = /<node\b([^>]*)\/?>/g;
const attr = (body, name) => { const m = body.match(new RegExp(name + '="([^"]*)"')); return m ? m[1] : ''; };
const bounds = (body) => {
  const m = attr(body, 'bounds').match(/^\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]$/);
  return m ? { l: +m[1], t: +m[2], r: +m[3], b: +m[4] } : null;
};

const nodes = [];
for (const m of xml.matchAll(NODE_RE)) {
  const b = bounds(m[1]);
  if (!b) continue;
  nodes.push({ pkg: attr(m[1], 'package'), cls: attr(m[1], 'class'), id: attr(m[1], 'resource-id'),
    desc: attr(m[1], 'content-desc'), text: (attr(m[1], 'text') || '').slice(0, 24), b });
}
if (nodes.length === 0) {
  console.log('NO CONCLUSION: the dump parsed zero nodes with bounds, which means it is a null-root dump (the '
    + 'window was not owned by the caller) rather than a clean screen.');
  process.exit(1);
}
const ours = nodes.filter(n => n.pkg === PKG && !(n.b.l === n.b.r && n.b.t === n.b.b));
if (ours.length === 0) {
  console.log('NO CONCLUSION: no node belongs to ' + PKG + ' — the app is not what this dump captured.');
  process.exit(1);
}
const others = nodes.filter(n => n.pkg && n.pkg !== PKG);
/* A dump that contains only our own package is a PAGE-level dump: the accessibility tree a WebView publishes
   reports bounds relative to the WebView's own coordinate space, which already begins below the bars. Judging those
   numbers against window bands is a category error — it will call the top of the page "under the status bar" — so the
   reader refuses unless the dump also holds foreign nodes, which is what a window-level dump looks like. This was
   found by re-running the reader on a recorded handset dump after the content-root change: the same file that read
   `findings: 0` on a window-level basis read `findings: 1` once the content root was followed properly, and neither
   number meant anything. */
if (others.length === 0) {
  console.log('NO CONCLUSION: every node in the dump belongs to ' + PKG + ', so this is a page-level (WebView) dump '
    + 'whose bounds are relative to the WebView, not the window. Take the dump with the window chrome in it, or read '
    + 'the renderer-side numbers with tools/device-edge-leg.cjs instead.');
  process.exit(1);
}

/* Bar bands, derived. A node that starts at the very top and is not ours is part of the status band; the band's
   floor is the lowest such bottom that is still a plausible bar (under a fifth of the screen), because a full-screen
   scrim from another app also starts at 0. Same logic mirrored at the bottom. */
const band = (touch, edge) => {
  const cands = others.map(n => n.b).filter(touch)
    .map(edge).filter(v => v >= 0 && v < screenH / 5);
  return cands.length ? Math.max(...cands) : 0;
};
const explicitBand = (name) => { const v = arg(name, ''); return /^\d+$/.test(v) ? Number(v) : null; };
const statusBarExplicit = explicitBand('statusbar');
const navBarExplicit = explicitBand('navbar');
const statusBar = statusBarExplicit !== null ? statusBarExplicit : band(b => b.t === 0, b => b.b);
const navFromBottom = navBarExplicit !== null ? navBarExplicit : band(b => b.b === screenH, b => screenH - b.t);
/* Where the bands came from has to be printed, because it changes what a clean line means. A dump of a WebView
   contains only the page's own virtual hierarchy — zero foreign nodes, measured on the recorded handset dumps — so
   it can never derive a bar band, and the bands must be supplied from `dumpsys window` (which still prints rects
   below API 35). A verdict with supplied bands is a bounds test against the platform's numbers; one with derived
   bands is a bounds test against the dump's own. They are not the same claim. */
const bandSource = (explicit) => (explicit ? 'supplied (--statusbar/--navbar)' : 'derived from foreign nodes');

if (!statusBar && !navFromBottom) {
  console.log('NO CONCLUSION: neither a status band nor a nav band was found among the ' + others.length
    + ' foreign nodes, so the overlap test has no edges to test against. This is a reader limit, not a clean run.');
  process.exit(1);
}

/* The population to judge is the app's CONTENT, not its nodes. Two reasons, both found on real and synthetic dumps
   in the same session: the decor and the framework's bar backgrounds always span the bars (`statusBarBackground`
   exists precisely to paint behind the status bar), and a bottom-anchored `navigationBarBackground` also poisons any
   "how far down does the app reach" test built from the node list. So the content root is taken from Android's own
   definition — `android:id/content` — and because a uiautomator dump is depth-first, that node and everything after
   it in document order is the content and its descendants. Without that node the reader falls back to excluding the
   known scaffolding, and says which rule it used: a verdict computed two ways must name the way it was computed. */
const DECOR_IDS = /android:id\/(statusBarBackground|navigationBarBackground)$/;
const rootInOurs = ours.findIndex(n => n.id === 'android:id/content');
const allBottom = Math.max(...ours.map(n => n.b.b));
const content = rootInOurs >= 0 ? ours.slice(rootInOurs)
  : ours.filter(n => !DECOR_IDS.test(n.id) && !(n.b.t === 0 && n.b.b >= allBottom));
const contentRule = rootInOurs >= 0 ? 'android:id/content root' : 'scaffolding excluded by bounds and id';

const findings = [];
const maxBottom = Math.max(...ours.map(n => n.b.b));
const minTop = Math.min(...content.map(n => n.b.t));
for (const n of content) {
  if (statusBar && n.b.t < statusBar && n.b.b > 0) {
    findings.push('painted under the status band: ' + (n.id || n.desc || n.cls || n.text || 'node')
      + ' top ' + n.b.t + ' < band floor ' + statusBar);
  }
  if (navFromBottom && n.b.b > screenH - navFromBottom) {
    findings.push('painted under the nav band: ' + (n.id || n.desc || n.cls || n.text || 'node')
      + ' bottom ' + n.b.b + ' > band top ' + (screenH - navFromBottom));
  }
}
const appBox = { t: minTop, b: maxBottom };

console.log('dump inset audit — ' + path.basename(FILE) + ' on a ' + screenW + 'x' + screenH + ' display');
console.log('  our nodes: ' + ours.length + ' total, ' + content.length + ' judged as content by '
  + contentRule + ' (' + (ours.length - content.length) + ' excluded as window scaffolding)');
console.log('  content box: topmost ' + appBox.t + ', bottommost ' + appBox.b
  + ' — the window itself reaches ' + maxBottom);
console.log('  status band: ' + (statusBar ? 'floor at y=' + statusBar + '  [' + bandSource(statusBarExplicit !== null) + ']' : 'not derived'));
console.log('  nav band:    ' + (navFromBottom ? 'top at y=' + (screenH - navFromBottom) + ' (' + navFromBottom + 'px)  [' + bandSource(navBarExplicit !== null) + ']' : 'not derived'));
console.log('  window height used by the app: ' + (appBox.b - appBox.t) + 'px of ' + screenH
    + ' → ' + (screenH - appBox.b) + 'px unused at the bottom, ' + appBox.t + 'px at the top');
console.log('findings: ' + findings.length);
findings.slice(0, 12).forEach(f => console.log('  FINDING ' + f));
if (findings.length > 12) console.log('  … and ' + (findings.length - 12) + ' more');
process.exit(findings.length ? 1 : 0);

/* The edge-to-edge leg, armed.

   DEVICE-PASS records why it stayed open: `targetSdk 36` forces edge-to-edge at **API 35+**, and every handset
   that has been attached here is below that — the OPPO is API 29, the vivo API 30 — so on both phones the
   question could not even be posed, not merely unanswered. `suki_leg9` is an android-36 frame (API 36), which is
   the first target on this machine where the platform actually enforces it. A framework answers mechanism
   questions and does not answer one handset's density or OEM skin, and this claim is a mechanism: does the shell
   keep the page clear of the bars.

   The mechanism under test lives in the shell, not the page: `MainActivity.applySystemBarInsets()` puts the
   `systemBars() | displayCutout() | ime()` insets as **padding on the WebView itself**. That has a measurable
   signature the page can report: if the padding took effect, the WebView's CSS viewport is shorter than the
   View's own box by the bar heights. So the leg compares three things it can read independently —
     · the WebView node's bounds in device px, from `uiautomator` (the platform's view of the box),
     · `innerHeight` and `devicePixelRatio`, from the page (the content area after the padding),
     · the bar heights, from `dumpsys window` —
   and requires the CSS content height to be smaller than the View height when bars exist. A page whose viewport
   equals the full View on a device with navigation bars is a page painted under the gesture bar, which is the
   defect this leg exists to find.

     node tools/device-edge-leg.cjs                # boot check + install + measure + verdict
     node tools/device-edge-leg.cjs --selftest     # prove the judge offline; no device, no network

   Named `device-*` so `tools/probe-all.cjs` does not discover it by filename, which would move the quoted
   instrument totals mid-pass. Refuses before measuring anything if the target's API is below 35: the question
   does not exist there, and a green line from a frame that cannot exhibit the behaviour is worse than no line.
*/
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ADB = process.env.ADB || 'C:/Users/ADMIN/AppData/Local/Android/Sdk/platform-tools/adb.exe';
const ROOT = path.join(__dirname, '..') + path.sep;
const META = JSON.parse(fs.readFileSync(ROOT + 'Sukinnect-Android/app/build/outputs/apk/debug/output-metadata.json', 'utf8'));
const PKG = META.applicationId;
const WANT_CODE = String(META.elements[0].versionCode);
const WANT_NAME = META.elements[0].versionName;
const APK = ROOT + 'Sukinnect-Android/app/build/outputs/apk/debug/' + META.elements[0].outputFileName;

function adb() {
  const args = Array.prototype.slice.call(arguments);
  try { return execFileSync(ADB, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).replace(/\r/g, ''); }
  catch (e) { return 'ADB ERROR: ' + String((e.stdout || '') + (e.stderr || '')).replace(/\r/g, ''); }
}
function sleep(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }
function probe(args) {
  try {
    return execFileSync(process.execPath, [ROOT + 'tools/device-probe.cjs'].concat(args),
      { encoding: 'utf8', cwd: ROOT, env: Object.assign({}, process.env, { ADB }) }).replace(/\r/g, '');
  } catch (e) { return 'PROBE ERROR: ' + String((e.stdout || '') + (e.stderr || '')).split('\n').slice(-2).join(' ').trim(); }
}
const lastLine = out => String(out).trim().split('\n').filter(Boolean).pop() || '(no answer)';
function ask(expr) { return lastLine(probe([expr])); }
function askJson(label, expr) {
  const raw = ask(expr);
  try { const j = JSON.parse(raw); if (!j || typeof j !== 'object') throw new Error('not an object'); return j; }
  catch (e) { console.log('  ' + label + ': NOT MEASURED — the page answered ' + String(raw).slice(0, 90)); return null; }
}

/* ---------- the pure judge: proven by --selftest, because a scarce frame is not where to debug this ---------- */
/* webViewH: the WebView node's height in DEVICE px. innerHeight/dpr: the page's own content box.
   barsTop/barsBottom: the platform's reported status + navigation bar heights in device px. */
function judge(m) {
  const reasons = [];
  if (!m) return { ok: false, reasons: ['no measurement'] };
  /* The platform bar heights are one of the two inputs the whole verdict rests on. If they could not be read,
     the arithmetic silently becomes "bars = 0", and a frame with a navigation bar would then be forgiven as if
     it were barless — a check that cannot fail printing a pass, which is this repository's named defect. So an
     unread measurement is a refusal, never a zero. */
  if (m.barsUnread) return { ok: false, reasons: ['the platform reported NO bar geometry at all (dumpsys and the tree both unmatched), so "no insets" would be the instrument being blind, not the shell being right'] };
  /* A matched-but-zero status bar is the same blindness in a subtler form: real saved trees carry
     `com.android.systemui:id/status_bar` nodes laid out as `[0,0][0,0]`, so the id was found and the height is
     nothing. Gesture navigation can legitimately make the BOTTOM zero; there is no Android frame in scope here
     where the TOP is zero while the page is drawn under something. */
  if (!m.barsTop) return { ok: false, reasons: ['the status bar read 0px from "' + (m.barsSource || 'no source') + '" — an id present but not laid out is a blind reader, not a barless device'] };
  const cssH = m.innerHeight, dpr = m.dpr;
  if (!cssH || !dpr || !m.webViewH) return { ok: false, reasons: ['a needed figure was missing (innerHeight/dpr/webViewH)'] };
  const contentPx = cssH * dpr;
  const slack = m.webViewH - contentPx;                       // what the padding took away
  const bars = (m.barsTop || 0) + (m.barsBottom || 0);
  /* The signature of the shell's padding. Tolerance: rounding between two independent sources at a fractional
     density, so a tenth of a device px is measurement noise, not a missing inset. */
  if (bars > 0 && slack < Math.min(bars, 4)) {
    reasons.push('content fills the View (' + Math.round(contentPx) + 'px of ' + m.webViewH + 'px) while the platform reports ' +
      bars + 'px of bars — the page is painted under a system bar');
  }
  if (m.navBottomCss != null && m.bottomNavBottom != null && m.bottomNavBottom > m.navBottomCss + 1) {
    reasons.push('the bottom navigation row ends at ' + m.bottomNavBottom + ' CSS px, below the content edge ' +
      m.navBottomCss + ' — a thumb target off the reduced viewport');
  }
  if (m.headerTop == null || m.headerTop < 0) reasons.push('the top bar was not painted, so nothing above it was measured');
  return { ok: reasons.length === 0, reasons, slack, bars, contentPx: Math.round(contentPx) };
}

/* ---------- reading the bar geometry from two places, because one can silently miss ---------- */
/* `dumpsys window` has printed these as `mStatusBar = [0,0][w,h]` on some releases and not at all on others,
   and a miss here is not a neutral zero — see judge(). So there is a second source: the platform tree names
   the bars' own nodes, and a node's bounds are the height. Both are reported, and neither matching is a
   refusal rather than a pass. */
const dimsOf = s => { const m = String(s).match(/(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)/); return m ? [Math.abs(+m[4] - +m[2]), Math.abs(+m[3] - +m[1])] : [0, 0]; };
function barsFromDumpsys(win) {
  /* Both bracket pairs are required: a frame reads `[0,0][1080,63]`, and stopping at the first `]` would hand
     back a zero-height bar, which is the vacuous reading this function exists to avoid. */
  const rel = String(win).match(/mStatusBar\s*=\s*\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]|mNavigationBar\s*=\s*\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]/g) || [];
  const one = s => { const d = dimsOf(s); return d[0]; };
  const topLine = rel.filter(s => /mStatusBar/.test(s))[0];
  const navLine = rel.filter(s => /mNavigationBar/.test(s))[0];
  const top = topLine ? one(topLine) : 0;
  const bottom = navLine ? one(navLine) : 0;
  return { top, bottom, source: rel.length ? 'dumpsys window (' + rel.length + ' line(s))' : null };
}
function barsFromTree(xml) {
  /* Parsed as nodes, not as one big pattern: an id-name alternation inside a concatenated regex silently
     splits the whole expression at the `|`, which is how the first version of this found no navigation bar. */
  const re = /<node\b([^>]*?)\/?>/g;
  let m, top = 0, bottom = 0, found = false;
  while ((m = re.exec(String(xml)))) {
    const attrs = {};
    const ar = /([\w-]+)="([^"]*)"/g;
    let k;
    while ((k = ar.exec(m[1]))) attrs[k[1]] = k[2];
    const id = attrs['resource-id'] || '';
    const b = String(attrs.bounds || '').match(/\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]/);
    if (!b) continue;
    const h = Math.abs(+b[4] - +b[2]);
    if (/status_bar/i.test(id)) { top = h; found = true; }
    else if (/navigation_bar|navigationbar/i.test(id)) { bottom = h; found = true; }
  }
  return { top, bottom, source: found ? 'uiautomator tree nodes' : null };
}

if (process.argv.indexOf('--selftest') > -1) {
  let fail = 0, cases = 0;
  const t = (label, ok, extra) => { cases++; const good = ok === extra; if (!good) fail++; console.log((good ? '  ok   ' : '  FAIL ') + label + '  (got ' + ok + ', want ' + extra + ')'); };
  /* A frame with bars where the padding took effect: content box smaller than the View by the bar height. */
  const insetCase = judge({ innerHeight: 800, dpr: 2, webViewH: 1700, barsTop: 72, barsBottom: 63, headerTop: 0, navBottomCss: 800, bottomNavBottom: 756 });
  t('padded WebView reports a shrunk viewport', insetCase.ok, true);
  /* The defect: the page owns the whole View while the platform says there are bars. */
  const underCase = judge({ innerHeight: 850, dpr: 2, webViewH: 1700, barsTop: 72, barsBottom: 63, headerTop: 0, navBottomCss: 850, bottomNavBottom: 849 });
  t('unpadded page under the bars is condemned', underCase.ok, false);
  t('…with the reason naming the px', underCase.reasons.length > 0, true);
  /* Gesture navigation: a zero BOTTOM is legitimate, so the page filling the *padded* area is not a defect.
     The first version of this fixture said innerHeight 850 at dpr 2 in a 1700px View with a 63px status bar —
     which is the defect, not the pass: 850×2 fills the View. A frame that really took the padding shows
     (1700−63)/2 = 818.5. The judge was right and the expectation was wrong; fixed here rather than loosened
     there. */
  const noBottomBar = judge({ innerHeight: 818.5, dpr: 2, webViewH: 1700, barsTop: 63, barsBottom: 0, headerTop: 0, navBottomCss: 818.5, bottomNavBottom: 812 });
  t('a gesture-nav frame (bottom 0) is not a defect', noBottomBar.ok, true);
  /* And the same frame with the padding NOT taken is still condemned, so the pass above is not a widened rule. */
  const underStatus = judge({ innerHeight: 850, dpr: 2, webViewH: 1700, barsTop: 63, barsBottom: 0, headerTop: 0, navBottomCss: 850, bottomNavBottom: 849 });
  t('filling the View while a status bar exists is still condemned', underStatus.ok, false);
  /* But a zero TOP is never a device — it is an id found and not laid out, as the real saved trees showed. */
  const zeroTop = judge({ innerHeight: 800, dpr: 2, webViewH: 1700, barsTop: 0, barsBottom: 0, barsSource: 'uiautomator tree nodes', headerTop: 0, navBottomCss: 800, bottomNavBottom: 780 });
  t('a zero status bar refuses as a blind reader', zeroTop.ok, false);
  t('…and names the source it came from', /uiautomator tree nodes/.test(zeroTop.reasons.join(' ')), true);
  /* The bottom row hanging below the reduced content box. */
  const offViewport = judge({ innerHeight: 800, dpr: 2, webViewH: 1700, barsTop: 72, barsBottom: 63, headerTop: 0, navBottomCss: 800, bottomNavBottom: 812 });
  t('a nav row below the content edge is condemned', offViewport.ok, false);
  /* Missing data must refuse, never pass by being blind. */
  t('a null measurement refuses', judge(null).ok, false);
  t('a missing dpr refuses', judge({ innerHeight: 800, webViewH: 1700, barsTop: 72 }).ok, false);
  /* The one that matters for honesty: bars unread must refuse rather than be read as "no bars needed". */
  const unread = judge({ innerHeight: 800, dpr: 2, webViewH: 1700, barsTop: 0, barsBottom: 0, barsUnread: true, navBottomCss: 800, bottomNavBottom: 780 });
  t('unread bar geometry refuses instead of forgiving the frame', unread.ok, false);
  t('…and says the instrument was blind, not the shell', /blind/.test(unread.reasons.join(' ')), true);
  /* Both bar readers, proven on text rather than on a phone. */
  const d1 = barsFromDumpsys('mStatusBar = [0,0][1080,63]\n  mNavigationBar = [0,1560][1080,1600]');
  t('dumpsys bars parsed (status 63, nav 40)', d1.top === 63 && d1.bottom === 40 && !!d1.source, true);
  const d0 = barsFromDumpsys('nothing here at all');
  t('a dumpsys miss reports no source rather than zeroes', d0.source, null);
  const t1 = barsFromTree('<node resource-id="com.android.systemui:id/status_bar" class="android.widget.TextView" bounds="[0,0][1080,63]" />' +
    '<node resource-id="com.android.systemui:id/navigation_bar_view" class="android.widget.FrameLayout" bounds="[0,1560][1080,1600]" />');
  t('the tree fallback finds both bars', t1.top === 63 && t1.bottom === 40, true);
  t('a tree with nothing named reports no source', barsFromTree('<node bounds="[0,0][1,1]" />').source, null);
  /* Real output, if any is on disk: a parser proven only against a string I wrote is proven against my own
     guess at the format. This case never passes or fails on its own — it reports what the real trees contain,
     because "the fallback found nothing in these particular dumps" is a fact to read, not a defect. */
  const savedTrees = fs.readdirSync(ROOT + '.scratch').filter(f => /\.xml$/.test(f)).slice(0, 6);
  let probed = 0, withAnyBarId = 0;
  for (const f of savedTrees) {
    try {
      const xml = fs.readFileSync(ROOT + '.scratch/' + f, 'utf8');
      if (!/<node\b/.test(xml)) continue;
      probed++;
      const r = barsFromTree(xml);
      if (r.source) withAnyBarId++;
      console.log('  real tree ' + f + ': ' + (r.source ? 'status=' + r.top + 'px nav=' + r.bottom + 'px' : 'no bar-named node (a picker tree, not system chrome)'));
    } catch (e) { /* an unreadable scratch file is not this test's subject */ }
  }
  console.log('  real trees probed: ' + probed + ' — reporting only, not a pass/fail');
  console.log('SELFTEST ' + (fail ? fail + ' FAILURES' : 'PASSED') + ': ' + cases + ' cases run, ' + fail + ' failing — ' + PKG + ' / ' + WANT_NAME + ' / code ' + WANT_CODE + '; the judge condemns a page painted under a bar, forgives a gesture-nav frame whose padding was taken, and refuses whenever the bar or page geometry was not actually read');
  process.exit(fail ? 1 : 0);
}

/* ---------- the device part ---------- */
const serialLine = adb('devices').split('\n').filter(l => /\tdevice$/.test(l) || l.trim().endsWith('\tdevice'))[0];
if (!serialLine) { console.log('NO DEVICE attached (adb devices shows nothing authorized). Nothing installed, nothing measured.'); process.exit(1); }
const SERIAL = serialLine.split('\t')[0];
console.log('device: ' + SERIAL);
const sdk = parseInt(String(adb('-s', SERIAL, 'shell', 'getprop', 'ro.build.version.sdk')).trim(), 10);
console.log('ro.build.version.sdk = ' + (isNaN(sdk) ? 'unreadable' : sdk));
if (isNaN(sdk)) { console.log('NO CONCLUSION — the API level could not be read, so the frame is not even classifiable.'); process.exit(1); }
if (sdk < 35) {
  console.log('WRONG TARGET — edge-to-edge is only FORCED at API 35+ (this is ' + sdk + '). On this frame the shell falls back to' +
    ' the deprecated getSystemWindowInset* path, so a clean reading here would not answer the open question. Refusing before installing.');
  process.exit(1);
}
const winDump = adb('-s', SERIAL, 'shell', 'dumpsys', 'window');
let bars = barsFromDumpsys(winDump);
if (!bars.source) bars = { top: 0, bottom: 0, source: null };
console.log('platform bars from dumpsys: ' + (bars.source ? 'status=' + bars.top + 'px nav=' + bars.bottom + 'px (' + bars.source + ')' : 'NOT READ — will try the platform tree before concluding anything'));
if (!fs.existsSync(APK)) { console.log('NO APK at ' + APK); process.exit(1); }
console.log('install: ' + adb('-s', SERIAL, 'install', '-r', '-t', APK).trim().split('\n').pop());
const read = adb('-s', SERIAL, 'shell', 'dumpsys', 'package', PKG);
if (!/versionName[=:]\s*'?'?/.test(read) || read.indexOf(WANT_NAME) === -1 || !new RegExp('versionCode[=:]\\s*' + WANT_CODE).test(read)) {
  console.log('INSTALL NOT PROVEN — the package does not read ' + WANT_NAME + ' / code ' + WANT_CODE + '. Nothing measured.');
  process.exit(1);
}
console.log('installed build proved: ' + WANT_NAME + ' / versionCode ' + WANT_CODE);
adb('-s', SERIAL, 'shell', 'am', 'force-stop', PKG); sleep(1000);
adb('-s', SERIAL, 'shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1'); sleep(6500);

/* The WebView node's box, from the platform's own tree. */
adb('-s', SERIAL, 'shell', 'uiautomator', 'dump', '/sdcard/window_dump.xml');
const dump = adb('-s', SERIAL, 'exec-out', 'cat', '/sdcard/window_dump.xml');
const wm = String(dump).match(/class="android\.webkit\.WebView"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/) ||
  String(dump).match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*class="android\.webkit\.WebView"/);
const webViewH = wm ? (+wm[4] - +wm[2]) : 0;
console.log('webview node: ' + (wm ? '[' + wm.slice(1, 5).join(',') + '] height ' + webViewH + 'px' : 'NOT FOUND in the dump'));

/* The second bar source, only consulted when the first one missed — and neither matching is a refusal below,
   never a zero. */
if (!bars.source) {
  const fromTree = barsFromTree(dump);
  if (fromTree.source) { bars = fromTree; console.log('platform bars recovered from the tree: status=' + bars.top + 'px nav=' + bars.bottom + 'px'); }
}
const barsUnread = !bars.source;
const barsTop = bars.top, barsBottom = bars.bottom;

const page = askJson('page geometry', '(function(){var nb=document.querySelector(".bottomnav");' +
  'var hb=document.querySelector(".topbar,#app h1");var q=nb?nb.getBoundingClientRect():null;' +
  'var h=hb?hb.getBoundingClientRect():null;' +
  'return JSON.stringify({view:state.view,innerHeight:innerHeight,dpr:devicePixelRatio,' +
  'vh:visualViewport?Math.round(visualViewport.height*10)/10:null,' +
  'bottomNavBottom:q?Math.round(q.bottom*10)/10:null,navBottomCss:innerHeight,' +
  'headerTop:h?Math.round(h.top*10)/10:null});})()');

const findings = [];
if (!wm) findings.push('the WebView node was not in the platform tree, so its box was never measured');
if (!page) findings.push('the page never answered with geometry, so nothing about the padding was observed');
let v = null;
if (page && webViewH) {
  v = judge(Object.assign({ webViewH: webViewH, barsTop: barsTop, barsBottom: barsBottom, barsUnread: barsUnread, barsSource: bars.source || 'none' }, page));
  console.log('measurement: view=' + page.view + ' innerHeight=' + page.innerHeight + ' dpr=' + page.dpr +
    ' → content ' + v.contentPx + 'px inside a ' + webViewH + 'px View, padding took ' + Math.round(v.slack * 10) / 10 + 'px, bars total ' + v.bars + 'px');
  if (!v.ok) v.reasons.forEach(r => findings.push(r));
  else console.log('verdict: the shell inset the WebView — the page\'s content box is ' + Math.round(v.slack) + 'px shorter than the View, and the platform reports ' + v.bars + 'px of bars');
} else {
  findings.push('NO CONCLUSION: judge() was never given a full measurement, so no verdict about edge-to-edge is available');
}
console.log('findings: ' + findings.length);
findings.forEach(f => console.log('  ' + (/NO CONCLUSION/.test(f) ? 'REFUSE ' : 'FINDING ') + f));
adb('-s', SERIAL, 'shell', 'rm', '/sdcard/window_dump.xml');
console.log('cleanup: dump removed, forwards cleared: ' + (String(adb('forward', '--remove-all')).trim() || 'ok'));
process.exit(findings.length ? 1 : 0);

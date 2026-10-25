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

if (process.argv.indexOf('--selftest') > -1) {
  let fail = 0;
  const t = (label, got, want) => {
    const ok = got === want;
    if (!ok) fail++;
    console.log((ok ? '  ok   ' : '  FAIL ') + label + '  (got ' + got + ', want ' + want + ')');
  };
  /* A frame with bars where the padding took effect: content box smaller than the View by the bar height. */
  const insetCase = judge({ innerHeight: 800, dpr: 2, webViewH: 1700, barsTop: 72, barsBottom: 63, headerTop: 0, navBottomCss: 800, bottomNavBottom: 756 });
  t('padded WebView reports a shrunk viewport', insetCase.ok, true);
  /* The defect: the page owns the whole View while the platform says there are bars. */
  const underCase = judge({ innerHeight: 850, dpr: 2, webViewH: 1700, barsTop: 72, barsBottom: 63, headerTop: 0, navBottomCss: 850, bottomNavBottom: 849 });
  t('unpadded page under the bars is condemned', underCase.ok, false);
  t('…with the reason naming the px', underCase.reasons.length > 0, true);
  /* No bars at all (a frame in gesture-free mode) must not be accused of missing insets. */
  const noBars = judge({ innerHeight: 850, dpr: 2, webViewH: 1700, barsTop: 0, barsBottom: 0, headerTop: 0, navBottomCss: 850, bottomNavBottom: 840 });
  t('a barless frame is not a defect', noBars.ok, true);
  /* The bottom row hanging below the reduced content box. */
  const offViewport = judge({ innerHeight: 800, dpr: 2, webViewH: 1700, barsTop: 72, barsBottom: 63, headerTop: 0, navBottomCss: 800, bottomNavBottom: 812 });
  t('a nav row below the content edge is condemned', offViewport.ok, false);
  /* Missing data must refuse, never pass by being blind. */
  t('a null measurement refuses', judge(null).ok, false);
  t('a missing dpr refuses', judge({ innerHeight: 800, webViewH: 1700, barsTop: 72 }).ok, false);
  console.log('SELFTEST ' + (fail ? fail + ' FAILURES' : 'PASSED: ' + PKG + ' / ' + WANT_NAME + ' / code ' + WANT_CODE + '; the judge condemns a page painted under the bars, forgives a barless frame, and refuses when it has no numbers'));
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
const rel = String(adb('-s', SERIAL, 'shell', 'dumpsys', 'window')).match(/mStatusBar\s*=\s*\[[^\]]*\]|mNavigationBar\s*=\s*\[[^\]]*\]/g) || [];
const dims = s => { const m = String(s).match(/(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)/); return m ? Math.abs(+m[4] - +m[2]) : 0; };
const barsTop = rel.length ? dims(rel[0]) : 0;
const barsBottom = rel.length > 1 ? dims(rel[1]) : 0;
console.log('platform bars: status=' + barsTop + 'px nav=' + barsBottom + 'px  (from dumpsys window ' + rel.length + ' line(s))');
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
  v = judge(Object.assign({ webViewH: webViewH, barsTop: barsTop, barsBottom: barsBottom }, page));
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

/* The edge-to-edge leg, armed and walked on an API 35+ frame.

   Why this leg existed: `targetSdk 36` forces edge-to-edge only at **API 35+**, and every handset ever attached
   here is below it (OPPO CPH2179 = API 29, vivo 1906 = API 30), where the shell takes the deprecated
   `getSystemWindowInset*` fallback instead. So a clean reading on those phones would not have answered the
   question — it would have measured a path the shipped build no longer uses. The android-36 frame is the first
   target on this machine that can pose it.

   The mechanism under test is in the shell, not the page: `MainActivity.applySystemBarInsets()` puts
   `systemBars() | displayCutout() | ime()` as **padding on the WebView itself**. That has a signature the page
   can report: if the padding took, the CSS content box is shorter than the View's own drawing surface. So the
   leg reads three things from three places — the screen size from `wm size`, the WebView surface from the CDP
   target's own description, and the content box from the page — and asks the platform, separately, whether it
   has system bars at all. A View spanning the whole screen with the page filling it, on a device that reports a
   status bar, is a page painted under that bar.

   What probing the frame taught before any of this worked, and why the readers look the way they do:
     · `uiautomator dump` answers `ERROR: null root node returned by UiTestAutomationBridge` on the emulator even
       with our own activity foreground, so there is no WebView NODE box to read. (The same bridge refused the
       owner-only pause dialog on the OPPO — both are reader limits, for different reasons, and neither is a
       statement about the app.)
     · API 36's `dumpsys window` prints bar references as `mStatusBar=Window{… StatusBar}` and names the bottom
       one `Taskbar`, with `mHasBottomNavigationBar=true`; it does NOT print the `mStatusBar = [0,0][w,h]`
       rectangles a naive parser expects, so that parse silently yields "no bars" — the false clean this file
       exists to refuse. Presence is therefore what is asserted, not rectangles.

     node tools/device-edge-leg.cjs                # install, prove, measure, verdict
     node tools/device-edge-leg.cjs --selftest     # 16 offline cases; no device, no network
     node tools/device-edge-leg.cjs --serial=NAME  # pick a target explicitly

   Named `device-*` so `tools/probe-all.cjs` does not discover it by filename and move the instrument totals.
   Refuses before installing on any frame below API 35: the question does not exist there.
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
/* Gradle calls the key `outputFile`; asking for `outputFileName` yields undefined and a path ending
   `/undefined`, which is caught by the existence check rather than silently installed. */
const APK = ROOT + 'Sukinnect-Android/app/build/outputs/apk/debug/' + META.elements[0].outputFile;

function adb() {
  const args = Array.prototype.slice.call(arguments);
  try { return execFileSync(ADB, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).replace(/\r/g, ''); }
  catch (e) { return 'ADB ERROR: ' + String((e.stdout || '') + (e.stderr || '')).replace(/\r/g, ''); }
}
function sleep(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }

/* ---------- platform readers, each proven offline by --selftest ---------- */
function screenHeightPx(wmSizeLine) {
  const m = String(wmSizeLine).match(/(\d+)x(\d+)/);
  return m ? +m[2] : 0;
}
function barsPresent(win) {
  const s = String(win);
  const top = /mStatusBar=Window\{|StatusBar\}/.test(s);
  const bottom = /mHasBottomNavigationBar=true|mNavigationBar=Window\{[^}]*?(NavigationBar|Taskbar)\}/.test(s);
  return { top, bottom, read: top || bottom, source: 'dumpsys window window references' };
}
function viewHeightPxFromTarget(desc) {
  const m = String(desc).match(/"height":(\d+)/);
  return m ? +m[1] : 0;
}

/* ---------- the pure judge ---------- */
function judge(m) {
  if (!m) return { ok: false, reasons: ['no measurement'] };
  if (!m.bars || !m.bars.read) return { ok: false, reasons: ['the platform never said whether it has system bars at all, so "no insets" would be the instrument being blind, not the shell being right'] };
  if (!m.bars.top) return { ok: false, reasons: ['no status bar was reported (' + m.bars.source + ') — every Android frame in scope has one, so this is a reader limit rather than a barless device'] };
  const cssH = m.innerHeight, dpr = m.dpr;
  if (!cssH || !dpr || !m.viewH) return { ok: false, reasons: ['a needed figure was missing (innerHeight/dpr/viewH)'] };
  if (m.screenH && m.viewH < m.screenH - 2) {
    const inset = m.screenH - m.viewH;
    if (m.sdk >= 35) {
      /* Edge-to-edge is FORCED at API 35+, so the framework does not shorten the window itself: an inset surface
         can only have come from the shell padding its container. That is the pass condition, and until 2026-10-25
         this branch reported it as UNTESTABLE — the sensor read a working fix as a frame that could not answer,
         which is the same class as a fix that suppresses the evidence that found the bug. */
      return { ok: true, reasons: [], slack: inset, contentPx: Math.round(cssH * dpr), insetByShell: true,
        note: 'the WebView surface is ' + inset + 'px shorter than the ' + m.screenH + 'px screen on a framework that'
          + ' forces edge-to-edge at API ' + m.sdk + ' — that inset is the shell padding, and the page fills the'
          + ' padded box with ' + Math.round(cssH * dpr) + 'px of content' };
    }
    return { ok: true, refusal: true, reasons: [], slack: inset, contentPx: Math.round(cssH * dpr),
      note: 'the window is already inset by the framework (' + m.viewH + ' of ' + m.screenH + 'px), so this frame'
        + ' cannot test the shell padding question' };
  }
  const contentPx = cssH * dpr;
  const slack = m.viewH - contentPx;
  const reasons = [];
  /* A status bar is at least ~1 device px of the difference; anything under one whole pixel of slack is the page
     filling a View that spans the screen. Deliberately conservative: the verdict should be a finding only when
     the arithmetic is unmistakable, and the numbers are printed either way. */
  if (slack < 1) {
    reasons.push('the WebView spans the screen (' + m.viewH + 'px of ' + m.screenH + 'px) and the page fills it (' +
      contentPx.toFixed(0) + 'px content, slack ' + slack.toFixed(1) + 'px) while the platform reports ' +
      (m.bars.bottom ? 'a status bar AND a navigation bar' : 'a status bar') + ' — the page is painted under a system bar');
  }
  if (m.navBottomCss != null && m.bottomNavBottom != null && m.bottomNavBottom > m.navBottomCss + 1) {
    reasons.push('the bottom navigation row ends at ' + m.bottomNavBottom + ' CSS px, below the content edge ' + m.navBottomCss + ' — a thumb target off the reduced viewport');
  }
  return { ok: reasons.length === 0, reasons, slack, contentPx: Math.round(contentPx) };
}

if (process.argv.indexOf('--selftest') > -1) {
  let fail = 0, cases = 0;
  const t = (label, got, want) => { cases++; const good = got === want; if (!good) fail++; console.log((good ? '  ok   ' : '  FAIL ') + label + '  (got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want) + ')'); };
  const BARS = { top: true, bottom: true, read: true, source: 'test' };
  t('a padded WebView shows a shrunk content box', judge({ viewH: 2340, screenH: 2340, innerHeight: 1105, dpr: 2, bars: BARS, navBottomCss: 1105, bottomNavBottom: 1100 }).ok, true);
  const under = judge({ viewH: 2340, screenH: 2340, innerHeight: 1170, dpr: 2, bars: BARS, navBottomCss: 1170, bottomNavBottom: 1169 });
  t('filling the View while bars exist is condemned', under.ok, false);
  t('…and the reason carries the pixel arithmetic', /2340px/.test(under.reasons.join(' ')), true);
  /* The branch that used to call a working fix UNTESTABLE: at API 35+ an inset surface IS the shell padding, and
     below it the refusal is still the honest answer. */
  const shellInset = judge({ sdk: 36, viewH: 2138, screenH: 2340, innerHeight: 778, dpr: 2.75, bars: BARS, navBottomCss: 778, bottomNavBottom: 774 });
  t('an inset surface at API 36 is the shell padding, not an untestable frame', shellInset.ok && !shellInset.refusal && shellInset.insetByShell === true, true);
  t('…and its note names the 202px it measured', /202px shorter/.test(shellInset.note), true);
  const oldRefusal = judge({ sdk: 30, viewH: 2138, screenH: 2340, innerHeight: 778, dpr: 2.75, bars: BARS, navBottomCss: 778, bottomNavBottom: 774 });
  t('below API 35 the same surface is still a refusal, not a pass', oldRefusal.refusal === true, true);
  const noSdk = judge({ viewH: 2138, screenH: 2340, innerHeight: 778, dpr: 2.75, bars: BARS, navBottomCss: 778, bottomNavBottom: 774 });
  t('an unread sdk reads as the refusal, never as the pass', noSdk.refusal === true, true);
  t('a gesture-nav frame with a padded top still passes', judge({ viewH: 2340, screenH: 2340, innerHeight: 1138, dpr: 2, bars: { top: true, bottom: false, read: true, source: 'test' }, navBottomCss: 1138, bottomNavBottom: 1132 }).ok, true);
  t('bars never reported refuses rather than passing', judge({ viewH: 2340, screenH: 2340, innerHeight: 1170, dpr: 2, bars: { read: false } }).ok, false);
  t('a frame reporting no status bar refuses as a reader limit', judge({ viewH: 2340, screenH: 2340, innerHeight: 1170, dpr: 2, bars: { top: false, bottom: true, read: true } }).ok, false);
  const inset = judge({ viewH: 2277, screenH: 2340, innerHeight: 1138, dpr: 2, bars: BARS, navBottomCss: 1138, bottomNavBottom: 1130 });
  t('a framework-inset window is declared untestable, not clean', inset.refusal === true && inset.ok === true, true);
  t('a nav row below the content edge is condemned', judge({ viewH: 2340, screenH: 2340, innerHeight: 1105, dpr: 2, bars: BARS, navBottomCss: 1105, bottomNavBottom: 1118 }).ok, false);
  t('a null measurement refuses', judge(null).ok, false);
  t('a missing dpr refuses', judge({ viewH: 2340, screenH: 2340, innerHeight: 1105, bars: BARS }).ok, false);
  t('wm size parsed', screenHeightPx('Physical size: 1080x2340'), 2340);
  t('an unparseable wm line gives 0 rather than guessing', screenHeightPx('no size here'), 0);
  const bp = barsPresent('    mStatusBar=Window\{740e070 u0 StatusBar\}\n    mNavigationBar=Window\{6e7662c u0 Taskbar\}\n    mHasBottomNavigationBar=true\n'.replace(/\\/g, ''));
  t('API 36 window references report both bars', bp.top === true && bp.bottom === true && bp.read === true, true);
  const bpNone = barsPresent('nothing resembling a bar here');
  t('an unparsable dumpsys reports read=false, not zero bars', bpNone.read === false && bpNone.top === false, true);
  t('CDP target description parsed for the surface height', viewHeightPxFromTarget('{"attached":true,"height":2340,"width":1080}'), 2340);
  t('a target with no height yields 0', viewHeightPxFromTarget('{"description":"x"}'), 0);
  console.log('SELFTEST ' + (fail ? fail + ' FAILURES' : 'PASSED') + ': ' + cases + ' cases run, ' + fail + ' failing — ' + PKG + ' / ' + WANT_NAME + ' / code ' + WANT_CODE);
  process.exit(fail ? 1 : 0);
}

/* ---------- the device part ---------- */
(async function runDeviceSection() {

function pickSerial() {
  const force = process.argv.find(a => a.startsWith('--serial='));
  if (force) return force.slice(9);
  const line = adb('devices').split('\n').map(l => l.trim()).filter(l => /\tdevice$/.test(l))[0];
  return line ? line.split('\t')[0] : null;
}
const SERIAL = pickSerial();
if (!SERIAL) { console.log('NO DEVICE attached (adb devices shows nothing authorized). Nothing installed, nothing measured.'); process.exit(1); }
console.log('device: ' + SERIAL);

const sdk = parseInt(String(adb('-s', SERIAL, 'shell', 'getprop', 'ro.build.version.sdk')).trim(), 10);
console.log('ro.build.version.sdk = ' + (isNaN(sdk) ? 'unreadable' : sdk));
if (isNaN(sdk)) { console.log('NO CONCLUSION — the API level could not be read, so the frame is not even classifiable.'); process.exit(1); }
if (sdk < 35) {
  console.log('WRONG TARGET — edge-to-edge is only FORCED at API 35+ (this is ' + sdk + '), where the shell uses the deprecated' +
    ' getSystemWindowInset* fallback instead. A clean reading here would not answer the open question, so nothing is installed.');
  process.exit(1);
}

const screenH = screenHeightPx(adb('-s', SERIAL, 'shell', 'wm', 'size'));
const bars = barsPresent(adb('-s', SERIAL, 'shell', 'dumpsys', 'window'));
console.log('screen: ' + screenH + 'px tall; bars reported present: status=' + bars.top + ' nav=' + bars.bottom + ' (' + (bars.read ? bars.source : 'NOT READ') + ')');
if (!fs.existsSync(APK)) { console.log('NO APK at ' + APK); process.exit(1); }
console.log('install: ' + adb('-s', SERIAL, 'install', '-r', '-t', APK).trim().split('\n').pop());
const pkgDump = adb('-s', SERIAL, 'shell', 'dumpsys', 'package', PKG);
if (pkgDump.indexOf(WANT_NAME) === -1 || !new RegExp('versionCode[=:]\\s*' + WANT_CODE).test(pkgDump)) {
  console.log('INSTALL NOT PROVEN — the package does not read ' + WANT_NAME + ' / code ' + WANT_CODE + '. Nothing measured.');
  process.exit(1);
}
console.log('installed build proved from the package: ' + WANT_NAME + ' / versionCode ' + WANT_CODE);

/* The frame needs longer than a fixed nap: the first run asked the inspector while the process was still
   coming up and every port answered "no HTTP body". So poll for a live WebView socket before probing. */
adb('-s', SERIAL, 'shell', 'am', 'force-stop', PKG); sleep(1200);
adb('-s', SERIAL, 'shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1');
let socket = '';
for (let i = 0; i < 12; i++) {
  sleep(3000);
  const unix = String(adb('-s', SERIAL, 'shell', 'cat', '/proc/net/unix'));
  const hit = unix.match(/webview_devtools_remote_(\d+)/);
  if (hit) { socket = hit[1]; break; }
}
if (!socket) { console.log('NO CONCLUSION — no webview_devtools_remote socket appeared, so the page was never going to answer.'); process.exit(1); }
/* Then let the frame settle before the first ask. On 2026-10-25 the same socket answered every reading when the
   app was cold-started and left alone for a minute, and answered nothing when the retry loop relaunched it each
   time — the timeouts were the instrument arriving early, not the renderer being dead. */
sleep(60000);
console.log('devtools socket: webview_devtools_remote_' + socket);

function probe(args) {
  try {
    return execFileSync(process.execPath, [ROOT + 'tools/device-probe.cjs'].concat(args),
      { encoding: 'utf8', cwd: ROOT, env: Object.assign({}, process.env, { ADB }) }).replace(/\r/g, '');
  } catch (e) { return 'PROBE ERROR: ' + String((e.stdout || '') + (e.stderr || '')).split('\n').slice(-1)[0].trim(); }
}
const lastLine = out => String(out).trim().split('\n').filter(Boolean).pop() || '(no answer)';
function ask(expr) { return lastLine(probe([expr])); }
/* Retry the first read: the renderer needs a moment after the socket appears, and a single timeout is the
   instrument being early, not the app being broken. */
/* Read the page over CDP directly: ONE attach, to the NEWEST page target, with no relaunch.
   The leg used to ask through tools/device-probe.cjs, which launches the activity on every call. On the API 36
   frame each relaunch landed on an ANR dialog — systemui’s once, the launcher’s next — and every
   `Runtime.evaluate` timed out, which is what §120 first mistook for a frame that could not answer. Left alone,
   the same socket answers every reading. The surface height comes from the same target list, so the two numbers
   the verdict compares are read from one place at one moment rather than from two instruments that can disagree.
   The `curl` lesson still applies: this is Node’s own fetch over a forward this function makes (§110). */
const GEOMETRY = '(function(){var nb=document.querySelector(".bottomnav");var q=nb?nb.getBoundingClientRect():null;'
  + 'return JSON.stringify({view:state.view,innerHeight:innerHeight,dpr:devicePixelRatio,'
  + 'bottomNavBottom:q?Math.round(q.bottom*10)/10:null,navBottomCss:innerHeight});})()';
function cdpEvaluate(wsUrl, expression, timeoutMs) {
  return new Promise((resolve) => {
    let ws; try { ws = new WebSocket(wsUrl); } catch (e) { return resolve('ERR ' + e.message); }
    const timer = setTimeout(() => { try { ws.close(); } catch (_) {} resolve('ERR timeout'); }, timeoutMs);
    ws.onopen = () => ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate',
      params: { expression: expression, returnByValue: true } }));
    ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id !== 1) return;
      clearTimeout(timer); try { ws.close(); } catch (_) {}
      resolve(m.result && m.result.result ? String(m.result.result.value)
        : 'ERR ' + JSON.stringify(m.error || m.result).slice(0, 80)); };
    ws.onerror = () => { clearTimeout(timer); resolve('ERR socket'); };
  });
}
adb('-s', SERIAL, 'forward', 'tcp:9333', 'localabstract:webview_devtools_remote_' + socket);
let page = null, viewH = 0, targetCount = 0;
for (let i = 0; i < 4 && !page; i++) {
  let list = [];
  try { list = JSON.parse(await (await fetch('http://127.0.0.1:9333/json', { signal: AbortSignal.timeout(15000) })).text()); }
  catch (e) { console.log('  cdp /json unread on attempt ' + (i + 1) + '/4: ' + String(e.message || e).slice(0, 70)); }
  targetCount = (list || []).length;
  const pages = (list || []).filter(t => t.type === 'page');
  const target = pages[pages.length - 1] || null;
  if (target) viewH = viewHeightPxFromTarget((target.description || '') + ' ' + JSON.stringify(target));
  if (!target) { console.log('  no page target on attempt ' + (i + 1) + '/4'); sleep(6000); continue; }
  const raw = await cdpEvaluate(target.webSocketDebuggerUrl, GEOMETRY, 45000);
  try { page = JSON.parse(raw); }
  catch (e) { console.log('  page read ' + (i + 1) + '/4 not parseable yet: ' + String(raw).slice(0, 90)); sleep(6000); }
}
console.log('cdp /json: ' + targetCount + ' target(s), read the newest page target: ' + !!page);
console.log('webview surface: ' + (viewH ? viewH + 'px tall (from the CDP target description)' : 'NOT READ'));

const findings = [];
if (!viewH) findings.push('the WebView surface height was never read, so the padding question is unmeasured');
if (!page) findings.push('the page never answered with geometry, so nothing about the padding was observed');
let v = null;
if (viewH && page) {
  v = judge({ sdk: +sdk || 0, viewH: viewH, screenH: screenH, bars: bars, innerHeight: page.innerHeight, dpr: page.dpr,
    navBottomCss: page.navBottomCss, bottomNavBottom: page.bottomNavBottom });
  console.log('measurement: view=' + page.view + ' innerHeight=' + page.innerHeight + ' dpr=' + page.dpr +
    ' → content ' + v.contentPx + 'px inside a ' + viewH + 'px surface, slack ' + (v.slack === undefined ? '?' : Math.round(v.slack * 10) / 10) + 'px');
  if (v.refusal) console.log('  UNTESTABLE: ' + v.note);
  else if (v.ok) console.log('  verdict: the shell inset the page from the bars — the page\'s content box is ' + Math.round(v.slack) + 'px shorter than a surface spanning the ' + screenH + 'px screen, and the platform reports system bars');
  else v.reasons.forEach(r => findings.push(r));
}
console.log('findings: ' + findings.length);
findings.forEach(f => console.log('  FINDING ' + f));
adb('-s', SERIAL, 'shell', 'rm', '/sdcard/window_dump.xml', '/sdcard/wd.xml', '/sdcard/wd2.xml');
console.log('cleanup: stray dumps removed, forwards cleared: ' + (String(adb('forward', '--remove-all')).trim() || 'ok'));
process.exit(findings.length ? 1 : 0);

})().catch(e => { console.log("BROKEN — the device section threw: " + String(e && e.message || e).slice(0,160)); process.exit(1); });

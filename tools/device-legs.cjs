/* Handset walk 9 — the two measurements DEVICE-PASS owes on 1.2-preview.39, and nothing else.
     1. install `.39`, proved by reading the package back rather than by the file name,
     2. read the admin PIN field's RENDERED size and box height, because §98 sized it in `rem` and
        §68 multiplies used sizes after CSS resolves — a bench cannot see that multiplication,
     3. read the filter option rows' RENDERED heights against the 44px floor §99 set,
     4. leave the app signed out through its own controls and read the platform back as it was found.

   The two screens are entered exactly as tools/shot.cjs enters them (`admin-lock-modal` and
   `resident-filter-sheet` in the SCREENS table), and then the painted control is opened with a REAL
   input event rather than a click(): the row under measurement has to be the row a thumb raises.
   --tap takes page CSS px, so every coordinate here is read off the page's own rect first.

   Run:  node tools/device-legs.cjs
   Refuses with NO DEVICE when adb sees no handset. Changes no accessibility or font_scale setting. */
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const ADB = process.env.ADB || 'C:/Users/ADMIN/AppData/Local/Android/Sdk/platform-tools/adb.exe';
const ROOT = require('path').join(__dirname, '..') + require('path').sep;
const APK = ROOT + 'Sukinnect-Android/app/build/outputs/apk/debug/Sukinnect-1.2-preview.39-debug.apk';
/* Never type the package or the version: read them from the build's own metadata, so the walk asks
   about whatever was actually produced. This driver originally hard-coded `com.sukinnect.proto` and the
   real applicationId is `com.sukinnect.app` — a wrong constant would only have shown up as a refusal. */
const META = JSON.parse(fs.readFileSync(ROOT + 'Sukinnect-Android/app/build/outputs/apk/debug/output-metadata.json', 'utf8'));
const PKG = META.applicationId;
const WANT_CODE = String(META.elements[0].versionCode);
const WANT_NAME = META.elements[0].versionName;

function adb() {
  try { return execFileSync(ADB, Array.prototype.slice.call(arguments), { encoding: 'utf8' }).replace(/\r/g, ''); }
  catch (e) { return 'ADB ERROR: ' + String((e.stdout || '') + (e.stderr || '')).replace(/\r/g, ''); }
}
function sleep(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }
function probe(args) {
  try {
    return execFileSync(process.execPath, [ROOT + 'tools/device-probe.cjs'].concat(args),
      { encoding: 'utf8', cwd: ROOT, env: Object.assign({}, process.env, { ADB }) }).replace(/\r/g, '');
  } catch (e) { return 'PROBE ERROR: ' + String((e.stdout || '') + (e.stderr || '')).split('\n').slice(-2).join(' ').trim(); }
}
function lastLine(out) { const l = String(out).trim().split('\n'); return (l[l.length - 1] || '(no answer)').trim(); }
function ask(expr) { return lastLine(probe([expr])); }
function say(label, expr) { const out = ask(expr); console.log(label + ': ' + out); return out; }
/* A leg has to know whether it measured anything. Executed for the first time against a real (emulated)
   Android 16 frame, the walk printed `findings: 0` while EVERY reading had failed: the app never came to the
   foreground, `pidof` answered nothing, device-probe reported "the WebView is not exposing an inspector", and
   the fragment-readings that followed (`PIN field: }`, `results: SyntaxError`) were parsed by nobody. So:
   `requireJson` counts readings that actually returned an object, `say` never trusts a line it cannot parse,
   and the final verdict is computed from the count of real measurements, not from the absence of leftovers. */
const readings = { ok: [], bad: [] };
function requireJson(label, expr) {
  const raw = ask(expr);
  let o = null;
  try { o = JSON.parse(raw); } catch (e) { /* not an answer */ }
  if (o && typeof o === 'object') { readings.ok.push(label); console.log(label + ': ' + raw); return o; }
  readings.bad.push(label);
  console.log(label + ': NOT MEASURED — the page did not answer with an object. Raw: ' + String(raw).slice(0, 110));
  return null;
}
/* Reaching a screen on a cold-booted app is not a single assignment. The AVD run showed why: the splash
   hands over to `login` on a timer that fires *after* `state.view='app'; render()` runs, so the assignment
   is silently overwritten and every reading that follows happens on the wrong page — which is how the walk
   came to print a PIN-field measurement it had never taken. So: wait for the app to settle, assign, and
   verify the `<h1>` the assignment is supposed to produce, retrying up to four times. Same rule the
   camera's SCREENS table encodes by calling the app's own entry points. */
function waitSettled() {
  for (let i = 0; i < 12; i++) {
    const o = (() => { try { return JSON.parse(ask('JSON.stringify({view:state.view})')); } catch (e) { return null; } })();
    if (o && o.view === 'login') { console.log('  the app settled at view=login after ' + (i + 1) + ' poll(s)'); return true; }
    sleep(2500);
  }
  return false;
}
let probes = 0;
function gotoScreen(label, setup, expectRe) {
  for (let i = 0; i < 4; i++) {
    /* device-probe wraps its argument as `(${expr})`, so a list of statements becomes a SyntaxError inside a
       parenthesis. That is what made every navigation here fail silently on the handset — the assignment ran
       nowhere, the walk stayed on `login`, and the readers then honestly reported "NO PIN FIELD PAINTED".
       Statements need an IIFE. */
    ask('(function(){' + 'state.sheet=null; state.adminAccountModal=null;' + setup + ' return 1; })()');
    sleep(1200);
    probes++;
    const rawNav = ask('JSON.stringify({view:state.view,tab:state.tab,sheet:state.sheet,' +
      'h1:(document.querySelector("#screen h1")||{}).textContent||""})');
    let o = null; try { o = JSON.parse(rawNav); } catch (e) { o = null; }
    if (!o) console.log(label + ' reached?: NOT ANSWERED — ' + String(rawNav).slice(0, 90));
    if (o && expectRe.test(o.h1)) { console.log(label + ': on screen — h1="' + o.h1 + '"'); return o; }
    console.log('  retry ' + (i + 1) + ': h1="' + (o ? o.h1 : '(no answer)') + '" view=' + (o ? o.view : '?'));
    if (i === 0) waitSettled();
    /* A budget handset accumulates DevTools targets the way the OPPO did: every reload inside one WebView
       leaves its target behind, and a resumed process will not service them — the vivo run of this walk spent
       its whole second half reading `}` because three targets had piled up and every evaluate timed out. The
       repair measured on the OPPO was a cold restart, and the frame answering `targets: 1` again is the proof
       it worked. Waiting longer does not fix it, so on the third attempt the app is restarted rather than
       polled. */
    if (i === 2) {
      console.log('  cold restart: the frame has not answered twice — force-stop, and the target count must fall back to 1');
      adb('shell', 'am', 'force-stop', PKG); sleep(1200);
      adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1'); sleep(6500);
      waitSettled();
    }
    sleep(1500);
  }
  readings.bad.push(label + ' (never reached)');
  return null;
}
function liveness() {
  for (let i = 0; i < 10; i++) {
    const pid = adb('shell', 'pidof', PKG).trim();
    if (pid) {
      const o = requireJson('live page', 'JSON.stringify({view:state.view,h1:(document.querySelector("h1,h2")||{}).textContent||""})');
      if (o && /login|app/.test(String(o.view))) return o;
    }
    console.log('  waiting for the app to own a painted page (try ' + (i + 1) + ', pidof="' + pid + '")');
    sleep(4000);
  }
  console.log('NO PAGE — the installed app never gave the probe a live WebView to answer from.');
  console.log('foreground window: ' + adb('shell', 'dumpsys', 'window').split('\n').filter(l => /mCurrentFocus|mFocusedApp/.test(l)).map(s => s.trim()).join(' | '));
  console.log('readings taken: ' + readings.ok.length + ', failed: ' + readings.bad.length + ' [' + readings.bad.join(',') + ']');
  console.log('findings: 1 — the leg could not be measured, which is NOT the same as measuring nothing wrong');
  return null;
}
/* The install proof, as pure functions, so it can be tested without a handset. dumpsys has printed the
   same two facts in two shapes across releases, and a proof that matches only one of them refuses a
   good install — the walk would then be reporting on its own instrument, not on a phone. */
function buildLines(txt) {
  return txt.split('\n').filter(l => /versionName|versionCode/i.test(l)).map(s => s.trim()).join(' | ');
}
function readBuild(txt) {
  return {
    name: (txt.match(/versionName[:=]\s*([^\s|]+)/) || [])[1] || '(none)',
    code: (txt.match(/versionCode[:=]\s*(\d+)/i) || [])[1] || '(none)'
  };
}
function installProven(txt, wantName, wantCode) {
  const got = readBuild(txt);
  return got.name === wantName && got.code === String(wantCode);
}
if (process.argv.indexOf('--selftest') > -1) {
  const cases = [
    ['colon form', 'VersionCode: 41 minSdk=24\n    versionName: 1.2-preview.39', true],
    ['equals form', '    versionCode=41 targetSdk=36\n    versionName=1.2-preview.39', true],
    ['stale code', '    versionCode=40\n    versionName=1.2-preview.39', false],
    ['stale name', '    versionCode=41\n    versionName=1.2-preview.38', false],
    ['not installed', 'Not installed', false]
  ];
  let bad = 0;
  for (const c of cases) {
    const got = installProven(c[1], WANT_NAME, WANT_CODE);
    if (got !== c[2]) bad++;
    console.log((got === c[2] ? 'ok   ' : 'WRONG') + ' ' + c[0] + ' — proven=' + got +
      ' want=' + c[2] + ' read=' + JSON.stringify(readBuild(c[1])));
  }
  console.log(bad ? 'SELFTEST FAILED: ' + bad + ' of ' + cases.length + ' proof cases wrong.'
    : 'SELFTEST PASSED: ' + cases.length + ' cases — both dumpsys spellings accepted, three refusals refused, on ' +
      PKG + ' / ' + WANT_NAME + ' / code ' + WANT_CODE + '.');
  process.exit(bad ? 1 : 0);
}
/* A real tap at the centre of the node the page paints for this matcher, reported back.
   The third argument is not a nicety: the lock dialog paints its `×` and its `Unlock` button with the
   identical `state.adminAccountModal=null` handler, and that string occurs 7 times in the file, so an
   attribute-only search takes the node that comes first in DOM order — the cross — and then prints
   "after Unlock" about a tap that closed the dialog by another route. Same end state, dishonest label.
   So pass the visible text or an id selector, and the count is reported either way. */
function tapPainted(label, matcherExpr, selectBy) {
  const rect = ask('(function(){var re=' + matcherExpr + ';var sel=' + JSON.stringify(selectBy || '') + ';' +
    'var all=[].slice.call(document.querySelectorAll("[onclick]"));' +
    'var byAttr=all.filter(function(e){return re.test(e.getAttribute("onclick")||"")});' +
    'var isSelector=/^[#..[]/.test(sel);' +
    'var chosen=null,how="";' +
    'if(isSelector){chosen=document.querySelector(sel);if(chosen)how="by selector "+sel;}' +
    'else if(sel){chosen=all.filter(function(e){return e.textContent.trim()===sel})[0]||null;if(chosen)how="by visible text "+sel;}' +
    'if(!chosen){chosen=byAttr[0]||null;how="by handler only";}' +
    'if(!chosen)return "MISSING:"+re;' +
    /* Bring it on screen first. The handset proved the rule the bench keeps re-learning: the Lock Admin
       Session button sat at page y=1196 of a 638px viewport, so a "real tap" at its own rect hit nothing
       outside the page, the dialog never opened, and the honest readers downstream reported no field.
       `#screen` scrolls smoothly by contract, so scrollIntoView alone can leave the rect unmoved — set the
       behaviour off and move scrollTop directly, then re-read the rect that will actually be tapped. */
    'var scr=document.getElementById("screen");' +
    'if(scr){var q0=chosen.getBoundingClientRect();' +
    'if(q0.bottom>innerHeight||q0.top<0){scr.style.scrollBehavior="auto";' +
    'scr.scrollTop=Math.max(0,scr.scrollTop+q0.top-Math.round(innerHeight*0.4));}}' +
    'var q=chosen.getBoundingClientRect();if(!q.width||!q.height)return "ZERO:"+how;' +
    'return JSON.stringify({t:Math.round(q.left+q.width/2),l:Math.round(q.top+q.height/2),' +
    'w:Math.round(q.width*10)/10,h:Math.round(q.height*10)/10,text:(chosen.textContent||"").trim().slice(0,28),' +
    'how:how,attrMatches:byAttr.length})})()');
  let o = null; try { o = JSON.parse(rect); } catch (e) { /* MISSING / ZERO / PROBE ERROR */ }
  if (!o) { console.log('tap ' + label + ': ' + rect); return null; }
  if (o.attrMatches > 1 && o.how === 'by handler only') {
    console.log('AMBIGUOUS ' + label + ': ' + o.attrMatches + ' nodes share that handler and none was named — refusing to call this a tap on "' + label + '"');
    return null;
  }
  if (o.h < 44) console.log('NOTE control below the 44px floor before the tap: ' + label + ' h=' + o.h);
  probe(['--tap=' + o.t + ',' + o.l, '1']);
  sleep(2400);
  console.log('tapped ' + label + ' — ' + o.how + ', ' + o.attrMatches + ' handler match(es), text "' + o.text +
    '", box ' + o.w + 'x' + o.h + ' at page ' + o.t + ',' + o.l);
  return o;
}

/* ---------- 0. is there a handset on the bus at all, and can it be used? ---------- */
/* A cable is not the only way in: Android 11+ can be reached over the network its own wireless-debugging
   screen prints. `--connect=192.168.1.20:37123` runs `adb connect` first, so a phone that is on the same
   Wi-Fi as this machine can carry a leg even while every USB cable here is charge-only. */
const connectFlag = process.argv.find(a => a.startsWith('--connect='));
if (connectFlag) {
  const target = connectFlag.slice(10);
  console.log('adb connect ' + target + ' → ' + adb('connect', target).trim());
  sleep(2000);
}
let row = '';
for (let i = 0; i < 10; i++) {
  const rows = adb('devices').split('\n').slice(1).filter(l => /\t(device|unauthorized|offline)/.test(l));
  if (rows.length) { row = rows[0]; break; }
  sleep(5000);
}
if (!row) { console.log('NO DEVICE — adb sees no handset. The two legs stay owed.'); process.exit(1); }
const serial = row.split('\t')[0];
const state = (row.split('\t')[1] || '').trim();
const model = adb('shell', 'getprop', 'ro.product.model').trim();
if (state !== 'device') {
  /* An unauthorized serial is not a failure to work around: nothing is installed, tapped or read
     until the owner has accepted the dialog on the phone, and the walk record would otherwise be
     written against a page the instrument never actually reached. */
  console.log('DEVICE PRESENT BUT ' + state.toUpperCase() + ' — ' + serial + ' ' + model);
  console.log('unauthorized: accept "Allow USB debugging" on the phone, then re-run.');
  console.log('offline:      replug, or adb kill-server && adb start-server, then re-run.');
  console.log('Nothing installed, nothing tapped. The two legs stay owed.');
  process.exit(1);
}
console.log('device: ' + serial + ' | ' + model + ' | android ' + adb('shell', 'getprop', 'ro.build.version.release').trim());
console.log('webview: ' + (adb('shell', 'dumpsys', 'webview_update').split('\n').filter(l => /current webview package/i.test(l))[0] ||
  adb('shell', 'dumpsys', 'package', 'com.google.android.webview').split('\n').filter(l => /versionName/.test(l))[0] || 'unknown').trim());
/* Only mWakefulness is trusted here. `dumpsys power` also prints history and per-display lines that
   can read mScreenOn=false while the phone is wide awake, and an instrument that refuses a good walk
   on a stale line is worse than one that does not check. */
const wake = (adb('shell', 'dumpsys', 'power').split('\n').filter(l => /^\s*mWakefulness=/.test(l))[0] || '').trim();
console.log('screen: ' + (wake || 'unreadable — proceeding'));
if (/Asleep|Dozing/.test(wake)) {
  console.log('THE SCREEN IS ASLEEP — a reading of a painted field needs the page on screen. Unlock the phone and re-run; nothing has been installed.');
  process.exit(1);
}

/* ---------- 1. the build before and after the install ---------- */
const buildOf = buildLines;
console.log('before: ' + buildOf(adb('shell', 'dumpsys', 'package', PKG)));
if (!fs.existsSync(APK)) { console.log('NO APK at ' + APK); process.exit(1); }
console.log('apk bytes: ' + fs.statSync(APK).size);
console.log('install: ' + adb('install', '-r', '-t', APK).trim().split('\n').pop());
const after = buildOf(adb('shell', 'dumpsys', 'package', PKG));
console.log('after:  ' + after);
console.log('want:   versionCode ' + WANT_CODE + ' / versionName ' + WANT_NAME + ' on ' + PKG);
const got = readBuild(after);
console.log('read:   versionName=' + got.name + '  versionCode=' + got.code);
/* Both halves have to move: a versionName match on a stale versionCode is an install that did not take,
   and reading only the file name would call that a success. */
if (!installProven(after, WANT_NAME, WANT_CODE)) {
  console.log('INSTALL NOT PROVEN — the package does not read both the version name and the version code this build carries.');
  process.exit(1);
}

/* ---------- 2. cold start, then the platform's own text multiplier ---------- */
adb('shell', 'am', 'force-stop', PKG); sleep(900);
adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1'); sleep(6500);
say('booted', 'JSON.stringify({view:state.view,role:state.role,innerWidth:innerWidth,innerHeight:innerHeight,devicePixelRatio:devicePixelRatio})');
/* Gate on liveness before anything is claimed. Every measurement that follows needs a painted page; without
   this the walk ran to completion on a device where the app had never come up and still printed a clean
   residue count. */
const live = liveness();
if (!live) process.exit(1);
console.log('font_scale (system) = ' + adb('shell', 'settings', 'get', 'system', 'font_scale').trim());
say('multiplier', '(function(){var s=document.createElement("span");' +
  's.style.cssText="position:absolute;left:0;top:0;font-size:100px;line-height:1;white-space:pre";' +
  's.textContent="H";document.body.appendChild(s);var q=s.getBoundingClientRect();s.remove();' +
  'return JSON.stringify({renderedOverSpecified:Math.round((q.height/100)*1e4)/1e4,' +
  'rootFont:getComputedStyle(document.documentElement).fontSize})})()');

/* ---------- 3. the admin lock field ---------- */
const hub = gotoScreen('admin hub', "state.view='app'; state.role='admin'; state.tab='profile'; render();", /Admin account/);
tapPainted('Lock Admin Session', "/adminAccountAction\\('lock'\\)/", 'Lock Admin Session');
say('dialog', 'JSON.stringify({title:(document.querySelector(".modal-layer b")||{}).textContent||"NO DIALOG PAINTED",' +
  'copy:((document.querySelector(".modal-layer")||{}).textContent||"").replace(/\\s+/g," ").trim().slice(0,150)})');
requireJson('PIN field', '(function(){var i=document.querySelector(".modal-layer input[type=password]");' +
  'if(!i)return "NO PIN FIELD PAINTED";var cs=getComputedStyle(i),q=i.getBoundingClientRect();' +
  'var lab=i.closest("label");' +
  /* The specified size is not the painted one: Android multiplies the used font size after CSS resolves, ' +
  'so getComputedStyle still answers 16px while the glyphs are taller. The factor is MEASURED here with a ' +
  'throwaway span carrying the field\'s own font-size, exactly as navFontScale() does for the nav — ' +
  'assuming it is what a bench reading cannot see. */
  'var probe=document.createElement("span");' +
  'probe.style.cssText="position:absolute;left:-9999px;top:0;font-size:"+cs.fontSize+"!important;line-height:1;white-space:pre";' +
  'probe.textContent="Hgs";document.body.appendChild(probe);' +
  'var pg=probe.getBoundingClientRect();' +
  'var probe2=document.createElement("span");' +
  'probe2.style.cssText="position:absolute;left:-9999px;top:0;font-size:100px;line-height:1;white-space:pre";' +
  'probe2.textContent="Hgs";document.body.appendChild(probe2);' +
  'var factor=probe2.getBoundingClientRect().height/100;' +
  'probe.remove();probe2.remove();' +
  'return JSON.stringify({placeholder:i.placeholder,specifiedFontSize:cs.fontSize,' +
  'measuredFactor:Math.round(factor*1e4)/1e4,renderedGlyphHeightPx:Math.round(pg.height*10)/10,' +
  'renderedSizeIsSpecified:Math.abs(factor-1)<0.005,' +
  'rectH:Math.round(q.height*10)/10,rectW:Math.round(q.width*10)/10,minHeight:cs.minHeight,' +
  'boxSizing:cs.boxSizing,tapFloorOk:q.height>=44,' +
  'labelText:lab?lab.firstChild.textContent.replace(/\\s+/g," ").trim():"NO LABEL"})})()');
tapPainted('Unlock', "/state\\.adminAccountModal=null/", 'Unlock');
say('after Unlock', "JSON.stringify({modal:state.adminAccountModal,view:state.view," +
  "h1:(document.querySelector('#screen h1')||{}).textContent})");

/* ---------- 3b. the same field under the phone's own text inflation ---------- */
/* With `font_scale` at the 1.0 the handsets were left at, the reading above can only say the phone agrees
   with the bench. §68's claim is the opposite: the platform multiplies a `rem`-sized field AFTER CSS
   resolves, and the only place that is observable is a phone with its text turned up. So this stage sets
   the scale, reads, and restores it — and it is opt-in because it is the owner's handset: the previous
   value is read first, restored on `exit` as well as on the happy path (walk 8's driver died between
   enabling TalkBack and restoring it, which is why an exit hook rather than a last line), and the
   restoration is verified by reading the setting back rather than remembering it. */
const scaleFlag = process.argv.find(a => a.startsWith('--scale='));
if (scaleFlag) {
  const want = scaleFlag.slice(8);
  const prev = adb('shell', 'settings', 'get', 'system', 'font_scale').trim();
  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    if (!prev || prev === 'null') adb('shell', 'settings', 'delete', 'system', 'font_scale');
    else adb('shell', 'settings', 'put', 'system', 'font_scale', prev);
    console.log('font_scale restored to ' + (prev === 'null' ? '(unset)' : prev) +
      ' — read back: ' + adb('shell', 'settings', 'get', 'system', 'font_scale').trim());
  };
  process.on('exit', restore);
  console.log('font_scale before = ' + prev);
  adb('shell', 'settings', 'put', 'system', 'font_scale', want);
  console.log('font_scale set to ' + want + ' — read back: ' + adb('shell', 'settings', 'get', 'system', 'font_scale').trim());
  adb('shell', 'am', 'force-stop', PKG); sleep(900);
  adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1'); sleep(6500);
  say('multiplier at ' + want, '(function(){var s=document.createElement("span");' +
    's.style.cssText="position:absolute;left:0;top:0;font-size:100px;line-height:1;white-space:pre";' +
    's.textContent="Hgs";document.body.appendChild(s);var q=s.getBoundingClientRect();s.remove();' +
    'return JSON.stringify({factor:Math.round((q.height/100)*1e4)/1e4,' +
    'rootFont:getComputedStyle(document.documentElement).fontSize})})()');
  gotoScreen('admin hub at ' + want, "state.view='app'; state.role='admin'; state.tab='profile'; render();", /Admin account/);
  tapPainted('Lock Admin Session', "/adminAccountAction\\('lock'\\)/", 'Lock Admin Session');
  say('PIN field at ' + want, '(function(){var i=document.querySelector(".modal-layer input[type=password]");' +
    'if(!i)return "NO PIN FIELD PAINTED";var cs=getComputedStyle(i),q=i.getBoundingClientRect();' +
    'var p=document.createElement("span");p.style.cssText="position:absolute;left:-9999px;font-size:100px;line-height:1";' +
    'p.textContent="Hgs";document.body.appendChild(p);var f=p.getBoundingClientRect().height/100;p.remove();' +
    'return JSON.stringify({specifiedFontSize:cs.fontSize,measuredFactor:Math.round(f*1e4)/1e4,' +
    'renderedSizeApprox:Math.round(parseFloat(cs.fontSize)*f*10)/10,rectH:Math.round(q.height*10)/10,' +
    'minHeight:cs.minHeight,tapFloorOk:q.height>=44})})()');
  gotoScreen('results at ' + want, "state.sheet=null;state.role='resident';startDiscovery('leak');", /Find Services/);
  tapPainted('Filter providers', "/openSheet\\('providerFilters'\\)/", '#provider-filter-btn');
  say('rows at scale', '(function(){var r=[].slice.call(document.querySelectorAll(".filter-option"));if(!r.length)return "NO ROWS";' +
    'var h=r.map(function(x){return Math.round(x.getBoundingClientRect().height*10)/10});' +
    'var s=document.createElement("span");s.style.cssText="position:absolute;left:-9999px;font-size:100px;line-height:1";' +
    's.textContent="H";document.body.appendChild(s);var f=s.getBoundingClientRect().height/100;s.remove();' +
    'return JSON.stringify({n:r.length,minH:Math.min.apply(null,h),below44:h.filter(function(x){return x<44}).length,' +
    'factor:Math.round(f*1e4)/1e4,fontSizes:Array.from(new Set(r.map(function(x){return getComputedStyle(x).fontSize})))})})()');
  restore();
}

/* ---------- 4. the resident filter rows ---------- */
const res = gotoScreen('results', "state.view='app'; state.role='resident'; startDiscovery('leak');", /Find Services/);
tapPainted('Filter providers', "/openSheet\\('providerFilters'\\)/", '#provider-filter-btn');
say('sheet', 'JSON.stringify({sheet:state.sheet,title:(document.querySelector(".sheet-title")||{}).textContent||"NO SHEET",' +
  'rows:document.querySelectorAll(".filter-option").length})');
requireJson('rows', '(function(){var rows=[].slice.call(document.querySelectorAll(".filter-option"));if(!rows.length)return "NO ROWS PAINTED";' +
  'var hs=rows.map(function(r){return Math.round(r.getBoundingClientRect().height*10)/10});' +
  'var fs=[...new Set(rows.map(function(r){return getComputedStyle(r).fontSize}))];' +
  'return JSON.stringify({n:rows.length,minH:Math.min.apply(null,hs),maxH:Math.max.apply(null,hs),' +
  'below44:hs.filter(function(h){return h<44}).length,fontSizes:fs,' +
  'first3:rows.slice(0,3).map(function(r){return r.textContent.replace(/\\s+/g," ").trim().slice(0,26)})})})()');
say('last row reach', '(function(){var rows=[].slice.call(document.querySelectorAll(".filter-option"));if(!rows.length)return "NO ROWS";' +
  'var el=rows[rows.length-1],q=el.getBoundingClientRect();' +
  'var sc=null,p=el.parentElement;while(p){if(p.scrollHeight>p.clientHeight+4&&/auto|scroll/.test(getComputedStyle(p).overflowY)){sc=p;break;}p=p.parentElement;}' +
  'return JSON.stringify({lastTop:Math.round(q.top),lastBottom:Math.round(q.bottom),viewportH:Math.round(innerHeight),' +
  'inViewportNow:q.top>=0&&q.bottom<=innerHeight,scroller:sc?(sc.className||sc.tagName):"none",' +
  'scrollerSeesMore:sc?Math.round(sc.scrollHeight)+" in "+Math.round(sc.clientHeight):"n/a",' +
  'reachable:q.bottom<=innerHeight||!!sc})})()');
say('close sheet', "(function(){state.sheet=null; render(); return JSON.stringify({sheet:state.sheet,h1:(document.querySelector('#screen h1')||{}).textContent})})()");

/* ---------- 5. leave it signed out, and read the platform back ---------- */
gotoScreen('resident hub', "state.view='app'; state.role='resident'; state.tab='profile'; render();", /Profile/);
say('tap Log Out row', "(function(){var b=[].slice.call(document.querySelectorAll('#screen *,[data-layer] *'))" +
  ".filter(function(e){return typeof e.onclick==='function'&&/logout/i.test(String(e.onclick))});" +
  "if(!b.length)return 'NO LOGOUT CONTROL';b[0].click();return 'clicked '+b.length})()");
say('confirm', "(function(){var m=document.querySelector('.modal-layer');if(!m)return 'NO MODAL';" +
  "var b=[].slice.call(m.querySelectorAll('button')).filter(function(x){return /log out/i.test(x.textContent)});" +
  "if(!b.length)return 'NO CONFIRM BUTTON';b[b.length-1].click();return 'confirmed: '+b[b.length-1].textContent.trim()})()");
say('signed out', 'JSON.stringify({view:state.view,h1:(document.querySelector("h1,h2")||{}).textContent})');

console.log('--- the platform as found (this walk sets none of these) ---');
const a11y = adb('shell', 'settings', 'get', 'secure', 'enabled_accessibility_services').trim();
const a11yOn = adb('shell', 'settings', 'get', 'secure', 'accessibility_enabled').trim();
const tb = adb('shell', 'ps', '-A').split('\n').filter(l => /talkback/i.test(l)).length;
const fsys = adb('shell', 'settings', 'get', 'system', 'font_scale').trim();
/* This walk's own names only. The owner has a `suki-*` file in Download dated 2026-10-11, recorded in
   walk 4 as one of their files left where it was: a residue list that greps `/suki/` calls it mine, and a
   cleanup that trusts that list deletes something I was never allowed to touch. */
const leftovers = adb('shell', 'ls', '/sdcard/Download/').split('\n').filter(n => /suki-leg9/i.test(n)).map(s => s.trim()).filter(Boolean);
const dumps = adb('shell', 'ls', '/sdcard/').split('\n').filter(n => /window_dump/.test(n)).map(s => s.trim()).filter(Boolean);
const endView = ask('JSON.stringify({view:state.view})');
console.log('enabled_accessibility_services = ' + a11y);
console.log('accessibility_enabled          = ' + a11yOn);
console.log('talkback process               = ' + (tb || 'none'));
console.log('font_scale (system)            = ' + fsys);
console.log('this walk\'s fixture left      = ' + (leftovers.join(', ') || 'none'));
console.log('uiautomator dumps left         = ' + (dumps.join(', ') || 'none'));
console.log('app view at the end            = ' + endView);
console.log('installed build                = ' + after);

/* One number, in the key the instrument runner already reads: every sentence the walk record writes about
   the device is a claim about a machine somebody else owns, and a paragraph is easier to misread than a
   count that has to be zero. */
const residue = [];
if (readings.bad.length) residue.push('readings that did not measure: ' + readings.bad.join(','));
if (!readings.ok.includes('PIN field') || !readings.ok.includes('rows')) {
  residue.push('the two surfaces this leg exists to measure were never measured (ok: ' + readings.ok.join(',') + ')');
}
if (leftovers.length) residue.push('fixture left: ' + leftovers.join(','));
if (dumps.length) residue.push('dump left: ' + dumps.join(','));
if (!/login/.test(endView)) residue.push('not signed out: ' + endView);
if (!installProven(after, WANT_NAME, WANT_CODE)) residue.push('build does not read .39: ' + after);
if (!/^(null|0)$/i.test(a11y)) console.log('NOTE device state, not this walk\'s doing: an accessibility service is enabled on this phone (' + a11y.slice(0, 80) + '). Nothing in this run turns one on; walk 8 is the only pass that ever did, and it restored what it found. Reported as a note rather than residue so a residue count keeps meaning "what this walk left behind".');
console.log('readings measured: ' + readings.ok.length + ' [' + readings.ok.join(',') + '] · navigation probes: ' + probes + ' (not counted as measurements)');
console.log('findings: ' + residue.length + (residue.length ? ' — ' + residue.join(' | ')
  : ' — both surfaces measured on a painted page, nothing this walk left on the device, the app signed out, the build reads .39, no reader enabled'));
process.exit(residue.length ? 1 : 0);

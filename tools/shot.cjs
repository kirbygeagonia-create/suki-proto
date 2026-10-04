#!/usr/bin/env node
/* tools/shot.cjs — actually look at the app.
   ---------------------------------------------------------------------------
   The rest of this repo's gate renders the app in Node against a fake DOM, which
   proves structure and can prove nothing about layout: nothing is ever painted.
   This drives a real headless Chrome over the DevTools Protocol, navigates the
   app the way a person would (by setting the same state the buttons set), and
   writes PNGs. Then a human or a model can read them with the eyes.

   No dependencies: Node 22+ ships a global WebSocket, and Chrome is already
   installed. Nothing in Sukinnect-next.html is modified or instrumented.

   usage:
     node tools/shot.cjs                       # the default journey, phone in app mode
     node tools/shot.cjs --list                # what the named screens are
     node tools/shot.cjs --only=login,home     # a subset
     node tools/shot.cjs --width=390 --height=844 --dpr=2
     node tools/shot.cjs --desktop             # the phone frame inside the desktop shell
     node tools/shot.cjs --out=.shots          # where the PNGs go
*/
const fs = require('fs');
const path = require('path');
const http = require('http');
const net = require('net');
const os = require('os');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const APP_FILE = path.join(ROOT, 'Sukinnect-next.html');

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const hit = argv.find(a => a.startsWith('--' + name + '='));
  return hit ? hit.split('=')[1] : dflt;
};
const has = (name) => argv.includes('--' + name);

const WIDTH = parseInt(flag('width', '390'), 10);
const HEIGHT = parseInt(flag('height', '844'), 10);
const DPR = parseFloat(flag('dpr', '2'));
const OUT = path.join(ROOT, flag('out', '.shots'));
const DESKTOP = has('desktop');
/* App mode (?app=1) is what the Android WebView loads: no phone frame, the UI
   fills the viewport. That is the only view where a 390x844 shot is honest. */
const APP_MODE = !DESKTOP;
const ONLY = (flag('only', '') || '').split(',').map(s => s.trim()).filter(Boolean);

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
].filter(Boolean);

function findChrome() {
  for (const p of CHROME_CANDIDATES) if (fs.existsSync(p)) return p;
  throw new Error('no Chrome or Edge found; set CHROME_PATH');
}

const get = (url) => new Promise((resolve, reject) => {
  http.get(url, res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
  }).on('error', reject);
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* Ask the OS for a port nobody is holding. A fixed one collides with any other
   debugging session on the machine, and the failure looks identical to "Chrome
   would not start", which is a bad hour to lose. */
function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const p = srv.address().port;
      srv.close(() => resolve(p));
    });
  });
}

/* ------------------------------------------------------------------ the CDP
   A hand-rolled client would be a lot of code. Chrome's HTTP endpoint hands us a
   WebSocket URL, and Node's global WebSocket speaks it directly, so a session is
   one queue of ids and one promise per command.
   -------------------------------------------------------------------------------- */
class Session {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.waiting = new Map();
    this.events = [];
    this.onEvent = () => {};
    ws.onmessage = (e) => {
      const msg = JSON.parse(typeof e.data === 'string' ? e.data : Buffer.from(e.data).toString());
      if (msg.id && this.waiting.has(msg.id)) {
        const { resolve, reject } = this.waiting.get(msg.id);
        this.waiting.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message + ' ' + JSON.stringify(msg.error.data))) : resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
        this.onEvent(msg);
      }
    };
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.waiting.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  /* Evaluate in the page and hand the value back, unwrapping Chrome's envelope. */
  async evaluate(expression) {
    const r = await this.send('Runtime.evaluate', {
      expression, returnByValue: true, awaitPromise: true
    });
    if (r.exceptionDetails)
      throw new Error('page threw: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  }
  static async connect(port) {
    const list = await get(`http://127.0.0.1:${port}/json/list`);
    const page = list.find(t => t.type === 'page' && !t.url.startsWith('devtools://')) || list[0];
    await new Promise(r => setTimeout(r, 50));
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = () => reject(new Error('could not open the DevTools socket'));
    });
    return new Session(ws);
  }
}

/* ------------------------------------------------------------------- screens
   Each screen says what a person would have to reach it. Everything here uses
   the app's own state and its own render(), because that is what its buttons do
   — no query-parameter hook was added to the shipped file just to photograph it.
   -------------------------------------------------------------------------------- */
const SCREENS = [
  ['login',            `state.view='login'; state.authMode='login'; state.role='resident'; render();`],
  ['login-register',   `state.view='login'; state.authMode='register'; state.role='resident'; render();`],
  ['splash',           `state.view='splash'; render();`],
  ['resident-home',    `state.view='app'; state.role='resident'; state.tab='home'; render();`],
  ['resident-results', `state.view='app'; state.role='resident'; state.tab='results';
                        state.searchQuery='leak'; state.providerFilters=blankFilters(); render();`],
  ['provider-detail',  `state.view='app'; state.role='resident'; state.tab='provider_detail';
                        state.selectedProvider=PROVIDERS[0]; render();`],
  ['booking-sheet',    `state.view='app'; state.role='resident'; state.tab='provider_detail';
                        state.selectedProvider=PROVIDERS[0];
                        openBookingRequest(); state.requestDraft.service='Kitchen faucet keeps leaking near the cabinet.';
                        state.sheet='bookingRequest'; render();`],
  ['booking-detail',   `state.view='app'; state.role='resident'; state.tab='booking_detail';
                        state.selectedBookingId=BOOKINGS.find(b=>b.status==='upcoming').id; render();`],
  ['booking-tracking', `state.view='app'; state.role='resident'; state.tab='booking_detail';
                        state.selectedBookingId=BOOKINGS.find(b=>b.status==='ongoing').id; render();`],
  ['resident-bookings',`state.view='app'; state.role='resident'; state.tab='bookings'; render();`],
  ['messages',         `state.view='app'; state.role='resident'; state.tab='messages'; state.isChatOpen=false; render();`],
  ['chat-room',        `state.view='app'; state.role='resident'; state.tab='messages';
                        openChatThread(PROVIDERS[0].id, bookingsForResident()[0] && bookingsForResident()[0].id);
                        state.isChatOpen=true; render();`],
  ['resident-profile', `state.view='app'; state.role='resident'; state.tab='profile'; render();`],
  ['concierge',        `state.view='app'; state.role='resident'; state.tab='concierge'; render();`],
  ['notifications',    `state.view='app'; state.role='resident'; state.tab='notifications'; render();`],
  ['provider-dash',    `state.view='app'; state.role='provider'; state.tab='dashboard'; render();`],
  ['provider-fsm',     `state.view='app'; state.role='provider'; state.tab='fsm'; render();`],
  ['provider-bookings',`state.view='app'; state.role='provider'; state.tab='bookings'; render();`],
  ['provider-job',     `state.view='app'; state.role='provider'; state.tab='provider_booking_detail';
                        state.selectedProviderBookingId=pendingProviderRequests()[0].id; render();`],
  ['provider-profile', `state.view='app'; state.role='provider'; state.tab='profile'; render();`],
  ['admin-dash',       `state.view='app'; state.role='admin'; state.tab='admin_dashboard'; state.adminScreen='overview'; render();`],
  ['admin-finance',    `state.view='app'; state.role='admin'; state.tab='admin_dashboard'; state.adminScreen='finance'; render();`],
  ['admin-trust',      `state.view='app'; state.role='admin'; state.tab='admin_dashboard'; state.adminScreen='trust'; render();`],
  ['admin-intel',      `state.view='app'; state.role='admin'; state.tab='admin_dashboard'; state.adminScreen='intelligence'; render();`],
  ['admin-verifiers',  `state.view='app'; state.role='admin'; state.tab='admin_verifications'; state.adminProviderCategory='pending'; render();`],
  ['admin-verified',   `state.view='app'; state.role='admin'; state.tab='admin_verifications'; state.adminProviderCategory='verified'; render();`],
  ['admin-desk',       `state.view='app'; state.role='admin'; state.tab='admin_disputes'; render();`],
  ['admin-provider',   `state.view='app'; state.role='admin'; state.tab='admin_provider_profile';
                        state.selectedAdminProvider='p1'; state.adminProviderSection='overview'; render();`],
  ['case-sheet',       `state.view='app'; state.role='resident'; state.tab='booking_detail';
                        const b=BOOKINGS.find(x=>x.status==='completed'&&x.pricing); b.completedAt=new Date().toISOString();
                        state.selectedBookingId=b.id; render(); openCaseSheet(b.id);`],
  ['empty-search',     `state.view='app'; state.role='resident'; state.tab='results';
                        state.searchQuery='piano tuning'; state.providerFilters=blankFilters(); render();`]
];

async function main() {
  if (has('list')) {
    console.log(SCREENS.map(s => '  ' + s[0]).join('\n'));
    return;
  }
  if (!fs.existsSync(APP_FILE)) throw new Error('missing ' + APP_FILE);

  const chrome = findChrome();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'suki-shot-'));
  const url = 'file:///' + APP_FILE.replace(/\\/g, '/') + (APP_MODE ? '?app=1' : '');
  const wanted = ONLY.length ? SCREENS.filter(s => ONLY.includes(s[0])) : SCREENS;
  const port = await freePort();
  /* Chrome's own words go to a file: this is a Windows GUI binary, so its stdout
     never arrives through the shell, and a silent failure is worthless to debug. */
  const chromeLog = path.join(profile, 'chrome.log');
  const logFd = fs.openSync(chromeLog, 'w');

  const child = spawn(chrome, [
    '--headless', '--disable-gpu', '--hide-scrollbars',
    '--allow-file-access-from-files',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${port}`,
    DESKTOP ? '--window-size=1280,900' : `--window-size=${WIDTH},${HEIGHT}`,
    'about:blank'
  ], { stdio: ['ignore', logFd, logFd] });

  /* This build of Chrome does not write DevToolsActivePort into the profile, so
     the port is discovered the way a real driver does: ask the endpoint. */
  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) {
    try { ready = !!(await get(`http://127.0.0.1:${port}/json/version`)).Browser; }
    catch { await sleep(250); }
  }
  if (!ready) {
    fs.closeSync(logFd);
    const log = fs.existsSync(chromeLog) ? fs.readFileSync(chromeLog, 'utf8') : '';
    child.kill('SIGKILL');
    fs.rmSync(profile, { recursive: true, force: true });
    throw new Error('no DevTools endpoint on port ' + port + '. Chrome said: ' + (log.slice(0, 400) || '(nothing)'));
  }
  fs.closeSync(logFd);

  let session;
  for (let i = 0; i < 20 && !session; i++) {
    try { session = await Session.connect(port); } catch { await sleep(300); }
  }
  if (!session) { child.kill('SIGKILL'); fs.rmSync(profile, { recursive: true, force: true }); throw new Error('could not attach to the page target'); }

  const consoleErrors = [];
  session.onEvent = (e) => {
    if (e.method === 'Runtime.exceptionThrown')
      consoleErrors.push('EXCEPTION ' + (e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text));
    if (e.method === 'Log.entryAdded' && e.params.entry.level === 'error')
      consoleErrors.push('CONSOLE  ' + e.params.entry.text.slice(0, 200));
  };

  await session.send('Page.enable');
  await session.send('Runtime.enable');
  await session.send('Log.enable').catch(() => {});
  /* Chrome's screenshot uses the viewport we give it. mobile:true makes
     text autosizing and the visual viewport behave like a phone instead of
     scaling a desktop layout down. */
  await session.send('Emulation.setDeviceMetricsOverride', {
    width: DESKTOP ? 1280 : WIDTH, height: DESKTOP ? 900 : HEIGHT,
    deviceScaleFactor: DPR, mobile: !DESKTOP
  });
  await session.send('Emulation.setScrollbarsHidden', { hidden: true });

  const loaded = new Promise(resolve => {
    const check = (e) => { if (e.method === 'Page.loadEventFired') resolve(); };
    session.onEvent = ((prev) => (e) => { check(e); prev(e); })(session.onEvent);
  });
  await session.send('Page.navigate', { url });
  await Promise.race([loaded, sleep(15000)]);

  /* The launch screen hands over to sign-in on its own timer about 1.25s after
     load. Wait it out before navigating anywhere, or it lands on top of the
     screen being photographed. */
  await sleep(1900);
  /* The launch screen plays once on cold load; force the entry point the tool
     actually wants to start from. */
  await session.evaluate(`(function(){ try { state.view='login'; render(); return true; } catch(e){ return String(e); } })()`);
  await sleep(400);

  const boot = await session.evaluate(`(function(){
     return { title: document.title, hasState: typeof state !== 'undefined',
              roles: typeof PROVIDERS !== 'undefined' ? PROVIDERS.length : 0,
              bookings: typeof BOOKINGS !== 'undefined' ? BOOKINGS.length : 0,
              persistent: typeof Store !== 'undefined' ? Store.kind : 'no Store',
              version: typeof SCHEMA_VERSION !== 'undefined' ? SCHEMA_VERSION : '?' };
  })()`);
  console.log('page: ' + boot.title + ' | providers ' + boot.roles + ' | bookings ' + boot.bookings +
              ' | store ' + boot.persistent + ' | schema v' + boot.version);

  fs.mkdirSync(OUT, { recursive: true });
  /* Reset once, not per screen: resetDemoData() renders, and doing it immediately
     before a navigation let its own paint land after the screen we asked for —
     the tool then photographed the sign-in card and reported it as the chat room. */
  await session.evaluate(`(function(){ localStorage.clear(); resetDemoData(); return true; })()`);
  await sleep(500);

  const manifest = [];
  for (const [name, nav] of wanted) {
    try {
      const err = await session.evaluate(`(function(){
         try { ${nav} return ''; } catch(e){ return String(e && e.message || e); }
      })()`);
      if (err) { console.log('  SKIP ' + name + ' — ' + err); continue; }
      /* Let transitions settle: the app animates sheets and toasts, and a shot
         taken mid-flight photographs a half-moved screen. */
      await session.evaluate(`(function(){
         /* The launch screen schedules its own hand-over to sign-in about 1.25s
            after it paints. Photographing other screens behind it is fine; letting
            it fire mid-run switches the app out from under the shot and closes any
            sheet that was open. */
         try { if (typeof bootFromSplash !== 'undefined' && bootFromSplash._t) clearTimeout(bootFromSplash._t); } catch (e) {}
         try { if (typeof state !== 'undefined' && state.view === 'splash') { /* leave it on screen */ } } catch (e) {}
         return true;
      })()`);
      await sleep(APP_MODE ? 700 : 900);
      /* A sheet needs one more push: the app's own render pass can hand the sheet
         state to a screen change before the layer mounts, and the second call lands
         on a screen that is already there. Only retried when the layer is absent,
         so an ordinary screen is never rendered twice for no reason. */
      for (let attempt = 0; attempt < 2; attempt++) {
        const mounted = await session.evaluate(`(function(){
           return !!document.querySelector('.sheet, .auth-sheet, .chat-list');
        })()`);
        const wantsSheet = /sheet|case/i.test(name);
        if (mounted || !wantsSheet) break;
        await session.evaluate(`(function(){ try { ${nav} return ''; } catch(e){ return String(e && e.message || e); } })()`);
        await sleep(420);
      }
      /* A toast expires on its own after 2.6s; a screenshot taken at 0.7s would
         otherwise photograph the tool's own housekeeping over the customer's
         screen. Clear the snackbar layer, then shoot. */
      await session.evaluate(`(function(){ const r=document.getElementById('toast-root'); if(r) r.innerHTML=''; return true; })()`);
      await sleep(120);
      /* Say what was actually photographed. A filename is a claim about the pixels
         in it, and without this the tool can silently shoot the wrong screen.
         querySelector returns the first match in DOCUMENT order, not in the order
         of the selector list, so the layers are asked one at a time instead: a
         sheet or dialog on top outranks the screen behind it. */
      const seen = await session.evaluate(`(function(){
         const ask = (sel) => { const n = document.querySelector(sel); return n ? n.textContent.trim().replace(/\\s+/g,' ').slice(0,40) : ''; };
         const title = ask('.sheet .sheet-title') || ask('.chat-head-name') ||
                       ask('.auth-sheet .auth-wordmark') || ask('#screen .topbar .title') ||
                       ask('#screen .card-title') || '(untitled)';
         const a = document.querySelector('.sheet, .auth-sheet, .chat-list');
         const el = a || document.getElementById('screen');
         return { title: title,
                  sheet: (typeof state !== 'undefined' && state.sheet) || '-',
                  where: (typeof state !== 'undefined' ? state.view + '/' + state.role + ':' + state.tab : '?'),
                  overflow: el ? el.scrollHeight - el.clientHeight : 0 };
      })()`);
      const shot = await session.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const file = path.join(OUT, name + '.png');
      fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
      manifest.push({ name, shows: seen.title, sheet: seen.sheet, where: seen.where, file: path.relative(ROOT, file), overflow: seen.overflow, viewport: WIDTH + 'x' + HEIGHT });
      console.log('  shot ' + name.padEnd(20) + 'shows "' + seen.title + '" [' + seen.where +
                  (seen.sheet !== '-' ? ' sheet:' + seen.sheet : '') + ']' +
                  (seen.overflow > 4 ? ('  scrolls ' + seen.overflow + 'px past the fold') : ''));
    } catch (e) {
      console.log('  FAIL ' + name + ' — ' + e.message);
    }
  }

  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({
    generatedAt: new Date().toISOString(), viewport: { width: WIDTH, height: HEIGHT, dpr: DPR },
    appMode: APP_MODE, url, screens: manifest, consoleErrors
  }, null, 2));
  if (consoleErrors.length) {
    console.log('\nthe page reported ' + consoleErrors.length + ' error(s):');
    [...new Set(consoleErrors)].slice(0, 12).forEach(e => console.log('  ' + e));
  } else {
    console.log('\nno console errors across ' + manifest.length + ' screens');
  }
  console.log('PNGs in ' + OUT);

  session.ws.close();
  child.kill('SIGKILL');
  /* Chrome keeps a handle on its profile for a moment after the kill, and a
     Windows delete then throws EPERM. The screenshots are the point; a leftover
     temp folder is not worth failing the run over. */
  await sleep(400);
  try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 }); }
  catch (e) { console.log('(left the throwaway Chrome profile at ' + profile + ': ' + e.code + ')'); }
}

main().catch(err => { console.error(err.message); process.exit(1); });

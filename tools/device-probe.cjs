/* Attach to the WebView on a connected handset and evaluate an expression in the real page.
   The bench has the camera for headless Chrome and uiautomator for the platform tree, but
   nothing that could ask a shipping WebView what IT decided — and on 2026-10-17 two phones
   disagreed about whether a modal raised from a sheet reaches the accessibility tree, which
   is a question only the page itself can answer.

     node tools/device-probe.cjs '<expression>'          # one expression, prints the answer
     node tools/device-probe.cjs --file=tools/probe-x.js # same as the camera's --probe=@
     node tools/device-probe.cjs --tap=225,452 '<expr>'  # a real gesture at page coords, then the answer
     node tools/device-probe.cjs --keys=DPAD_DOWN,DPAD_CENTER '<expr>'   # platform key events first

   --tap exists because of §75's file-picker leg. `element.click()` run from Runtime.evaluate carries no
   user activation, and Chrome refuses to open a file chooser without one — so the first handset attempt
   at that leg reported "no picker appears", which was the instrument, not the application. Input events
   dispatched over CDP arrive through the browser's own input path and do count as activation.

   --keys exists for the other half of the same leg, and on 2026-10-23 it proved itself: ColorOS's
   DocumentsUI accepts an injected tap on its own chrome and refuses one on a document row, which was
   read as "a thumb owes this" — but the key route had never been tried. Handset walk 7 ran
   `--keys=TAB,TAB,DPAD_DOWN,DPAD_CENTER` against the vivo 1906's picker and our page came back holding a
   file, so a refused affordance was a refused *input method*, not a refused platform. ColorOS remains
   untried by keys. `input keyevent` reaches whichever window is on screen, not only this WebView, and
   that is exactly the hazard: a key press activates **the focused row**, which on a phone in daily use is
   one of the owner's own photographs — walk 7 selected one before the app's own remove control cleared it,
   and nothing was stored because the page keeps only the name. So point this at a folder that is empty
   except for the file you pushed, entered by name, and never at a recents grid. The codes are named or
   numeric, applied in order with 700ms between them, **before** the reader expression runs — focusing a
   field inside the reader and pressing Enter afterwards arrives too late; tap the control's own rect
   instead. Reading the page needs `document.hasFocus()` true, because an injected `focus()` while the
   window is unfocused leaves the keypress swallowed in silence.

   The coordinates are **page** ones (CSS px, so 0..innerWidth), not the device pixels `uiautomator`
   bounds and `adb shell input tap` speak in — on the vivo 1906 those differ by devicePixelRatio 1.6 plus
   a 54px status bar. Ask the page for a rect instead of converting: read `getBoundingClientRect()` here,
   then tap the answer. And this reaches only our own WebView; a document row inside another app's picker
   refuses synthetic activation on some OEM builds even when their own chrome accepts it. See Handset
   walk 5 in DEVICE-PASS.md.

   Needs the debug shell's WebView.setWebContentsDebuggingEnabled(true). Requires nothing from
   npm: it speaks the DevTools Protocol over a hand-rolled WebSocket, the same way shot.cjs does. */
'use strict';
const net = require('net');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ADB = process.env.ADB || 'adb';
const argv = process.argv.slice(2);
const fileFlag = argv.find(a => a.startsWith('--file='));
const tapFlag = argv.find(a => a.startsWith('--tap='));
const tap = tapFlag ? tapFlag.slice(6).split(',').map(Number) : null;
if (tapFlag && (tap.length !== 2 || tap.some(n => !Number.isFinite(n))) ) {
  console.error('--tap wants page coordinates: --tap=225,452'); process.exit(1);
}
/* Android key events through `adb shell input keyevent`, so they reach the window that is actually on
   screen — including another app's, which CDP cannot. Accepts keycode numbers or the names without their
   KEYCODE_ prefix, applied in order with a short settle between each. */
const KEYCODES = { BACK: 4, DPAD_UP: 19, DPAD_DOWN: 20, DPAD_LEFT: 21, DPAD_RIGHT: 22, DPAD_CENTER: 23,
  ENTER: 66, TAB: 61, ESCAPE: 111, MENU: 82 };
const keyFlag = argv.find(a => a.startsWith('--keys='));
const keys = keyFlag ? keyFlag.slice(7).split(',').filter(Boolean).map(tok => {
  const named = KEYCODES[tok.trim().toUpperCase()];
  if (named !== undefined) return named;
  const n = Number(tok);
  if (Number.isInteger(n)) return n;
  console.error('--keys does not know ' + JSON.stringify(tok) + '; use a keycode number or '
    + Object.keys(KEYCODES).join('/')); process.exit(1);
}) : [];
const expr = fileFlag
  ? require('fs').readFileSync(fileFlag.slice(7), 'utf8')
  : (argv.find(a => !a.startsWith('--')) || 'document.title');

function adb(...args) {
  return execFileSync(ADB, args, { encoding: 'utf8' }).trim();
}

/* ------------------------------------------------------------------ WebSocket, by hand */
function wsConnect(socket, path, onMessage) {
  const key = crypto.randomBytes(16).toString('base64');
  const req = `GET ${path} HTTP/1.1\r\nHost: localhost\r\nUpgrade: websocket\r\n` +
    `Connection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`;
  let buf = Buffer.alloc(0), haveHeader = false;
  socket.on('data', chunk => {
    buf = Buffer.concat([buf, chunk]);
    if (!haveHeader) {
      const end = buf.indexOf('\r\n\r\n');
      if (end < 0) return;
      haveHeader = true;
      buf = buf.slice(end + 4);
    }
    while (buf.length >= 2) {
      const opcode = buf[0] & 0x0f;
      let len = buf[1] & 0x7f, off = 2;
      if (len === 126) { if (buf.length < 4) break; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) break; len = Number(buf.readBigUInt64BE(2)); off = 10; }
      if (buf.length < off + len) break;
      const payload = buf.slice(off, off + len);
      buf = buf.slice(off + len);
      if (opcode === 0x1) { try { onMessage(JSON.parse(payload.toString('utf8'))); } catch (e) {} }
      else if (opcode === 0x8) socket.end();
    }
  });
  socket.write(req);
  return {
    send(obj) {
      const payload = Buffer.from(JSON.stringify(obj));
      const mask = crypto.randomBytes(4);
      let header;
      if (payload.length < 126) header = Buffer.from([0x81, 0x80 | payload.length]);
      else if (payload.length < 65536) {
        header = Buffer.alloc(4); header[0] = 0x81; header[1] = 0x80 | 126; header.writeUInt16BE(payload.length, 2);
      } else {
        header = Buffer.alloc(10); header[0] = 0x81; header[1] = 0x80 | 127; header.writeBigUInt64BE(BigInt(payload.length), 2);
      }
      const masked = Buffer.alloc(payload.length);
      for (let i = 0; i < payload.length; i++) masked[i] = payload[i] ^ mask[i % 4];
      socket.write(Buffer.concat([header, mask, masked]));
    }
  };
}

/* ------------------------------------------------------------------ find the page target */
function httpGet(port, path) {
  return new Promise((resolve, reject) => {
    const sock = net.connect(port, '127.0.0.1', () => sock.write(`GET ${path} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nConnection: close\r\n\r\n`));
    /* Accumulate Buffers, not strings: Content-Length counts BYTES, and the page title this
       endpoint reports contains an em dash, so a character count comes out short and the body
       never looks complete. That read as "the DevTools endpoint timed out" on a socket that was
       answering perfectly well. */
    let buf = Buffer.alloc(0);
    let settled = false;
    const done = (v, asBuffer) => {
      if (settled) return;
      settled = true;
      sock.destroy();
      resolve(asBuffer ? v.toString('utf8') : v);
    };
    const fail = msg => { if (!settled) { settled = true; sock.destroy(); reject(new Error(msg)); } };
    const tryFinish = () => {
      const i = buf.indexOf('\r\n\r\n');
      if (i < 0) return;
      const head = buf.slice(0, i).toString('latin1');
      const m = /Content-Length:\s*(\d+)/i.exec(head);
      const body = buf.slice(i + 4);
      if (m ? body.length >= Number(m[1]) : body.length > 0) done(body, true);
    };
    sock.on('data', d => { buf = Buffer.concat([buf, d]); tryFinish(); });
    sock.on('end', () => { const i = buf.indexOf('\r\n\r\n'); if (i >= 0) done(buf.slice(i + 4), true); else fail('no HTTP body arrived'); });
    sock.on('error', e => fail(e.message));
    setTimeout(() => fail('timed out reading ' + path + ' (got ' + buf.length + ' bytes)'), 6000);
  });
}

(async () => {
  const out = adb('devices');
  const serial = (out.match(/^(\S+)\s+device$/m) || [])[1];
  if (!serial) { console.error('no authorised device. adb devices said:\n' + out); process.exit(1); }
  /* Only launch when the app is not already on screen. Launching unconditionally — which this instrument did
     for every one of its life — means a walk that asks five questions issues five `am start`s, and each one
     leaves a renderer reloading an eleven-thousand-line page; by the next call the previous target is dead
     and the fresh one is busy, so every Runtime.evaluate times out and the target list keeps growing. That
     is exactly what the OPPO produced: app focused, activity resumed, screen awake, and seven consecutive
     probes all refusing to answer. Ask the window manager first and leave a running app alone. */
  const focusLine = adb('-s', serial, 'shell', 'dumpsys', 'window').match(/mCurrentFocus=[^\n]*/g) || [];
  const alreadyUp = focusLine.some(l => /com\.sukinnect\.app/.test(l));
  if (alreadyUp) {
    console.error('already foreground, not relaunching: ' + focusLine[0].trim());
  } else {
    console.error('launching (foreground was: ' + (focusLine[0] || 'unknown').trim() + ')');
    adb('-s', serial, 'shell', 'am', 'start', '-n', 'com.sukinnect.app/.MainActivity');
    await new Promise(r => setTimeout(r, 2500));
  }
  const pidLine = adb('-s', serial, 'shell', 'pidof', 'com.sukinnect.app');
  const pid = (pidLine.match(/\d+/) || [])[0];
  if (!pid) { console.error('com.sukinnect.app is not running'); process.exit(1); }
  const socketName = `webview_devtools_remote_${pid}`;
  /* Unbind before binding. Re-forwarding tcp:9222 onto a *new* socket does not reliably displace the old
     mapping here — a previous run's forward to a dead pid kept answering nothing on /json, and the probe
     reported "the WebView is not exposing an inspector" about a WebView that was exposing one (the socket
     was visible in /proc/net/unix the whole time). So: remove this port's forward, bind fresh, and if the
     endpoint still refuses to answer, rebind on a spare port and say which socket was reached. The wrong
     diagnosis cost a walk, which is why the instrument now cannot produce it. */
  const PORTS = [9222, 9223, 9224, 9225];
  let port = 0, targets = null, forwardErr = '';
  for (const p of PORTS) {
    try { adb('-s', serial, 'forward', '--remove', `tcp:${p}`); } catch (e) { /* nothing bound yet */ }
    adb('-s', serial, 'forward', `tcp:${p}`, `localabstract:${socketName}`);
    try { targets = JSON.parse(await httpGet(p, '/json')); port = p; break; }
    catch (err) { forwardErr = err.message; console.error(`  port ${p} for ${socketName}: ${err.message}`); }
  }
  if (!port || !targets) {
    console.error(`cannot reach the DevTools endpoint for ${socketName}: ${forwardErr}`);
    console.error('That means the WebView is not exposing an inspector — check the debug flag in MainActivity,');
    console.error(`and check the socket really exists: adb -s ${serial} shell cat /proc/net/unix | grep ${socketName}`);
    for (const p of PORTS) { try { adb('-s', serial, 'forward', '--remove', `tcp:${p}`); } catch (e) { } }
    process.exit(1);
  }
  console.error(`attached: ${socketName} via tcp:${port}, targets: ${targets.length}`);
  const page = targets.find(t => t.type === 'page' && /Sukinnect/i.test(t.title)) || targets.find(t => t.type === 'page');
  if (!page) { console.error('no page target. targets: ' + JSON.stringify(targets.map(t => t.title + '|' + t.url))); process.exit(1); }
  /* A LIVE target, not merely a matching one. On the emulated frame this endpoint listed 20+ page targets on
     ONE socket, because every reload leaves its target behind, and the picker above takes the FIRST title
     match — so consecutive probes attach to DIFFERENT pages. That is the whole of what looked like the
     application misbehaving: `state is not defined`, half-typed fragments, and a view that flipped between
     splash and login from one reading to the next. So each candidate is asked one trivial question about the
     app's own state, and the first that answers is kept — and kept for the rest of the session, because a
     tap that lands on a different page from the reading that follows is worse than no tap at all. Prefer the
     newest target (DevTools appends as pages are created). On a handset with one WebView the first candidate
     answers and nothing about the behaviour changes; if NOTHING answers, the old path is taken loudly rather
     than silently, so a walk can still report what it saw. */
  const pagePath = t => (t.webSocketDebuggerUrl || '').replace(/^ws:\/\/[^/]+/, '') || '/devtools/page/' + t.id;
  const openTo = async p => {
    const s = net.connect(port, '127.0.0.1');
    let id = 0;
    const pending = new Map();
    const w = wsConnect(s, p, msg => {
      if (msg.id && pending.has(msg.id)) { const { resolve } = pending.get(msg.id); pending.delete(msg.id); resolve(msg); }
    });
    await new Promise(r => { if (s.connecting) s.once('connect', r); else r(); });
    const sd = (method, params) => new Promise(resolve => {
      const my = ++id; pending.set(my, { resolve }); w.send({ id: my, method, params: params || {} });
      setTimeout(() => { if (pending.has(my)) { pending.delete(my); resolve({ error: { message: method + ' timed out' } }); } }, 15000);
    });
    return { sock: s, ws: w, send: sd };
  };
  const matches = targets.filter(t => t.type === 'page' && /Sukinnect/i.test((t.title || '') + (t.url || '')));
  const ordered = (matches.length ? matches : targets.filter(t => t.type === 'page')).slice().reverse();
  let active = null;
  let inconclusive = null;
  const tried = [];
  for (const cand of ordered.slice(0, 6)) {
    const c = await openTo(pagePath(cand));
    let v = 'NO-STATE';
    try {
      const r = await c.send('Runtime.evaluate', {
        expression: "JSON.stringify({v:(typeof state!=='undefined'&&state)?String(state.view):'NO-STATE'})",
        returnByValue: true
      });
      if (r && r.result && r.result.value) v = String(JSON.parse(r.result.value).v);
      else if (r && r.error) v = 'ERR ' + r.error.message;
    } catch (e) { v = 'ERR ' + e.message; }
    tried.push(String(cand.title || cand.url || '?').slice(0, 24) + '=' + v);
    if (v !== 'NO-STATE' && !/^ERR/.test(v)) {
      console.error(`live target found after ${tried.length} of ${Math.min(6, ordered.length)} candidate(s): ` + tried.join(' | '));
      active = c;
      break;
    }
    /* A validation that TIMES OUT is not a dead page. Proven the hard way: on a saturated frame this check
       answered `ERR Runtime.evaluate timed out` for a target that then served the real reading perfectly a
       second later — so treating inconclusive as dead made the instrument announce "NO LIVE TARGET" about
       the only live page it had, which is this repository's oldest error in a new costume. Keep the first
       inconclusive candidate as a fallback and adopt it, saying so, instead of destroying it. */
    if (/timed out/.test(v) && !inconclusive) { inconclusive = c; continue; }
    try { c.sock.destroy(); } catch (e) { /* already gone */ }
  }
  if (!active && inconclusive) {
    active = inconclusive;
    console.error(`VALIDATION INCONCLUSIVE, adopting the page anyway: state.view could not be read (` + tried.join(' | ') +
      ') but the frame is slow rather than dead — the reading below will say whether it answered.');
  }
  if (!active) {
    console.error(`NO LIVE TARGET: ${ordered.length} page target(s) on ${socketName}, none usable. Tried: ` + (tried.join(' | ') || 'nothing'));
    console.error('Falling back to the first match so the walk still reports what it sees rather than nothing.');
    active = await openTo(pagePath(page));
  }
  const sock = active.sock, ws = active.ws, send = active.send;
  await new Promise(r => setTimeout(r, 900));
  if (tap) {
    /* touchStart then touchEnd through the browser's input path — this is what carries user
       activation, and what a page-side .click() does not. */
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tap[0], y: tap[1] }] });
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await new Promise(r => setTimeout(r, 1200));
  }
  if (keys.length) {
    /* Deliberately NOT CDP: `Input.dispatch*` reaches only our own WebView, and the reason this exists
       is the system picker, which is another app's window. `input keyevent` goes in through the
       platform, lands on whatever is focused, and is a different input route from the taps ColorOS's
       DocumentsUI refuses on a document row. Untested on hardware — no phone was attached when it was
       added; the sequence it was added for is in DEVICE-PASS.md's owed list. */
    for (const k of keys) {
      try {
        execFileSync(ADB, ['shell', 'input', 'keyevent', String(k)], { stdio: 'ignore' });
      } catch (noKey) {
        /* Loud, and before the expression: an answer read from a screen the keys never reached is the
           state-nobody-can-reach mistake this repository has now written down four times. */
        console.error('KEY FAILED: `input keyevent ' + k + '` did not go through (' + noKey.message.split('\n')[0] + ') — nothing was evaluated');
        process.exit(1);
      }
      await new Promise(r => setTimeout(r, 700));
    }
  }
  /* awaitPromise, like the camera: without it an async probe serialises to `{}`, which reads exactly
     like a page that found nothing. The first device run of §77 hit that and looked like a failure of
     the app rather than of this tool. */
  const res = await send('Runtime.evaluate', { expression: `(function(){ try { return (${expr}); } catch(e){ return 'threw: ' + e.message; } })()`, returnByValue: true, awaitPromise: true });
  const inner = res.result && res.result.result;
  const value = inner && inner.value !== undefined ? inner.value
    : (inner && inner.description) || res;
  console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 1));
  adb('-s', serial, 'forward', '--remove', `tcp:${port}`);
  sock.destroy();
  process.exit(0);
})().catch(err => { console.error('device-probe failed: ' + err.message); process.exit(1); });

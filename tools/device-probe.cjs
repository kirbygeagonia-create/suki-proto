/* Attach to the WebView on a connected handset and evaluate an expression in the real page.
   The bench has the camera for headless Chrome and uiautomator for the platform tree, but
   nothing that could ask a shipping WebView what IT decided — and on 2026-10-17 two phones
   disagreed about whether a modal raised from a sheet reaches the accessibility tree, which
   is a question only the page itself can answer.

     node tools/device-probe.cjs '<expression>'          # one expression, prints the answer
     node tools/device-probe.cjs --file=tools/probe-x.js # same as the camera's --probe=@

   Needs the debug shell's WebView.setWebContentsDebuggingEnabled(true). Requires nothing from
   npm: it speaks the DevTools Protocol over a hand-rolled WebSocket, the same way shot.cjs does. */
'use strict';
const net = require('net');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ADB = process.env.ADB || 'adb';
const argv = process.argv.slice(2);
const fileFlag = argv.find(a => a.startsWith('--file='));
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
  adb('-s', serial, 'shell', 'am', 'start', '-n', 'com.sukinnect.app/.MainActivity');
  await new Promise(r => setTimeout(r, 2500));
  const pidLine = adb('-s', serial, 'shell', 'pidof', 'com.sukinnect.app');
  const pid = (pidLine.match(/\d+/) || [])[0];
  if (!pid) { console.error('com.sukinnect.app is not running'); process.exit(1); }
  const socketName = `webview_devtools_remote_${pid}`;
  adb('-s', serial, 'forward', 'tcp:9222', `localabstract:${socketName}`);
  let targets;
  try { targets = JSON.parse(await httpGet(9222, '/json')); }
  catch (err) {
    console.error(`cannot reach the DevTools endpoint for ${socketName}: ${err.message}`);
    console.error('That means the WebView is not exposing an inspector — check the debug flag in MainActivity.');
    adb('-s', serial, 'forward', '--remove', 'tcp:9222');
    process.exit(1);
  }
  const page = targets.find(t => t.type === 'page' && /Sukinnect/i.test(t.title)) || targets.find(t => t.type === 'page');
  if (!page) { console.error('no page target. targets: ' + JSON.stringify(targets.map(t => t.title + '|' + t.url))); process.exit(1); }
  const wsPath = (page.webSocketDebuggerUrl || '').replace(/^ws:\/\/[^/]+/, '') || '/devtools/page/' + page.id;

  const sock = net.connect(9222, '127.0.0.1');
  let id = 0;
  const pending = new Map();
  const ws = wsConnect(sock, wsPath, msg => {
    if (msg.id && pending.has(msg.id)) { const { resolve } = pending.get(msg.id); pending.delete(msg.id); resolve(msg); }
  });
  const send = (method, params) => new Promise(resolve => {
    const my = ++id; pending.set(my, { resolve }); ws.send({ id: my, method, params: params || {} });
    setTimeout(() => { if (pending.has(my)) { pending.delete(my); resolve({ error: { message: method + ' timed out' } }); } }, 15000);
  });

  await new Promise(r => { if (sock.connecting) sock.once('connect', r); else r(); });
  await new Promise(r => setTimeout(r, 900));
  const res = await send('Runtime.evaluate', { expression: `(function(){ try { return (${expr}); } catch(e){ return 'threw: ' + e.message; } })()`, returnByValue: true });
  const inner = res.result && res.result.result;
  const value = inner && inner.value !== undefined ? inner.value
    : (inner && inner.description) || res;
  console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 1));
  adb('-s', serial, 'forward', '--remove', 'tcp:9222');
  sock.destroy();
  process.exit(0);
})().catch(err => { console.error('device-probe failed: ' + err.message); process.exit(1); });

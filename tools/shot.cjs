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
     node tools/shot.cjs --only=login,resident-home     # a subset (--list for the names)
     node tools/shot.cjs --width=390 --height=844 --dpr=2
     node tools/shot.cjs --measure             # also run the audit over each painted frame
     node tools/shot.cjs --reduced-motion      # emulate prefers-reduced-motion: reduce
     node tools/shot.cjs --probe=@file         # evaluate an expression after the page settles
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

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const hit = argv.find(a => a.startsWith('--' + name + '='));
  return hit ? hit.split('=')[1] : dflt;
};
const has = (name) => argv.includes('--' + name);

/* --file lets the camera run against a *bundled* copy rather than the repo source.
   The Android shell resolves every relative path against file:///android_asset/, so
   the APK's page sits one layout deeper than the repo's — only photographing the
   copy that actually ships can prove the images and fonts are where it will look. */
const APP_FILE = path.resolve(ROOT, flag('file', 'Sukinnect-next.html'));

const WIDTH = parseInt(flag('width', '390'), 10);
const HEIGHT = parseInt(flag('height', '844'), 10);
const DPR = parseFloat(flag('dpr', '2'));
const OUT = path.join(ROOT, flag('out', '.shots'));
const DESKTOP = has('desktop');
/* App mode (?app=1) is what the Android WebView loads: no phone frame, the UI
   fills the viewport. That is the only view where a 390x844 shot is honest. */
const APP_MODE = !DESKTOP;
const ONLY = (flag('only', '') || '').split(',').map(s => s.trim()).filter(Boolean);
const MEASURE = has('measure');
/* Asks Chrome to report prefers-reduced-motion, so a claim that the app honours
   that setting can be measured instead of assumed. */
const REDUCED = has('reduced-motion');
const PROBE = flag('probe', '');

/* ------------------------------------------------------------------ the audit
   A screenshot shows one screen to one pair of eyes; these numbers run over every
   screen and ask the questions that are easy to get wrong by eye: is anything
   tappable smaller than a thumb, is any text invisible against its own background,
   is anything clipped, is the type scale being honoured, does the bottom nav sit
   over content. All of it is measured in the painted page, so it can only report
   what a real browser actually laid out.
   -------------------------------------------------------------------------------- */
const AUDIT_JS = `(function(){
  const out = { small: [], unlabelled: [], truncated: [], previews: [], offScale: [], contrast: [], overlaps: [], stretched: [], broken: [], remote: [], svgSmall: [], vendor: [], mapEscape: [], occluded: [], nameless: [], placeholderOnly: [], catMotion: [], hOverflow: 0 };
  const vw = document.documentElement.clientWidth;
  out.hOverflow = document.documentElement.scrollWidth - vw;
  const TAP = 44;
  const text = (el) => [(el.textContent || ''), (el.getAttribute('aria-label') || ''), el.placeholder || '', el.title || '', el.id || '']
      .map(s => s.trim().replace(/\s+/g,' ')).find(s => s.length) || '';
  const painted = (el) => {
    const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    if (!r.width || !r.height) return null;
    if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) return null;
    return r;
  };
  /* Chrome drawn by a vendored library, counted apart from our own defects. The
     OpenStreetMap attribution link is a licence condition and must stay, and the
     marker is an <img> that Leaflet sizes and positions itself. Resizing either
     means fighting vendor CSS, so they are reported, not fixed. */
  const vendor = (el) => !!(el.closest && el.closest('.leaflet-container'));

  document.querySelectorAll('button, a, input:not([type=hidden]), select, textarea, [role=button], [data-open-chat-id], .navitem, .chip[onclick], .pick, .filter-option').forEach(el => {
    const r = painted(el); if (!r) return;
    if (vendor(el)) { out.vendor.push({ what: text(el).slice(0, 30) || el.tagName.toLowerCase() }); return; }
    const s = getComputedStyle(el);
    const clickable = el.tagName !== 'DIV' && el.tagName !== 'SPAN' || el.onclick || el.getAttribute('onclick') || el.dataset.openChatId;
    if (!clickable) return;
    /* A link inside a sentence cannot take a height; WCAG measures those at 24px,
       not 44. Only box-shaped controls are held to the tap floor. */
    const inline = getComputedStyle(el).display === 'inline';
    if (inline && r.height >= 24 - 0.6) return;
    /* A 23px input inside a 56px pill is a 56px target only if the pill forwards the touch.
       A <label> does — the browser activates its control. So does an ancestor <button>, <a>
       or <summary>, or anything with its own handler. An inert div wrapping padding over the
       page background does not: the only place you can hit is the control itself. The first
       version of this walked the ancestors, computed the bigger box, printed its own comment
       about the pill, and then measured the control anyway. */
    const forwards = (w) => w.tagName === 'LABEL' ? w.control === el
      : (/^(BUTTON|A|SUMMARY)$/.test(w.tagName) || !!w.onclick || !!w.getAttribute('onclick'));
    let reachH = r.height, reachW = r.width, via = 'self';
    for (let p = el.parentElement, up = 0; p && up < 3; p = p.parentElement, up++) {
      const pr = painted(p); if (!pr || !forwards(p)) continue;
      if (pr.height > reachH) { reachH = pr.height; via = p.tagName.toLowerCase(); }
      if (pr.width > reachW) reachW = pr.width;
      if (reachH >= TAP) break;
    }
    if (reachH < TAP - 0.6 || reachW < 28)
      out.small.push({ what: text(el).slice(0, 30) || el.tagName.toLowerCase(), h: Math.round(r.height), w: Math.round(r.width),
                       boxH: Math.round(reachH), inline, via, cls: (el.className||'').toString().split(' ')[0] });
    if (!text(el)) out.unlabelled.push({ unlabelled: el.tagName.toLowerCase() + '.' + ((el.className||'').toString().split(' ')[0] || '-') });
  });

  /* A form control a screen reader cannot name. This is asked of the live DOM rather than
     read out of the source, because el.labels is the browser's own answer — it counts a
     wrapping label element, a for=, and an aria-labelledby, where a text scan has to guess
     at all three and gets it wrong in both directions. A field whose only name is its
     placeholder is listed separately, not failed: it does announce, but the name disappears
     the moment anyone types, which is the worst possible moment to lose it. */
  document.querySelectorAll('input, select, textarea').forEach(el => {
    if (!painted(el) || vendor(el)) return;
    if (el.type === 'hidden') return;
    const named = (el.labels && el.labels.length) ||
      el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') ||
      (el.closest('label') && text(el.closest('label')).trim());
    const who = (el.tagName.toLowerCase() + '#' + (el.id || '-') +
      '.' + (((el.className || '').toString().split(' ')[0]) || '-')).slice(0, 46);
    if (!named && el.placeholder) out.placeholderOnly.push({ field: who, hint: el.placeholder.slice(0, 32) });
    else if (!named) out.nameless.push({ field: who });
  });

  /* Category artwork must be still — an owner's rule, and the one thing a source
     grep cannot prove: a class with no rule, or a rule with a typo, both read fine
     in text. Ask the painted page instead. A reduced-motion page reports a duration
     of 1e-05s and one iteration, which is the app honouring a preference, so only a
     loop that actually runs counts as motion. */
  document.querySelectorAll('.cat, .cat *').forEach(el => {
    const s = getComputedStyle(el);
    const runs = s.animationName && s.animationName !== 'none' &&
      parseFloat(s.animationDuration) > 0.01 && s.animationIterationCount !== '1';
    const moves = /transform/.test(s.transitionProperty || '') && parseFloat(s.transitionDuration) > 0.01;
    if (runs || moves) {
      out.catMotion.push({ what: (el.getAttribute('class') || el.tagName) +
        (runs ? ' animation:' + s.animationName : '') + (moves ? ' transition:transform' : '') });
    }
  });

  /* SVG text is drawn in viewBox units and then scaled to the element's width, so a
     chart that declares 15px can PAINT 13.3px on a narrow phone. The off-scale-font
     check above reads computed style, which always reports the declared value — it
     could not see this, and the app's own 14px floor was quietly broken inside every
     chart for a whole pass before a probe caught it. */
  document.querySelectorAll('svg text').forEach(t => {
    const host = t.ownerSVGElement; if (!host) return;
    const vb = host.viewBox && host.viewBox.baseVal; if (!vb || !vb.width) return;
    const w = host.getBoundingClientRect().width; if (!w) return;
    const declared = parseFloat(t.getAttribute('font-size')) || parseFloat(getComputedStyle(t).fontSize);
    if (!declared) return;
    const rendered = Math.round(declared * (w / vb.width) * 10) / 10;
    if (rendered < 14) out.svgSmall.push({ text: (t.textContent || '').trim().slice(0, 16),
      declared: declared, rendered: rendered, box: Math.round(w) });
  });

  /* Anything the nav actually traps. Content sliding under a glass bar while you
     scroll is normal and wanted; a control that is still covered when the screen
     is scrolled to its end is not. So scroll to the bottom first, then ask. */
  const nav = document.querySelector('.bottomnav');
  if (nav) {
    const scroller = document.querySelector('#screen') || document.scrollingElement;
    const was = scroller.scrollTop;
    /* The screen scrolls smoothly by contract, so a plain scrollTop assignment
       starts an animation and the measurement would catch it mid-glide. Turn the
       behaviour off for the duration of the test, the same way the app does when
       it restores a scroll position. */
    const behaviour = scroller.style.scrollBehavior;
    scroller.style.scrollBehavior = 'auto';
    scroller.scrollTop = scroller.scrollHeight;
    const nr = nav.getBoundingClientRect();
    document.querySelectorAll('#screen button, #screen a, #screen input, #screen select').forEach(el => {
      const r = painted(el); if (!r) return;
      if (vendor(el)) return;
      if (r.bottom <= nr.top + 1) return;
      const cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
      if (cx < 0 || cy < 0 || cx > vw || cy > document.documentElement.clientHeight) return;
      const hit = document.elementFromPoint(cx, cy);
      if (hit && (hit === nav || nav.contains(hit)))
        out.overlaps.push({ what: text(el).slice(0, 30), underBy: Math.round(r.bottom - nr.top) });
    });
    scroller.scrollTop = was;
    scroller.style.scrollBehavior = behaviour;
  }

  /* clipped or ellipsised text */
  document.querySelectorAll('#screen *, .sheet *, .auth-sheet *').forEach(el => {
    if (el.children.length) return;
    const t = (el.textContent || '').trim(); if (!t) return;
    const s = getComputedStyle(el);
    if (s.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1)
      out.previews.push({ text: t.slice(0, 30), lost: el.scrollWidth - el.clientWidth });
    else if (el.scrollWidth > el.clientWidth + 3 && /hidden/.test(s.overflow))
      out.truncated.push({ text: t.slice(0, 30), lost: el.scrollWidth - el.clientWidth, hidden: true });
  });

  /* the type scale */
  const rootS = getComputedStyle(document.documentElement);
  const scale = ['t-display','t-title-lg','t-num','t-title','t-lead','t-body-lg','t-input','t-body','t-body-sm','t-caption']
    .map(t => parseFloat(rootS.getPropertyValue('--' + t))).filter(Boolean);
  const seenSizes = {};
  document.querySelectorAll('#screen *, .sheet *, .auth-sheet *').forEach(el => {
    if (el.children.length) return;
    if (!(el.textContent || '').trim()) return;
    const f = Math.round(parseFloat(getComputedStyle(el).fontSize) * 10) / 10;
    if (!f) return;
    seenSizes[f] = (seenSizes[f] || 0) + 1;
    if (!scale.some(s => Math.abs(s - f) < 0.7))
      out.offScale.push({ size: f, text: (el.textContent || '').trim().slice(0, 24) });
  });
  out.usedSizes = Object.keys(seenSizes).map(Number).sort((a,b)=>a-b);

  /* contrast against what is actually painted behind the text */
  const rgba = (s) => { const m = (s||'').match(/rgba?\\(([\\d.]+),\\s*([\\d.]+),\\s*([\\d.]+)(?:,\\s*([\\d.]+))?\\)/); return m ? [+m[1],+m[2],+m[3], m[4]===undefined?1:+m[4]] : null; };
  const over = (fg, bg) => [0,1,2].map(i => fg[i]*fg[3] + bg[i]*(1-fg[3]));
  const lum = (c) => { const f = v => { v/=255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }; return 0.2126*f(c[0]) + 0.7152*f(c[1]) + 0.0722*f(c[2]); };
  const ratio = (a, b) => { const L1 = lum(a), L2 = lum(b); return (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05); };
  /* Contrast against what is actually painted behind the text.
     Taking the "worst stop" of a gradient is wrong — white text on a navy→blue
     header reads as white-on-white if the gradient happens to end in white. The
     colour has to be evaluated where the text actually sits: project the element's
     centre onto the gradient line of the painted box and interpolate the stops. */
  function splitTop(s){
    const out2 = []; let depth = 0, cur = '';
    for (const ch of s) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { out2.push(cur); cur = ''; } else cur += ch;
    }
    if (cur.trim()) out2.push(cur);
    return out2;
  }
  function toDeg(tok){
    if (/deg$/.test(tok)) return parseFloat(tok);
    const dir = { 'to top':0, 'to top right':45, 'to right':90, 'to bottom right':135,
                  'to bottom':180, 'to bottom left':225, 'to left':270, 'to top left':315 };
    return dir[tok.replace(/\\s+/g,' ').trim()] ?? 180;
  }
  function parseGradient(img){
    const m = img.match(/linear-gradient\\((.*)\\)/);
    if (!m) return null;
    const parts = splitTop(m[1]);
    let angle = 180;
    const head = parts[0].trim();
    const am = head.match(/^(to\\s+\\w+(?:\\s+\\w+)?|[\\d.]+deg)/i);
    if (am && parts.length > 2) { angle = toDeg(am[0]); parts.shift(); }
    const stops = [];
    parts.forEach((p, i, arr) => {
      const c = rgba(p); if (!c) return;
      const pm = p.match(/([\\d.]+)%\\s*$/);
      stops.push({ c, pos: pm ? parseFloat(pm[1]) / 100 : (arr.length === 1 ? 0 : i / (arr.length - 1)) });
    });
    return stops.length ? { angle, stops } : null;
  }
  function sample(stops, t){
    if (t <= stops[0].pos) return stops[0].c;
    if (t >= stops[stops.length-1].pos) return stops[stops.length-1].c;
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i], b = stops[i+1];
      if (t >= a.pos && t <= b.pos) {
        const k = (t - a.pos) / ((b.pos - a.pos) || 1);
        return [0,1,2,3].map(j => a.c[j] + (b.c[j] - a.c[j]) * k);
      }
    }
    return stops[stops.length-1].c;
  }
  function gradAt(node, spec, cx, cy){
    const r = node.getBoundingClientRect();
    const rad = spec.angle * Math.PI / 180;
    const dx = Math.sin(rad), dy = -Math.cos(rad);
    const L = Math.abs(r.width * dx) + Math.abs(r.height * dy);
    const t = (((cx - (r.left + r.width/2)) * dx) + ((cy - (r.top + r.height/2)) * dy)) / (L || 1) + 0.5;
    return sample(spec.stops, Math.max(0, Math.min(1, t)));
  }
  function backdrop(el){
    const layers = [];
    let n = el;
    while (n) {
      const s = getComputedStyle(n);
      const c = rgba(s.backgroundColor);
      if (c && c[3] > 0) layers.push({ solid: c });
      const img = s.backgroundImage || '';
      if (img.indexOf('linear-gradient') > -1) {
        const spec = parseGradient(img);
        if (spec) layers.push({ grad: spec, node: n });
      }
      n = n.parentElement;
    }
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width/2, cy = r.top + r.height/2;
    let acc = [255,255,255,1];
    for (const L of layers.slice().reverse())
      acc = over(L.solid || Object.assign(gradAt(L.node, L.grad, cx, cy), { 3: 1 }), acc);
    return acc;
  }
  document.querySelectorAll('#screen *, .sheet *, .auth-sheet *').forEach(el => {
    if (el.children.length) return;
    const t = (el.textContent || '').trim(); if (t.length < 2) return;
    const r = painted(el); if (!r) return;
    const s = getComputedStyle(el);
    const fg = rgba(s.color); if (!fg) return;
    const size = parseFloat(s.fontSize), bold = +s.fontWeight >= 700;
    const need = (size >= 24 || (size >= 18.66 && bold)) ? 3 : 4.5;
    const bg = backdrop(el);
    const got = ratio(over(fg, bg), bg);
    if (got < need - 0.01)
      out.contrast.push({ text: t.slice(0, 26), ratio: Math.round(got*100)/100, need, size, weight: s.fontWeight,
                          on: 'rgb(' + bg.slice(0,3).map(Math.round).join(',') + ')' });
  });

  /* the official mark must keep its proportions (AGENTS.md 10) */
  document.querySelectorAll('img').forEach(el => {
    const src = (el.getAttribute('src') || '').slice(0, 44);
    /* A missing file used to be invisible here. The proportion test below needs
       naturalWidth and returns early at zero — which is precisely what a broken
       image looks like. The category tiles are image files now, so a dangling path
       is a blank square on the front door of the app and nothing reported it. */
    /* complete && no pixels is a real failure. An image that has not finished is not:
       the first version of this check reported four OpenStreetMap tiles that were
       simply still in flight, which is a false alarm on every screen that mounts a
       map — and a tally that cries wolf gets ignored, which is worse than no tally. */
    if (src && el.complete && el.naturalWidth === 0) { out.broken.push({ src, why: 'no pixels' }); return; }
    const r = painted(el); if (!r) return;
    const natural = el.naturalWidth / el.naturalHeight, drawn = r.width / r.height;
    if (Math.abs(natural - drawn) / natural > 0.04)
      out.stretched.push({ src: src.slice(0,26), natural: Math.round(natural*100)/100, drawn: Math.round(drawn*100)/100 });
  });
  /* The WebView loads this file off disk with no network (AGENTS.md 81), so every
     resource the page actually fetched must be a file: or a data: URL. This asks the
     browser what it requested rather than trusting a grep of the source. */
  (performance.getEntriesByType('resource') || []).forEach(e => {
    if (/^(https?|ws|wss):/i.test(e.name)) out.remote.push({ url: e.name.slice(0, 72), kind: e.initiatorType || '-' });
  });
  /* mountMap() marks every map with .map-mount so Leaflet's absolutely placed panes
     have a frame to resolve against. Leaflet does set that position itself, but
     only asynchronously — late enough that the first second of a map's life painted
     its tiles across the card above (seen in a real screenshot). Checking the mark
     rather than the computed position keeps the test deterministic: waiting for the
     page to heal itself hides exactly the window that a person sees. */
  document.querySelectorAll('.leaflet-container').forEach(el => {
    const cr = el.getBoundingClientRect();
    if (!cr.width || !cr.height) return;
    if (!el.classList.contains('map-mount'))
      out.mapEscape.push({ what: el.id || '(unnamed)', why: 'mounted without .map-mount' });
    else if (getComputedStyle(el).position === 'static')
      out.mapEscape.push({ what: el.id || '(unnamed)', why: '.map-mount is not positioning the frame' });
  });
  /* A modal layer is only modal if it is actually on top. Sample points across the
     open sheet and ask the page what is really there: a lower layer with a large
     internal z-index (Leaflet puts 1000 on its own controls) will answer for a
     point the sheet believes it owns. */
  const top = document.querySelector('.sheet-layer, .modal-layer');
  if (top) {
    const panel = top.querySelector('.sheet, .modal-card') || top;
    const pr = panel.getBoundingClientRect();
    if (pr.width > 4 && pr.height > 4) {
      for (let ix = 1; ix <= 4; ix++) {
        for (let iy = 1; iy <= 4; iy++) {
          const x = Math.round(pr.left + pr.width * ix / 5);
          const y = Math.round(pr.top + pr.height * iy / 5);
          if (x < 0 || y < 0 || x > vw || y > document.documentElement.clientHeight) continue;
          const hit = document.elementFromPoint(x, y);
          if (hit && !top.contains(hit) && !hit.contains(top)) {
            out.occluded.push({ what: (hit.className || hit.tagName).toString().split(' ')[0],
              at: ix + '/' + iy });
          }
        }
      }
    }
  }
  return out;
})()`;

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
  ['resident-results', `state.view='app'; state.role='resident'; startDiscovery('leak');`],
  /* Reached the way a tap reaches it. openProviderDetail() is what mounts the
     map; assigning state.tab skips that and photographs an empty frame. */
  ['provider-detail',  `state.view='app'; state.role='resident'; state.tab='results'; render();
                        openProviderDetail(PROVIDERS[0].id, 'results');`],
  ['booking-sheet',    `state.view='app'; state.role='resident'; openProviderDetail(PROVIDERS[0].id, 'results');
                        openBookingRequest(); state.requestDraft.service='Kitchen faucet keeps leaking near the cabinet.';
                        state.sheet='bookingRequest'; render();`],
  ['booking-detail',   `state.view='app'; state.role='resident';
                        openBookingDetail(BOOKINGS.find(b=>b.status==='upcoming'&&b.customerId===CURRENT_CUSTOMER_ID).id);`],
  /* The pilot category, reached the way a resident reaches it: pick the category's
     provider, open the sheet, choose a mode. Screens nobody can navigate to are
     not screens — they are markup. */
  ['fruit-sheet',      `state.view='app'; state.role='resident'; openProviderDetail('p7', 'results');
                        openBookingRequest(); state.requestDraft.mode='sell_fruit';
                        state.requestDraft.fruit={ fruitType:'Mango', treeCount:1,
                          estimatedQuantityGrams:40000, treeHeightBand:'about 5 metres, ladder needed',
                          ownershipConfirmed:true };
                        state.sheet='bookingRequest'; render();`],
  ['fruit-harvest-sheet', `state.view='app'; state.role='resident'; openProviderDetail('p7', 'results');
                        openBookingRequest(); state.requestDraft.mode='harvest_only';
                        state.requestDraft.fruit={ fruitType:'Mango', treeCount:2,
                          estimatedQuantityGrams:25000 };
                        state.sheet='bookingRequest'; render();`],
  ['fruit-offer',      `state.view='app'; state.role='resident';
                        openBookingDetail(BOOKINGS.find(b=>b.id==='b8').id);`],

  ['booking-tracking', `state.view='app'; state.role='resident';
                        openBookingDetail(BOOKINGS.find(b=>b.status==='ongoing'&&b.customerId===CURRENT_CUSTOMER_ID).id);`],
  ['resident-bookings',`state.view='app'; state.role='resident'; state.tab='bookings'; render();`],
  ['messages',         `state.view='app'; state.role='resident'; state.tab='messages'; state.isChatOpen=false; render();`],
  ['chat-room',        `state.view='app'; state.role='resident'; state.tab='messages';
                        openChatThread(PROVIDERS[0].id, bookingsForResident()[0] && bookingsForResident()[0].id);
                        state.isChatOpen=true; render();`],
  ['resident-profile', `state.view='app'; state.role='resident'; state.tab='profile'; render();`],
  ['concierge',        `state.view='app'; state.role='resident'; state.tab='concierge'; render();`],
  ['notifications',    `state.view='app'; state.role='resident'; state.tab='notifications'; render();`],
  ['provider-dash',    `state.view='app'; state.role='provider'; state.tab='dashboard'; render();`],
  /* The pilot's provider side, reached by signing in as the fruit pro rather than
     by a parallel app: same shell, same screens, different identity. */
  ['fruit-provider-dash', `applyProviderIdentity('p7');
                        state.view='app'; state.role='provider'; state.tab='dashboard'; render();`],
  ['fruit-request',    `applyProviderIdentity('p7');
                        state.view='app'; state.role='provider'; state.tab='provider_booking_detail';
                        openProviderBooking('b10'); render();`],
  ['offer-sheet',      `applyProviderIdentity('p7');
                        state.view='app'; state.role='provider'; state.tab='provider_booking_detail';
                        openProviderBooking('b10'); openMakeOffer('b10');
                        offerInput('unitPesos','55'); offerInput('labourPesos','1600'); render();`],
  ['fruit-harvest-job',`applyProviderIdentity('p7');
                        state.view='app'; state.role='provider'; state.tab='provider_booking_detail';
                        openProviderBooking('b9'); render();`],
  ['fruit-provider-profile', `applyProviderIdentity('p7');
                        state.view='app'; state.role='provider'; state.tab='profile'; render();`],
  ['provider-fsm',     `state.view='app'; state.role='provider'; state.tab='fsm'; render();`],
  ['provider-bookings',`state.view='app'; state.role='provider'; state.tab='bookings'; render();`],
  ['provider-job',     `state.view='app'; state.role='provider'; state.tab='bookings'; render();
                        openProviderBooking(pendingProviderRequests()[0].id);`],
  ['provider-profile', `state.view='app'; state.role='provider'; state.tab='profile'; render();`],
  /* The profile modules open as sheets, and until now no sheet like this was in the table at
     all — so the resident's spending card and the provider's new credential list had never been
     photographed or measured, which is exactly how the invented history survived a suite that
     renders every screen it knows about. */
  ['resident-spending',  `state.view='app'; state.role='resident'; state.tab='profile'; render();
                          openProfileSection('resident','spending','Spending summary','Paid, by service');`],
  ['provider-credentials', `state.view='app'; state.role='provider';
                          state.tab='profile'; render();
                          openProfileSection('provider','credentials','Credentials','Documents on file');`],
  ['admin-dash',       `state.view='app'; state.role='admin'; state.tab='admin_dashboard'; state.adminScreen='overview'; render();`],
  ['admin-finance',    `state.view='app'; state.role='admin'; state.tab='admin_dashboard'; state.adminScreen='finance'; render();`],
  ['admin-trust',      `state.view='app'; state.role='admin'; state.tab='admin_dashboard'; state.adminScreen='trust'; render();`],
  ['admin-intel',      `state.view='app'; state.role='admin'; state.tab='admin_dashboard'; state.adminScreen='intelligence'; render();`],
  ['admin-categories', `state.view='app'; state.role='admin'; state.tab='admin_dashboard'; state.adminScreen='categories'; render();`],

  ['admin-verifiers',  `state.view='app'; state.role='admin'; state.tab='admin_verifications'; state.adminProviderCategory='pending'; render();`],
  ['admin-verified',   `state.view='app'; state.role='admin'; state.tab='admin_verifications'; state.adminProviderCategory='verified'; render();`],
  ['admin-desk',       `state.view='app'; state.role='admin'; state.tab='admin_disputes'; render();`],
  ['admin-provider',   `state.view='app'; state.role='admin'; state.tab='admin_provider_profile';
                        state.selectedAdminProvider='p1'; state.adminProviderSection='overview'; render();`],
  /* The admin's fourth nav item is "Account", and it renders adminProfile() through the same
     tab='profile' dispatch the other two roles use. It sat out every camera run since the
     table was written — 46 screens never included it — and it is the screen that holds the
     admin's editable name, phone and office. */
  ['admin-account',    `state.view='app'; state.role='admin'; state.tab='profile'; render();`],
  ['case-sheet',       `state.view='app'; state.role='resident'; state.tab='booking_detail';
                        const b=BOOKINGS.find(x=>x.status==='completed'&&x.pricing); b.completedAt=new Date().toISOString();
                        state.selectedBookingId=b.id; render(); openCaseSheet(b.id);`],
  ['empty-search',     `state.view='app'; state.role='resident'; state.tab='results';
                        state.searchQuery='piano tuning'; state.providerFilters=blankFilters(); render();`],

  /* ---- screens that change the data: reset first, and kept last ----
     The whole run happens in one page session, so a screen that answers an offer
     leaves nothing for the next one that needs one — and quietly dirties every
     screen after it. Each of these calls the app's own reset before it sets up, so
     it photographs the state its name claims rather than whatever ran before it. */
  ['fruit-record',     `resetDemoData(); state.view='app'; state.role='resident';
                        answerOffer('b8','accept',{ role:'customer', id:CURRENT_CUSTOMER_ID });
                        openBookingDetail('b8');`],
  ['fruit-voided',     `resetDemoData(); state.view='app'; state.role='resident';
                        answerOffer('b8','accept',{ role:'customer', id:CURRENT_CUSTOMER_ID });
                        attemptTransition('b8','cancelled',{ role:'provider', id:'p8' },
                          { reason:'Could not do the job' });
                        openBookingDetail('b8');`],
  ['admin-intel-produce', `resetDemoData(); state.view='app'; state.role='admin';
                        answerOffer('b8','accept',{ role:'customer', id:CURRENT_CUSTOMER_ID });
                        state.tab='admin_dashboard'; state.adminScreen='intelligence'; render();`],
  /* The weighing step, photographed from both sides of the same job. b10 is the
     harvest-and-buy that p7 can actually walk, so these three set it up the way the
     app does — offer, answer, arrive — rather than assigning a state nobody could. */
  ['fruit-weighed',    `resetDemoData(); applyProviderIdentity('p7');
                        makeOffer('b10',{ basis:'per_kg', quantityGrams:120000, unitPriceCentavos:5500,
                          produceCentavos:660000, labourCentavos:0, whoHarvests:'provider' },{ role:'provider' });
                        answerOffer('b10','accept',{ role:'customer', id:CURRENT_CUSTOMER_ID });
                        ['upcoming','en_route','arrived'].forEach(t =>
                          attemptTransition('b10', t, { role:'provider', id:'p7' }));
                        finaliseProduce('b10',{ quantityGrams:31000, note:'A third was damaged and left' },{ role:'provider' });
                        state.view='app'; state.role='provider'; state.tab='provider_booking_detail';
                        openProviderBooking('b10'); render();
                        document.querySelector('.finalise-card').scrollIntoView();`],
  ['finalise-sheet',   `resetDemoData(); applyProviderIdentity('p7');
                        makeOffer('b10',{ basis:'per_kg', quantityGrams:120000, unitPriceCentavos:5500,
                          produceCentavos:660000, labourCentavos:0, whoHarvests:'provider' },{ role:'provider' });
                        answerOffer('b10','accept',{ role:'customer', id:CURRENT_CUSTOMER_ID });
                        ['upcoming','en_route','arrived'].forEach(t =>
                          attemptTransition('b10', t, { role:'provider', id:'p7' }));
                        state.view='app'; state.role='provider'; state.tab='provider_booking_detail';
                        openProviderBooking('b10'); openFinalise('b10');
                        /* Type it the way the phone does. The field deliberately keeps its
                           own value while the totals update under it, so a script that only
                           moved the model would photograph a field and a total that never
                           occur together. */
                        document.getElementById('final-qty').value='31'; finalInput('qtyKg','31');`],
  ['finalise-warn',    `resetDemoData(); applyProviderIdentity('p7');
                        makeOffer('b10',{ basis:'per_kg', quantityGrams:120000, unitPriceCentavos:5500,
                          produceCentavos:660000, labourCentavos:0, whoHarvests:'provider' },{ role:'provider' });
                        answerOffer('b10','accept',{ role:'customer', id:CURRENT_CUSTOMER_ID });
                        ['upcoming','en_route','arrived'].forEach(t =>
                          attemptTransition('b10', t, { role:'provider', id:'p7' }));
                        state.view='app'; state.role='provider'; state.tab='provider_booking_detail';
                        openProviderBooking('b10'); openFinalise('b10');
                        /* A scale reads in grams; this field asks for kilos. Typed the way a
                           person holding a scale readout would type it. */
                        document.getElementById('final-qty').value='31000'; finalInput('qtyKg','31000');`],
  ['fruit-weighed-record', `resetDemoData(); applyProviderIdentity('p7');
                        makeOffer('b10',{ basis:'per_kg', quantityGrams:120000, unitPriceCentavos:5500,
                          produceCentavos:660000, labourCentavos:0, whoHarvests:'provider' },{ role:'provider' });
                        answerOffer('b10','accept',{ role:'customer', id:CURRENT_CUSTOMER_ID });
                        ['upcoming','en_route','arrived'].forEach(t =>
                          attemptTransition('b10', t, { role:'provider', id:'p7' }));
                        finaliseProduce('b10',{ quantityGrams:31000 },{ role:'provider' });
                        state.view='app'; state.role='resident'; openBookingDetail('b10');
                        document.querySelector('.produce-card').scrollIntoView();`],
];

/* The table is data, and data can be wrong in ways the parser will not report. A
   missing comma between two entries does not throw — it parses the second as a
   subscript on the first, which evaluates to undefined, and the screen simply stops
   being measured while the tool goes on printing a count that looks like coverage.
   This ran into exactly that: 42 entries, 40 measured, no complaint anywhere. */
(function validateScreens(){
  const bad = [];
  SCREENS.forEach((entry, i) => {
    if (!Array.isArray(entry) || entry.length !== 2 ||
        typeof entry[0] !== 'string' || typeof entry[1] !== 'string')
      bad.push('#' + i + ' ' + JSON.stringify(entry));
  });
  const names = SCREENS.map(x => x && x[0]);
  const dupes = names.filter((n, i) => n && names.indexOf(n) !== i);
  if (bad.length || dupes.length) {
    console.error('SCREENS table is malformed — refusing to report a screen count.');
    if (bad.length)    console.error('  not a [name, script] pair: ' + bad.join(', '));
    if (dupes.length)  console.error('  duplicate names: ' + dupes.join(', '));
    process.exit(1);
  }
})();

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
  if (REDUCED) {
    await session.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    console.log('  emulating prefers-reduced-motion: reduce');
  }

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
      await sleep(parseInt(flag('wait', APP_MODE ? '700' : '900'), 10));
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
         querySelector returns the first match in DOCUMENT order, not in the order of
         the selector list, so the layers are asked one at a time: a sheet on top
         outranks the screen behind it. The last two fallbacks exist because the root
         tabs carry a bare <h1> with no class on it — the resident's name, not a page
         heading — so the tool printed "(untitled)" over a screen that does have a
         title, and a column of lies teaches you to stop reading the column.
         "(untitled)" now means genuinely no heading was found. */
      const seen = await session.evaluate(`(function(){
         const t = document.querySelector('.sheet .sheet-title') || document.querySelector('.chat-head-name') ||
                   document.querySelector('.auth-sheet .auth-wordmark') || document.querySelector('#screen .topbar .title') ||
                   document.querySelector('#screen .card-title') || document.querySelector('#screen h1') ||
                   document.querySelector('#screen h2');
         const a = document.querySelector('.sheet, .auth-sheet, .chat-list');
         const el = a || document.getElementById('screen');
         return { title: t ? t.textContent.trim().replace(/\\s+/g,' ').slice(0,40) : '(untitled)',
                  sheet: (typeof state !== 'undefined' && state.sheet) || '-',
                  where: (typeof state !== 'undefined' ? state.view + '/' + state.role + ':' + state.tab : '?'),
                  overflow: el ? el.scrollHeight - el.clientHeight : 0 };
      })()`);
      /* --probe='JS' runs an expression after the navigation and prints what the
         page answers. Half of this audit was a wrong theory about a painted box,
         and the cheap way to settle a theory is to ask the page. */
      if (PROBE) {
        /* Its own try, because a bad probe string used to be reported as "page threw" —
           which reads as an app defect to whoever is holding the output, when the only
           thing that broke was the question. (@file is loaded relative to the repo; a
           bare path without the @ is evaluated as JavaScript and fails on its first ':'.) */
        try {
          const expr = PROBE.startsWith('@') ? fs.readFileSync(path.resolve(ROOT, PROBE.slice(1)), 'utf8') : PROBE;
          console.log('    probe → ' + JSON.stringify(await session.evaluate(`(function(){ try { return (${expr}); } catch(e){ return 'threw: ' + e.message; } })()`)));
        } catch (err) { console.log('    probe failed (not a page fault): ' + err.message.split('\n')[0]); }
      }
      const shot = await session.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const file = path.join(OUT, name + '.png');
      fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
      /* Measure the same painted frame that was just photographed. */
      let audit = null;
      if (MEASURE) {
        try { audit = await session.evaluate(AUDIT_JS); } catch (e) { audit = { error: e.message }; }
      }
      manifest.push({ name, shows: seen.title, sheet: seen.sheet, where: seen.where, file: path.relative(ROOT, file), overflow: seen.overflow, viewport: WIDTH + 'x' + HEIGHT, audit });
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
  if (MEASURE) {
    const flat = (key) => manifest.flatMap(m => (m.audit && m.audit[key] || []).map(x => ({ screen: m.name, ...x })));
    const tally = (rows, label, fmt) => {
      console.log('\n' + label + ': ' + rows.length);
      const byScreen = {};
      rows.forEach(r => { byScreen[r.screen] = (byScreen[r.screen] || 0) + 1; });
      Object.entries(byScreen).sort((a, b) => b[1] - a[1]).slice(0, 8)
        .forEach(([s, n]) => console.log('  ' + s.padEnd(22) + n));
      const uniq = new Map();
      rows.forEach(r => { const k = fmt(r); if (!uniq.has(k)) uniq.set(k, r); });
      [...uniq.values()].slice(0, 14).forEach(r => console.log('    · ' + fmt(r)));
      if (uniq.size > 14) console.log('    … ' + (uniq.size - 14) + ' more');
    };
    const small = flat('small').filter(r => r.boxH < 44), contrast = flat('contrast'), trunc = flat('truncated'),
          previews = flat('previews'),
          off = flat('offScale'), over = flat('overlaps'), unl = flat('unlabelled'), str = flat('stretched');
    tally(small, 'controls under a 44px tap target', r => r.screen + ' "' + r.what + '" ' + r.w + 'x' + r.h + 'px' + (r.boxH > r.h ? ' (wrapper ' + r.boxH + 'px)' : ''));
    tally(contrast, 'text below WCAG contrast', r => r.screen + ' "' + r.text + '" ' + r.ratio + ':1 (needs ' + r.need + ', ' + r.size + 'px w' + r.weight + ' on ' + r.on + ')');
    tally(trunc, 'text clipped by its own container', r => r.screen + ' "' + r.text + '" loses ' + r.lost + 'px' + (r.ellipsis ? ' (ellipsis)' : ''));
    tally(off, 'font sizes off the type scale', r => r.screen + ' ' + r.size + 'px "' + r.text + '"');
    tally(over, 'content sitting under the bottom nav', r => r.screen + ' "' + r.what + '" by ' + r.underBy + 'px');
    tally(unl, 'clickable things with no accessible name', r => r.screen + '  ' + r.unlabelled);
    tally(flat('nameless'), 'form controls a screen reader cannot name', r => r.screen + '  ' + r.field);
    tally(str, 'images drawn out of proportion', r => r.screen + '  ' + r.src + ' natural ' + r.natural + ' drawn ' + r.drawn);
    tally(flat('mapEscape'), 'map panes painted outside their own frame', r => r.screen + '  ' + r.what + ' — ' + r.why);
    tally(flat('occluded'), 'something painting on top of an open modal layer', r => r.screen + '  ' + r.what + ' at sample ' + r.at);
    tally(flat('catMotion'), 'category artwork moving in the painted page', r => r.screen + '  ' + r.what);
    tally(flat('broken'), 'images that asked for a file and got no pixels', r => r.screen + '  ' + r.src + ' — ' + r.why);
    tally(flat('remote'), 'requests that left the device for a network', r => r.screen + '  ' + r.kind + '  ' + r.url);
    tally(flat('svgSmall'), 'chart text that paints below the 14px floor', r => r.screen + '  "' + r.text + '" declares ' + r.declared + 'px, paints ' + r.rendered + 'px');
    const vend = flat('vendor');
    console.log('\nvendor-owned controls excluded (Leaflet attribution + markers, not ours to resize): ' +
      vend.length + (vend.length ? '  e.g. ' + [...new Set(vend.map(r => r.what || 'unlabelled <img>'))].slice(0, 4).join(' | ') : ''));
    const weak = flat('placeholderOnly');
    console.log('\nfields whose only name is a placeholder (it vanishes on typing; listed for review): ' + weak.length + (weak.length ? '  ' + weak.slice(0, 6).map(r => r.screen + ' ' + r.field).join(', ') : ''));
    console.log('\nsingle-line previews shortened with an ellipsis (intended, listed for review): ' + previews.length + (previews.length ? '  e.g. ' + previews.slice(0,3).map(r => '\"' + r.text + '\x22 loses ' + r.lost + 'px').join(', ') : ''));
    const hOver = manifest.filter(m => m.audit && m.audit.hOverflow > 0);
    console.log('\nhorizontal overflow (a screen wider than the phone): ' + (hOver.length ? hOver.map(m => m.name + ' +' + m.audit.hOverflow + 'px').join(', ') : 'none'));
    const sizes = new Set(manifest.flatMap(m => (m.audit && m.audit.usedSizes) || []));
    console.log('distinct painted font sizes across the app: ' + sizes.size + '  [' + [...sizes].sort((a,b)=>a-b).join(', ') + ']');
    fs.writeFileSync(path.join(OUT, 'audit.json'), JSON.stringify(manifest.map(m => ({ name: m.name, ...m.audit })), null, 1));
  }

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

// Extracts the literal text runs from every slide of the pitch deck so the audit
// can quote the deck rather than a summary of it. No npm packages: a small zip
// reader over the stored/deflated entries is all this needs.
const fs = require('fs');
const zlib = require('zlib');

const SRC = process.argv[2] || 'SEAIT SUKINNECT - PITCHDECK.pptx';
const OUT = process.argv[3] || '.shots/decktext/deck.txt';

function readZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i > 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('not a zip');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = {};
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28);
    const elen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const name = buf.toString('utf8', p + 46, p + 46 + nlen);
    const lho = buf.readUInt32LE(p + 42);
    const lsz = buf.readUInt16LE(lho + 26);
    const lex = buf.readUInt16LE(lho + 28);
    const start = lho + 30 + lsz + lex;
    out[name] = { method, data: buf.slice(start, start + csize) };
    p += 46 + nlen + elen + clen;
  }
  return out;
}

function unesc(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d));
}

const z = readZip(fs.readFileSync(SRC));
const slides = Object.keys(z)
  .filter(k => /^ppt\/slides\/slide\d+\.xml$/.test(k))
  .sort((a, b) => +a.match(/\d+/)[0] - +b.match(/\d+/)[0]);

let txt = '';
for (const s of slides) {
  const e = z[s];
  const xml = e.method === 0 ? e.data.toString('utf8') : zlib.inflateRawSync(e.data).toString('utf8');
  const runs = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map(m => unesc(m[1]));
  txt += '\n===== ' + s + ' =====\n' + runs.join(' | ') + '\n';
}
fs.mkdirSync(require('path').dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, txt.replace(/\r\n?/g, '\n'));
console.log('slides ' + slides.length + ', chars ' + txt.length + ' -> ' + OUT);

/* Why did "a credential reads its state from its own expiry date" start failing?
   The check builds its dates with Date.now() + n days and then truncates to the UTC
   calendar date, while credentialState measures from the LOCAL midnight of that date.
   Print both sides of that join, and what the app actually answers. */
const { boot } = require('./harness.cjs');
const app = boot();

const DAY = 86400000;
const iso = d => new Date(Date.now() + d * DAY).toISOString().slice(0, 10);
const warn = app.CONFIG.credentialWarnDays;

console.log('now            ', new Date().toString());
console.log('utc offset (min)', new Date().getTimezoneOffset());
console.log('warn days      ', warn);

for (const [name, d] of [['warn-1', warn - 1], ['warn', warn], ['warn+1', warn + 1],
                        ['warn+2', warn + 2], ['0', 0], ['-1', -1]]) {
  const s = iso(d);
  const localMidnight = app.parseDay ? app.parseDay(s) : NaN;
  const raw = (localMidnight - Date.now()) / DAY;
  console.log(name.padEnd(7), s, 'raw days', raw.toFixed(3),
              '->', JSON.stringify(app.credentialState({ expiresAt: s })));
}

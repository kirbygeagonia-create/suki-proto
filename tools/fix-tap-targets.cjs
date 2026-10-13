/* Bring every remaining control up to the 44px tap floor.

   Seventeen controls measured under it after the instrument stopped crediting wrappers that do
   not forward a tap. None of them had a forwarding ancestor — they are genuinely that hard to
   hit — so each fix raises the control itself, not a box around it.

   The sizes are chosen so the visual result does not change: the search pill is currently 56px
   because its wrapper's min-height wins over a 23px input plus 5px padding, and a 44px input
   inside the same padding is 44 + 10 + 2 = 56. Where an input sits in a fixed-height field the
   field already clears the floor and only the input was short.

   Every edit asserts its own match count. */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'Sukinnect-next.html');
const APPLY = process.argv.includes('--apply');
let src = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
const log = []; let failed = 0;
function sub(label, needle, replacement, expected) {
  const hits = src.split(needle).length - 1;
  if (hits !== expected) { log.push('MISMATCH  ' + label + ': found ' + hits + ', expected ' + expected); failed++; return; }
  src = src.split(needle).join(replacement); log.push('ok        ' + label + ' (' + hits + ')');
}

/* 1. the resident search field: 3 screens, one rule */
sub('search pill input takes the tap floor',
  `  .search-wrapper input{
    border:none; font-family:inherit; font-size:var(--t-input); width:100%;
    background:transparent; color:var(--ink);
  }`,
  `  /* The pill is 56px of padding and border around a 23px input, and the wrapper is an inert
     div — tapping the padding focuses nothing, so the target really was 23px tall. The input
     takes the floor instead; with the wrapper's 5px padding the pill stays exactly 56px. */
  .search-wrapper input{
    border:none; font-family:inherit; font-size:var(--t-input); width:100%;
    min-height:var(--tap); background:transparent; color:var(--ink);
  }`, 1);

/* 2. the two admin roster searches, same shape */
sub('admin roster search takes the tap floor',
  'style="width:100%; border:0; outline:0; font:inherit; font-size:var(--t-caption); background:transparent;"',
  'style="width:100%; min-height:var(--tap); border:0; outline:0; font:inherit; font-size:var(--t-caption); background:transparent;"', 2);

/* 3. the chat field, 2px short of the floor inside a 48px field */
sub('chat input takes the tap floor',
  'style="width:100%; border:none; background:transparent; font-family:inherit; font-size:var(--t-body-sm); padding:11px 0; color:var(--ink);"',
  'style="width:100%; min-height:var(--tap); border:none; background:transparent; font-family:inherit; font-size:var(--t-body-sm); padding:11px 0; color:var(--ink);"', 1);

/* 4. seven commission-rate inputs on the admin configuration screen */
sub('commission rate inputs take the tap floor',
  'style="width:62px; padding:6px 8px; border:1px solid var(--line); border-radius:8px; font:inherit;',
  'style="width:62px; min-height:var(--tap); padding:6px 8px; border:1px solid var(--line); border-radius:8px; font:inherit;', 1);

/* 5. the trust-score disclosure on the provider profiles */
sub('auth-switch takes the tap floor',
  `  .auth-switch{
    background:none; border:none; padding:0; font:inherit; font-size:var(--t-body);`,
  `  .auth-switch{
    background:none; border:none; padding:0; font:inherit; font-size:var(--t-body);
    min-height:var(--tap); display:inline-flex; align-items:center;`, 1);

/* 6. two hand-rolled copies of .back-btn, one of them contradicting itself */
sub('admin provider back uses the shared control',
  `<button onclick="state.tab='admin_verifications'; state.adminProviderCategory='verified'; render();" aria-label="Back to verified providers" style="width:var(--tap); height:var(--tap); display:inline-flex; align-items:center; justify-content:center; background:transparent; border:1px solid rgba(255,255,255,0.35); border-radius:50%; color:var(--on-brand); width:30px; height:30px; cursor:pointer;">`,
  `<button class="back-btn" onclick="state.tab='admin_verifications'; state.adminProviderCategory='verified'; render();" aria-label="Back to verified providers">`, 1);
sub('verification review back uses the shared control',
  `<button onclick="state.tab='admin_verifications'; render();" aria-label="Back to pending providers" style="background:transparent; border:1px solid rgba(255,255,255,0.35); border-radius:50%; color:var(--on-brand); width:30px; height:30px; cursor:pointer;">`,
  `<button class="back-btn" onclick="state.tab='admin_verifications'; render();" aria-label="Back to pending providers">`, 1);

const still = ['width:30px; height:30px'].filter(s => src.includes(s));
log.push('\nremaining 30px controls: ' + (still.length ? still.join(', ') : 'none'));
if (still.length) failed++;

console.log(log.join('\n'));
if (failed) { console.log('\nREFUSING TO WRITE.'); process.exit(1); }
if (!APPLY) { console.log('\nreport only. Re-run with --apply.'); process.exit(0); }
fs.writeFileSync(FILE, src.replace(/\n/g, '\r\n'), 'utf8');
const back = fs.readFileSync(FILE, 'utf8');
const crlf = (back.match(/\r\n/g) || []).length, lf = (back.match(/\n/g) || []).length;
console.log('wrote — lines ' + back.split('\n').length + ', CRLF ' + crlf + ', LF ' + lf + (crlf === lf ? ' (pure CRLF)' : ' (MIXED)'));

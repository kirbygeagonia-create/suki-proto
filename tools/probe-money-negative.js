/* One expression the camera evaluates inside a real page:
     node tools/shot.cjs --probe=@tools/probe-money-negative.js --only=offer-sheet
   Types a negative unit price into the field that declares no `min`, with a labour charge that is
   genuinely positive, then presses the sheet's own submit button and dumps the record that came
   out. The two-negative case is refused (both lines clamp to zero and an offer with no amount is
   rejected); this one asks whether the clamp on the totals leaves the per-unit figure behind. */
(() => {
  const set = (id, text) => {
    const el = document.getElementById(id);
    if (!el) return id + ' ABSENT';
    el.focus(); el.select && el.select();
    document.execCommand('delete', false, null);
    document.execCommand('insertText', false, text);
    el.blur();
    return id + '="' + el.value + '" badInput=' + el.validity.badInput;
  };
  const out = [set('offer-unit', '-5'), set('offer-labour', '100')];
  const before = (typeof OFFERS !== 'undefined') ? OFFERS.length : -1;
  const btn = Array.from(document.querySelectorAll('.sheet-layer button, .sheet-layer .btn'))
    .find(b => /send offer/i.test(b.textContent || ''));
  out.push('submit: ' + (btn ? 'found' : 'ABSENT'));
  if (btn) btn.click();
  const after = (typeof OFFERS !== 'undefined') ? OFFERS.length : -1;
  out.push('OFFERS ' + before + ' -> ' + after);
  const o = (typeof OFFERS !== 'undefined' && OFFERS.length) ? OFFERS[OFFERS.length - 1] : null;
  out.push('last: ' + (o ? JSON.stringify({ id: o.id, status: o.status, unit: o.unitPriceCentavos,
    produce: o.produceCentavos, labour: o.labourCentavos }) : 'none'));
  const toast = document.querySelector('.toast, #toast, [role="status"]');
  out.push('toast: ' + (toast ? (toast.textContent || '').trim().slice(0, 70) : 'none'));
  return out.join('\n');
})()

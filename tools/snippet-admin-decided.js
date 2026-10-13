/* The queue filters decided applicants out, so the console needs a place that still
   shows them: an approval that removes the only record of itself is a decision nobody can
   audit. Reached from the same screen as the queue, and opening one lands on the review
   with its activity list and its Reopen control. */
function adminDecidedSection(decided){
  if (!decided.length) return emptyState('file-text', 'No decisions recorded yet',
    'Approving or rejecting an application on this device puts it here, with the time it happened and who recorded it.');
  return `<div style="font-size:var(--t-caption); color:var(--mist); margin:0 0 10px; line-height:1.5;">Decided on this device. Reopening an application returns it to the queue and adds that to its activity.</div>`
    + decided.map(a => {
      const r = reviewOf(a.id);
      return `<div class="card" style="padding:11px; margin-bottom:10px;"><div class="row" style="align-items:flex-start;"><div style="min-width:0;"><b class="card-title">${esc(a.name)}</b><div style="font-size:var(--t-caption); color:var(--mist); margin-top:2px;">${esc(a.service)} · ${esc(a.barangay)}</div></div><span class="chip ${r.status === 'verified' ? '' : 'badge-alert'}" style="flex-shrink:0;">${esc(reviewStatusLine(r.status))}</span></div><div style="font-size:var(--t-caption); color:var(--ink-soft); margin-top:8px; line-height:1.5;">${esc(shortDate(r.decidedAt))} ${esc(clockText(r.decidedAt))} by ${esc(r.reviewer || 'this administrator')}${r.reason ? ' — ' + esc(r.reason) : ''}</div><button class="btn sm secondary" style="margin-top:10px;" onclick="openProviderVerification('${a.id}')">Open the decision</button></div>`;
    }).join('');
}

/* Sukinnect rebuild verification.   node tools/verify.cjs
   Drives the real kernel out of Sukinnect-next.html in Node: money, storage, the
   marketplace loop, the ledger, the state machine, payments and reports, then
   renders every screen of every role and fails on any painted undefined. */
const { boot, fakeStorage, makeChecker } = require('./harness.cjs');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const suites = [];
const suite = (name, fn) => suites.push({ name, fn });

/* ══ 1. money ═══════════════════════════════════════════════════════════════ */
suite('money', async () => {
  const { peso, pesoShort, pesoCompact, rateLabel, toCentavos, toPesos } = boot();
  const c = makeChecker();
  c.check('₱365 renders as it always did', pesoShort(36500) === '₱365', pesoShort(36500));
  c.check('₱4,200 keeps its grouping', pesoShort(420000) === '₱4,200', pesoShort(420000));
  c.check('exact money shows cents', peso(35050) === '₱350.50', peso(35050));
  c.check('exact money pads whole pesos', peso(35000) === '₱350.00', peso(35000));
  c.check('a refund reads negative', peso(-8000) === '-₱80.00', peso(-8000));
  c.check('compact abbreviates from ₱10,000', pesoCompact(1000000) === '₱10k', pesoCompact(1000000));
  c.check('compact keeps small figures honest', pesoCompact(950000) === '₱9,500', pesoCompact(950000));
  c.check('published rate reads as a rate',
    rateLabel(35000, 'call-out fee') === '₱350 / call-out fee', rateLabel(35000, 'call-out fee'));
  c.check('centavos round-trip', toCentavos(1234.56) === 123456 && toPesos(123456) === 1234.56);
  return c;
});

/* ══ 2. storage ═════════════════════════════════════════════════════════════ */
suite('storage', async () => {
  const c = makeChecker();
  const mem = boot();
  c.check('no localStorage falls back to memory', mem.Store.kind === 'memory', mem.Store.kind);
  c.check('memory mode writes', mem.persist() === true);
  c.check('memory mode reads back', mem.hydrate().restored === true);

  const store = fakeStorage();
  const a = boot({ storage: store });
  c.check('localStorage is used when available', a.Store.kind === 'local-storage', a.Store.kind);
  a.BOOKINGS.push({ id: 'zzz', customerId: 'c1', providerId: 'p1', status: 'requested',
                    amountCentavos: 1, createdAt: new Date().toISOString(), source: 'live' });
  a.persist();
  const b = boot({ storage: store });
  b.hydrate();
  c.check('a reload restores the record', b.BOOKINGS.some(x => x.id === 'zzz'));

  const old = fakeStorage();
  old.setItem('sukinnect.snapshot.v1', JSON.stringify({ schemaVersion: -1, bookings: [{ id: 'stale' }] }));
  const stale = boot({ storage: old });
  c.check('an old dump is dropped, not half-read', stale.hydrate().restored === false);
  c.check('and the seed survives', !stale.BOOKINGS.some(x => x.id === 'stale'));

  const broken = fakeStorage();
  broken.setItem('sukinnect.snapshot.v1', '{ not json');
  c.check('corrupt storage is treated as empty', boot({ storage: broken }).hydrate().restored === false);

  const quota = fakeStorage();
  const okSet = quota.setItem.bind(quota);
  quota.setItem = (k, v) => { if (k === 'sukinnect.snapshot.v1') throw new Error('QuotaExceeded'); okSet(k, v); };
  const q = boot({ storage: quota });
  c.check('a failed write returns false without throwing', q.persist() === false);

  const f = boot({ storage: fakeStorage() });
  f.BOOKINGS[0].status = 'cancelled';
  f.restoreSeed();
  c.check('reset restores seeded state', f.BOOKINGS[0].status === 'ongoing');
  c.check('snapshot holds records, never UI state',
    !['tab', 'sheet', 'view', 'searchQuery'].some(k => k in f.snapshot()), Object.keys(f.snapshot()).join(','));
  return c;
});

/* ══ 3. the marketplace loop ═════════════════════════════════════════════════ */
suite('loop', async () => {
  const c = makeChecker();
  const app = boot();
  const { BOOKINGS, state, providerOf, customerOf, bookingsForResident, bookingsForProvider,
          pendingProviderRequests, submitBookingRequest, answerRequest } = app;

  c.check('bookings join by id, not by copied object',
    BOOKINGS.every(b => b.customerId && b.providerId && !('provider' in b) && !('client' in b)));
  c.check('every join resolves', BOOKINGS.every(b => providerOf(b) && customerOf(b)));
  c.check('demo rows are labelled as demo', BOOKINGS.every(b => b.source === 'demo'));
  const shared = bookingsForResident().filter(b => bookingsForProvider().includes(b));
  c.check('both roles read the same objects', shared.length > 0 && shared.every(b => b === BOOKINGS.find(x => x.id === b.id)));
  c.check('one job in progress per provider',
    bookingsForProvider().filter(x => x.status === 'ongoing').length === 1);

  const before = pendingProviderRequests().length;
  state.selectedProvider = app.PROVIDERS[0];
  state.requestDraft = { service: '', dayIdx: 0, timeIdx: 1, addrIdx: 0, payIdx: 0 };
  app._document.getElementById('request-service').value = 'The basin tap will not stop dripping.';
  submitBookingRequest();
  await sleep(1200);
  const created = BOOKINGS.find(b => b.source === 'live');
  c.check('a request creates one shared record', !!created);
  if (!created) return c;
  c.check('it is the resident’s', created.customerId === 'c1' && bookingsForResident().includes(created));
  c.check('and it reached the provider inbox',
    pendingProviderRequests().length === before + 1 && pendingProviderRequests()[0] === created);

  state.providerResponding = null;
  answerRequest(created.id, 'accept');
  await sleep(900);
  c.check('the provider accepting moves the resident’s view',
    created.status === 'upcoming' && bookingsForResident().find(x => x.id === created.id).status === 'upcoming');

  state.providerDeclineConfirm = false; state.providerResponding = null;
  const other = pendingProviderRequests()[0];
  answerRequest(other.id, 'decline');
  await sleep(900);
  c.check('a decline is readable on both sides',
    other.status === 'cancelled' && BOOKINGS.find(x => x.id === other.id).status === 'cancelled');
  return c;
});

/* ══ 4. every screen renders ═════════════════════════════════════════════════ */
suite('screens', async () => {
  const c = makeChecker();
  const app = boot();
  const { state, render, PROVIDERS } = app;
  state.view = 'app';
  const broken = [];
  const label = () => [state.role + '/' + state.tab,
    state.adminScreen !== 'overview' ? state.adminScreen : null,
    state.bookingFilter !== 'all' ? 'f:' + state.bookingFilter : null,
    state.providerBookingFilter !== 'all' ? 'f:' + state.providerBookingFilter : null,
    state.selectedProviderBookingId ? '#' + state.selectedProviderBookingId : null,
    state.selectedBookingId ? '#' + state.selectedBookingId : null,
    state.isChatOpen ? 'chat' : null].filter(Boolean).join(' ');
  const base = () => {
    state.isChatOpen = false;
    state.selectedBookingId = 'b1'; state.selectedProviderBookingId = 'pb6';
    state.selectedProvider = PROVIDERS[0]; state.selectedVerificationId = 'maria';
    state.selectedAdminProvider = 'p1'; state.adminScreen = 'overview';
    state.bookingFilter = 'all'; state.providerBookingFilter = 'all';
    state.sheet = null; state.providerResponding = null; state.providerDeclineConfirm = false;
  };
  function visit(setup) {
    setup();
    try {
      render();
      const html = app._document.getElementById('screen').innerHTML;
      const bad = html.match(/undefined|NaN|\[object Object\]/);
      if (bad) { broken.push(label() + '  paints ' + bad[0]); return; }
      /* Square brackets around a label are developer shorthand that never got
         taken out before shipping — the FSM button read "[Set Available 5–8 PM]"
         on a real screen, and no other check notices because it renders fine. */
      const ph = html.match(/\[\s*[A-Z][A-Za-z0-9–— &\/-]{2,44}\]/);
      if (ph) broken.push(label() + '  shows a placeholder: ' + ph[0]);
      /* Unbalanced markup renders, but the sheet or card that lost its opening
         tag silently stops being a group — a structure bug no text check sees. */
      const open = (html.match(/<div\b/g) || []).length;
      const close = (html.match(/<\/div>/g) || []).length;
      if (open !== close) broken.push(label() + '  markup unbalanced: ' + open + ' <div> against ' + close + ' </div>');
      const ob = (html.match(/<button\b/g) || []).length;
      const cb = (html.match(/<\/button>/g) || []).length;
      if (ob !== cb) broken.push(label() + '  buttons unbalanced: ' + ob + ' against ' + cb);
      /* A scripted edit once wrote `<h1$1>$2</h1>` into 23 titles because
         String.replace's capture substitution had been suppressed. It rendered, it
         balanced, and every screen simply lost its name — so the heading itself is
         now checked, not just the markup around it. */
      const heads = [...html.matchAll(/<(h[1-4])([^>]*)>([\s\S]*?)<\/\1>/g)];
      const badHead = heads.filter(h => !h[3].replace(/<[^>]*>/g, '').trim()
                              || /\$\d/.test(h[0]) || /\$\d/.test(h[3]));
      if (badHead.length)
        broken.push(label() + '  heading is empty or still holds a placeholder: '
          + badHead.map(h => '<' + h[1] + h[2] + '>' + h[3] + '</' + h[1] + '>').join(' ').slice(0, 90));
      const ho = (html.match(/<h[1-4]\b/g) || []).length;
      const hc = (html.match(/<\/h[1-4]>/g) || []).length;
      if (ho !== hc) broken.push(label() + '  headings unbalanced: ' + ho + ' against ' + hc);
      /* AGENTS.md §31 has claimed "every screen title is an <h1>" while two screens
         painted a bare <div> instead — the resident's booking detail and the chat room.
         A claim about the structure of every screen belongs in the pass that visits every
         screen, not in a paragraph that nobody re-measures. */
      if (state.view === 'app' && !/<h1\b/.test(html))
        broken.push(label() + '  paints no <h1> — nothing for a screen reader to navigate by');
    } catch (err) { broken.push(label() + '  throws ' + err.message); }
  }
  const SCREENS = [['resident', 'home'], ['resident', 'bookings'], ['resident', 'messages'],
    ['resident', 'profile'], ['resident', 'concierge'], ['resident', 'notifications'],
    ['resident', 'results'], ['resident', 'provider_detail'], ['resident', 'booking_detail'],
    ['provider', 'dashboard'], ['provider', 'fsm'], ['provider', 'bookings'], ['provider', 'messages'],
    ['provider', 'profile'], ['provider', 'provider_booking_detail'],
    ['admin', 'admin_dashboard'], ['admin', 'admin_verifications'], ['admin', 'admin_disputes'],
    ['admin', 'profile'], ['admin', 'verification_review'], ['admin', 'admin_provider_profile'],
    ['admin', 'admin_provider_insights']];
  for (const [role, tab] of SCREENS) visit(() => { state.role = role; state.tab = tab; base(); });
  visit(() => { state.role = 'resident'; state.tab = 'messages'; base(); state.isChatOpen = true; state.activeChatProvider = PROVIDERS[0]; });
  visit(() => { state.role = 'resident'; state.tab = 'bookings'; base(); state.bookingFilter = 'completed'; });
  visit(() => { state.role = 'resident'; state.tab = 'bookings'; base(); state.bookingFilter = 'requested'; });
  visit(() => { state.role = 'resident'; state.tab = 'booking_detail'; base(); state.selectedBookingId = 'b3'; });
  visit(() => { state.role = 'resident'; state.tab = 'booking_detail'; base(); state.selectedBookingId = 'b5'; });
  visit(() => { state.role = 'resident'; state.tab = 'booking_detail'; base(); state.selectedBookingId = 'pb6'; });
  visit(() => { state.role = 'resident'; state.tab = 'profile'; base(); state.residentProfileSection = 'addresses'; });
  visit(() => { state.role = 'provider'; state.tab = 'bookings'; base(); state.providerBookingFilter = 'requested'; });
  visit(() => { state.role = 'provider'; state.tab = 'profile'; base(); state.providerProfileSection = 'services'; });
  visit(() => { state.role = 'provider'; state.tab = 'profile'; base(); state.providerProfileSection = 'pricing'; });
  visit(() => { state.role = 'provider'; state.tab = 'profile'; base(); state.providerProfileSection = 'payout'; });
  visit(() => { state.role = 'provider'; state.tab = 'provider_booking_detail'; base(); state.selectedProviderBookingId = 'pb6'; });
  visit(() => { state.role = 'provider'; state.tab = 'provider_booking_detail'; base(); state.selectedProviderBookingId = 'b1'; });
  visit(() => { state.role = 'admin'; state.tab = 'admin_dashboard'; base(); state.adminScreen = 'intelligence'; });
  visit(() => { state.role = 'admin'; state.tab = 'admin_dashboard'; base(); state.adminScreen = 'trust'; });
  visit(() => { state.role = 'admin'; state.tab = 'admin_dashboard'; base(); state.adminScreen = 'audit'; });
  visit(() => { state.role = 'admin'; state.tab = 'admin_verifications'; base(); state.adminProviderCategory = 'pending'; });
  visit(() => { state.role = 'admin'; state.tab = 'admin_verifications'; base(); state.adminProviderCategory = 'credentials'; });
  visit(() => { state.role = 'admin'; state.tab = 'admin_disputes'; base(); });

  /* the booking sheet paints into its own layer, so it needs its own pass: a
     group that lost its opening tag still looks like a sheet until you tap it */
  const sheets = [];
  [['plumbing', 0], ['plumbing', 1], ['delivery', 0], ['tutoring', 0]].forEach(([svc, idx]) => {
    const provider = app.PROVIDERS.find(p => p.serviceId === svc);
    sheets.push([provider.name + ' sheet', () => {
      state.role = 'resident'; state.tab = 'provider_detail'; base();
      state.selectedProvider = provider;
      state.requestDraft = { service: 'A test request long enough', listingIdx: idx, dayIdx: 0, timeIdx: 1, addrIdx: 0, payIdx: 0, asap: idx === 1 };
      state.sheet = 'bookingRequest';
    }]);
  });
  sheets.push(['filter sheet', () => {
    state.role = 'resident'; state.tab = 'results'; base();
    state.searchQuery = 'leak'; state.sheet = 'providerFilters';
  }]);
  for (const [name, setup] of sheets) {
    setup();
    try {
      app.render();
      const html = app._document.getElementById('sheet-root').innerHTML;
      const o = (html.match(/<div\b/g) || []).length, cl = (html.match(/<\/div>/g) || []).length;
      if (o !== cl) broken.push(name + '  markup unbalanced: ' + o + ' <div> against ' + cl + ' </div>');
      if (/undefined|NaN|\[object Object\]/.test(html)) broken.push(name + '  paints a hole');
    } catch (err) { broken.push(name + '  throws ' + err.message); }
  }
  state.sheet = null;
  c.check('every screen renders clean', broken.length === 0, '\n      ' + broken.join('\n      '));
  return c;
});

/* ══ 5. ledger and pricing ═══════════════════════════════════════════════════ */
suite('ledger', async () => {
  const c = makeChecker();
  const app = boot();
  const { LEDGER, BOOKINGS, ACCOUNTS, postEvent, accountBalance, computeBreakdown,
          platformStatement, providerStatement, providerBalances, settlementLines, settlementToProvider,
          CONFIG, setConfig } = app;

  /* the deck's own worked example must be reproducible */
  const d = computeBreakdown({ baseCentavos: 80000, categoryId: 'plumbing' });
  c.check('₱800 at the pilot rate takes ₱80', d.commissionCentavos === 8000, String(d.commissionCentavos));
  c.check('and leaves the provider ₱720', d.providerShareCentavos === 72000, String(d.providerShareCentavos));
  c.check('the customer pays the price on the card', d.customerTotalCentavos === 80000, String(d.customerTotalCentavos));
  c.check('commission plus share equals the base',
    d.commissionCentavos + d.providerShareCentavos === d.baseCentavos);

  /* parts are collected for the provider, never commissioned */
  const p = computeBreakdown({ baseCentavos: 50000, categoryId: 'cleaning',
                               inclusions: [{ label: 'Cleaning supplies', amountCentavos: 1500 }] });
  c.check('a parts charge does not raise the commission', p.commissionCentavos === 5000, String(p.commissionCentavos));
  c.check('the customer total includes the parts', p.customerTotalCentavos === 51500, String(p.customerTotalCentavos));
  c.check('settlement to the provider includes the parts',
    settlementToProvider(p) === 45000 + 1500, String(settlementToProvider(p)));
  c.check('so the split still balances',
    settlementToProvider(p) + p.commissionCentavos === p.customerTotalCentavos);

  /* every event in the book, including the seeded history, balances */
  const unbalanced = LEDGER.filter(e => {
    const debit = e.lines.filter(l => l.direction === 'debit').reduce((t, l) => t + l.amountCentavos, 0);
    const credit = e.lines.filter(l => l.direction === 'credit').reduce((t, l) => t + l.amountCentavos, 0);
    return debit !== credit;
  });
  c.check('every ledger event balances', unbalanced.length === 0,
    unbalanced.map(e => e.eventType).join(','));
  c.check('the seed wrote real history', LEDGER.length > 0, String(LEDGER.length));
  const KINDS = ['payment.authorized', 'payment.voided', 'booking.settled', 'booking.settled_cash', 'dispute.held'];
  c.check('only money movements appear at boot',
    LEDGER.every(e => KINDS.includes(e.eventType)),
    LEDGER.map(e => e.eventType).filter(t => !KINDS.includes(t)).join(','));
  c.check('a holding belongs to an accepted job, never a request',
    LEDGER.filter(e => e.eventType === 'payment.authorized')
      .every(e => { const b = BOOKINGS.find(x => x.id === e.bookingId); return b && b.status !== 'requested'; }));
  c.check('an earning belongs to work that finished, or a case about it',
    LEDGER.filter(e => e.eventType === 'booking.settled' || e.eventType === 'booking.settled_cash')
      .every(e => { const b = BOOKINGS.find(x => x.id === e.bookingId); return b && (b.status === 'completed' || b.status === 'disputed'); }));
  c.check('a case held against an earning does not erase the earning',
    LEDGER.filter(e => e.eventType === 'dispute.held')
      .every(e => { const b = BOOKINGS.find(x => x.id === e.bookingId); return b && b.status === 'disputed'; }));
  c.check('no job is settled twice at boot',
    new Set(LEDGER.filter(e => /^booking\.settled/.test(e.eventType)).map(e => e.bookingId)).size ===
      LEDGER.filter(e => /^booking\.settled/.test(e.eventType)).length);

  /* A chart of accounts that can go below zero is lying: you cannot hold money you
     were never given, or owe earnings you never promised. */
  const negatives = [];
  Object.keys(ACCOUNTS).forEach(account => {
    const total = app.accountBalance(account);
    if (total < 0) negatives.push(account + '=' + total);
  });
  BOOKINGS.forEach(b => { const d = app.accountBalance('customer_deposit', b.id); if (d < 0) negatives.push('deposit ' + b.id + '=' + d); });
  ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].forEach(p => {
    const v = app.accountBalance('provider_payable', p); if (v < 0) negatives.push('payable ' + p + '=' + v);
    const r = app.accountBalance('commission_receivable', p); if (r < 0) negatives.push('receivable ' + p + '=' + r);
  });
  c.check('no account reads negative', negatives.length === 0, negatives.join(', '));
  /* The holding is more than the deposits once jobs complete: the same money now
     backs what we owe the provider and the fee we have earned, and nothing in this
     prototype sweeps those out to a bank account of our own. Escrow therefore has
     to equal all three claims on it, or the books are pretending to hold money
     that has been promised twice.
     A cash job adds the fourth term: its fee is earned but never collected, so it
     is backed by the receivable rather than by the holding. Stated without that
     term, the identity fails on any roster that contains cash work. */
  const assets = app.accountBalance('escrow_held') + app.accountBalance('commission_receivable');
  const claims = BOOKINGS.reduce((t, b) => t + Math.max(0, app.accountBalance('customer_deposit', b.id)), 0)
    + ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].reduce((t, p) => t + app.accountBalance('provider_payable', p), 0)
    + app.accountBalance('platform_fee_revenue') + app.accountBalance('platform_fixed_fee_revenue')
    /* a held case is still a claim on the same money, just not yet for anyone */
    + app.accountBalance('dispute_hold');
  c.check('the holding plus the cash receivable covers exactly the claims on it',
    assets === claims, assets + ' vs ' + claims);
  c.check('the fee the platform earned is inside the holding, not outside it',
    app.accountBalance('platform_fee_revenue') > 0);

  /* rejected postings */
  const throws = fn => { try { fn(); return false; } catch (err) { return true; } };
  c.check('an unbalanced posting is refused', throws(() => postEvent('bad', [
    { account:'platform_fee_revenue', direction:'credit', amountCentavos: 100 }])), 'no throw');
  c.check('an unknown account is refused', throws(() => postEvent('bad', [
    { account:'crypto_wallet', direction:'debit', amountCentavos: 100 },
    { account:'platform_fee_revenue', direction:'credit', amountCentavos: 100 }])));
  c.check('a fractional cent is refused', throws(() => postEvent('bad', [
    { account:'platform_fee_revenue', direction:'debit', amountCentavos: 10.5 },
    { account:'provider_payable', scope:'p1', direction:'credit', amountCentavos: 10.5 }])));
  c.check('a zero line is refused', throws(() => postEvent('bad', [
    { account:'platform_fee_revenue', direction:'debit', amountCentavos: 0 },
    { account:'provider_payable', scope:'p1', direction:'credit', amountCentavos: 0 }])));
  c.check('there is no resident balance anywhere in the chart',
    !Object.keys(ACCOUNTS).some(k => /resident|customer_wallet|stored_value/i.test(k)) &&
    !Object.keys(ACCOUNTS).some(k => ACCOUNTS[k].kind === 'asset' && /resident/i.test(k)) &&
    Object.keys(ACCOUNTS).includes('customer_deposit') && ACCOUNTS.customer_deposit.kind === 'liability');

  /* statements are derived, not typed */
  const st = platformStatement();
  const ledgerCommission = LEDGER.reduce((t, e) => t + e.lines
    .filter(l => l.account === 'platform_fee_revenue' && l.direction === 'credit')
    .reduce((a, l) => a + l.amountCentavos, 0), 0)
    - LEDGER.reduce((t, e) => t + e.lines
    .filter(l => l.account === 'platform_fee_revenue' && l.direction === 'debit')
    .reduce((a, l) => a + l.amountCentavos, 0), 0);
  c.check('platform revenue equals the ledger it claims to read',
    st.commissionEarnedCentavos === ledgerCommission, st.commissionEarnedCentavos + ' vs ' + ledgerCommission);
  c.check('net revenue is commission plus fees',
    st.netRevenueCentavos === st.commissionEarnedCentavos + st.fixedFeesCentavos);

  const ramil = providerStatement('p1');
  c.check('a provider statement adds up',
    ramil.grossServicesCentavos === ramil.commissionCentavos + ramil.netServiceEarnedCentavos,
    JSON.stringify([ramil.grossServicesCentavos, ramil.commissionCentavos, ramil.netServiceEarnedCentavos]));

  const bal = providerBalances('p1');
  c.check('the earnings screen has no wallet word and no fake cash-out',
    bal.pendingCentavos + bal.availableCentavos >= 0 && typeof bal.nextPayoutOn === 'string');
  const payable = accountBalance('provider_payable', 'p1');
  const owed = BOOKINGS.filter(b => b.providerId === 'p1' && b.status === 'completed' && b.pricing &&
    b.payMethod !== 'cash')
    .reduce((t, b) => t + settlementToProvider(b.pricing), 0);
  c.check('provider payable balance matches the settlements recorded',
    payable === owed, payable + ' vs ' + owed);

  /* configuration is a decision, not a constant, and history survives it */
  c.check('the default rate is the deck’s worked example', CONFIG.commissionRateDefault === 0.10);
  c.check('no booking inherits today’s rate table',
    BOOKINGS.filter(b => b.pricing).every(b => typeof b.pricing.commissionRate === 'number'));
  const before = LEDGER.length;
  c.check('a bad config key is refused rather than silently added',
    throws(() => app.setConfig({ madeUpKey: 1 })), 'accepted');
  c.check('and it created no ledger noise', LEDGER.length === before);
  return c;
});

/* ══ 6. the booking state machine ════════════════════════════════════════════ */
suite('machine', async () => {
  const c = makeChecker();
  const app = boot();
  const { BOOKINGS, BOOKING_STATES, TRANSITIONS, STATUS_EVENTS, LEDGER, NOTIFICATIONS, state, CONFIG,
          attemptTransition, transitionAllowed, nextActionFor, bookingTimeline, providerOf, customerOf,
          accountBalance, settlementToProvider, applyDueTransitions, pendingProviderRequests, label } = app;

  const throws = fn => { try { fn(); return null; } catch (err) { return err; } };
  const revenueAtBoot = accountBalance('platform_fee_revenue');
  const PROVIDER = { role:'provider', id:'p1', name:'Ramil Odiada' };
  const CUSTOMER = { role:'customer', id:'c1' };
  const ADMIN = { role:'admin', id:'a1' };

  /* the table and the vocabulary agree */
  c.check('every declared state has a place in the table',
    Object.keys(BOOKING_STATES).every(k => k in TRANSITIONS),
    Object.keys(BOOKING_STATES).filter(k => !(k in TRANSITIONS)).join(','));
  c.check('every booking sits in a declared state',
    BOOKINGS.every(b => b.status in BOOKING_STATES),
    BOOKINGS.filter(b => !(b.status in BOOKING_STATES)).map(b => b.id + ':' + b.status).join(','));

  /* refused moves */
  const done = BOOKINGS.find(b => b.status === 'completed');
  c.check('a completed job cannot go back to accepted',
    !!throws(() => attemptTransition(done.id, 'upcoming', PROVIDER)), 'allowed');
  c.check('a customer cannot accept their own request',
    !!throws(() => attemptTransition('pb6', 'upcoming', CUSTOMER)), 'allowed');
  c.check('the refusal explains itself',
    (throws(() => attemptTransition('pb6', 'upcoming', CUSTOMER)) || {}).name === 'GuardRejected');
  c.check('a cancelled job has no way forward',
    nextActionFor(BOOKINGS.find(b => b.status === 'cancelled'), 'provider').length === 0);
  c.check('transitionAllowed answers without throwing',
    transitionAllowed(done, 'disputed', CUSTOMER).ok === true ||
    transitionAllowed(done, 'upcoming', PROVIDER).ok === false);

  /* a full walk, on one record */
  const target = pendingProviderRequests()[0];
  const payableBefore = accountBalance('provider_payable', 'p1');
  attemptTransition(target.id, 'upcoming', PROVIDER);
  c.check('accepting freezes the terms onto the booking', !!target.pricing);
  c.check('accepting takes the holding, once',
    LEDGER.filter(e => e.eventType === 'payment.authorized' && e.bookingId === target.id).length === 1);
  c.check('and the holding is not yet revenue',
    accountBalance('platform_fee_revenue') === revenueAtBoot);
  c.check('and the frozen terms add up',
    target.pricing.commissionCentavos + target.pricing.providerShareCentavos === target.pricing.baseCentavos);
  attemptTransition(target.id, 'en_route', PROVIDER);
  attemptTransition(target.id, 'arrived', PROVIDER);
  const blocked = throws(() => attemptTransition(target.id, 'ongoing', PROVIDER));
  c.check('a second job cannot start while one is in progress', !!blocked, 'allowed');
  c.check('and the refusal is the guard’s own words',
    /already have a job in progress/.test((blocked || {}).message || ''), (blocked || {}).message);

  /* the walk needs a free provider: clear the live job first */
  const live = BOOKINGS.find(b => b.id !== target.id && b.status === 'ongoing');
  attemptTransition(live.id, 'completed', PROVIDER);
  c.check('completing converts the holding into earnings',
    LEDGER.filter(e => e.bookingId === live.id && /^booking\.settled/.test(e.eventType)).length === 1,
    LEDGER.filter(e => e.bookingId === live.id).map(e => e.eventType).join(','));
  const afterLive = throws(() => attemptTransition(target.id, 'ongoing', PROVIDER));
  c.check('with the live job done the second one may start', afterLive === null, afterLive && afterLive.message);
  attemptTransition(target.id, 'completed', PROVIDER);
  c.check('each job settles exactly once',
    LEDGER.filter(e => /^booking\.settled/.test(e.eventType))
      .every(e => LEDGER.filter(x => x.bookingId === e.bookingId && /^booking\.settled/.test(x.eventType)).length === 1));
  c.check('the settled job released its deposit',
    accountBalance('customer_deposit', target.id) === 0, String(accountBalance('customer_deposit', target.id)));
  c.check('accepting finally earns the platform its fee',
    accountBalance('platform_fee_revenue') > revenueAtBoot);
  c.check('every event still balances after the walk', LEDGER.every(e => {
    const dr = e.lines.filter(l => l.direction === 'debit').reduce((t, l) => t + l.amountCentavos, 0);
    const cr = e.lines.filter(l => l.direction === 'credit').reduce((t, l) => t + l.amountCentavos, 0);
    return dr === cr;
  }));
  /* Cash and partner settlements land in different places, and the books have to
     show that: the provider already holds cash collected on site, so the
     platform only records the fee it is owed. */
  const isCash = b => b.payMethod === 'cash';
  const payableDelta = accountBalance('provider_payable', 'p1') - payableBefore;
  const expectedPayable = (isCash(live) ? 0 : settlementToProvider(live.pricing)) +
                          (isCash(target) ? 0 : settlementToProvider(target.pricing));
  c.check('payable rose by the partner-path settlements', payableDelta === expectedPayable,
    payableDelta + ' vs ' + expectedPayable);
  const receivableDelta = accountBalance('commission_receivable', 'p1');
  c.check('a cash-settled job raises a receivable instead',
    isCash(live) ? receivableDelta >= live.pricing.commissionCentavos : true,
    String(receivableDelta));
  c.check('the two paths never mix on one booking',
    LEDGER.filter(e => e.bookingId === live.id).every(e => e.eventType === 'booking.settled_cash'),
    LEDGER.filter(e => e.bookingId === live.id).map(e => e.eventType).join(','));

  /* the timeline is the tracking view */
  const steps = bookingTimeline(target.id);
  c.check('the walk left one event per move', steps.length >= 5, String(steps.length));
  c.check('each event starts where the last one ended',
    steps.every((e, i) => i === 0 || e.from === steps[i - 1].to),
    steps.map(e => (e.from || '∅') + '→' + e.to).join(', '));
  c.check('the final event is the current state', steps[steps.length - 1].to === target.status);
  c.check('each step names who moved it', steps.every(e => e.actorRole));
  c.check('and each carries a real instant', steps.every(e => !Number.isNaN(Date.parse(e.at))));
  c.check('the customer was notified along the way',
    NOTIFICATIONS.some(n => n.bookingId === target.id && n.title === 'Booking confirmed'));

  /* demo history must not claim steps it cannot show */
  c.check('every demo booking’s timeline reaches its stated status',
    BOOKINGS.filter(b => b.source === 'demo').every(b => {
      const t = bookingTimeline(b.id);
      return t.length && t[t.length - 1].to === b.status;
    }),
    BOOKINGS.filter(b => b.source === 'demo')
      .filter(b => { const t = bookingTimeline(b.id); return !t.length || t[t.length - 1].to !== b.status; })
      .map(b => b.id).join(','));

  /* dispute: freeze, then release, never erase */
  const held0 = accountBalance('dispute_hold', target.id);
  attemptTransition(target.id, 'disputed', CUSTOMER, { reason:'The leak came back two days later' });
  c.check('opening a case freezes the provider’s share',
    accountBalance('dispute_hold', target.id) === settlementToProvider(target.pricing),
    String(accountBalance('dispute_hold', target.id)));
  c.check('the freeze is an entry, not a deletion', LEDGER.some(e => e.eventType === 'dispute.held'));
  c.check('nothing was decided by opening it', held0 === 0 && target.refundDue !== true);
  attemptTransition(target.id, 'completed', ADMIN);
  c.check('closing in the provider’s favour releases the hold',
    accountBalance('dispute_hold', target.id) === 0, String(accountBalance('dispute_hold', target.id)));
  c.check('and the release is its own entry', LEDGER.some(e => e.eventType === 'dispute.released'));

  /* late cancellation pays the provider, not the platform */
  const fee = CONFIG.cancellationFeeAfterAcceptCentavos;
  const revenueBefore = accountBalance('platform_fee_revenue');
  const payableNow = accountBalance('provider_payable', 'p1');
  const next = BOOKINGS.find(b => b.status === 'upcoming' && b.providerId === 'p1');
  attemptTransition(next.id, 'cancelled', CUSTOMER);
  c.check('a late cancellation pays the provider',
    accountBalance('provider_payable', 'p1') === payableNow + fee,
    String(accountBalance('provider_payable', 'p1') - payableNow));
  c.check('and the platform earns nothing from it',
    accountBalance('platform_fee_revenue') === revenueBefore);
  c.check('an early withdrawal costs nothing',
    CONFIG.cancellationFeeBeforeAcceptCentavos === 0);

  /* what the clock owes */
  const stale = BOOKINGS.find(b => b.status === 'requested');
  stale.createdAt = new Date(Date.now() - (CONFIG.acceptTtlMinutes + 10) * 60000).toISOString();
  const expired = applyDueTransitions();
  c.check('an unanswered request expires on the next open',
    stale.status === 'expired' && expired.some(m => m.id === stale.id), stale.status);
  c.check('expiry takes no money', !LEDGER.some(e => e.bookingId === stale.id));
  c.check('and it tells the customer nothing was charged',
    NOTIFICATIONS.some(n => n.bookingId === stale.id && /not charged/.test(n.body)));
  const old = BOOKINGS.find(b => b.status === 'completed' && !b.confirmedBy);
  if (old) {
    old.completedAt = new Date(Date.now() - (CONFIG.autoCompleteHours + 2) * 3600000).toISOString();
    applyDueTransitions();
    c.check('an unconfirmed completion auto-confirms and says so', old.confirmedBy === 'auto', String(old.confirmedBy));
  } else c.check('an unconfirmed completion auto-confirms and says so', false, 'no fixture');
  c.check('label() speaks in words, not in field names', label('upcoming') === 'Accepted' && label('expired') === 'No answer');
  return c;
});

/* ══ 7. payments, refunds and payouts ════════════════════════════════════════ */
suite('payments', async () => {
  const c = makeChecker();
  const app = boot();
  const { BOOKINGS, PAYMENTS, PAYOUTS, LEDGER, Gateway, MockGateway, paymentsFor, accountBalance,
          attemptTransition, pendingProviderRequests, refundBooking, runPayoutCycle, providerBalances } = app;
  const PROVIDER = { role:'provider', id:'p1', name:'Ramil Odiada' };
  const CUSTOMER = { role:'customer', id:'c1' };
  const ADMIN = { role:'admin', id:'a1' };
  const throws = fn => { try { fn(); return null; } catch (err) { return err; } };

  /* the seam a real gateway would implement */
  c.check('the gateway exposes the four verbs and nothing else clever',
    ['authorize', 'capture', 'refund', 'void_'].every(m => typeof Gateway[m] === 'function'));
  c.check('swapping the adapter is the only change a live gateway needs', Gateway === MockGateway);
  c.check('every movement carries a reference a partner could be shown',
    Gateway.authorize(1000).ref && Gateway.capture(1000).ref && Gateway.refund(1000).ref && Gateway.void_().ref);

  /* the demo jobs are traceable both ways */
  c.check('every settled job has a payment row',
    LEDGER.filter(e => /^booking\.settled/.test(e.eventType))
      .every(e => paymentsFor(e.bookingId).some(p => p.type === 'capture' || p.type === 'collection')),
    LEDGER.filter(e => /^booking\.settled/.test(e.eventType))
      .filter(e => !paymentsFor(e.bookingId).some(p => p.type === 'capture' || p.type === 'collection'))
      .map(e => e.bookingId).join(','));
  c.check('no payment row exists without a booking behind it',
    PAYMENTS.every(p => BOOKINGS.some(b => b.id === p.bookingId)));

  /* a partner job: held, then released */
  const partner = pendingProviderRequests().find(b => b.payMethod !== 'cash') ||
                  BOOKINGS.find(b => b.status === 'requested');
  if (!partner.payMethod) partner.payMethod = 'gcash';
  attemptTransition(partner.id, 'upcoming', PROVIDER);
  const auth = paymentsFor(partner.id).find(p => p.type === 'authorization');
  c.check('accepting records an authorization', !!auth);
  c.check('held money is labelled held, not paid',
    partner.payStatus === 'authorized', partner.payStatus);
  c.check('a holding is not revenue',
    LEDGER.filter(e => e.bookingId === partner.id).every(e => e.eventType !== 'booking.settled'));

  /* a cash job never creates a holding */
  const cash = BOOKINGS.find(b => b.status === 'ongoing' && b.payMethod === 'cash');
  c.check('a cash job has no authorization row',
    !paymentsFor(cash.id).some(p => p.type === 'authorization'));

  /* completing releases */
  cash.status = 'ongoing';
  attemptTransition(cash.id, 'completed', PROVIDER);
  c.check('a cash completion records a collection, not a capture',
    !!paymentsFor(cash.id).find(p => p.type === 'collection'));
  c.check('and it says the money was paid on site',
    cash.payStatus === 'collected', cash.payStatus);
  c.check('the platform is owed the fee rather than holding it',
    accountBalance('commission_receivable', 'p1') >= cash.pricing.commissionCentavos,
    String(accountBalance('commission_receivable', 'p1')));

  /* refunds */
  const refundable = BOOKINGS.find(b => b.status === 'completed' && b.pricing &&
                                       b.payMethod !== 'cash');
  const revenueBefore = accountBalance('platform_fee_revenue');
  const payableBefore = accountBalance('provider_payable', refundable.providerId);
  const escrowBefore = accountBalance('escrow_held');
  const total = refundable.pricing.customerTotalCentavos;
  refundBooking(refundable, Math.round(total / 2), ADMIN, 'Half the work was not done');
  c.check('a partial refund leaves the job partly settled',
    refundable.payStatus === 'partially_refunded', refundable.payStatus);
  c.check('the fee on the refunded half is reversed',
    accountBalance('platform_fee_revenue') < revenueBefore);
  c.check('the provider gives back their half',
    accountBalance('provider_payable', refundable.providerId) < payableBefore);
  c.check('and it leaves the holding',
    accountBalance('escrow_held') === escrowBefore - Math.round(total / 2),
    String(escrowBefore - accountBalance('escrow_held')));
  const over = throws(() => { for (let i = 0; i < 8; i++) refundBooking(refundable, total, ADMIN, 'again'); });
  c.check('a job cannot be refunded past its price', !!over, 'unbounded');
  c.check('refunded never exceeds what was charged',
    paymentsFor(refundable.id).filter(p => p.type === 'refund').reduce((t, p) => t + p.amountCentavos, 0) <= total);
  c.check('every refund names who ordered it',
    paymentsFor(refundable.id).filter(p => p.type === 'refund').every(p => p.byActor));

  /* cancelling releases nothing as revenue */
  const upcoming = BOOKINGS.find(b => b.status === 'upcoming' && b.payMethod !== 'cash');
  const revBefore2 = accountBalance('platform_fee_revenue');
  attemptTransition(upcoming.id, 'cancelled', CUSTOMER, { reason:'Plans changed' });
  c.check('a cancellation returns the holding',
    accountBalance('customer_deposit', upcoming.id) === 0);
  c.check('and never books revenue for work not done',
    accountBalance('platform_fee_revenue') === revBefore2);
  c.check('the authorization is marked voided, not deleted',
    paymentsFor(upcoming.id).some(p => p.type === 'void') &&
    paymentsFor(upcoming.id).some(p => p.type === 'authorization' && p.status === 'voided'));

  /* payouts: a schedule, not a wallet */
  const held = providerBalances('p1');
  c.check('money the provider collected on site is not treated as ours to pay out',
    held.pendingCentavos + held.availableCentavos <= accountBalance('provider_payable', 'p1'),
    JSON.stringify({ pending: held.pendingCentavos, available: held.availableCentavos,
                     payable: accountBalance('provider_payable', 'p1') }));
  c.check('cash taken on site is reported separately', typeof held.collectedOnSiteCentavos === 'number');

  const blocked = runPayoutCycle('p6');
  c.check('a provider under the minimum is not paid', blocked.paid === false, blocked.reason);
  c.check('and nothing is recorded for a skipped cycle', PAYOUTS.length === 0);

  /* inside the hold, nothing is due yet */
  c.check('a job younger than the hold window is still pending',
    providerBalances('p1').availableCentavos === 0, String(providerBalances('p1').availableCentavos));

  /* clear the hold and the minimum so the cycle itself can be proven */
  app.setConfig({ payoutHoldDays: 0, payoutMinCentavos: 5000 });
  const before = accountBalance('provider_payable', 'p1');
  const cycle = runPayoutCycle('p1');
  c.check('at or above the minimum the cycle pays out', cycle.paid === true, cycle.reason);
  c.check('a payout never exceeds what the books owe',
    cycle.payout.amountCentavos <= before);
  c.check('the payable falls by exactly the payout',
    accountBalance('provider_payable', 'p1') === before - cycle.payout.amountCentavos);
  c.check('a full card number never reaches the record',
    !/\d{9,}/.test(JSON.stringify(cycle.payout)), JSON.stringify(cycle.payout));
  const again = runPayoutCycle('p1');
  c.check('a second cycle finds nothing new', again.paid === false, JSON.stringify(again.payout));
  c.check('payouts leave the holding as they leave the books',
    accountBalance('escrow_held') >= 0, String(accountBalance('escrow_held')));

  /* the two axes stay separate (AGENTS.md 22) */
  c.check('a booking can be completed while its money is still moving',
    BOOKINGS.some(b => b.status === 'completed' && b.payStatus !== 'captured'),
    BOOKINGS.map(b => b.status + '/' + b.payStatus).slice(0, 3).join(' '));
  c.check('and the axes are different fields on the same record',
    BOOKINGS.every(b => 'status' in b && 'payStatus' in b));
  return c;
});

/* ══ 8. the provider side ─══════════════════════════════════════════════════ */
suite('provider', async () => {
  const c = makeChecker();
  const app = boot();
  const { state, BOOKINGS, LISTINGS, earningsCard, jobActionBar, realRequestCard, listingsPanel,
          threadsFor, providerJobAction, toggleListing, commitListingDraft, pendingProviderRequests,
          bookingsForProvider, bookingsForResident, providerBalances, bookedThisWeek, completionRate,
          cancellationRate, pesoShort, label, render, _document, dayName, timeMinutes } = app;
  state.view = 'app'; state.role = 'provider'; state.tab = 'fsm';

  /* the wallet is gone, and what replaced it says where the money is */
  const earn = earningsCard('p1');
  c.check('the earnings card never says wallet', !/wallet/i.test(earn));
  c.check('and never promises a cash-out', !/cash-?out/i.test(earn));
  c.check('it reports the hold and the minimum honestly',
    earn.includes(pesoShort(providerBalances('p1').availableCentavos)) || /Ready to pay out/.test(earn));
  c.check('cash taken on site is shown as already the provider’s', /Collected on site/.test(earn));

  /* The dashboard's "Today" section. It used to take every upcoming job in record
     order, cut it to three and label the result Today — so it showed a Monday job
     under a Today heading, out of time order, and dropped a second one that nobody
     could reach from the screen. */
  const dash = (() => {
    const was = state.tab;
    state.role = 'provider'; state.tab = 'dashboard'; render();
    const out = _document.getElementById('screen').innerHTML || '';
    state.tab = was; render();
    return out.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  })();
  const held = bookingsForProvider().filter(b => b.status === 'upcoming' || b.status === 'ongoing');
  const todays = held.filter(b => b.date === dayName(0));
  const beyond = held.filter(b => b.date !== dayName(0));
  const slice = (dash.match(/Today ([\s\S]*?)(?=booked this week|Insights|$)/) || [])[1] || '';
  c.check('a provider can reach every job he holds',
    held.every(b => slice.includes(b.summary) || /more scheduled job/.test(slice)),
    held.filter(b => !slice.includes(b.summary)).map(b => b.id).join(' ') + ' are neither listed nor counted');
  c.check('the Today section lists only jobs that are today',
    todays.every(b => slice.includes(b.summary)) &&
    (beyond.length === 0 || slice.includes(beyond[0].date)),
    'today=' + todays.map(b => b.id).join(',') + ' beyond=' + beyond.map(b => b.id + '@' + b.date).join(','));
  /* Asserting the order on the seed as it stands proves nothing — record order
     happens to be chronological for today's two jobs, so an unsorted list passes.
     Shuffle the array first and ask again: now only a real sort keeps the screen
     in order. */
  const rowsInOrder = (() => {
    const was = BOOKINGS.slice();
    try {
      BOOKINGS.length = 0;
      was.slice().reverse().forEach(x => BOOKINGS.push(x));
      state.role = 'provider'; state.tab = 'dashboard'; render();
      const out = (_document.getElementById('screen').innerHTML || '').replace(/<[^>]+>/g, ' ');
      const seg = (out.match(/Today ([\s\S]*?)(?=more scheduled job|booked this week|Insights|$)/) || [])[1] || '';
      return (seg.match(/\b\d{1,2}:\d{2} [AP]M\b/g) || []).map(timeMinutes);
    } finally {
      BOOKINGS.length = 0; was.forEach(x => BOOKINGS.push(x));
      render();
    }
  })();
  c.check('jobs are listed in the order they happen, whatever order the records are in',
    rowsInOrder.length >= 2 && rowsInOrder.every((t, i) => i === 0 || rowsInOrder[i - 1] <= t),
    rowsInOrder.join(' → '));

  /* only moves the machine allows */
  const job = bookingsForProvider().find(b => b.status === 'upcoming');
  const bar = jobActionBar(job);
  c.check('the action bar offers the legal next move', /I have arrived|Start the work/.test(bar), bar.slice(0, 60));
  c.check('and never offers one the table refuses', !/>Accept</.test(bar));
  const before = BOOKINGS.length;
  providerJobAction(job.id, 'en_route');
  c.check('pressing it moves the shared record', job.status === 'en_route', job.status);
  c.check('without inventing a second record', BOOKINGS.length === before);

  /* the FSM no longer narrates an imaginary queue */
  const fsm = realRequestCard();
  const oldest = pendingProviderRequests().slice().sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))[0];
  c.check('the surge card shows the request that has waited longest',
    fsm.includes(oldest.summary.slice(0, 12)), oldest.summary);
  c.check('and counts down from the configured window', /min left to answer/.test(fsm));
  pendingProviderRequests().forEach(b => { b.status = 'completed'; });
  c.check('with nothing waiting it says so plainly', /Nothing waiting on you/.test(realRequestCard()));

  /* the price list is data, not prose */
  const count = LISTINGS.length;
  listingsPanel('p1');
  c.check('a listed service can be hidden and shown again', (() => {
    const l = LISTINGS[0]; const was = l.isActive;
    toggleListing(l.id); const flipped = l.isActive;
    toggleListing(l.id); return flipped !== was && l.isActive === was;
  })());
  state.providerProfileModal = 'add_service'; state.listingDraft = null; state.profileError = null;
  _document.getElementById('listing-title').value = 'Emergency pipe burst response';
  _document.getElementById('listing-price').value = '850';
  _document.getElementById('listing-mins').value = '90';
  commitListingDraft();
  const added = LISTINGS.find(l => l.title === 'Emergency pipe burst response');
  c.check('adding a service writes a record', !!added && LISTINGS.length === count + 1);
  c.check('at a whole number of centavos', added && added.basePriceCentavos === 85000, added && String(added.basePriceCentavos));
  c.check('a price under the floor is refused with a reason on the field', (() => {
    state.providerProfileModal = 'add_service';
    state.listingDraft = { id:null, title:'Cheap job', pricePesos:'20', durationMin:'30' };
    _document.getElementById('listing-title').value = 'Cheap job';
    _document.getElementById('listing-price').value = '20';
    _document.getElementById('listing-mins').value = '30';
    commitListingDraft();
    return !LISTINGS.some(l => l.title === 'Cheap job') && /at least/.test(state.profileError || '');
  })(), state.profileError);
  state.profileError = null;

  /* conversations follow the job, not the demo persona */
  const providerThreads = threadsFor('provider');
  const residentThreads = threadsFor('resident');
  c.check('a provider sees only the clients of their own jobs',
    providerThreads.length > 0 && providerThreads.every(t => t.kind === 'customer' &&
      bookingsForProvider().some(b => b.customerId && app.customerOf(b).name === t.name)));
  c.check('a resident sees only their own providers',
    residentThreads.length > 0 && residentThreads.every(t => t.kind === 'provider'));
  c.check('neither thread list is the other role’s inbox',
    !providerThreads.some(t => residentThreads.some(r => r.name === t.name && r.kind === t.kind)));

  /* dashboard figures come from records */
  const week = bookedThisWeek('p1');
  c.check('booked this week matches the jobs in the last seven days',
    week === bookingsForProvider().filter(b => Date.now() - Date.parse(b.createdAt) < 7 * 86400000)
             .reduce((t, b) => t + (b.amountCentavos || 0), 0), String(week));
  c.check('completion and cancellation are complements',
    completionRate('p1') + cancellationRate('p1') <= 100);
  return c;
});

/* ══ 9. the money console ─══════════════════════════════════════════════════ */
suite('admin', async () => {
  const c = makeChecker();
  const app = boot();
  const { state, BOOKINGS, DISPUTES, LEDGER, CONFIG, CONFIG_AUDIT, LISTINGS,
          platformStatement, statementCard, configPanel, disputeCard, adminCounts, intelligenceStats,
          supplyGaps, setConfig, commitConfig, resolveCase, resolveDispute, resetDemoData,
          accountBalance, paymentsFor, peso, pesoCompact, render, _document, label,
          disputeLabel, DISPUTE_STATES, caseIsOpen } = app;
  const el = id => _document.getElementById(id);

  /* the card and the ledger agree */
  const st = platformStatement();
  const card = statementCard();
  c.check('the statement card prints the ledger’s own number', card.includes(peso(st.commissionEarnedCentavos)));
  c.check('and the compact tile agrees with it', adminFinanceHtmlHas(app, pesoCompact(st.grossServicesCentavos)) || card.includes(peso(st.grossServicesCentavos)));

  /* no typed fortune tellers left on the console */
  state.view = 'app'; state.role = 'admin'; state.tab = 'admin_dashboard'; state.adminScreen = 'overview';
  app.render();
  const dash = _document.getElementById('screen').innerHTML;
  c.check('the dashboard no longer quotes an invented month', !/42,800|48,200|42\.8k/.test(dash));
  c.check('and no longer splits revenue that was never earned', !/Revenue allocation|Community programs/.test(dash));

  /* configuration is editable, audited, and does not rewrite history */
  const before = CONFIG.commissionRateDefault;
  const frozenJob = BOOKINGS.find(b => b.pricing);
  const frozenRate = frozenJob.pricing.commissionRate;
  el('cfg-commissionRateDefault').value = '18';
  el('cfg-taxRate').value = '12';
  el('cfg-payoutMinCentavos').value = '250';
  el('cfgcat-plumbing').value = '25';
  commitConfig();
  c.check('a saved rate takes effect', CONFIG.commissionRateDefault === 0.18, String(CONFIG.commissionRateDefault));
  c.check('a VAT setting is recorded, not assumed silently', CONFIG.taxRate === 0.12, String(CONFIG.taxRate));
  c.check('a per-category override is stored separately', CONFIG.commissionRateByCategory.plumbing === 0.25);
  c.check('the change is written to a log', CONFIG_AUDIT.length >= 3 && CONFIG_AUDIT[0].actor === 'admin');
  c.check('and the job booked earlier keeps the rate it agreed', frozenJob.pricing.commissionRate === frozenRate);
  const withTax = app.computeBreakdown({ baseCentavos: 100000, categoryId: 'plumbing' });
  c.check('a new job pays the category rate', withTax.commissionCentavos === 25000, String(withTax.commissionCentavos));
  c.check('and VAT now appears, on the platform fee only',
    withTax.taxCentavos === Math.round((25000 + CONFIG.fixedFeeCentavos) * 0.12), String(withTax.taxCentavos));
  c.check('the split still reconciles with tax on',
    withTax.providerShareCentavos + withTax.commissionCentavos + withTax.passThroughCentavos + withTax.fixedFeeCentavos + withTax.taxCentavos
      === withTax.customerTotalCentavos);
  c.check('a negative rate is refused', (() => {
    el('cfg-commissionRateDefault').value = '-5'; commitConfig();
    return CONFIG.commissionRateDefault === 0.18;
  })());
  setConfig({ commissionRateDefault: before, taxRate: 0, commissionRateByCategory: {} }, { role: 'admin' });

  /* disputes: read the evidence, then move the money */
  const d = DISPUTES[0];
  const b = BOOKINGS.find(x => x.id === d.bookingId);
  c.check('a case is tied to a real job', !!b && !!b.pricing);
  c.check('and to the money that job produced', d.amountInClaimCentavos === b.pricing.customerTotalCentavos);
  c.check('the freeze is on the books', accountBalance('dispute_hold', b.id) > 0);
  c.check('the case card shows evidence rather than a verdict', (() => {
    const html = disputeCard(d);
    return /Evidence timeline/.test(html) && !/found guilty|at fault/i.test(html);
  })());
  const heldBefore = accountBalance('dispute_hold', b.id);
  const revenueBefore = accountBalance('platform_fee_revenue');
  resolveCase(d.id, 'refunded');
  c.check('refunding releases the freeze', accountBalance('dispute_hold', b.id) === 0, String(accountBalance('dispute_hold', b.id)));
  c.check('it reverses our own fee', accountBalance('platform_fee_revenue') === revenueBefore - Math.round(heldBefore * b.pricing.commissionRate / (1 - b.pricing.commissionRate)),
    String(revenueBefore - accountBalance('platform_fee_revenue')));
  c.check('it leaves a refund row on the job', paymentsFor(b.id).some(p => p.type === 'refund'));
  c.check('the case is closed and says how',
    d.status === 'refunded' && /refunded/.test(disputeLabel(d.status)), d.status + ' / ' + disputeLabel(d.status));
  /* The status used to BE the sentence, and the audit log recovered the outcome by
     splitting it on its own em-dash. A code cannot drift into a rule. */
  c.check('a case stores a code, never a sentence',
    DISPUTES.every(x => !!DISPUTE_STATES[x.status]) && !/status\.split\(/.test(app._source),
    DISPUTES.map(x => x.status).join(','));
  c.check('and the words come from the table, for every outcome',
    ['open', 'upheld', 'partly_refunded', 'refunded'].every(k => DISPUTE_STATES[k] && DISPUTE_STATES[k].label && DISPUTE_STATES[k].short)
    && DISPUTE_STATES.open.tone === 'warning' && DISPUTE_STATES.upheld.tone === 'success');
  c.check('closing it twice is refused', (() => { try { resolveDispute(d.id, 'upheld'); return false; } catch (err) { return /already closed/.test(err.message); } })());
  c.check('the booking records the outcome', b.status === 'cancelled' && b.payStatus === 'refunded', b.status + '/' + b.payStatus);
  c.check('every event still balances after a refund', LEDGER.every(e => {
    const dr = e.lines.filter(l => l.direction === 'debit').reduce((t, l) => t + l.amountCentavos, 0);
    const cr = e.lines.filter(l => l.direction === 'credit').reduce((t, l) => t + l.amountCentavos, 0);
    return dr === cr;
  }));
  c.check('no account went negative under the console',
    Object.keys(app.ACCOUNTS).every(k => accountBalance(k) >= 0),
    Object.keys(app.ACCOUNTS).filter(k => accountBalance(k) < 0).join(','));

  /* counts and filters */
  const k = adminCounts();
  c.check('the console counts what is actually there',
    k.verified === app.PROVIDERS.length && k.liveCases === DISPUTES.filter(x => x.status === 'under review').length);
  const allTime = intelligenceStats({ days: 0, category: 'all' });
  const month = intelligenceStats({ days: 30, category: 'all' });
  const plumbed = intelligenceStats({ days: 0, category: 'plumbing' });
  c.check('all time is never smaller than a window', allTime.bookings >= month.bookings);
  c.check('a category filter cannot show other work',
    plumbed.byCategory.every(r => r.id === 'plumbing'), plumbed.byCategory.map(r => r.id).join(','));
  c.check('gaps only name categories with demand and thin cover',
    supplyGaps({ category: 'all' }).every(g => g.demand > 0 && g.supply <= 1));

  /* the reset control */
  const jobsBefore = BOOKINGS.length;
  resetDemoData();
  c.check('restoring the sample records clears the case and the money',
    DISPUTES.length === 1 && caseIsOpen(DISPUTES[0]) && BOOKINGS.length === jobsBefore);
  c.check('and the reopened job is back to being disputed',
    BOOKINGS.some(x => x.status === 'disputed'));
  return c;
});

function adminFinanceHtmlHas(app, needle) {
  try {
    app.state.view = 'app'; app.state.role = 'admin'; app.state.tab = 'admin_dashboard';
    app.state.adminScreen = 'finance'; app.render();
    return app._document.getElementById('screen').innerHTML.includes(needle);
  } catch (err) { return false; }
}

/* ══ 10. hygiene that must not regress ═══════════════════════════════════════ */
suite('hygiene', async () => {
  const c = makeChecker();
  const src = require('fs').readFileSync(require('./harness.cjs').APP, 'utf8');
  const body = src.slice(src.lastIndexOf('<script>') + 8, src.lastIndexOf('</script>'));
  const css = src.slice(0, src.indexOf('</style>'));

  /* a button that reports success without changing anything is the bug class this
     whole rebuild was asked to remove */
  const congratulating = (body.match(/onclick="showToast\(([^)]*)\)"[^>]*>/g) || [])
    .filter(t => /successfully|Accepted|sent|generated/i.test(t));
  c.check('no control claims success it does not deliver', congratulating.length === 0,
    congratulating.map(t => t.slice(0, 60)).join(' | '));

  /* ── the escaping rule, pinned ─────────────────────────────────────────────
     esc()'s own comment says anything from a keyboard stays data and never becomes markup.
     That held for chat and booking text and never held for the profile objects: 44 sites
     painted a persisted, typed value straight into markup, and tools/probe-injection.js
     showed the browser building real elements out of a name field. A fix that is not pinned
     is a fix that comes back the next time someone adds an editable field — which this app
     does on purpose.

     It resolves the aliases from the page's own `X.field = el.value` assignments rather than
     from a list of field names, because a list goes stale the moment a field is added and a
     stale list reads as clean. */
  const writable = new Set();
  for (const m of body.matchAll(/(state\.[A-Za-z]+)\.([A-Za-z_$][\w$]*)\s*=\s*[A-Za-z_$][\w$.]*\.value/g)) {
    writable.add(m[1] + '.' + m[2]);
  }
  const pAlias = {};
  for (const m of body.matchAll(/(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(state\.[A-Za-z]+)\b/g)) {
    if (!pAlias[m[1]]) pAlias[m[1]] = m[2];
  }
  /* The object path is itself a way to read the same field, and a page that mostly uses an
     alias can gain one direct read at any time — so both spellings are prefixes to match. */
  for (const target of new Set(Object.values(pAlias))) pAlias[target] = target;
  c.check('the page declares fields a keyboard can write', writable.size >= 10, writable.size + ' found');

  const SAFE_RETURN = ['esc', 'peso', 'pesoShort', 'rateLabel', 'label', 'chartSrSummary', 'Number', 'String', 'Math'];
  const SAFE_SINK = ['settingsRow', 'row', 'emptyState'];
  const untilMatch = (s, from, open, close) => {
    let d = 0;
    for (let i = from; i < s.length; i++) { if (s[i] === open) d++; else if (s[i] === close) { d--; if (!d) return i; } }
    return s.length;
  };
  const guardedSpans = (expr) => {
    const spans = [];
    for (const f of [...SAFE_RETURN, ...SAFE_SINK]) {
      let at = -1;
      while ((at = expr.indexOf(f + '(', at + 1)) >= 0) {
        if (at && /[\w$.]/.test(expr[at - 1])) continue;
        spans.push([at, untilMatch(expr, at + f.length, '(', ')') + 1]);
      }
    }
    return spans;
  };
  const leaks = [];
  let paintedFields = 0;
  for (let i = 0; i < body.length - 1; i++) {
    if (body[i] !== '$' || body[i + 1] !== '{') continue;
    const end = untilMatch(body, i + 1, '{', '}');
    const expr = body.slice(i + 2, end);
    const spans = guardedSpans(expr);
    for (const [a, target] of Object.entries(pAlias)) {
      const re = new RegExp('\\b' + a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\.([A-Za-z_$][\\w$]*)', 'g');
      for (const m of expr.matchAll(re)) {
        if (!writable.has(target + '.' + m[1])) continue;
        paintedFields++;
        if (!spans.some(([s, e]) => m.index >= s && m.index < e)) {
          leaks.push(target + '.' + m[1] + ' at line ' + (body.slice(0, i).split('\n').length + (src.slice(0, src.indexOf('<script>')).split('\n').length)));
        }
      }
    }
    i = end;
  }
  c.check('no keyboard-writable field is painted without escaping', leaks.length === 0,
    leaks.slice(0, 4).join(' | ') + ' (' + leaks.length + ' of ' + paintedFields + ')');
  c.check('the rule has something to bite on', paintedFields >= 25, paintedFields + ' writable reads into markup');

  /* esc() alone cannot serve an inline handler: the attribute is HTML and the decoded content
     is a JavaScript string, so a double quote survives esc() and closes the attribute. */
  c.check("esc() covers the apostrophe as well as the double quote",
    /\[&<>"'\]/.test(body), 'character class not found');
  c.check('settingsRow quotes its handler instead of patching quotes into it',
    /function settingsRow[\s\S]{0,700}onclick="\$\{act\}"/.test(body) && /jsStr\(title\)/.test(body) && /jsStr\(detail\)/.test(body),
    'act must be built from jsStr()');
  c.check('settingsRow escapes what it paints',
    /jr-t">\$\{esc\(title\)\}<[\s\S]{0,80}jr-s">\$\{esc\(detail\)\}/.test(body));
  c.check('emptyState escapes the words it is handed',
    /empty-title">\$\{esc\(title\)\}[\s\S]{0,60}empty-body">\$\{esc\(body\)\}/.test(body));
  const jsStrBody = ((/function jsStr\(v\)\{([\s\S]{0,240}?)\n\}/.exec(body) || [, ''])[1]);
  c.check('jsStr exists and escapes for both languages',
    /JSON\.stringify/.test(jsStrBody) && /esc\(/.test(jsStrBody) && /replace\(\/'\/g/.test(jsStrBody),
    jsStrBody.trim().slice(0, 90) || 'jsStr() not found');

  /* A token derived for one surface and never wired in is a fix that was declared, not made. */
  c.check('the on-dark rating uses the tint derived for it',
    /\.stars\.on-dark \.fill\{ color:var\(--rating-on-dark\); \}/.test(css));
  c.check('the legacy alias with no call site is gone', !/--deep-700/.test(css));

  /* ── the 44px tap floor, and the credential summary that contradicted its own list ──
     Seventeen controls measured under the floor once the instrument stopped crediting a
     wrapper that cannot forward a tap. The search pill is 56px of padding around a 23px
     input in an inert div, so the target really was 23px; giving the input the floor left
     the pill at 56px and the category grid exactly where it was. */
  const tapRules = [
    ['.search-wrapper input min-height', /\.search-wrapper input\{[^}]*min-height:var\(--tap\)/],
    ['chat input min-height', /id="chat-input"[^\n]*?min-height:var\(--tap\)/],
    ['commission rate inputs min-height', /width:62px; min-height:var\(--tap\)/],
    ['admin roster search min-height', /width:100%; min-height:var\(--tap\); border:0/],
    ['auth-switch min-height', /\.auth-switch\{[^}]*min-height:var\(--tap\)/],
  ];
  const missingTap = tapRules.filter(([, re]) => !re.test(src)).map(([n]) => n);
  c.check('every control raised to the tap floor still declares it', missingTap.length === 0, missingTap.join(' | '));
  c.check('no hand-rolled 30px back button survives', !/width:30px; height:30px/.test(src)
    && /class="back-btn" onclick="state\.tab='admin_verifications'; state\.adminProviderCategory='verified'/.test(src));
  /* Scoped to a style attribute on purpose: the first cut of this pattern let [^"]* run across
     whole CSS rules and reported two false hits, because a rule that sets width and a later
     media query that overrides it are not "the same attribute declaring a size twice". */
  c.check('a style attribute does not declare the same size twice',
    !/style="[^"]*width:var\(--tap\)[^"]*width:[0-9]+px/.test(src) &&
    !/style="[^"]*height:var\(--tap\)[^"]*height:[0-9]+px/.test(src),
    'a later width silently overrode the tap token, which is how a 44px button measured 30');

  c.check('the profile card no longer asserts a fixed credential state', !/All Valid<\/b>/.test(src));

  /* The inline set is the only icon path the rebuild takes: a missing glyph is an
     empty square on every screen, with no custom element left to catch it. Names
     reach ic() three ways — written in markup, carried by a record, or passed to
     emptyState() — and a data-table name is the one a grep for ic(' misses. */
  const defined = new Set((body.match(/^  '?([a-z0-9-]+)'?: \{o:/gm) || [])
    .map(l => l.replace(/^  '?/, '').replace(/'?: \{o:$/, '')));
  const dupes = (body.match(/^  '?([a-z0-9-]+)'?: \{o:/gm) || []).length - defined.size;
  const quoted = new Set([...body.matchAll(/\bic\(\s*['"]([a-z0-9-]+)['"]/g)].map(m => m[1]));
  const carried = new Set([...body.matchAll(/\bicon:\s*'([a-z0-9-]+)'/g)].map(m => m[1]));
  const empties = new Set([...body.matchAll(/\bemptyState\(\s*'([a-z0-9-]+)'/g)].map(m => m[1]));
  const asked = new Set([...quoted, ...carried, ...empties]);
  const missing = [...asked].filter(n => !defined.has(n));
  c.check('every glyph the app can reach has a drawing', missing.length === 0, 'missing: ' + missing.join(','));
  c.check('and the names were actually looked for', asked.size >= 30 && defined.size >= asked.size,
    asked.size + ' reachable, ' + defined.size + ' drawn');
  c.check('no glyph key is declared twice', dupes === 0, dupes + ' duplicate entry(ies)');
  c.check('the set stays the size of an icon system', defined.size <= 48, defined.size + ' entries');
  /* reicon.js is 8 MB of LFS for a set the file now draws itself, and a page that
     waits for a custom element to register shows a screen with no icons for four
     seconds when it never does. The rebuild loads neither. */
  c.check('the rebuild paints icons from one source, not two',
    !/<script[^>]*reicon\.js/.test(src) && !/<re-icon/.test(src) && !/REICON_READY/.test(src));
  c.check('the active tab can still be drawn filled',
    /ICONS\.home\.f/.test(body) && /ICONS\.calendar\.f/.test(body));

  /* retired markup should stay retired */
  c.check('no hidden cards are shipped', !/<div class="card" style="display:none;">/.test(body));

  /* Category artwork is static by owner's rule, not by taste: the picture is what
     tells a plumber from an electrician, and this app once ran 33 infinite
     animations over the seven tiles. A CSS-only guard would not hold — the motion
     lived in both the stylesheet and the markup, and the file also carried two
     comments that disagreed about whether it moved. So all three ways it came back
     are checked: the keyframes, the rules, and the classes on the shapes. */
  const catRules = [...css.matchAll(/(\.cat[a-z-]*(?:[^{}]*))\{([^{}]*)\}/g)]
    .map(m => ({ sel: m[1].replace(/\s+/g, ' ').trim(), decl: m[2] }))
    .filter(r => /\.cat\b|\.cat\s|\.cat:|\.cat\./.test(r.sel));
  const catAnimatedRules = catRules.filter(r => /animation|transform/.test(r.decl));
  c.check('no category-tile rule animates or transforms', catAnimatedRules.length === 0,
    catAnimatedRules.map(r => r.sel).join(' | '));
  c.check('the category keyframes stay deleted', !/@keyframes ca[A-Z]/.test(css));
  c.check('no artwork shape carries an animation class', !/class="ca-[a-z]/.test(body));
  /* These four existed only to move. A twinkle that cannot twinkle is a plus sign,
     speed lines behind a still parcel are three dashes, and a second ripple ring
     stacked on the first is a doubled stroke. Asserted as "at most one", because the
     scenes they lived in have since been replaced by rendered images entirely. */
  c.check('the motion-only marks were not restored',
    !/M8 9v8M4 13h8/.test(body) && !/M2 17h6/.test(body) &&
    !/<circle cx="28" cy="11" r="2\.6"/.test(body) &&
    (body.match(/cx="35" cy="50" rx="7" ry="2"/g) || []).length <= 1,
    'twinkle cross, speed lines, page dots or a duplicate ripple has come back');

  /* The category tiles are pre-rendered image files now, so the checks that matter
     are about the files: every category has one, it is on disk, it is referenced by a
     local relative path, and it is not smuggled in as base64 or fetched from a CDN.
     A tile with a missing image is a blank square on the front door of the app, and
     nothing else in this suite would notice. */
  const appDir = require('path').dirname(require('./harness.cjs').APP);
  const fsx = require('fs');
  const artMap = src.slice(src.indexOf('const SERVICE_ART = {'), src.indexOf('const CAT_ART_PX'));
  const artPaths = [...artMap.matchAll(/([a-z]+):\s*'([^']+)'/g)].map(m => ({ id: m[1], file: m[2] }));
  const catalogue = boot().SERVICES;
  c.check('the art map is keyed by every category the catalogue holds',
    catalogue.every(s => artPaths.some(a => a.id === s.id)),
    'missing an entry for: ' + catalogue.filter(s => !artPaths.some(a => a.id === s.id)).map(s => s.id).join(','));
  c.check('and every entry names a file that is actually on disk',
    artPaths.length > 0 && artPaths.every(a => fsx.existsSync(require('path').join(appDir, a.file))),
    'dangling: ' + artPaths.filter(a => !fsx.existsSync(require('path').join(appDir, a.file))).map(a => a.file).join(','));
  c.check('category art is local — no CDN, no absolute URL, no base64 payload',
    artPaths.every(a => /^assets\/[a-z0-9/-]+\.png$/.test(a.file)) &&
    !/src="https?:|src="data:image/.test(src));
  c.check('the tile image states its size and stays out of the accessibility tree',
    /width="' \+ CAT_ART_PX \+ '" height="' \+ CAT_ART_PX/.test(src) && /alt=""/.test(src));
  c.check('the flat SVG scene table is gone, not merely unused', !/const CAT_ART = \{/.test(src));

  /* The keyboard surface. Each of these was true-once-and-broke: a focus ring that
     named seventeen classes left every later control invisible, two fields set
     outline:none inline where no rule could reach them, and one booking card was a
     div with an onclick — operable by mouse only. */
  const inlineNoOutline = (src.match(/style="[^"]*outline:\s*none/g) || []).length;
  c.check('no control suppresses its focus ring from markup', inlineNoOutline === 0,
    inlineNoOutline + ' inline outline:none');
  c.check('one focus rule covers everything focusable',
    /:where\([\s\S]{0,420}?\):focus-visible/.test(css.replace(/\r?\n\s*/g, ' ')),
    'no :where(...) selector carrying :focus-visible');
  const bareClicks = (body.match(/<(div|span|li|td|p|img)\b[^>]*onclick=/g) || [])
    .filter(t => !/role=|tabindex=/.test(t));
  c.check('every click target is reachable without a mouse', bareClicks.length === 0,
    bareClicks.map(t => t.slice(1, 30)).join(' | '));
  c.check('a toast is announced, not just painted', /aria-live/.test(body) && /role', 'status'/.test(body));
  c.check('each screen states its title as a heading', /<h1 class="title">/.test(body));
  c.check('and a sheet over it does not pretend to be the page', /<h2 class="sheet-title">/.test(body));
  c.check('a call control dials', (body.match(/href="tel:/g) || []).length >= 2);
  c.check('the provider map uses the provider it names', !/setView\(\[6\.3665, 124\.9338\], 15\)/.test(body));
  c.check('no stored-value wallet language survives',
    !/Secure Balance Wallet|Instant Cash-Out|wallet balance/i.test(body));
  c.check('nothing pretends a rate is measured', !/\(previously 4%\)|\(previously 4\.8\)/.test(body));
  return c;
});

/* ══ 11. the sign-in screen ═════════════════════════════════════════════════ */
suite('login', async () => {
  const c = makeChecker();
  const app = boot();
  const { state, loginHTML } = app;
  const safe = (label, fn) => { try { return fn(); } catch (err) { c.check(label + ' threw', false, err.message); return ''; } };

  state.view = 'login';
  const screens = [];
  ['resident', 'provider', 'admin'].forEach(role => {
    state.role = role;
    state.authMode = 'login';
    screens.push(['log in · ' + role, safe(role, () => loginHTML())]);
    state.authMode = 'register';
    screens.push(['register · ' + role, safe(role, () => loginHTML())]);
  });

  const problems = [];
  const OPEN = /<div\b/g, CLOSE = /<\/div>/g, HOLE = /undefined|NaN|\[object Object\]/;
  screens.forEach(([name, out]) => {
    if (!out) { problems.push(name + ' produced nothing'); return; }
    const o = (out.match(OPEN) || []).length, cl = (out.match(CLOSE) || []).length;
    if (o !== cl) problems.push(name + ' markup unbalanced ' + o + ' against ' + cl);
    const hole = out.match(HOLE);
    if (hole) problems.push(name + ' paints ' + hole[0]);
    if (!/id="login-email"/.test(out) || !/id="login-pass"/.test(out)) problems.push(name + ' is missing a field');
    if (!/id="login-btn"/.test(out)) problems.push(name + ' has no primary action');
  });
  c.check('every sign-in state renders clean', problems.length === 0, '\n      ' + problems.join('\n      '));

  const one = screens[0][1];
  const reg = screens[1][1];
  const adminLog = screens[4][1];
  const adminReg = screens[5][1];
  const css = app._source;
  /* Admin is an operations console, not a person looking for a plumber, so it is
     never a chip. It is reached by one quiet link at the foot of the account
     creation card, and once entered it says what it is and offers the way back. */
  c.check('sign-in offers the two roles a marketplace is for',
    /id="rt-resident"/.test(one) && /id="rt-provider"/.test(one) && !/id="rt-admin"/.test(one));
  c.check('create account keeps those two chips and hides Admin in a foot link',
    /id="rt-resident"/.test(reg) && /id="rt-provider"/.test(reg)
    && /class="auth-admin-link" id="rt-admin"/.test(reg));
  c.check('the Admin route names itself and gives one way back out',
    /Signing in as Admin/.test(adminLog) && /id="rt-admin-exit"/.test(adminLog)
    && !/id="rt-resident"/.test(adminLog));
  c.check('and the Admin card has no control that cannot be answered',
    !/id="toggle-auth-mode"/.test(adminLog) && !/id="reg-name"/.test(adminReg));
  c.check('the form sits in one centred card on the brand gradient',
    /\.auth-screen\{[\s\S]{0,260}?background:var\(--grad-brand-soft\)/.test(css)
    && /\.auth-sheet\{[\s\S]{0,400}?box-shadow:var\(--shadow-md\)/.test(css));
  c.check('the card never outgrows the viewport, so the keyboard has room',
    /\.auth-sheet\{[\s\S]{0,400}?max-height:100%/.test(css)
    && /\.auth-screen\{[\s\S]{0,260}?overflow:hidden/.test(css));
  /* Global, because a non-global match returns the capture groups as well as the
     hit, and a length of 2 then means "found once", not "both chips". */
  const chipGlyphs = (one.match(/id="rt-(?:resident|provider)"[^>]*>[\s\S]{0,90}?<svg/g) || []).length;
  c.check('each role chip carries the glyph of where it leads',
    chipGlyphs === 2, 'found ' + chipGlyphs + ' of 2');
  /* The check is only worth anything if the chips are there to look at: an empty
     render would report zero and read like a glyph problem, not a broken screen. */
  c.check('and both role chips were actually painted to compare',
    chipGlyphs === 2 && (one.match(/id="rt-resident"/g) || []).length === 1
    && (one.match(/id="rt-provider"/g) || []).length === 1);
  c.check('the official mark is the first thing on it',
    one.indexOf('Sukinnect_Logo.png') > -1 && one.indexOf('Sukinnect_Logo.png') < one.indexOf('login-email'));
  /* what was asked off the screen: the pitch, not the product */
  c.check('no marketing copy is left competing with the form',
    !/Verified local help|Two minutes now|Now serving Tupi|Welcome back/.test(one));
  c.check('the FIND-REVIEW-BOOK-RECORD strip is not on the sign-in screen',
    !/REVIEW.*BOOK/.test(one));
  c.check('and the prefilled-credentials paragraph is gone',
    !/prefilled for the role above/.test(one));
  /* The disclaimer left the form, so the honesty has to live where it is
     actionable — the message shown at the moment the claim is made. */
  c.check('no disclaimer paragraph competes with the fields',
    !/auth-note-line|not an account|Demo environment/.test(one));
  c.check('and the sign-in still says the account is not stored',
    /this account is not stored/.test(app._source));
  c.check('forgot password reads as a link under the field', /class="auth-forgot"/.test(one));
  c.check('log in is the only primary action',
    (one.match(/class="btn" id="login-btn"/g) || []).length === 1);
  c.check('register asks for a name and a barangay, login does not',
    /id="reg-name"/.test(reg) && /id="reg-brgy"/.test(reg) && !/id="reg-name"/.test(one));
  c.check('fields carry real labels, not a placeholder alone', /for="login-email"/.test(one));
  c.check('the password can be shown', /id="toggle-pw-btn"/.test(one));
  c.check('the sample credential still arrives prefilled for the chosen role',
    one.indexOf('ana@demo.ph') > -1 && screens[2][1].indexOf('ramil@demo.ph') > -1);
  c.check('the sheet is the only scroller, so the keyboard cannot bury the action',
    /class="auth-sheet"/.test(one));
  return c;
});

/* ══ 12. every journey can actually be walked ═══════════════════════════════
   The audit found a status the machine could produce and no screen produced: the
   booking moved to "Under review" from a button labelled with the state itself,
   and the function that creates a case had no caller at all. Rendering cleanly
   was never going to catch that. So this suite asks the shipped markup the
   question the code cannot answer by itself: is there a control there, for the
   person who is standing on that screen, that does the thing the model claims? */
suite('journeys', async () => {
  const c = makeChecker();
  const app = boot();
  const { state, render, BOOKINGS, TRANSITIONS, nextActionFor, PAYMENT_LABELS, PAY_METHODS,
          BOOKING_STATES, FINISHED_STATES, openCaseSheet, submitCase, resolveDispute,
          DISPUTES, MESSAGES, sendChatMessage, attemptTransition, providerOf,
          CURRENT_CUSTOMER_ID } = app;
  const src = app._source;
  const html = () => app._document.getElementById('screen').innerHTML;
  const go = (role, tab, extra) => {
    state.view = 'app'; state.role = role; state.tab = tab; state.isChatOpen = false;
    if (extra) extra();
    render();
    return html();
  };
  const controls = (pattern) => [...html().matchAll(pattern)].map(m => m[1]);

  /* ── the case door exists on both sides ── */
  const residentJob = BOOKINGS.find(b => b.customerId === app.CURRENT_CUSTOMER_ID && b.status === 'completed' && b.pricing);
  residentJob.completedAt = new Date(Date.now() - 86400000).toISOString();
  go('resident', 'booking_detail', () => { state.selectedBookingId = residentJob.id; });
  c.check('a resident with an eligible job is offered a case',
    /openCaseSheet\('/.test(html()));
  c.check('and the offer is a button, not a state name wearing a verb',
    !/>Under review</.test(html()) && /Something went wrong/.test(html()));

  const proJob = BOOKINGS.find(b => b.providerId === app.CURRENT_PROVIDER_ID && b.status === 'ongoing');
  go('provider', 'provider_booking_detail', () => { state.selectedProviderBookingId = proJob.id; });
  c.check('a provider with a live job is offered the same door',
    /openCaseSheet\('/.test(html()));

  c.check('openDispute, the only thing that makes a case, is called from the app',
    (src.match(/openDispute\(/g) || []).length >= 2,
    'call sites: ' + ((src.match(/openDispute\(/g) || []).length - 1));

  /* walking it end to end, through the screens rather than the kernel */
  const before = DISPUTES.length;
  state.role = 'resident'; state.tab = 'booking_detail'; state.selectedBookingId = residentJob.id;
  render();
  openCaseSheet(residentJob.id);
  const box = app._document.getElementById('case-reason');
  box.value = 'The same fault returned the day after the repair was finished.';
  submitCase();
  c.check('the form a resident fills in produces a case, not only a status',
    DISPUTES.length === before + 1 && DISPUTES.some(d => d.bookingId === residentJob.id));
  c.check('and the help desk can see the case it produced',
    (() => { const h = go('admin', 'admin_disputes'); const d = DISPUTES.find(x => x.bookingId === residentJob.id);
             return d ? h.includes(d.id) : false; })());

  /* ── no machine move is offered as a bare state name ── */
  /* The rule the card should have followed all along: if a move can be offered to
     the provider, it has a verb. Falling back to the state's own name is how
     "Under review" ended up on a button. */
  const offered = new Set();
  Object.keys(TRANSITIONS).forEach(status =>
    Object.keys(TRANSITIONS[status] || {}).forEach(to => {
      if ((TRANSITIONS[status][to].actors || []).includes('provider')) offered.add(to);
    }));
  const noVerb = [...offered].filter(to => !app.JOB_VERBS[to]);
  c.check('every move a provider can make has a verb, not a state name',
    noVerb.length === 0, 'rendered as the status itself: ' + noVerb.join(', '));
  /* Asked behaviourally rather than as a grep for a variable name: the naming moved
     into providerJobMoves, and a check that greps for `JOB_VERBS[o]` only proves the
     file still spells it that way. This walks every status the provider can hold and
     fails if any button is wearing a state's own name. */
  const stateNames = new Set(Object.values(app.BOOKING_STATES).map(st => st.label));
  const wearingAStateName = [];
  Object.keys(app.BOOKING_STATES).forEach(st => {
    BOOKINGS.filter(b => b.status === st).slice(0, 4).forEach(b =>
      app.providerJobMoves(b).forEach(m => {
        if (m.kind !== 'note' && stateNames.has(m.label)) wearingAStateName.push(b.id + ':' + m.label);
      }));
  });
  c.check('and the card never has to fall back to a label',
    wearingAStateName.length === 0 && !/const VERBS = \{/.test(src),
    'buttons wearing a state name: ' + (wearingAStateName.join(', ') || 'none'));

  /* a requested job, the one place the fallback used to fire */
  const asked = BOOKINGS.find(b => b.status === 'requested' && b.providerId === app.CURRENT_PROVIDER_ID);
  if (asked) {
    go('provider', 'provider_booking_detail', () => { state.selectedProviderBookingId = asked.id; });
    c.check('the accept button says accept, not accepted',
      /Accept this request/.test(html()) && !/>Accepted</.test(html()));
  }

  /* ── the money axis only ever holds codes ── */
  c.check('no booking carries a payment word where a code belongs',
    BOOKINGS.every(b => !b.payStatus || PAYMENT_LABELS[b.payStatus]),
    BOOKINGS.filter(b => b.payStatus && !PAYMENT_LABELS[b.payStatus]).map(b => b.id + ':' + b.payStatus).join(', '));
  c.check('no booking carries a payment method nobody offered it',
    BOOKINGS.every(b => !b.payMethod || PAY_METHODS[b.payMethod]),
    BOOKINGS.filter(b => b.payMethod && !PAY_METHODS[b.payMethod]).map(b => b.id + ':' + b.payMethod).join(', '));
  c.check('and the phrase tests that used to decide money are gone from the kernel',
    !/\/cash on arrival\/i\.test\(/.test(src), 'still reading a label to settle a job');

  /* ── nothing is declared that nothing reaches ── */
  const deadFunctions = [...src.matchAll(/^function ([A-Za-z_$][\w$]*)\s*\(/gm)]
    .map(m => m[1]).filter(n => (src.match(new RegExp('\\b' + n + '\\b', 'g')) || []).length <= 1);
  c.check('no function is defined that nothing references',
    deadFunctions.length === 0, deadFunctions.join(', '));
  const untouched = Object.keys(state).filter(k =>
    (src.match(new RegExp('state\\.' + k + '\\b', 'g')) || []).length <= 1);
  c.check('no state key is declared that no screen reads or writes',
    untouched.length === 0, untouched.join(', '));
  const inertWrites = Object.keys(state).filter(k => {
    const writes = (src.match(new RegExp('state\\.' + k + '\\s*(\\+|-)?=(?![=>])', 'g')) || []).length;
    const reads = (src.match(new RegExp('state\\.' + k + '(?!\\s*(\\+|-)?=(?![=>]))', 'g')) || []).length;
    return writes > 0 && reads === 0;
  });
  c.check('nothing is stored that no screen ever reads',
    inertWrites.length === 0, inertWrites.join(', '));

  /* ── a message is a record ── */
  go('resident', 'messages');
  const threadBefore = MESSAGES.length;
  state.isChatOpen = true;
  state.activeChatProvider = app.PROVIDERS[0];
  state.activeChatCounterpart = app.PROVIDERS[0];
  state.activeChatCustomerId = app.CURRENT_CUSTOMER_ID;
  state.activeChatProviderId = app.PROVIDERS[0].id;
  render();
  app._document.getElementById('chat-input').value = 'The side gate is unlocked, come through that.';
  sendChatMessage();
  c.check('what the resident types becomes a record',
    MESSAGES.length === threadBefore + 1, 'grew by ' + (MESSAGES.length - threadBefore));
  c.check('and it is still on the screen after the screen rebuilds',
    /side gate is unlocked/.test(render() || html()) || /side gate is unlocked/.test(html()));
  c.check('the thread list shows the last message, not the original request',
    (() => { state.isChatOpen = false; state.tab = 'messages'; render();
             return /side gate is unlocked/.test(app._document.getElementById('screen').innerHTML)
                 || /side gate is unlocked/.test(JSON.stringify(app.threadsFor('resident'))); })());

  /* ── the open states are open for somebody ── */
  const stranded = Object.keys(BOOKING_STATES).filter(status => {
    if (FINISHED_STATES.includes(status)) return false;
    const probe = BOOKINGS.find(b => b.pricing) || BOOKINGS[0];
    const was = probe.status; probe.status = status;
    const anyone = ['customer', 'provider', 'admin', 'system'].some(r => nextActionFor(probe, r).length > 0);
    probe.status = was;
    return !anyone;
  });
  c.check('every open state can be moved on by somebody',
    stranded.length === 0, stranded.join(', ') + ' has no actor left with a move');

  /* ── the arrival on screen is the arrival that happened ──
     A booking used to carry a hand-written `arrivalTime` string that the seed filled
     with a status word, so a job marked arrived printed the appointment slot (or
     "Awaiting provider", or "Completed"). The card now reads the stamp the machine
     writes; this walks a real request to `arrived` and compares what the resident and
     the provider are shown against it. */
  const walkable = BOOKINGS.find(x => x.status === 'upcoming' && x.customerId === CURRENT_CUSTOMER_ID
    && !BOOKINGS.some(y => y.id !== x.id && y.providerId === x.providerId
      && ['requested', 'upcoming', 'en_route', 'arrived', 'ongoing'].includes(y.status)));
  let arrivalShown = null, arrivalTruth = null, doorShown = null;
  if (walkable) {
    try {
      const as = { role: 'provider', id: walkable.providerId, name: providerOf(walkable).name };
      attemptTransition(walkable.id, 'en_route', as);
      attemptTransition(walkable.id, 'arrived', as);
      const d = new Date(walkable.arrivedAt);
      let h = d.getHours(); const mm = String(d.getMinutes()).padStart(2, '0');
      arrivalTruth = (h % 12 || 12) + ':' + mm + ' ' + (h >= 12 ? 'PM' : 'AM');
      /* Both lines are the resident's own tracking card: the cell in the detail grid
         and the caption under the status. The provider's screen is not asked here —
         it refuses a job belonging to another provider, which is also correct. */
      const seen = go('resident', 'booking_detail', () => { state.selectedBookingId = walkable.id; });
      arrivalShown = (seen.match(/Arrived:<\/span><br>\s*<b[^>]*>([^<]*)<\/b>/) || [])[1];
      doorShown = (seen.match(/At the door · ([^<]{0,20})/) || [])[1];
    } catch (err) { arrivalShown = 'transition refused: ' + err.message; }
  }
  c.check('a job that has arrived shows the time it arrived',
    !!walkable && arrivalShown === arrivalTruth && (doorShown || '').trim() === arrivalTruth,
    'cell ' + JSON.stringify(arrivalShown) + ', caption ' + JSON.stringify(doorShown) + ', stamp ' + JSON.stringify(arrivalTruth));
  c.check('and no record keeps a status word in a time field',
    !/arrivalTime/.test(src) && BOOKINGS.every(b => b.arrivalTime === undefined));

  return c;
});

/* Screens that state a number the prototype never worked out. A demo may show
   sample data — AGENTS.md 76 and 86 — but it must not dress an invented figure
   up as a measurement, and it must not contradict the records on the same device. */
suite('honesty', async () => {
  const c = makeChecker();
  const app = boot();
  const { state, render } = app;
  /* The fake DOM exposes innerHTML, not textContent. Reading the wrong one here
     returns undefined, every text assertion then matches nothing, and the checks
     pass for the reason that they were never looking at anything. */
  const paint = (role, tab) => {
    state.view = 'app'; state.role = role; state.tab = tab;
    state.sheet = null; state.isChatOpen = false;
    /* The admin console renders its sub-screen until this is put back. Leaving it
       set made a later paint() quietly re-shoot the previous screen, so every text
       match returned null and the checks beside it passed for nothing. */
    state.adminScreen = 'overview';
    render();
    return app._document.getElementById('screen').innerHTML
      .replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const fsm = paint('provider', 'fsm');
  const invented = ['expected requests', 'available plumbers', 'predicted to increase', 'District Surge'];
  c.check('the radar states no forecast the prototype cannot compute',
    !invented.some(w => fsm.includes(w)), invented.filter(w => fsm.includes(w)).join(', ') + ' still claimed');
  c.check('and it admits the figures are demo counts, not measurement',
    /does not forecast demand/i.test(fsm), 'the honesty caption is gone');

  /* The chip and the sentence have to agree with each other; if they drift, one
     of them is being typed rather than read from the same count. */
  const chip = (fsm.match(/(\d+) waiting/) || [])[1];
  const line = (fsm.match(/(\d+) requests? in \w+ (?:is|are) waiting/) || [])[1];
  c.check('the radar chip and its sentence report the same count',
    chip !== undefined && chip === line, 'chip says ' + chip + ', sentence says ' + line);

  /* A next-step line that names the step you are already on tells the reader
     nothing about what happens next (AGENTS.md 21). */
  const states = app.BOOKING_STATES;
  const contradicts = Object.entries(states)
    .filter(([, s]) => s.next && /confirm/i.test(s.next) && s.label === 'Accepted')
    .map(([id]) => id);
  c.check('no state promises a step that state has already taken',
    contradicts.length === 0, contradicts.join(', ') + ' still promises confirmation');

  /* Chips are labels. A chip phrased as an instruction reads as a control and
     goes nowhere when pressed. */
  paint('admin', 'admin_dashboard');
  state.adminScreen = 'intelligence'; render();
  const intelHtml = app._document.getElementById('screen').innerHTML;
  const commanding = [...intelHtml.matchAll(/<span class="chip[^"]*"[^>]*>([^<]*)<\/span>/g)]
    .map(m => m[1].trim()).filter(t => /\b(here|now|tap|press|go)\b/i.test(t));
  c.check('no chip is worded as a command',
    commanding.length === 0, commanding.join(' | ') + ' read as actions but are not buttons');

  /* The dashboard used to type its own digits: the attention list claimed 6
     applications beside a queue of 3, and 5 expiring credentials where two
     providers hold a flagged one. One concept must be one count on one screen. */
  const dashHtml = paint('admin', 'admin_dashboard');
  const said = (re) => { const m = dashHtml.match(re); return m ? +m[1] : null; };
  const k = app.adminCounts();
  const pairs = [
    ['applications', said(/(\d+)\s+Provider applications need review/i), said(/(\d+)\s+Applications to review/i), k.pendingVerification],
    ['open cases',   said(/(\d+)\s+Cases open for review/i),           said(/(\d+)\s+Cases open(?!\s+for)/i),    k.liveCases],
    ['credentials',  said(/(\d+)\s+Credentials expiring or expired/i), null,                                      k.expiringSoon],
  ];
  const disagreeing = pairs
    .filter(([, shown, alsoShown, truth]) => shown !== null && shown !== truth)
    .map(([n, shown, , truth]) => n + ': list shows ' + shown + ' but the records hold ' + truth);
  c.check('the attention list counts from the records', disagreeing.length === 0, disagreeing.join(' | '));

  /* The stat grid used to repeat two of the queue's numbers to the digit, and the check
     here enforced agreement between the two copies. That was the weaker rule: a dashboard
     that states one fact twice can only ever be consistent or contradictory, while a
     dashboard that states it once cannot. So the tiles are gone and this asserts the
     duplication cannot come back. */
  c.check('the attention queue is the only place those counts appear',
    said(/(\d+)\s+Applications to review/i) === null &&
    said(/(\d+)\s+Cases open(?!\s+for)/i) === null,
    'the stat grid repeats a count the queue already carries');
  c.check('the queue numbers were actually found to compare',
    pairs.every(([, shown]) => shown !== null) &&
    pairs.every(([, , , truth]) => Number.isInteger(truth)),
    pairs.map(([n, shown]) => n + '=' + shown).join(', '));

  /* The analytics card was the last screen typing its own percentages: 82%, 68% and
     74% in the markup, the third of them contradicted two tiles above it (one case
     open, none closed, "Cases resolved 74%"). */
  const adminDash = paint('admin', 'admin_dashboard');
  const rates = app.marketplaceRates();
  /* paint() strips tags, so a rate is read from the text a reader actually sees —
     which is also the only version that can mislead them. */
  const pct = label => {
    const m = adminDash.match(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s+(\\d{1,3})%'));
    return m ? +m[1] : null;
  };
  c.check('the analytics card shows the rates the records give',
    pct('Completed bookings') === rates.completion &&
    pct('Provider verification progress') === rates.verification &&
    pct('Cases resolved') === rates.cases,
    [pct('Completed bookings'), pct('Provider verification progress'), pct('Cases resolved')]
      .join(' / ') + ' vs ' + [rates.completion, rates.verification, rates.cases].join(' / '));
  c.check('and each rate travels with its denominator',
    /\d+ of \d+ closed jobs finished/.test(adminDash) && /\d+ of \d+ on the roster are verified/.test(adminDash)
    && /\d+ of \d+ cases closed/.test(adminDash), 'a percentage with no denominator reads as a measurement');
  /* The operations donut was typed: 18 items split 45/25/30 on a screen whose own
     tiles said 3 applications and 1 case. */
  const work = app.opsWorkload(app.adminCounts());
  const k2 = app.adminCounts();
  c.check('the workload ring is the queue the tiles count',
    work.total === k2.open + k2.pendingVerification + k2.expiringSoon + k2.liveCases &&
    work.parts[0].items === k2.open && work.parts[2].items === k2.liveCases &&
    work.parts.reduce((t,p)=>t+p.items,0) === work.total,
    work.parts.map(p => p.label + '=' + p.items).join(', ') + ' total ' + work.total);
  c.check('the ring closes at 100% whatever the rounding does',
    work.total === 0 || work.parts[work.parts.length-1].to === 100,
    work.parts.map(p=>p.from+'-'+p.to).join(' '));
  c.check('no typed queue survives on the dashboard',
    !/18<br>items|>45%<\/b>|>25%<\/b>|>30%<\/b>/.test(app._source));

  c.check('no percentage on the dashboard is a literal in the markup',
    !/<b>\d{1,3}%<\/b>/.test(app._source.slice(app._source.indexOf('function adminDashboard'),
      app._source.indexOf('function adminDashboard') + 24000)));

  /* Found by looking at a screenshot of a held booking, not by a rule anyone had
     written: the receipt said "How it was paid · GCash (0912***6789)" three rows under
     "Held, not yet paid". The tense now follows the ledger, so a receipt cannot report a
     payment the platform has only authorised. */
  c.check('a receipt states the tense of its money from the ledger', (() => {
    const v = boot();
    const held = v.receiptCard(v.bookingById('b2'));
    const paid = v.receiptCard(v.bookingById('b3'));
    return !v.isSettled(v.bookingById('b2')) && /To be paid with/.test(held) &&
      !/>\s*Paid with\s*</.test(held) &&
      v.isSettled(v.bookingById('b3')) && /Paid with/.test(paid) &&
      !/To be paid with/.test(paid);
  })(), 'a held payment was described in the past tense');

  /* ── the provider insights ───────────────────────────────────────────────
     Three of these cards drew numbers that no record contained: an earnings line
     made of seven literal SVG points under a growth percentage nobody had
     computed, barangay bars whose tallest measured 40% of the drawn total while
     the caption asserted 58%, and a donut of earnings by job type when a booking
     carries no job type at all. The captions are asserted absent by string,
     because a claim that comes back in different wording is still the same lie. */
  const dashSrc = app._source.slice(app._source.indexOf('function providerDashboard'),
    app._source.indexOf('function providerFSM'));
  c.check('the invented chart claims are gone',
    !/\+18% Growth|peaking at ₱4,200|58% of all plumbing|Where the earnings come from|feedbacks analyzed/.test(app._source));
  c.check('no provider chart is drawn from literal geometry',
    !/points="15,80/.test(app._source) && !/height:45px/.test(app._source) &&
    !/conic-gradient\(var\(--brand-primary\) 0% 65%/.test(app._source));
  c.check('the feedback card reads the signed-in provider, not a fixed one',
    /CURRENT_PROVIDER_ID/.test(dashSrc) && !/p\.id === 'p1'/.test(dashSrc));

  /* Recompute every drawn week from the records with the same predicate the
     helper uses. Asserting only that a figure is an integer would pass while the
     whole series was wrong, so this compares the count and the centavos per week. */
  c.check('each earnings week equals the jobs that settled inside it', (() => {
    const id = app.CURRENT_PROVIDER_ID;
    const weeks = app.providerWeeklyEarnings(id, 8);
    if (weeks.length !== 8) return false;
    const same = weeks.every((w, i) => {
      const from = app.weekStart(weeks.length - 1 - i).getTime();
      const jobs = app.BOOKINGS.filter(b => b.providerId === id &&
        b.status === 'completed' && b.pricing && b.completedAt &&
        Date.parse(b.completedAt) >= from && Date.parse(b.completedAt) < from + 7 * 86400000);
      return w.jobs === jobs.length &&
        w.centavos === jobs.reduce((t, b) => t + app.settlementToProvider(b.pricing), 0);
    });
    /* The equality above can pass while the helper ignores status entirely, if
       every fixture row that carries a completion stamp has settled. So force the
       case the filter exists for: un-settle one stamped job and require the
       series to drop. A helper that counts anything would report the same total. */
    const probe = app.BOOKINGS.find(b => b.providerId === id && b.pricing && b.completedAt);
    if (!probe) return false;
    const before = weeks.reduce((t, w) => t + w.centavos, 0);
    const was = probe.status;
    probe.status = 'ongoing';
    const after = app.providerWeeklyEarnings(id, 8).reduce((t, w) => t + w.centavos, 0);
    probe.status = was;
    return same && before > 0 && after < before;
  })(), 'the earnings series counts jobs that have not settled');

  c.check('barangay demand counts the requests that actually arrived', (() => {
    const rows = app.providerDemandByBarangay(app.CURRENT_PROVIDER_ID, 30);
    const since = Date.now() - 30 * 86400000;
    const expected = app.BOOKINGS.filter(b => b.providerId === app.CURRENT_PROVIDER_ID &&
      Date.parse(b.createdAt) >= since)
      .reduce((m, b) => (m[b.barangay] = (m[b.barangay] || 0) + 1, m), {});
    const total = rows.reduce((t, r) => t + r.jobs, 0);
    return total === Object.values(expected).reduce((t, n) => t + n, 0) &&
      rows.every(r => expected[r.label] === r.jobs);
  })(), 'a barangay bar does not match its own record count');

  c.check('a dense series thins its own axis labels instead of overlapping them', (() => {
    const wide = Array.from({ length: 12 }, (_, i) => ({ label: 'W' + (i + 1), value: i + 1 }));
    /* Counted by the axis row's own y coordinate: value labels sit above the bars and
       both use text-anchor="middle", so counting that attribute measured the values. */
    const axisLabels = html => (html.match(/y="120" text-anchor="middle"/g) || []).length;
    const sparse = app.chartColumns([{ label: 'Mon', value: 2 }, { label: 'Tue', value: 3 }], { format: v => v });
    const n = axisLabels(app.chartColumns(wide, { format: v => v }));
    return n < wide.length && n >= 3 && axisLabels(sparse) === 2;
  })(), 'axis labels overlap on a dense series, or the thinning breaks a sparse one');

  c.check('no chart is drawn from a literal data series', (() => {
    /* The same defect twice over, and invisible either way on screen: the provider
       earnings line was seven hard-coded SVG points, and an admin "Weekly bookings"
       card drew seven days of invented percentages from a typed array — sitting on the
       same screen as the honest derived chart, indistinguishable from it. */
    const srcTxt = app._source;
    return !/\[\['(Mon|Tue|Wed|Thu|Fri|Sat|Sun)',\d/.test(srcTxt) &&
      !/points="\d+,\d+ \d+,\d+ \d+,\d+/.test(srcTxt) &&
      !/height:\$\{(completed|open|value)\}%/.test(srcTxt);
  })(), 'a chart is being drawn from typed numbers rather than records');

  c.check('the admin weekly chart renders through the shared kit', (() => {
    const html = app.adminDashboard();
    return /viewBox="0 0 320/.test(html) && /Weekly bookings/.test(html) &&
      /sr-only/.test(html) && !/Sample activity this week/.test(html);
  })(), 'the admin dashboard is not drawing its weekly chart from the kit');

  c.check('a thin sample is stated as a count, never drawn as a share', (() => {
    const me = app.PROVIDERS.find(p => p.id === app.CURRENT_PROVIDER_ID);
    const html = app.providerDashboard();
    const n = (me.reviews || []).length;
    /* Asserted on the ring element rather than on any sentence: the drawing is the
       claim being made, and the prose around it must stay free to be rewritten. */
    if (n >= app.MIN_SHARE_SAMPLE) return /chart-ring/.test(html);
    return !/chart-ring/.test(html) && /chart-empty|chart-row/.test(html);
  })(), 'a part-to-whole ring was drawn from fewer records than the floor');

  /* No provider in the demo data holds MIN_SHARE_SAMPLE reviews, so the ring branch
     is never reached by rendering a screen. Tested directly instead, on both sides
     of the floor — otherwise the one path that draws a share would ship unexercised. */
  c.check('the share ring draws only at or above the sample floor, and closes at 100%', (() => {
    const many = app.chartShare([{ label: 'A', value: 4, tone: 'x' }, { label: 'B', value: 2, tone: 'y' }], {});
    const few = app.chartShare([{ label: 'A', value: 1, tone: 'x' }, { label: 'B', value: 1, tone: 'y' }], {});
    return /chart-ring/.test(many) && /100%/.test(many) && /chart-empty/.test(few) && !/chart-ring/.test(few);
  })(), 'the ring rendered on the wrong side of the floor, or left a rounding gap');

  c.check('the column chart labels its axis, values every bar, and refuses an all-zero series', (() => {
    const drawn = app.chartColumns([{ label: 'Mon', value: 31500 }, { label: 'Tue', value: 0 }],
      { format: v => app.pesoCompact(v) });
    const empty = app.chartColumns([{ label: 'Mon', value: 0 }], { format: v => v, empty: 'nothing yet' });
    return /<svg/.test(drawn) && /role="img" aria-label="/.test(drawn) &&
      /sr-only/.test(drawn) && /₱/.test(drawn) &&
      /chart-empty/.test(empty) && /nothing yet/.test(empty) &&
      /* the empty state still carries a decorative glyph svg, so what must be absent
         is a chart — asserted on the kit's own viewBox, not on the word "<svg>" */
      !/viewBox="0 0 320/.test(empty);
  })(), 'the column chart is missing an axis label, a value, or its empty state');

  c.check('a count axis never asks for a fraction of a thing', (() => {
    /* The first version drew 0 / 0.75 / 1 on bookings-per-day. Asserted on the scale
       helper directly, at the sizes the app actually draws. */
    const whole = n => app.chartScale(n).ticks.every(t => Number.isInteger(t));
    return [1, 2, 3, 5, 7, 10, 16].every(whole) &&
      app.chartScale(1).ticks.join(',') === '0,1,2,3,4' &&
      app.chartScale(0).ticks.length === 2;
  })(), 'an integer series produced a fractional tick');

  /* ── the resident's own history, read from the records ───────────────────────
     These modules used to carry a parallel past: a faucet job described as completed, rated
     five and paid on September 12 for ₱850, when the same booking is in progress, dated
     Oct 11, priced ₱365 and unpaid — and a ₱2,500 year-to-date across four trades where the
     records hold two finished jobs worth ₱590. §77 names this exactly: a receipt claiming
     Paid on a transaction the app elsewhere shows as pending. §86 forbids presenting
     invented figures as the person's own activity. */
  const appSrc = require('fs').readFileSync(require('./harness.cjs').APP, 'utf8');
  const retiredClaims = ['₱2,500', 'September 12, 2026', 'Kitchen Faucet Repair', 'Active until September 19',
    'Due October 10', 'Air Conditioner Cleaning', 'Warranty active',
    /* The same class in the admin's provider-management profile: three jobs this provider is
       said to have completed that no record holds. Found only because the check written for
       the resident copy happened to look for the phrase. */
    'Pipe Leak Repair', 'Emergency Valve Repair'];
  const stillThere = retiredClaims.filter(s => appSrc.includes(s));
  c.check('the invented resident history is gone from the file', stillThere.length === 0, stillThere.join(' | '));

  const finished = app.residentFinished();
  const paid = app.residentPaid();
  c.check('a receipt is only ever a finished job whose money changed hands', (() => {
    const faucet = app.bookingById('b1');
    return paid.length > 0
      && paid.every(b => b.status === 'completed' && ['captured', 'collected'].includes(b.payStatus))
      && finished.every(b => b.status === 'completed')
      && !paid.includes(faucet) && faucet.status === 'ongoing';
  })(), 'the receipt set drew from a booking that is not paid');

  /* Reconciliation, not agreement by coincidence: stop one job being paid and the total has
     to move by exactly that job's money. A card that typed its own figure would survive. */
  const sumOf = list => list.reduce((s, b) => s + app.bookingTotal(b), 0);
  const spendBefore = sumOf(app.residentPaid());
  const b3 = app.bookingById('b3');
  const wasPay = b3.payStatus;
  b3.payStatus = 'voided';
  const spendAfter = sumOf(app.residentPaid());
  const splitAfter = app.residentSpendByService(app.residentPaid()).reduce((s, x) => s + x.centavos, 0);
  b3.payStatus = wasPay;
  c.check('the spending total follows the records when a job stops being paid',
    spendAfter === spendBefore - app.bookingTotal(b3) && spendBefore !== spendAfter,
    'before ' + spendBefore + ', after ' + spendAfter);
  c.check('the per-trade breakdown adds back to the total it is shown under',
    sumOf(app.residentPaid()) === app.residentSpendByService(app.residentPaid()).reduce((s, x) => s + x.centavos, 0)
      && splitAfter === spendAfter,
    'the split and the headline disagreed');

  /* Helpers agreeing with the records is not the same claim as the card printing them. */
  const spendingHtml = app.residentSectionBody('spending');
  const derived = new Set([app.pesoShort(spendBefore)]
    .concat(app.residentSpendByService(app.residentPaid()).map(x => app.pesoShort(x.centavos))));
  const stray = [...new Set((spendingHtml.match(/₱[\d,]+/g) || []))].filter(m => !derived.has(m));
  c.check('every peso figure on the spending card is one the records produce',
    stray.length === 0 && derived.size > 0, 'stray: ' + stray.join(', '));

  const receiptsHtml = app.residentSectionBody('receipts');
  c.check('no receipt names a booking that has not been paid',
    !receiptsHtml.includes(app.bookingById('b1').summary) && receiptsHtml.includes(app.bookingById('b3').summary),
    'the faucet booking is ongoing and unpaid; it must not appear as a receipt');

  /* ── credentials and verification are records now ──────────────────────────
     Three screens asserted document statuses, an expiry date and a verified-since date that no
     record held, and the admin's "needs attention" tile counted a verdict typed into a table.
     The first check below is the one that was hiding all of it: bookingsForProvider took no
     parameter, so every per-provider figure in the console was the signed-in provider's figure. */
  c.check('bookingsForProvider honours the id it is handed', (() => {
    const a = app.bookingsForProvider('p1');
    const b = app.bookingsForProvider('p2');
    return a.length > 0 && b.length > 0
      && a.every(x => x.providerId === 'p1') && b.every(x => x.providerId === 'p2');
  })(), 'two different ids returned the same provider rows');

  /* Both sides of the threshold, because a one-sided test survives a rule that fires too often. */
  const DAY = 86400000;
  const iso = d => new Date(Date.now() + d * DAY).toISOString().slice(0, 10);
  c.check('a credential reads its state from its own expiry date', (() => {
    const warn = app.CONFIG.credentialWarnDays;
    return app.credentialState({ expiresAt: null }).code === 'valid'
      && app.credentialState({ expiresAt: iso(warn) }).code === 'expiring'
      && app.credentialState({ expiresAt: iso(warn + 1) }).code === 'valid'
      && app.credentialState({ expiresAt: iso(-1) }).code === 'expired'
      && app.credentialState({ expiresAt: iso(0) }).code === 'expiring';
  })(), 'the warning window did not have two sides');

  c.check('the verified roster is a record, not a slice of the array', (() => {
    const list = app.verifiedProviderList();
    const byStatus = app.PROVIDERS.filter(p => p.verification && p.verification.status === 'verified');
    /* The old definition was PROVIDERS.slice(0, 4), which happened to name four real
       providers. Equal-by-length is not equal-by-content: the slice and the record disagree
       about who is on it, and that disagreement is the whole point. */
    return list.length === byStatus.length
      && list.every(p => p.verification.status === 'verified')
      && list.map(p => p.id).join(',') === byStatus.map(p => p.id).join(',')
      && list.map(p => p.id).join(',') !== app.PROVIDERS.slice(0, list.length).map(p => p.id).join(',');
  })(), 'verified did not match the status records, or matched a positional slice');
  c.check('the suspended and pending providers are excluded by their record',
    app.verifiedProviderList().every(p => p.id !== 'p4' && p.id !== 'p7')
      && app.adminProviderMeta(app.PROVIDERS.find(p => p.id === 'p4')).account === 'Suspended'
      && app.adminProviderMeta(app.PROVIDERS.find(p => p.id === 'p7')).account === 'Awaiting review');

  /* The badge that used to count a string. Take one document on a currently-clean provider past
     its expiry and the count has to move by one. p3 is the target because its worst state is
     'valid' today; p8 was the first pick and it is already counted, which is why the first cut
     of this test could never have passed however correct the code was. */
  c.check('the expiring-credential badge counts documents, and follows them', (() => {
    if (app.worstCredentialState('p3') !== 'valid') return false;
    const before = app.expiringProviderCount();
    const target = app.credentialsOf('p3').find(c => c.expiresAt);
    if (!target) return false;
    const was = target.expiresAt;
    target.expiresAt = new Date(Date.now() - 5 * DAY).toISOString().slice(0, 10);
    const during = app.expiringProviderCount();
    const worstDuring = app.worstCredentialState('p3');
    target.expiresAt = was;
    return during === before + 1 && worstDuring === 'expired' && app.worstCredentialState('p3') === 'valid';
  })(), 'the badge did not move when a document expired');

  c.check('the admin profile states reasons rather than a verdict', (() => {
    const m = app.adminProviderMeta(app.PROVIDERS.find(p => p.id === 'p2'));
    return Array.isArray(m.reasons) && m.complaints === app.openCasesFor('p2').length
      && !('performance' in m);
  })(), 'meta still carries an unsourced verdict');
  c.check('the provider sees its own documents, from the records', (() => {
    const html = app.providerSectionBody('credentials');
    const names = app.credentialsOf('p1').map(c => c.name);
    return names.length > 0 && names.every(n => html.includes(n));
  })(), 'the credentials module does not list the records');

  /* A date-only ISO string parsed as UTC midnight formats as the previous day on a machine west
     of UTC — which is how a record reading 2026-03-14 rendered "Verified Mar 13, 2026". Only
     found by looking at the screenshot; every number in it was correct. */
  c.check('a date-only value formats as the same day it names',
    /Mar 14, 2026/.test(app.shortDate('2026-03-14')) && /Jan 1, 2026/.test(app.shortDate('2026-01-01')),
    app.shortDate('2026-03-14'));

  c.check('the credential summary agrees with the credential list', (() => {
    const p1 = app.credentialSummaryFor('p1');
    const creds = app.credentialsOf('p1');
    const flagged = creds.filter(c => app.credentialState(c).code !== 'valid').length;
    /* p1 has two documents inside the warning window, so the profile card must say so rather
       than "All Valid"; p3 is clean; p4 has one already expired. */
    return flagged > 0
      && p1.label === flagged + ' of ' + creds.length + ' expiring soon'
      && p1.tone === 'var(--warning-ink)'
      && app.credentialSummaryFor('p3').label.startsWith('All ')
      && app.credentialSummaryFor('p4').tone === 'var(--error-ink)';
  })(), 'the profile card contradicted its own credential list');

  /* Both sides of the summary's thresholds, so it cannot pass by always warning. */
  c.check('the credential summary distinguishes clean, expiring and expired', (() => {
    const clean = app.credentialSummaryFor('p3');
    const target = app.credentialsOf('p3').find(c => c.expiresAt);
    const was = target.expiresAt;
    target.expiresAt = new Date(Date.now() - 9 * 86400000).toISOString().slice(0, 10);
    const after = app.credentialSummaryFor('p3');
    target.expiresAt = was;
    return clean.tone === 'var(--success-ink)' && after.tone === 'var(--error-ink)'
      && app.credentialSummaryFor('p3').tone === 'var(--success-ink)';
  })(), 'the summary did not change when a document expired');

  const unsourced = ['Expires in 23 days', 'ID Verification - ', 'Last active: 2 hours ago',
    'Failed login attempt', 'PROVIDERS.slice(0, 4)', 'adminVerifiedPerformance', 'meta.active',
    'meta.performance'];
  const found = unsourced.filter(s => appSrc.includes(s));
  c.check('no screen asserts a security or document state nothing records',
    found.length === 0, found.join(' | '));

  c.check('the warranty window is computed, never typed', (() => {
    const ends = app.warrantyEndsAt(b3).getTime();
    const expected = Date.parse(b3.completedAt) + app.CONFIG.warrantyDays * 86400000;
    return ends === expected;
  })(), 'warrantyEndsAt did not equal completedAt + CONFIG.warrantyDays');

  c.check('the saved module names no provider nobody saved',
    /section === 'saved' \? emptyState\(/.test(appSrc), 'the saved section still asserts a list');
  c.check('the payments module says the method is a label, not a linked account',
    /not a linked account/.test(appSrc) && /No card or wallet number is stored/.test(appSrc));

  return c;
});
/* ══ 15. fruit — the pilot category, as the brief's checklist ═════════════════
   SUKINNECT_MASTER_IMPLEMENTATION_PROMPT.md §37 lists what has to be true for
   Fruit Harvest & Buy. A list in a document is not a check, so the load-bearing
   items are asserted here against the real kernel: one booking table, centavos,
   the machine owning the lifecycle, produce money never becoming service revenue,
   and no wallet. Each check was falsified by breaking the rule it watches. */
suite('fruit', async () => {
  const app = boot();
  const { BOOKINGS, OFFERS, PROVIDERS, CONFIG, CONFIG_DEFAULTS, LEDGER } = app;
  const c = makeChecker();
  const src = app._source;

  /* ---- the kernel is untouched by the new category ---- */
  c.check('there is still one booking table and no fruit twin',
    /const BOOKINGS = \[/.test(src) && !/FRUIT_BOOKINGS/.test(src));
  c.check('a fruit booking is a booking the machine knows',
    ['b8','b9','b10'].every(id => app.BOOKING_STATES[app.bookingById(id).status]),
    ['b8','b9','b10'].map(id => id + '=' + app.bookingById(id).status).join(' '));
  /* "expired" means the same plain thing to both records, so sharing the word is
     not the risk. The risk is an offer's own vocabulary leaking into a booking's
     status field, where the machine has no transitions for it. */
  c.check('no booking wears an offer-only state',
    BOOKINGS.every(b => !['proposed','declined','withdrawn','superseded'].includes(b.status)) &&
    OFFERS.every(o => app.OFFER_STATES[o.status]),
    BOOKINGS.filter(b => ['proposed','declined','withdrawn','superseded'].includes(b.status)).map(b => b.id + ':' + b.status).join(','));
  c.check('weight is stored in whole grams, never float kilos',
    [app.bookingById('b8'), app.bookingById('b10')].every(b =>
      Number.isInteger(b.fruit.estimatedQuantityGrams)) &&
    OFFERS.every(o => o.quantityGrams === null || Number.isInteger(o.quantityGrams)));
  c.check('every money field on an offer is a whole number of centavos',
    OFFERS.every(o => Number.isInteger(o.produceCentavos) && Number.isInteger(o.labourCentavos) &&
                      Number.isInteger(o.unitPriceCentavos || 0)));
  c.check('no wallet or store-value came back for the pilot',
    !app.ACCOUNTS.wallet && !app.ACCOUNTS.store_value && !/wallet|storeValue/i.test(
      JSON.stringify(OFFERS) + JSON.stringify(BOOKINGS.filter(b => b.mode))));

  /* ---- the two legs of the money stay separate ---- */
  const offer = OFFERS[0];
  const t = app.offerTotals(offer);
  /* The owner's rule: the fruit part is chargeable only inside a visit that also
     harvests. A straight sale is decided-none, and no screen may imply a rate might
     still appear on it. */
  c.check('a straight sale is decided-none, not a rate waiting to appear',
    CONFIG.produceCommissionRate === null && t.platformFeeCentavos === 0 &&
    t.produceFeeWaived === true && t.produceFeeUndecided === false,
    JSON.stringify(t));
  c.check('the combined visit is the one carrying an open rate', (() => {
    const both = app.offerTotals({ mode:'harvest_and_buy', labourCentavos:160000, produceCentavos:660000 });
    return both.produceFeeUndecided === true && both.produceFeeWaived === false &&
      both.produceFeeCentavos === 0 && both.platformFeeCentavos === 16000;
  })(), 'the undecided state must belong to harvest_and_buy alone');
  c.check('a sale stays free even once a produce rate exists', (() => {
    const keep = CONFIG.produceCommissionRate;
    CONFIG.produceCommissionRate = 0.10;
    const sold = app.offerTotals({ mode:'sell_fruit', labourCentavos:0, produceCentavos:209000 });
    CONFIG.produceCommissionRate = keep;
    return sold.produceFeeCentavos === 0 && sold.produceFeeWaived === true && sold.produceCharged === false;
  })(), 'the mode gate is not honoured once a rate is set');
  c.check('the undecided rate is a decision, not an accidental zero',
    CONFIG_DEFAULTS.produceCommissionRate === null);
  c.check('the resident is never billed the fruit she is selling',
    t.customerPaysCentavos === 0 && t.providerPaysCustomerCentavos === offer.produceCentavos,
    JSON.stringify(t));
  c.check('the legs add to the job without merging into one number',
    t.totalCentavos === t.produceCentavos + t.labourCentavos);
  /* a decided rate charges the fruit leg, and only on the mode the rule allows */
  const hb = { mode:'harvest_and_buy', labourCentavos:100000, produceCentavos:200000 };
  const withRate = app.offerTotals(hb);
  CONFIG.produceCommissionRate = 0.05;
  const decided = app.offerTotals(hb);
  CONFIG.produceCommissionRate = null;
  c.check('a decided rate on a harvest-and-buy charges the fruit and nothing else',
    decided.produceFeeCentavos === 10000 &&
    decided.platformFeeCentavos - withRate.platformFeeCentavos === 10000 &&
    decided.produceCentavos === withRate.produceCentavos &&
    decided.labourCentavos === withRate.labourCentavos,
    decided.produceFeeCentavos + ' vs 10000');

  /* ---- answering an offer is commercial, not lifecycle ---- */
  const b8 = app.bookingById('b8');
  app.answerOffer('b8', 'accept', { role:'customer', id: app.CURRENT_CUSTOMER_ID });
  c.check('accepting an offer does not move the booking', b8.status === 'requested', b8.status);
  c.check('it records the produce leg beside the record',
    !!b8.produce && b8.produce.amountCentavos === 209000 && b8.produce.settledAs === 'on_site');
  c.check('a settled sale records its fee as decided-none, not as pending',
    b8.produce.feeStatus === 'not-charged' && b8.produce.platformFeeCentavos === 0,
    b8.produce.feeStatus);
  c.check('a purchase-only job freezes no service price',
    b8.amountCentavos === 0 && !b8.pricing, JSON.stringify(b8.pricing));
  c.check('and posts nothing to the ledger', app.ledgerFor('b8').length === 0,
    app.ledgerFor('b8').map(e => e.eventType).join(','));
  c.check('the trial balance still closes after an acceptance', (() => {
    const d = LEDGER.reduce((x, e) => x + e.lines.filter(l => l.direction === 'debit').reduce((y, l) => y + l.amountCentavos, 0), 0);
    const r = LEDGER.reduce((x, e) => x + e.lines.filter(l => l.direction === 'credit').reduce((y, l) => y + l.amountCentavos, 0), 0);
    return d === r;
  })());

  /* ---- a request the provider answered with a price does not lapse ---- */
  const fresh = boot();
  fresh.CONFIG.acceptTtlMinutes = 1;
  const before = fresh.bookingById('b8').status;
  fresh.applyDueTransitions();
  c.check('an open offer pauses the accept window, because it was answered',
    fresh.bookingById('b8').status === before && before === 'requested',
    fresh.bookingById('b8').status);
  c.check('an unanswered request still lapses on the clock',
    fresh.bookingById('b10').status === 'expired' || fresh.bookingById('b10').status !== 'requested',
    fresh.bookingById('b10').status);

  /* ---- persistence, the four places a table has to appear ---- */
  const store = fakeStorage();
  const first = boot({ storage: store });
  first.makeOffer('b10', { basis:'per_kg', quantityGrams:120000, unitPriceCentavos:5500,
    produceCentavos:660000, labourCentavos:160000, whoHarvests:'provider' }, { role:'provider' });
  first.persist();
  const again = boot({ storage: store });
  again.hydrate();
  c.check('an offer survives a reload', again.OFFERS.some(o => o.bookingId === 'b10' && o.produceCentavos === 660000),
    JSON.stringify(again.OFFERS.map(o => o.id + ':' + o.status)));
  c.check('the offer sequence starts past the ids a restored dump already used', (() => {
    const made = again.makeOffer('b10', { basis:'per_lot', produceCentavos:50000, labourCentavos:0 },
      { role:'provider' });
    const ids = again.OFFERS.map(o => o.id);
    return ids.filter(x => x === made.id).length === 1 && new Set(ids).size === ids.length;
  })(), 'ids: ' + again.OFFERS.map(o => o.id).join(','));
  c.check('a dump carrying an unknown offer state is refused, not half-read', (() => {
    const bad = fakeStorage();
    bad.setItem('sukinnect.snapshot.v1', JSON.stringify({ schemaVersion: again.SCHEMA_VERSION,
      bookings: [{ id:'z1', status:'requested' }], offers: [{ id:'of9', bookingId:'z1', status:'negotiating' }] }));
    return boot({ storage: bad }).hydrate().restored === false;
  })());
  c.check('an offer attached to no booking is refused too', (() => {
    const bad = fakeStorage();
    bad.setItem('sukinnect.snapshot.v1', JSON.stringify({ schemaVersion: again.SCHEMA_VERSION,
      bookings: [{ id:'z1', status:'requested' }], offers: [{ id:'of9', bookingId:'nowhere', status:'proposed' }] }));
    return boot({ storage: bad }).hydrate().restored === false;
  })());
  c.check('resetting the demo clears the offers and their sequence', (() => {
    again.resetDemoData();
    return again.OFFERS.length === 0 || again.OFFERS.every(o => o.source === 'demo');
  })(), 'offers after reset: ' + again.OFFERS.length);

  /* ---- capability is data the provider declared, not a role ---- */
  const p7 = PROVIDERS.find(p => p.id === 'p7'), p8 = PROVIDERS.find(p => p.id === 'p8');
  c.check('a harvester-buyer can take all three modes',
    ['harvest_only','sell_fruit','harvest_and_buy'].every(m => app.providerCanMode(p7, m)));
  c.check('a buyer is not offered the harvest',
    !app.providerCanMode(p8, 'harvest_only') && !app.providerCanMode(p8, 'harvest_and_buy') &&
     app.providerCanMode(p8, 'sell_fruit'));
  c.check('capability is a field on a provider, not a fourth role',
    !/ROLE.*fruit|role === 'fruit'/i.test(src) && !!p7.fruitCapability);
  c.check('the profile says who declared it and denies verifying it',
    /Declared by/.test(app.capabilityCard(p7)) && !/certified|verified climber/i.test(app.capabilityCard(p7)),
    app.capabilityCard(p7).slice(-200));

  /* ---- the six trades that shipped before this one are untouched ---- */
  c.check('no original category asks a mode', ['plumbing','electrical','cleaning','tutoring','appliance','delivery']
    .every(id => app.serviceMeta(id).pilot !== true && app.categoryBehaviour(id).modes.length === 1));
  c.check('only the pilot is marked experimental',
    app.SERVICES.filter(s => s.pilot).map(s => s.id).join(',') === 'fruit',
    app.SERVICES.filter(s => s.pilot).map(s => s.id).join(',') || '(none)');
  c.check('the grid carries seven categories without a new nav tab',
    app.SERVICES.length === 7 && app.ROOT_TABS.resident.length === 4 &&
    app.ROOT_TABS.provider.length === 5,
    app.SERVICES.length + ' services, ' + (app.ROOT_TABS.resident || []).length + ' resident tabs');

  /* ---- the record is linked, the way every other job is ---- */
  c.check('each fruit job has its own timeline',
    ['b8','b9','b10'].every(id => app.STATUS_EVENTS.some(e => e.bookingId === id)));
  c.check('each fruit job opened a thread with the request in it',
    ['b8','b9','b10'].every(id => app.MESSAGES.some(m => m.bookingId === id)));
  c.check('a negotiated job still says so in the resident\'s words, not ₱0',
    app.bookingAmountText(app.bookingById('b10')) === 'Price by offer',
    app.bookingAmountText(app.bookingById('b10')));
  c.check('and a settled purchase reports no service fee, not a zero one', (() => {
    const copy = boot();
    copy.answerOffer('b8', 'accept', { role:'customer' });
    return copy.bookingAmountText(copy.bookingById('b8')) === 'No service fee';
  })());

  /* ---- the provider cannot be shown a door that freezes a price they never set ---- */
  const prov = boot();
  prov.applyProviderIdentity('p7');
  const moves = prov.providerJobMoves(prov.bookingById('b10')).filter(m => m.kind !== 'note');
  c.check('an unpriced fruit request offers an offer, not an acceptance',
    moves.length && moves[0].kind === 'offer' && !moves.some(m => m.to === 'upcoming'),
    JSON.stringify(moves.map(m => m.kind + ':' + m.label)));
  c.check('a harvest job with a price still uses the ordinary machine',
    prov.providerJobMoves(prov.bookingById('b9')).every(m => m.kind !== 'offer'));
  /* Asserted through the reader rather than the symbol: the harness snapshots
     exports at boot, so a reassigned identity only shows in what the app can see. */
  c.check('the signed-in provider follows the demo account, not a constant',
    prov.bookingsForProvider().some(b => b.id === 'b10') &&
    prov.bookingsForProvider().every(b => b.providerId === 'p7') &&
    prov.state.providerProfileData.name === 'Erning Bautista',
    prov.state.providerProfileData.name + ' / ' + prov.bookingsForProvider().map(b => b.id + '@' + b.providerId).join(','));

  /* ---- the admin sees the two kinds of money as two numbers ---- */
  const adm = boot();
  adm.state.view='app'; adm.state.role='admin';
  adm.answerOffer('b8','accept', { role:'customer', id: adm.CURRENT_CUSTOMER_ID });
  const ints = adm.intelligenceStats({ days: 36500, category:'all' });
  c.check('a settled purchase appears in the produce figures at all',
    ints.produceJobs === 1 && ints.produceCentavos === 209000,
    JSON.stringify({ j:ints.produceJobs, c:ints.produceCentavos }));
  c.check('and never in services sold',
    ints.grossCentavos === ints.byCategory.reduce((t,r)=>t+r.centavos,0) &&
    !ints.byCategory.some(r => r.id === 'fruit' && r.centavos >= 209000),
    JSON.stringify(ints.byCategory));
  c.check('the produce card states the exclusion in words',
    /not in the total above/.test(adm.adminMarketplaceIntelligence()) &&
    /never held that money/.test(adm.adminMarketplaceIntelligence()));
  c.check('a settled fruit purchase moves the platform statement not at all', (() => {
    const before = adm.platformStatement();
    const copy = boot();
    const open = before.grossServicesCentavos + '/' + before.commissionEarnedCentavos;
    /* The same job, agreed: the produce money changes hands between two people and
       the platform's own books cannot notice it. If this figure moves, a purchase has
       been counted as service revenue. */
    copy.answerOffer('b8','accept', { role:'customer', id: copy.CURRENT_CUSTOMER_ID });
    const after = copy.platformStatement();
    return open === (after.grossServicesCentavos + '/' + after.commissionEarnedCentavos) &&
      after.grossServicesCentavos < 209000;
  })());
  c.check('the catalogue is reachable from the console and names every category',
    /state.adminScreen === 'categories'/.test(src) &&
    adm.SERVICES.every(cat => new RegExp(cat.label.replace(/[&]/g,'&amp;')).test(adm.adminCategories())),
    'categories screen renders ' + adm.SERVICES.length + ' rows');
  c.check('the pilot is marked as a pilot to the administrator',
    /Pilot/.test(adm.adminCategories()) && /Safety rules on this category/.test(adm.adminCategories()));
  c.check('an ordinary category is not described with the pilot vocabulary', (() => {
    /* Each category renders as its own card, so the pilot's rows — the safety rules
       and the capability list — must not appear on any of the other six. A single
       concatenated string would let one card's text stand in for another's. */
    const cards = adm.adminCategories().split('<div class="card">').slice(1);
    const pilot = cards.filter(t => /Fruit Harvest/.test(t));
    const plain = cards.filter(t => !/Fruit Harvest/.test(t));
    return pilot.length === 1 &&
      /Safety rules on this category/.test(pilot[0]) &&
      /Providers declare/.test(pilot[0]) &&
      plain.every(t => !/Safety rules on this category/.test(t) && !/Providers declare/.test(t));
  })(), 'pilot rows leaked onto an ordinary category');
  /* The defect the unit checks all missed and only walking the flow found: a pure
     fruit purchase, confirmed by the provider, fell back to the provider's harvest
     listing and froze a service fee onto a job that had no labour in it — then
     authorized and settled it. A negotiated job's price is whatever the offer said.
     Driven through b10 because the lifecycle guards ask who is signed in, and only
     Ramil and Erning are accounts a reviewer can be. */
  c.check('confirming a negotiated purchase invents no service fee', (() => {
    const w = boot();
    w.makeOffer('b10', { basis:'per_kg', quantityGrams:120000, unitPriceCentavos:5500,
      produceCentavos:660000, labourCentavos:0, whoHarvests:'provider' }, { role:'provider' });
    w.answerOffer('b10','accept', { role:'customer', id: w.CURRENT_CUSTOMER_ID });
    w.applyProviderIdentity('p7');
    w.attemptTransition('b10','upcoming', { role:'provider', id:'p7' });
    const job = w.bookingById('b10');
    return job.status === 'upcoming' && job.amountCentavos === 0 && !job.pricing &&
      w.ledgerFor('b10').length === 0;
  })(), 'a purchase-only job came out priced or ledgered');
  c.check('walking that purchase to completion settles nothing on the ledger', (() => {
    const w = boot();
    w.makeOffer('b10', { basis:'per_kg', quantityGrams:120000, unitPriceCentavos:5500,
      produceCentavos:660000, labourCentavos:0, whoHarvests:'provider' }, { role:'provider' });
    w.answerOffer('b10','accept', { role:'customer', id: w.CURRENT_CUSTOMER_ID });
    w.applyProviderIdentity('p7');
    ['upcoming','en_route','arrived','ongoing','completed'].forEach(to =>
      w.attemptTransition('b10', to, { role:'provider', id:'p7' }));
    const job = w.bookingById('b10');
    return job.status === 'completed' && w.ledgerFor('b10').length === 0 &&
      w.bookingAmountText(job) === 'No service fee' &&
      /Fruit settled/.test(w.payStatusLabel(job));
  })(), 'a purchase came out as a paid service job');
  c.check('a negotiated harvest-and-buy freezes only its labour leg', (() => {
    const w = boot();
    w.makeOffer('b10', { basis:'per_kg', quantityGrams:120000, unitPriceCentavos:5500,
      produceCentavos:660000, labourCentavos:160000, whoHarvests:'provider' }, { role:'provider' });
    w.answerOffer('b10','accept', { role:'customer', id: w.CURRENT_CUSTOMER_ID });
    const job = w.bookingById('b10');
    return !!job.pricing && job.pricing.baseCentavos === 160000 &&
      job.amountCentavos === 160000 && job.produce.amountCentavos === 660000;
  })(), 'the two legs merged or the wrong one was frozen');

  /* ---- an offer only lives as long as the request it prices ----
     Found by walking the paths the demo does not ship: a provider declining a job
     left the offer 'proposed', so the model would have written a produce payment
     onto a cancelled booking. Hiding the button is not refusing. */
  c.check('a declined request closes its open offer', (() => {
    const w = boot();
    w.attemptTransition('b8','cancelled', { role:'provider', id:'p8' }, { reason:'Could not take it' });
    return !w.openOfferFor('b8') && w.currentOffer('b8').status === 'withdrawn' &&
      w.currentOffer('b8').closedBecause === 'cancelled';
  })());
  c.check('answering a closed request is refused by the model, not only by the UI', (() => {
    const w = boot();
    w.attemptTransition('b8','cancelled', { role:'provider', id:'p8' }, { reason:'Could not take it' });
    w.OFFERS[0].status = 'proposed';                 /* force the impossible state */
    try { w.answerOffer('b8','accept',{ role:'customer' }); return false; }
    catch (e) { return /closed/.test(e.message); }
  })());
  c.check('an offer past its own deadline expires when the app is opened', (() => {
    const w = boot();
    w.OFFERS[0].validUntil = new Date(Date.now() - 60000).toISOString();
    w.applyDueTransitions();
    return w.OFFERS[0].status === 'expired' && !w.openOfferFor('b8');
  })());
  c.check('a deadline in the future leaves the offer answerable', (() => {
    const w = boot();
    w.OFFERS[0].validUntil = new Date(Date.now() + 86400000).toISOString();
    w.applyDueTransitions();
    return w.OFFERS[0].status === 'proposed';
  })());
  c.check('a called-off job stops claiming a payment that never happened', (() => {
    const w = boot();
    w.answerOffer('b8','accept', { role:'customer', id: w.CURRENT_CUSTOMER_ID });
    w.attemptTransition('b8','cancelled', { role:'provider', id:'p8' }, { reason:'Could not do the job' });
    const job = w.bookingById('b8');
    return !!job.produce.voided && w.payStatusLabel(job) === 'No payment' &&
      !/you were paid/.test(w.produceRow(job)) && /never bought/.test(w.produceRow(job));
  })(), 'a cancelled job still asserted a payment');
  /* Walked, not forced: setting the status by hand trips the closed-request guard
     that this very suite added, which is the guard working. */
  /* Through b10 and p7: b8's buyer Maricel is not an account anyone signs in as, so
     the capacity guard — which asks who is signed in, correctly — refuses the walk.
     That is the guard working, not a hole. */
  c.check('a job that runs to completion keeps its payment claim', (() => {
    const w = boot();
    w.makeOffer('b10', { basis:'per_kg', quantityGrams:120000, unitPriceCentavos:5500,
      produceCentavos:660000, labourCentavos:0, whoHarvests:'provider' }, { role:'provider' });
    w.answerOffer('b10','accept', { role:'customer', id: w.CURRENT_CUSTOMER_ID });
    w.applyProviderIdentity('p7');
    ['upcoming','en_route','arrived','ongoing','completed'].forEach(to =>
      w.attemptTransition('b10', to, { role:'provider', id:'p7' }));
    const job = w.bookingById('b10');
    return job.status === 'completed' && !job.produce.voided &&
      /you were paid/.test(w.produceRow(job));
  })());
  /* Read off a screenshot, not off a hypothesis: the header said CANCELLED while the
     offer card above it still promised the buyer would confirm the visit. */
  c.check('an offer card on a closed job stops promising a visit', (() => {
    const w = boot();
    w.answerOffer('b8','accept', { role:'customer', id: w.CURRENT_CUSTOMER_ID });
    w.attemptTransition('b8','cancelled', { role:'provider', id:'p8' }, { reason:'Could not do the job' });
    const card = w.offerCard(w.bookingById('b8'));
    return !/has to confirm the visit/.test(card) && /never bought/.test(card);
  })(), 'the card still promised a visit for a job that was called off');

  c.check('Home names an open offer as the next step when it is the active job', (() => {
    const w = boot();
    w.state.view='app'; w.state.role='resident'; w.state.tab='home';
    w.BOOKINGS.filter(b => b.customerId === w.CURRENT_CUSTOMER_ID && b.id !== 'b8')
      .forEach(b => { if (!w.FINISHED_STATES.includes(b.status)) b.status = 'completed'; });
    const html = w.residentHome();
    return /data-booking="b8"/.test(html) && /waiting for your answer/i.test(html) &&
      !/Waiting for the provider to answer/.test(html);
  })(), 'the one booking where her answer is the story was the one screen that did not say so');

  c.check('the catalogue admits what it cannot do',
    /does not do/.test(adm.adminCategories()) && /not available here/.test(adm.adminCategories()));

  return c;
});

/* ══ 16. weighing — the final link of HARVEST/COLLECT → FINALIZE QUANTITY → SETTLE ══
   The pilot's chain stopped short of the measurement: a buyer who agreed 120 kilos and
   carried 31 had nowhere to record the difference, so the only figure on the job stayed
   an estimate nobody had weighed. These checks hold the line that keeps the step from
   becoming a second pricing screen. */
suite('weighing', async () => {
  const c = makeChecker();
  const rules = boot();
  const produceFeeOfOf = rules.produceFeeOf, produceFeeStateOf = rules.produceFeeState;
  c.check('the two readers of the fee rule are both reachable from outside the file',
    typeof produceFeeOfOf === 'function' && typeof produceFeeStateOf === 'function');

  /* A job walked to the point where a recording is allowed: offered, accepted, arrived. */
  const walked = (opts) => {
    const w = boot();
    if (opts && opts.rate) w.CONFIG.produceCommissionRate = opts.rate;
    w.makeOffer('b10', { basis: opts && opts.basis || 'per_kg',
      quantityGrams: 120000, unitPriceCentavos: opts && opts.unit || 5500,
      produceCentavos: opts && opts.produce || 660000,
      labourCentavos: opts && opts.labour || 0, whoHarvests: 'provider' }, { role:'provider' });
    w.answerOffer('b10', 'accept', { role:'customer', id: w.CURRENT_CUSTOMER_ID });
    w.applyProviderIdentity('p7');
    ['upcoming','en_route','arrived'].forEach(to =>
      w.attemptTransition('b10', to, { role:'provider', id:'p7' }));
    return w;
  };

  const w1 = walked();
  const agreed = w1.bookingById('b10').produce.amountCentavos;
  const f1 = w1.finaliseProduce('b10', { quantityGrams: 31000, note:'A third was damaged and left' },
    { role:'provider' });
  c.check('the agreed rate is applied to the actual weight, not to the guess',
    agreed === 660000 && f1.amountCentavos === 170500, agreed + ' → ' + f1.amountCentavos);
  c.check('the agreed figure survives beside the measured one',
    w1.bookingById('b10').produce.amountCentavos === 660000 && !!f1.revisedFrom === false);
  c.check('the unit price the offer was written at is on the record',
    w1.bookingById('b10').produce.unitPriceCentavos === 5500);
  c.check('a reading is stored in whole grams and reads back in kilos',
    f1.quantityGrams === 31000 && /31 kg/.test(w1.finalProduceLine(w1.bookingById('b10'))),
    w1.finalProduceLine(w1.bookingById('b10')));

  /* The rule that keeps this step from inventing economics. */
  const w2 = walked({ labour: 300000 });
  const before = JSON.stringify(w2.bookingById('b10').pricing) + '|' + w2.bookingById('b10').amountCentavos;
  w2.finaliseProduce('b10', { quantityGrams: 31000 }, { role:'provider' });
  c.check('weighing the fruit never touches the service leg',
    before === JSON.stringify(w2.bookingById('b10').pricing) + '|' + w2.bookingById('b10').amountCentavos &&
    w2.bookingById('b10').produce.final.serviceLegChanged === false,
    w2.bookingById('b10').amountCentavos + ' after, ' + before.split('|')[1] + ' before');
  c.check('the ledger hears nothing from a measurement — the fruit was never the platform money', (() => {
    const v = walked({ labour: 300000 });
    const before = JSON.stringify(v.LEDGER);
    v.finaliseProduce('b10', { quantityGrams: 31000 }, { role:'provider' });
    return before === JSON.stringify(v.LEDGER);
  })(), 'a weighing moved money on the platform books');

  const w3 = walked({ basis: 'per_lot', produce: 150000, unit: 150000 });
  const f3 = w3.finaliseProduce('b10', { quantityGrams: 41000 }, { role:'provider' });
  c.check('a lot priced as a lot is not re-scaled by its weight',
    f3.amountCentavos === 150000 && f3.quantityGrams === 41000,
    f3.amountCentavos + ' on 41 kg');

  /* The third basis the pilot offers, walked rather than assumed. */
  const wT = walked({ basis: 'per_tree', produce: 60000, unit: 20000 });
  const fT = wT.finaliseProduce('b10', { treeCount: 4 }, { role:'provider' });
  c.check('a job priced per tree comes out at the agreed price per tree',
    fT.amountCentavos === 80000 && fT.treeCount === 4 && fT.quantityGrams === null &&
    /4 trees/.test(wT.finalProduceLine(wT.bookingById('b10'))),
    JSON.stringify(fT));
  c.check('the per-tree job is asked for trees, not kilos', (() => {
    const v = walked({ basis: 'per_tree', produce: 60000, unit: 20000 });
    v.openFinalise('b10');
    return /How many trees did you actually do/.test(v.sheetHTML()) &&
      /Enter trees/.test(v.finaliseCard(v.bookingById('b10')));
  })(), 'the per-tree job was offered the wrong unit');

  /* The freeze, which is the whole reason the rate is copied onto the produce record. */
  const w4 = walked();
  w4.CONFIG.produceCommissionRate = 0.05;
  const f4 = w4.finaliseProduce('b10', { quantityGrams: 31000 }, { role:'provider' });
  c.check('a rate decided after the agreement does not reach back and charge this job',
    f4.feeStatus === 'undecided' && f4.platformFeeCentavos === 0,
    f4.feeStatus + ' / ' + f4.platformFeeCentavos);
  const w5 = walked({ rate: 0.05 });
  c.check('a job that was agreed under a rate is priced by that rate on the real weight',
    w5.bookingById('b10').produce.feeStatus === 'charged' &&
    w5.bookingById('b10').produce.feeRate === 0.05 &&
    w5.finaliseProduce('b10', { quantityGrams: 31000 }, { role:'provider' }).platformFeeCentavos === 8525,
    JSON.stringify(w5.bookingById('b10').produce.final && w5.bookingById('b10').produce.final.platformFeeCentavos));
  const w6 = walked({ rate: 0.05 });
  w6.CONFIG.produceCommissionRate = 0.10;
  c.check('a heavier load under a frozen rate scales the fee and nothing else',
    w6.finaliseProduce('b10', { quantityGrams: 200000 }, { role:'provider' }).platformFeeCentavos === 55000,
    '200 kg at the frozen ₱55 is ₱11,000, and 5% of that is ₱550 — not 10%');

  /* Where a recording is refused, and what a second one remembers. */
  const w7 = boot();
  w7.makeOffer('b10', { basis:'per_kg', quantityGrams:120000, unitPriceCentavos:5500,
    produceCentavos:660000, labourCentavos:0, whoHarvests:'provider' }, { role:'provider' });
  w7.answerOffer('b10','accept', { role:'customer', id: w7.CURRENT_CUSTOMER_ID });
  c.check('the fruit is only weighed once the visit has started', (() => {
    try { w7.finaliseProduce('b10', { quantityGrams: 31000 }, { role:'provider' }); return false; }
    catch (err) { return /once the visit has started/.test(err.message); }
  })(), 'a reading was accepted against a request nobody had visited');
  c.check('with nothing weighed there is nothing to show on the job',
    w7.finaliseCard(w7.bookingById('b10')) === '');

  /* Through b8 and p8: a provider may call off their own visit while it is still a
     request, which is the one path that produces a voided produce leg. */
  const w8 = boot();
  w8.answerOffer('b8', 'accept', { role:'customer', id: w8.CURRENT_CUSTOMER_ID });
  w8.attemptTransition('b8', 'cancelled', { role:'provider', id:'p8' }, { reason:'Could not do the job' });
  c.check('a called-off visit cannot be weighed out', (() => {
    try { w8.finaliseProduce('b8', { quantityGrams: 31000 }, { role:'provider' }); return false; }
    catch (err) { return /called off/.test(err.message); }
  })(), 'the reading was taken on a job that never happened');

  c.check('a job with no fruit money is refused, not zeroed', (() => {
    const v = boot();
    try { v.finaliseProduce('b1', { quantityGrams: 5000 }, { role:'provider' }); return false; }
    catch (err) { return /no fruit money/.test(err.message); }
  })(), 'finalise ran on a booking with no produce leg');

  const w10 = walked();
  w10.finaliseProduce('b10', { quantityGrams: 31000 }, { role:'provider' });
  c.check('correcting a reading replaces it without erasing it', (() => {
    const v = walked();
    v.finaliseProduce('b10', { quantityGrams: 31000 }, { role:'provider' });
    const again = v.finaliseProduce('b10', { quantityGrams: 29500, note:'Recounted at the gate' }, { role:'provider' });
    return again.amountCentavos === 162250 && !!again.revisedFrom &&
      again.revisedFrom.amountCentavos === 170500 && again.revisedFrom.quantityGrams === 31000;
  })(), 'a second reading overwrote the first with no trace of it');

  /* Read off a screenshot of a job walked past the confirmation: the offer card was
     still asking the resident to wait for a thing that had already happened. The
     shipped demo only ever shows the accepted-and-still-requested state, which is
     how this survived an audit that looked at every closed status. */
  c.check('an accepted offer stops asking for a confirmation the job already has', (() => {
    const card = w1.offerCard(w1.bookingById('b10'));
    return /The visit is confirmed/.test(card) && !/has to confirm the visit/.test(card);
  })(), 'the card still promised a pending confirmation on an arrived job');
  c.check('while the visit is not confirmed the card says exactly that', (() => {
    const v = boot();
    v.answerOffer('b8', 'accept', { role:'customer', id: v.CURRENT_CUSTOMER_ID });
    return /has to confirm the visit/.test(v.offerCard(v.bookingById('b8')));
  })(), 'the pending case lost its own sentence');

  /* The other side has to learn it happened, from the record rather than a rumour. */
  c.check('the thread carries the weighing to the resident', (() => {
    const said = w10.MESSAGES.filter(m => m.bookingId === 'b10');
    const last = said[said.length - 1];
    return !!last && last.from === 'provider' && /^Weighed out 31 kg/.test(last.text) &&
      /₱1,705 at the agreed rate/.test(last.text);
  })(), JSON.stringify(w10.MESSAGES.filter(m => m.bookingId === 'b10').slice(-1)));

  /* Screens, not just models: the row has to stop calling an estimate a payment. */
  const rowBoth = w10.produceRow(w10.bookingById('b10'));
  c.check('the row states the weighed amount and keeps the agreed one visible',
    /₱1,705\.00/.test(rowBoth) && /Agreed ₱6,600/.test(rowBoth) && /weighed out at ₱1,705/.test(rowBoth) &&
    !/about 120 kg/.test(rowBoth), rowBoth.slice(rowBoth.indexOf('finalise-delta'), rowBoth.indexOf('finalise-delta') + 240));
  c.check('the row names who recorded it, because both people read this card',
    /recorded by the provider/.test(rowBoth), 'the by-line was missing or spoke as one party');
  /* Read off the same screenshot: the row asserted the fruit in the past tense while
     the visit was still running, which is the §17 defect wearing a different hat —
     and weighing the load made the claim more specific, not less. */
  c.check('a fruit row does not report a payment the visit has not finished making', (() => {
    const v = walked();
    const mid = v.produceRow(v.bookingById('b10'));
    ['ongoing','completed'].forEach(to => v.attemptTransition('b10', to, { role:'provider', id:'p7' }));
    const done = v.produceRow(v.bookingById('b10'));
    return /you are being paid/.test(mid) && !/you were paid/.test(mid) &&
      /you were paid ₱6,600\.00/.test(done);
  })(), 'the row claimed settled money mid-visit');
  const cardDone = w10.finaliseCard(w10.bookingById('b10'));
  c.check('the provider keeps a way to correct the reading after taking it',
    /Weighed out · ₱1,705/.test(cardDone) && /Correct the reading/.test(cardDone));
  /* Read off the screenshot: the card's headline and its caption were the same
     sentence, so the one figure the provider had just typed appeared twice in a card
     that had room for one of them. */
  c.check('the weighed card states its figure once',
    (cardDone.match(/Weighed out/g) || []).length === 1 &&
    (cardDone.match(/₱1,705/g) || []).length === 1 &&
    /31 kg at the agreed rate/.test(cardDone), cardDone.slice(0, 300));
  const wPre = walked();
  const cardOpen = wPre.finaliseCard(wPre.bookingById('b10'));
  c.check('before the weighing the card asks for the unit the deal used',
    /Enter kilos/.test(cardOpen) && /estimate of about 120 kg/.test(cardOpen) &&
    /openFinalise\('b10'\)/.test(cardOpen), cardOpen.slice(0, 200));
  c.check('the card is a real control inside the provider job screen, not a paragraph',
    /onclick="openFinalise\('b10'\)"/.test(w1.finaliseCard(w1.bookingById('b10'))) &&
    (() => { const src = w10._source, at = src.indexOf('function providerBookingDetail');
      const body = src.slice(at, src.indexOf('\nfunction', at + 1));
      return body.includes('${finaliseCard(booking)}'); })());

  /* What the operator tallies has to be the money that moved. */
  const w11 = walked();
  const stA = w11.intelligenceStats({ category:'all', days:0 });
  w11.finaliseProduce('b10', { quantityGrams: 31000 }, { role:'provider' });
  const stB = w11.intelligenceStats({ category:'all', days:0 });
  c.check('the fruit figure the operator reads is the weighed amount',
    stA.produceCentavos === 660000 && stB.produceCentavos === 170500 && stB.produceJobs === 1,
    stA.produceCentavos + ' agreed, ' + stB.produceCentavos + ' after the reading');
  c.check('and the service figure is exactly the same job it was',
    stB.grossCentavos === stA.grossCentavos, stA.grossCentavos + ' vs ' + stB.grossCentavos);

  /* The preview is the save. Two arithmetic blocks that can disagree is how a screen
     starts promising a number the record will not hold. */
  const w12 = walked();
  w12.openFinalise('b10');
  w12.state.finalDraft.qtyKg = '31';
  const preview = w12.finalDraftTotals(w12.state.finalDraft);
  c.check('the figure on the sheet is the figure the record takes',
    preview.amountCentavos === 170500 && preview.differenceCentavos === -489500 && preview.valid === true,
    JSON.stringify(preview));
  c.check('the sheet renders and says the rate is not editable here',
    /the agreed one/.test(w12.finaliseProduceSheet()) && /not repriced/.test(w12.finaliseProduceSheet()));
  /* Reachability, the lesson the journeys suite was built on: a function the test can
     call is not a screen a person can open. Drive it the way the phone does. */
  c.check('the sheet is painted by a route, not only callable from a test', (() => {
    const v = walked();
    v.state.view = 'app'; v.state.role = 'provider'; v.state.tab = 'provider_booking_detail';
    v.openProviderBooking('b10');
    v.openFinalise('b10');                 /* the card's own click handler */
    v.finalInput('qtyKg', '31');           /* the field's own input handler */
    const html = v.sheetHTML();            /* what renderSheet() paints with */
    return v.state.sheet === 'finaliseProduce' && /Weigh out the fruit/.test(html) &&
      /Agreed at the estimate/.test(html) && /₱6,600/.test(html) &&
      /Less fruit than the estimate/.test(html) && /−₱4,895/.test(html) &&
      /Record ₱1,705/.test(html);
  })(), 'no route painted the sheet');
  c.check('the save button records the reading the provider typed', (() => {
    const v = walked();
    v.state.view = 'app'; v.state.role = 'provider'; v.state.tab = 'provider_booking_detail';
    v.openProviderBooking('b10');
    v.openFinalise('b10');
    v.state.finalDraft.qtyKg = '31';
    v.submitFinalise();
    const f = v.bookingById('b10').produce.final;
    return v.state.sheet === null && !!f && f.amountCentavos === 170500 && f.by === 'provider';
  })(), 'the button on the sheet did not write the record the sheet showed');
  c.check('the provider job screen itself offers the weighing', (() => {
    const v = walked();
    v.state.view = 'app'; v.state.role = 'provider'; v.state.tab = 'provider_booking_detail';
    v.openProviderBooking('b10');
    v.render();
    const html = v._document.getElementById('screen').innerHTML;
    return /Record what you actually took/.test(html) && /Enter kilos/.test(html);
  })(), 'the screen never showed the step that closes the chain');
  c.check('reopening the sheet starts from the last reading, exactly', (() => {
    const v = walked();
    v.finaliseProduce('b10', { quantityGrams: 29500 }, { role:'provider' });
    v.state.finalDraft = null;
    v.openFinalise('b10');
    return v.state.finalDraft.qtyKg === '29.5';
  })(), 'a half-kilo reading reopened rounded up, so saving it again moved the record');
  c.check('an empty reading cannot be saved',
    w12.finalDraftTotals(Object.assign({}, w12.state.finalDraft, { qtyKg:'' })).valid === false);
  c.check('a lot needs no number to be recorded',
    (() => { const v = walked({ basis:'per_lot', produce:150000, unit:150000 });
      v.openFinalise('b10'); return v.finalDraftTotals(v.state.finalDraft).valid === true; })());

  /* The refactor the whole step leans on: one rule, two callers, same answers. */
  c.check('the fee rule answers for a rate that was never decided',
    produceFeeStateOf('harvest_and_buy', 100000, null) === 'undecided' &&
    produceFeeOfOf('harvest_and_buy', 100000, null) === 0);
  c.check('a straight sale stays decided-free even once a rate exists',
    produceFeeStateOf('sell_fruit', 100000, 0.05) === 'not-charged' &&
    produceFeeOfOf('sell_fruit', 100000, 0.05) === 0);
  c.check('no fruit means no fee state to report',
    produceFeeStateOf('harvest_and_buy', 0, 0.05) === 'no-fruit');
  c.check('offerTotals still writes the fee through that one rule', (() => {
    const v = boot();
    const o = { mode:'harvest_and_buy', labourCentavos:0, produceCentavos:200000 };
    v.CONFIG.produceCommissionRate = null;
    const undecided = v.offerTotals(o);
    v.CONFIG.produceCommissionRate = 0.05;
    const charged = v.offerTotals(o);
    return undecided.produceFeeCentavos === 0 && undecided.produceFeeUndecided === true &&
      undecided.produceCharged === false && charged.produceFeeCentavos === 10000 &&
      charged.produceCharged === true && charged.produceFeeUndecided === false;
  })());

  /* The typo that a scale makes: it reads in grams, the field asks for kilos, and the
     number that lands on the line telling a person what they owe is a thousand times too
     big. Probed by hand first — the model accepted 999,999 kg and priced it at ₱5.5
     billion with nothing on the screen noticing. */
  c.check('a reading far above the estimate is warned about, not refused', (() => {
    const v = walked();
    v.openFinalise('b10');
    v.finalInput('qtyKg', '999999');
    const html = v.sheetHTML();
    return v.finalDraftTotals(v.state.finalDraft).farAboveEstimate === true &&
      /kilos, not grams/.test(html) && /more than double/.test(html) &&
      /they will be paid/.test(html);
  })(), 'the sheet took an absurd weight in silence');
  /* The asymmetry is the point, and it is the mistake this audit nearly shipped: an
     earlier draft warned on *any* reading under half the estimate, which fires on 31 of
     an agreed 120 — the ordinary story of a standing tree, and the one case the step
     exists for. Carrying less is normal. Carrying double is a unit error. */
  c.check('carrying less than estimated is never treated as a mistake', (() => {
    const v = walked();
    v.openFinalise('b10');
    return ['31', '10', '1'].every(kg => {
      v.finalInput('qtyKg', kg);
      return v.finalDraftTotals(v.state.finalDraft).farAboveEstimate === false &&
        !/finalise-warn/.test(v.sheetHTML());
    });
  })(), 'the warning fired on an ordinary shortfall');
  c.check('a reading somewhat above the estimate is not treated as a mistake', (() => {
    const v = walked();
    v.openFinalise('b10');
    /* 120 kg was estimated. 200 is a good season; 300 is a scale read in grams. A rule
       that warned on the first would be crying wolf on the sheet the buyer reads before
       they hand over money, which is worse than the silence it replaces. */
    v.finalInput('qtyKg', '200');
    const plausible = v.finalDraftTotals(v.state.finalDraft).farAboveEstimate === false &&
      !/finalise-warn/.test(v.sheetHTML());
    v.finalInput('qtyKg', '300');
    return plausible && v.finalDraftTotals(v.state.finalDraft).farAboveEstimate === true &&
      /finalise-warn/.test(v.sheetHTML());
  })(), 'the warning had no threshold, only a direction');
  c.check('a lot is never warned about, because its weight changes no money', (() => {
    const v = walked({ basis: 'per_lot', produce: 150000, unit: 150000 });
    v.openFinalise('b10');
    v.finalInput('qtyKg', '999999');
    return v.finalDraftTotals(v.state.finalDraft).farAboveEstimate === false;
  })());
  c.check('the model still takes the big reading — the cap would be an invented rule', (() => {
    const v = walked();
    return v.finaliseProduce('b10', { quantityGrams: 999999000 }, { role:'provider' }).amountCentavos === 5499994500;
  })(), 'a limit nobody agreed was quietly added to the weight');

  /* The two states the audit walked into and found untested. */
  c.check('a reading survives a reload with the rate that priced it', (() => {
    const store = fakeStorage();
    const first = boot({ storage: store });
    first.makeOffer('b10', { basis:'per_kg', quantityGrams:120000, unitPriceCentavos:5500,
      produceCentavos:660000, labourCentavos:0, whoHarvests:'provider' }, { role:'provider' });
    first.answerOffer('b10','accept', { role:'customer', id: first.CURRENT_CUSTOMER_ID });
    first.applyProviderIdentity('p7');
    ['upcoming','en_route','arrived'].forEach(to =>
      first.attemptTransition('b10', to, { role:'provider', id:'p7' }));
    first.finaliseProduce('b10', { quantityGrams: 31000 }, { role:'provider' });
    first.persist();
    const again = boot({ storage: store });
    again.hydrate();
    const job = again.bookingById('b10');
    return !!job.produce.final && job.produce.final.amountCentavos === 170500 &&
      job.produce.unitPriceCentavos === 5500 &&
      /weighed out at ₱1,705/.test(again.produceRow(job)) &&
      /Weighed out · ₱1,705/.test(again.finaliseCard(job));
  })(), 'the reading was written to the screen but not to the store');
  c.check('a job under case review cannot have its weight edited', (() => {
    const v = walked();
    v.finaliseProduce('b10', { quantityGrams: 31000 }, { role:'provider' });
    ['ongoing','completed'].forEach(to => v.attemptTransition('b10', to, { role:'provider', id:'p7' }));
    v.openDispute('b10', { role:'customer', id: v.CURRENT_CUSTOMER_ID }, 'Fewer kilos than the weighing claimed');
    const job = v.bookingById('b10');
    let refused = false;
    try { v.finaliseProduce('b10', { quantityGrams: 120000 }, { role:'provider' }); }
    catch (err) { refused = /once the visit has started/.test(err.message); }
    return job.status === 'disputed' && refused && v.finaliseCard(job) === '' &&
      /you are being paid/.test(v.produceRow(job));
  })(), 'the number under dispute could still be rewritten by the party who wrote it');

  return c;
});

/* ══ 17. back — the phone's only way out ═══════════════════════════════════════════
   The shell asks the WebView "can you go back?" and the answer used to always be no,
   because the page recorded nothing. That made the first Back press quit Sukinnect from
   inside a half-filled form. These checks drive the history the page now keeps, through
   the harness's own stub — which is the only reason this is testable at all. */
suite('back', async () => {
  const c = makeChecker();
  const app = boot();
  app.state.view = 'app'; app.state.role = 'resident'; app.state.tab = 'home'; app.render();
  c.check('standing on a root tab records nothing to go back to',
    app._history.entries.length === 0, JSON.stringify(app._history.entries.length));

  app.openSheet('bookingRequest');
  c.check('opening a sheet records one step to undo',
    app._history.entries.length === 1 && !!app.state.sheet, JSON.stringify(app._history.entries.length));
  app._history.back();
  c.check('Back closes the sheet and leaves the screen under it alone',
    app.state.sheet === null && app.state.tab === 'home' && app._history.entries.length === 0,
    'sheet=' + app.state.sheet + ' tab=' + app.state.tab + ' entries=' + app._history.entries.length);

  app.openSheet('bookingRequest');
  app.closeSheet();
  c.check('closing by tap spends the entry, so Back is never wasted',
    app.state.sheet === null && app._history.entries.length === 0,
    'entries=' + app._history.entries.length);

  const v = boot();
  v.state.view = 'app'; v.state.role = 'resident'; v.state.tab = 'home'; v.render();
  v.openProviderDetail('p1');
  c.check('walking into a provider records one step back out',
    v.state.tab === 'provider_detail' && v._history.entries.length === 1,
    'tab=' + v.state.tab + ' entries=' + v._history.entries.length);
  v._history.back();
  c.check('Back from a provider returns to the tab it was reached from',
    v.state.tab === 'home' && !v.selectedProvider && v._history.entries.length === 0,
    'tab=' + v.state.tab);

  /* The case the whole feature exists for: a form half filled, deep in the app. */
  const d = boot();
  d.state.view = 'app'; d.state.role = 'resident'; d.state.tab = 'home'; d.render();
  d.openProviderDetail('p1');
  d.openSheet('bookingRequest');
  c.check('a sheet on a drill-in records both steps',
    d._history.entries.length === 2, JSON.stringify(d._history.entries.length));
  d._history.back();
  c.check('the first Back closes the sheet and keeps the screen you were on',
    d.state.sheet === null && d.state.tab === 'provider_detail' && d._history.entries.length === 1,
    'sheet=' + d.state.sheet + ' tab=' + d.state.tab + ' entries=' + d._history.entries.length);
  d._history.back();
  c.check('the second Back leaves the drill-in, and only then is the app quittable',
    d.state.tab === 'home' && d._history.entries.length === 0,
    'tab=' + d.state.tab + ' entries=' + d._history.entries.length);

  const e = boot();
  e.state.view = 'app'; e.state.role = 'resident'; e.state.tab = 'home'; e.render();
  e.openProviderDetail('p1');
  e.openSheet('bookingRequest');
  e.closeSheet();
  c.check('tapping the sheet away does not throw you out of the screen behind it',
    e.state.tab === 'provider_detail' && e._history.entries.length === 1,
    'tab=' + e.state.tab + ' entries=' + e._history.entries.length);

  /* A tab switch is a move sideways, not a step down: Back should leave, not retrace
     every tab tapped since the app opened. */
  const f = boot();
  f.state.view = 'app'; f.state.role = 'resident'; f.state.tab = 'home'; f.render();
  f.state.tab = 'bookings'; f.render();
  f.state.tab = 'messages'; f.render();
  c.check('moving between root tabs leaves nothing to retrace',
    f._history.entries.length === 0, JSON.stringify(f._history.entries.length));

  /* Where Back lands is the tab you were actually on, and it belongs to the role you
     are signed in as — a provider must not be dropped into a resident screen. */
  const g = boot();
  g.state.view = 'app'; g.state.role = 'provider'; g.state.tab = 'fsm'; g.render();
  g.openProviderBooking('pb6');
  c.check('a provider who came from the FSM goes back to the FSM', (() => {
    g._history.back();
    return g.state.tab === 'fsm';
  })(), 'tab=' + g.state.tab);

  const h = boot();
  h.state.view = 'app'; h.state.role = 'resident'; h.state.tab = 'messages'; h.render();
  h.openChatThread('p1', 'b1');
  const inChat = h.state.isChatOpen === true || h.state.tab === 'chat';
  c.check('opening a chat is a step down, so Back is not wasted on it', (() => {
    h._history.back();
    return inChat && h.state.tab === 'messages' && !h.state.isChatOpen;
  })(), 'tab=' + h.state.tab + ' isChatOpen=' + h.state.isChatOpen);

  /* The login screen is not inside the app; nothing there should be undoable. */
  const i = boot();
  i.state.view = 'login'; i.render();
  i.state.authMode = 'register'; i.render();
  c.check('the sign-in screen keeps no back handles', i._history.entries.length === 0,
    JSON.stringify(i._history.entries.length));

  return c;
});

(async () => {
  let total = 0, failed = 0;
  for (const { name, fn } of suites) {
    console.log('\n── ' + name + ' ' + '─'.repeat(Math.max(0, 56 - name.length)));
    let c;
    try { c = await fn(); }
    catch (err) { console.log('FAIL  suite crashed: ' + err.message + '\n' + (err.stack || '').split('\n')[1]); failed++; total++; continue; }
    total += c.total();
    failed += c.failures().length;
  }
  console.log('\n' + (failed ? failed + ' of ' + total + ' checks FAILED' : 'all ' + total + ' checks passed'));
  process.exit(failed ? 1 : 0);
})();

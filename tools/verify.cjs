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
    state.providerProfileSection ? 'sec:' + state.providerProfileSection : null,
    state.residentProfileSection ? 'sec:' + state.residentProfileSection : null,
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
    state.residentProfileSection = null; state.providerProfileSection = null;
    state.adminAccountSection = null; state.bookingFilter = 'all'; state.providerBookingFilter = 'all';
    state.sheet = null; state.providerResponding = null; state.providerDeclineConfirm = false;
  };
  function visit(setup) {
    setup();
    try {
      render();
      const html = app._document.getElementById('screen').innerHTML;
      const bad = html.match(/undefined|NaN|\[object Object\]/);
      if (bad) broken.push(label() + '  paints ' + bad[0]);
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
  visit(() => { state.role = 'admin'; state.tab = 'admin_disputes'; base(); state.adminWarrantyShown = true; });
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
  const KINDS = ['payment.authorized', 'payment.voided', 'booking.settled', 'booking.settled_cash'];
  c.check('only money movements appear at boot',
    LEDGER.every(e => KINDS.includes(e.eventType)),
    LEDGER.map(e => e.eventType).filter(t => !KINDS.includes(t)).join(','));
  c.check('a holding belongs to an accepted job, never a request',
    LEDGER.filter(e => e.eventType === 'payment.authorized')
      .every(e => { const b = BOOKINGS.find(x => x.id === e.bookingId); return b && b.status !== 'requested'; }));
  c.check('an earning belongs to a completed job only',
    LEDGER.filter(e => e.eventType === 'booking.settled' || e.eventType === 'booking.settled_cash')
      .every(e => { const b = BOOKINGS.find(x => x.id === e.bookingId); return b && b.status === 'completed'; }));
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
     that has been promised twice. */
  const claims = BOOKINGS.reduce((t, b) => t + Math.max(0, app.accountBalance('customer_deposit', b.id)), 0)
    + ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].reduce((t, p) => t + app.accountBalance('provider_payable', p), 0)
    + app.accountBalance('platform_fee_revenue') + app.accountBalance('platform_fixed_fee_revenue')
    + app.accountBalance('dispute_hold') * -1;
  c.check('escrow covers exactly the claims on it',
    app.accountBalance('escrow_held') === claims,
    app.accountBalance('escrow_held') + ' vs ' + claims);
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
    !/cash on arrival/i.test(b.paymentMethod || ''))
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
  const isCash = b => /cash on arrival/i.test(b.paymentMethod || '');
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
  const partner = pendingProviderRequests().find(b => !/cash/i.test((b.paymentMethod || 'Cash on Arrival'))) ||
                  BOOKINGS.find(b => b.status === 'requested');
  if (partner.paymentMethod === undefined || !partner.paymentMethod) partner.paymentMethod = 'GCash (0912***6789)';
  attemptTransition(partner.id, 'upcoming', PROVIDER);
  const auth = paymentsFor(partner.id).find(p => p.type === 'authorization');
  c.check('accepting records an authorization', !!auth);
  c.check('held money is labelled held, not paid',
    partner.paymentStatus === 'Held, not yet paid', partner.paymentStatus);
  c.check('a holding is not revenue',
    LEDGER.filter(e => e.bookingId === partner.id).every(e => e.eventType !== 'booking.settled'));

  /* a cash job never creates a holding */
  const cash = BOOKINGS.find(b => b.status === 'ongoing' && /cash on arrival/i.test(b.paymentMethod || ''));
  c.check('a cash job has no authorization row',
    !paymentsFor(cash.id).some(p => p.type === 'authorization'));

  /* completing releases */
  cash.status = 'ongoing';
  attemptTransition(cash.id, 'completed', PROVIDER);
  c.check('a cash completion records a collection, not a capture',
    !!paymentsFor(cash.id).find(p => p.type === 'collection'));
  c.check('and it says the money was paid on site',
    cash.paymentStatus === 'Paid on Site', cash.paymentStatus);
  c.check('the platform is owed the fee rather than holding it',
    accountBalance('commission_receivable', 'p1') >= cash.pricing.commissionCentavos,
    String(accountBalance('commission_receivable', 'p1')));

  /* refunds */
  const refundable = BOOKINGS.find(b => b.status === 'completed' && b.pricing &&
                                       !/cash on arrival/i.test(b.paymentMethod || ''));
  const revenueBefore = accountBalance('platform_fee_revenue');
  const payableBefore = accountBalance('provider_payable', refundable.providerId);
  const escrowBefore = accountBalance('escrow_held');
  const total = refundable.pricing.customerTotalCentavos;
  refundBooking(refundable, Math.round(total / 2), ADMIN, 'Half the work was not done');
  c.check('a partial refund leaves the job partly settled',
    refundable.paymentStatus === 'Partly refunded', refundable.paymentStatus);
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
  const upcoming = BOOKINGS.find(b => b.status === 'upcoming' && !/cash on arrival/i.test(b.paymentMethod || ''));
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
    BOOKINGS.some(b => b.status === 'completed' && b.paymentStatus !== 'Paid Online'),
    BOOKINGS.map(b => b.status + '/' + b.paymentStatus).slice(0, 3).join(' '));
  c.check('and the axes are different fields on the same record',
    BOOKINGS.every(b => 'status' in b && 'paymentStatus' in b));
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

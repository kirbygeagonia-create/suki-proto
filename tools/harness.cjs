/* Shared test harness for the Sukinnect rebuild.
   Boots the real application script out of Sukinnect-next.html against a minimal
   fake DOM, so the kernel can be driven in Node exactly as the phone drives it in
   the browser — no duplicated copy of the logic, no browser required. */
const fs = require('fs');
const path = require('path');

const APP = path.join(__dirname, '..', 'Sukinnect-next.html');

/* The kernel grows a few exports every step. Names are pulled through a local
   eval so a suite can ask for what it needs and gets undefined for what has not
   landed yet, instead of the whole harness failing to boot over one symbol. */
const EXPORTS = ['BOOKINGS', 'CUSTOMERS', 'PROVIDERS', 'LISTINGS', 'NOTIFICATIONS', 'LEDGER',
  'PAYMENTS', 'STATUS_EVENTS', 'PAYOUTS', 'DISPUTES', 'CONFIG', 'state', 'Store', 'snapshot',
  'hydrate', 'persist', 'restoreSeed', 'bookingsForResident', 'bookingsForProvider',
  'pendingProviderRequests', 'bookingById', 'providerOf', 'customerOf', 'listingsOf',
  'listingById', 'agoText', 'clockText', 'dayName', 'timeMinutes', 'byWhen', 'serviceMeta', 'peso', 'pesoShort', 'pesoCompact', 'rateLabel',
  'toCentavos', 'toPesos', 'computeBreakdown', 'breakdownForBooking', 'postEvent', 'settlementLines', 'settlementToProvider', 'freezePricing', 'commissionRateFor', 'CONFIG_DEFAULTS', 'CONFIG_AUDIT',
  'accountBalance', 'ledgerBalance', 'ledgerFor', 'ACCOUNTS', 'LEDGER_EVENTS',
  'PAYMENTS', 'PAYOUTS', 'PAYMENT_LABELS', 'paymentsFor', 'recordPayment', 'Gateway',
  'earningsCard', 'jobActionBar', 'realRequestCard', 'listingsPanel', 'threadsFor',
  'toggleListing', 'commitListingDraft', 'bookedThisWeek', 'completionRate', 'cancellationRate', 'nextPayoutDate', 'settlementLines',
  'TRANSITIONS', 'BOOKING_STATES', 'FINISHED_STATES', 'attemptTransition', 'transitionAllowed',
  'nextActionFor', 'bookingTimeline', 'label', 'stateHint', 'recordStatusEvent', 'seedStatusHistory',
  'applyDueTransitions', 'MockGateway', 'authorizeBooking', 'captureBooking', 'voidBooking',
  'refundBooking', 'settleCashBooking', 'providerBalances', 'runPayoutCycle', 'platformStatement',
  'providerStatement', 'commissionReceivableAgeing', 'SCHEMA_VERSION', 'ROOT_TABS',
  'submitBookingRequest', 'answerRequest', 'providerJobAction', 'openProviderDetail',
  'render', 'showToast', 'resetDemoData', 'setConfig', 'rateFor', 'LedgerImbalance',
  'CURRENT_CUSTOMER_ID', 'CURRENT_PROVIDER_ID', 'CONFIG_DEFAULTS', 'commissionRateFor',
  'adminCounts', 'marketplaceRates', 'opsWorkload', 'intelligenceStats', 'supplyGaps', 'disputeCard', 'statementCard', 'configPanel',
  'DISPUTE_STATES', 'disputeLabel', 'caseIsOpen', 'providerCases', 'resolveCase', 'resolveDispute', 'commitConfig', 'setIntFilter', 'runPayoutNow', 'openDispute',
  'categorySupply', 'weeklyBookings', 'adminFinanceScreen', 'ageingCard',
  'loginHTML', 'AUTH_ROLE_LABEL', 'DEMO_LOGIN',
  /* Added after the audit: the guards, the money readers and the case door were
     unreachable from the suite, which is exactly how a severed entry point could
     render beautifully and still pass every check. */
  'canDispute', 'creditedFor', 'isCashJob', 'payStatusLabel', 'payMethodLabel',
  'refundableCentavos', 'refundLines', 'postedCredits', 'notificationRoute',
  'openDispute', 'openCaseSheet', 'submitCase', 'raiseCaseSheet', 'caseDoor', 'caseActor',
  'PAY_METHODS', 'PAYMENT_LABELS', 'TRANSITIONS', 'providerIsFreeToAccept',
  /* the thread, and the verbs the provider's card offers */
  'MESSAGES', 'threadsFor', 'threadMessages', 'threadKeyOf', 'threadKeyFor', 'postMessage',
  'appendMessage', 'sendChatMessage', 'openChatThread', 'currentThreadKey', 'nextStepFor',
  'JOB_VERBS', 'photoAvatar', 'serviceAvatar', 'isSettled', 'seedMessages',
  /* the pilot category: its child record, its arithmetic, and its readers */
  'OFFERS', 'OFFER_STATES', 'offerLabel', 'offerIsOpen', 'offersFor', 'currentOffer',
  'openOfferFor', 'offerTotals', 'offerDirection', 'describeOffer', 'makeOffer',
  'answerOffer', 'kgText', 'seedFruitOffers', 'fruitCapability', 'providerCanMode',
  'capabilityLabel', 'categoryBehaviour', 'CATEGORY_DEFAULTS', 'SERVICES',
  /* the resident's fruit sheet and the readers every screen share */
  'bookingRequestSheet', 'modeRail', 'modesFor', 'fruitBlock', 'fruitFields', 'fruitField',
  'fruitInput', 'pickFruitField', 'toggleFruitBool', 'requestPhotos', 'dropFruitPhoto',
  'fruitDraft', 'pickRequestMode', 'offerTermsCard', 'termsCard',
  'bookingModeRecord', 'priceByOffer', 'bookingAmountText', 'bookingAmountPhrase',
  'FRUIT_FIELD_UI',
  /* the resident's screens, so a probe can read what a tap would show */
  'residentHome', 'residentBookingDetail', 'statusCard', 'offerCard', 'offerMoneyLines',
  'produceRow', 'answerResidentOffer', 'offersFor', 'offerIsOpen', 'hasServiceMoney',
  /* the provider's side of the pilot */
  'providerJobMoves', 'makeOfferSheet', 'offerTotalsBlock', 'offerDraft', 'offerDraftTotals',
  'offerDraftUnits', 'openMakeOffer', 'submitOffer', 'offerInput', 'pickOfferBasis',
  'pickOfferWho', 'capabilityCard', 'providerJobAction', 'realRequestCard', 'jobActionBar',
  'requestActionCard', 'PROVIDER_DEMO_ACCOUNTS', 'PROVIDER_DEMO_PROFILES',
  'signInAsProvider', 'applyProviderIdentity'];

function boot({ appMode = false, storage = null } = {}) {
  const src = fs.readFileSync(APP, 'utf8');
  const body = src.slice(src.lastIndexOf('<script>') + '<script>'.length, src.lastIndexOf('</script>'));

  const els = new Map();
  let nonce = 0;
  function fakeEl(id) {
    if (els.has(id)) return els.get(id);
    const el = {
      id, value: '', textContent: '', innerHTML: '', scrollTop: 0, scrollHeight: 0,
      style: {}, dataset: {}, disabled: false, children: [], className: '',
      /* firstChild and children have to behave like a real tree: the app trims
         toasts with "while (children.length > 2) removeChild(firstChild)", and a
         stub that never actually removes anything is an infinite loop. */
      get firstChild() { return el.children[0] || null; },
      get childNodes() { return el.children; },
      classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
      querySelector: (sel) => fakeEl(el.id + ' >> ' + sel),
      querySelectorAll: () => [],
      addEventListener() {}, removeEventListener() {}, focus() {}, setSelectionRange() {},
      appendChild(c) { el.children.push(c); return c; },
      remove() {},
      removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); return c; },
      getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0 }),
      closest: () => null,
      setAttribute(k, v) { el[k] = v; }, getAttribute(k) { return el[k] == null ? null : el[k]; },
      removeAttribute(k) { delete el[k]; },
      insertAdjacentHTML() {}, scrollTo() {}, scrollIntoView() {}, click() {}, blur() {},
      contains: () => false
    };
    els.set(id, el);
    return el;
  }

  const document = {
    body: { classList: { add() {}, remove() {}, toggle() {} } },
    documentElement: { style: {}, classList: { add() {}, remove() {} } },
    getElementById: (id) => (id ? fakeEl(id) : null),
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => fakeEl('created-' + ++nonce),
    addEventListener() {}
  };
  const window = { customElements: null, addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) };
  const location = { search: appMode ? '?app=1' : '' };
  const navigator = { userAgent: 'node-test' };
  class Image { set src(v) { this._src = v; } get src() { return this._src; } }
  const chain = () => {
    const o = {};
    ['setView', 'addTo', 'bindPopup', 'openPopup', 'setZoom', 'on', 'flyTo', 'remove', 'invalidateSize']
      .forEach(m => { o[m] = () => o; });
    return o;
  };
  const L = { map: chain, tileLayer: chain, marker: chain };

  if (storage) globalThis.localStorage = storage;
  else delete globalThis.localStorage;

  const ctx = new Function('window', 'document', 'location', 'navigator', 'L', 'Image', 'console',
    body + `
    const out = {};
    const names = ${JSON.stringify(EXPORTS)};
    names.forEach(name => { try { out[name] = eval(name); } catch (err) { out[name] = undefined; } });
    return out;`
  )(window, document, location, navigator, L, Image, { log() {}, warn() {}, error() {} });

  ctx._document = document;
  ctx._els = els;
  ctx._source = src;
  return ctx;
}

function fakeStorage() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
    _map: m
  };
}

/* Small assertion reporter shared by every suite. */
function makeChecker() {
  const results = [];
  const api = {
    check(label, cond, extra) {
      results.push({ label, ok: !!cond, extra });
      console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${cond ? '' : '   ' + (extra || '')}`);
      return !!cond;
    },
    failures() { return results.filter(r => !r.ok); },
    total() { return results.length; }
  };
  return api;
}

module.exports = { boot, fakeStorage, makeChecker, APP, EXPORTS };

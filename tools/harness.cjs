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
const EXPORTS = ['BOOKINGS', 'CUSTOMERS', 'PROVIDERS', 'CREDENTIALS', 'LISTINGS', 'NOTIFICATIONS', 'LEDGER',
  'PAYMENTS', 'STATUS_EVENTS', 'PAYOUTS', 'DISPUTES', 'CONFIG', 'state', 'Store', 'snapshot',
  'hydrate', 'persist', 'restoreSeed', 'bookingsForResident', 'bookingsForProvider',
  'pendingProviderRequests', 'bookingById', 'providerOf', 'customerOf', 'listingsOf',
  'listingById', 'agoText', 'clockText', 'dayName', 'timeMinutes', 'byWhen', 'serviceMeta', 'peso', 'pesoShort', 'pesoCompact', 'rateLabel',
  'toCentavos', 'toPesos', 'computeBreakdown', 'breakdownForBooking', 'postEvent', 'settlementLines', 'settlementToProvider', 'freezePricing', 'commissionRateFor', 'CONFIG_DEFAULTS', 'CONFIG_AUDIT',
  'accountBalance', 'ledgerBalance', 'ledgerFor', 'ACCOUNTS', 'LEDGER_EVENTS',
  'PAYMENTS', 'PAYOUTS', 'PAYMENT_LABELS', 'paymentsFor', 'recordPayment', 'Gateway',
  'earningsCard', 'jobActionBar', 'realRequestCard', 'listingsPanel', 'threadsFor', 'adminDashboard',
  'toggleListing', 'commitListingDraft', 'bookedThisWeek', 'completionRate', 'cancellationRate', 'nextPayoutDate', 'settlementLines',
  'TRANSITIONS', 'BOOKING_STATES', 'FINISHED_STATES', 'STEP_STAMPS', 'attemptTransition', 'transitionAllowed',
  'nextActionFor', 'bookingTimeline', 'label', 'stateHint', 'recordStatusEvent', 'seedStatusHistory',
  'applyDueTransitions', 'MockGateway', 'authorizeBooking', 'captureBooking', 'voidBooking',
  'refundBooking', 'settleCashBooking', 'providerBalances', 'runPayoutCycle', 'platformStatement',
  'providerStatement', 'commissionReceivableAgeing', 'SCHEMA_VERSION', 'ROOT_TABS',
  'submitBookingRequest', 'answerRequest', 'providerJobAction', 'openProviderDetail',
  'providerBookingDetail',
  'render', 'showToast', 'resetDemoData', 'setConfig', 'rateFor', 'LedgerImbalance',
  'CURRENT_CUSTOMER_ID', 'CURRENT_PROVIDER_ID', 'CONFIG_DEFAULTS', 'commissionRateFor',
  /* Discovery and the provider's own availability, pulled through so a suite can ask
     whether a filter actually changes what a resident is shown. */
  'providerMatches', 'providerServes', 'providerAccepting', 'blankFilters', 'activeFilterCount', 'coverageLines',
  'setProviderAvailable', 'setProviderBusy', 'reputationSeedOf', 'refreshReputation',
  'adminCounts', 'marketplaceRates', 'opsWorkload', 'intelligenceStats', 'supplyGaps', 'disputeCard', 'statementCard', 'configPanel',
  'DISPUTE_STATES', 'disputeLabel', 'caseIsOpen', 'providerCases', 'resolveCase', 'resolveDispute', 'commitConfig', 'setIntFilter', 'runPayoutNow', 'openDispute',
  'categorySupply', 'weeklyBookings', 'providerWeeklyEarnings', 'providerDemandByBarangay', 'weekStart', 'MIN_SHARE_SAMPLE', 'chartShare', 'chartColumns', 'chartBars', 'chartEmpty', 'chartScale', 'chartSummary', 'adminFinanceScreen', 'ageingCard',
  'residentFinished', 'residentPaid', 'bookingTotal', 'residentSpendByService', 'warrantyEndsAt', 'shortDate', 'residentSectionBody',
  'adminProviderMeta', 'credentialState', 'credentialsOf', 'worstCredentialState', 'verifiedProviderList', 'expiringProviderCount', 'bookingsForProvider', 'providerSectionBody', 'adminSectionBody', 'openCasesFor', 'credentialSummaryFor', 'closedJobCount', 'networkSummary',
  'adminProviderInsights', 'networkAttentionList', 'adminAttentionSection', 'adminDisputes', 'attentionQueue', 'networkServiceRows', 'networkHealthRows', 'networkFlagSummary',
  'PENDING_APPLICANTS', 'APPLICATION_DOCS', 'APPLICATION_DOC_KINDS', 'applicationDocs', 'applicationDocsSubmitted', 'applicationDocsOutstanding', 'applicationDocLabel', 'applicantWaitDays', 'applicantWaitLabel', 'applicantIssue', 'pendingApplicantList', 'reviewOf', 'reviewStatusLine', 'reviewTimeline', 'verificationApplication', 'verificationAction', 'openProviderVerification', 'reopenReview', 'docsOutstanding',
  'loginHTML', 'AUTH_ROLE_LABEL', 'AUTH_ROLE_ICON', 'ICON_MEANING', 'BOOKING_GROUPS', 'ATTENTION_KINDS', 'attentionQueue', 'rescheduleAskCard', 'pendingRescheduleAsks', 'DEMO_LOGIN',
  /* Added after the audit: the guards, the money readers and the case door were
     unreachable from the suite, which is exactly how a severed entry point could
     render beautifully and still pass every check. */
  'canDispute', 'creditedFor', 'isCashJob', 'payStatusLabel', 'payMethodLabel',
  'refundableCentavos', 'refundLines', 'postedCredits', 'notificationRoute',
  /* Added with the weighing step: a rule that only a screen can trigger has to be
     triggerable from the suite too, or the screen is the only thing that tested it. */
  'produceFeeOf', 'produceFeeState', 'finaliseProduce', 'finalProduceLine',
  'finaliseCard', 'openFinalise', 'finalDraft', 'finalDraftTotals', 'submitFinalise',
  'finalQuantityText',
  'finaliseProduceSheet', 'finaliseTotalsBlock', 'sheetHTML', 'finalInput', 'updateFinalTotals',
  /* the Back suite drives the app through its own navigation entry points, because a
     history handle is only worth testing if the step that created it is real */
  'openSheet', 'closeSheet', 'openChatThread', 'stepBack', 'openLayers', 'receiptCard',
  'layerKeys', 'modalAboveSheet', 'openProfileSection', 'residentProfileAction',
  'startOfDay', 'daysBetween', 'applicantWaitDays', 'applicantWaitLabel', 'credentialState',
  'isoDay', 'isoDayAgo', 'isoDayAhead', 'saveProviderProfessionalProfile', 'submitAuth',
  'adminVerifications', 'emptyState',
  'requestChoices', 'requestAddressBook', 'requestPaymentOptions', 'requestDays',
  'residentChatRoom', 'draftListing',
  'REQUEST_TIMES', 'submitBookingRequest', 'bookingRequestSheet',
  'closeChatRoom', 'threadsFor', 'markThreadRead', 'threadKeyOf',
  'matchConciergeService', 'addConciergeAnswer', 'conciergeFindMatches', 'openCategory',
  'adminLog', 'askForDocuments', 'flagAccountReview', 'submitCase', 'savePayoutAccount',
  'savePreferredPayment', 'setProviderNotification', 'saveHouseholdItem', 'savePortfolioWork',
  'saveAdminProviderNote', 'setAdminNotification',
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
  'signInAsProvider', 'applyProviderIdentity', 'signedInProvider',
  /* the operator's view of the pilot */
  'adminMarketplaceIntelligence', 'adminCategories', 'intelligenceStats', 'bookingsInWindow',
  'ADMIN_PRICING_WORDS', 'ADMIN_CAPABILITY_WORDS', 'ADMIN_SAFETY_WORDS',
  'residentResults', 'residentProviderDetail', 'residentBookings', 'providerBookings', 'providerDashboard', 'providerFSM',
  'openBookingRequest', 'submitBookingRequest', 'openProviderBooking', 'findProviderBooking',
  /* the reschedule flow: a proposal is a record, so the gate drives the real handlers and reads
     the booking back rather than trusting that a button was wired. */
  'RESCHEDULE_REQUESTS', 'RESCHEDULE_STATES', 'reschedulable', 'pendingReschedule',
  'bookingTimeline', 'timelineRows',
  'rescheduleBooking', 'rescheduleHistory', 'openRescheduleRequest', 'submitRescheduleRequest', 'answerReschedule',
  'withdrawReschedule', 'counterReschedule', 'rescheduleCard', 'rescheduleRow', 'rescheduleSheet',
  /* the three documents and the acceptance record, so the gate can drive the real register path */
  'LEGAL_DOCUMENTS', 'LEGAL_VERSION', 'legalDoc', 'openLegalDoc', 'legalDocSheet', 'legalLinks',
  /* the scroll gate: which documents the consent sentence names, and the one function a scroll
     calls. The gate drives these rather than writing state.docRead, so the reading rule itself is
     what the checks exercise. */
  'acceptDocIds', 'docIsRead', 'acceptanceUnlocked', 'docScrolled', 'noteUnscrollableDocs',
  /* the floating concierge door on Home, so the gate can resolve the handler the painted attribute
     names and prove the click lands somewhere */
  'conciergeFab', 'openConcierge',
  /* the Phase D surfaces: the record-derived suggestions, the web-only admin refusal, and the rate
     wizard. Each is driven through its own function so the gate runs the procedure rather than reading
     the source that describes it. */
  'frequentActionRows', 'frequentActionsCard', 'openFrequentAction',
  'adminWebOnly', 'exitAdminShell',
  'rateBandFor', 'marketRateHint', 'openRateWizard', 'rateWizardSheet',
  'rateWizardGo', 'rateWizardChoose', 'rateWizardSave',
  /* the verification stepper and its two named seams */
  'openVerificationWizard', 'verificationSheet', 'verificationGo', 'verificationAttach',
  'verificationField', 'verificationSummary', 'saveVerificationDraft',
  'readIdDocumentSeam', 'matchFaceSeam',
  /* the sign-up guide and its dictation seam */
  'openSignupGuide', 'signupGuideSheet', 'guideWrite', 'guideGo', 'guideDictate', 'speechSeam'];

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
  /* A browser keeps a session history and fires popstate when Back is pressed, and the app
     now relies on both: a sheet pushes one entry so the phone's Back closes the sheet rather
     than quitting. With no stub here the app's history calls would simply throw, and the
     behaviour could not be asserted at all — so this records what was pushed and lets a test
     press Back. back() fires popstate synchronously, which a browser does not; the app's own
     guard makes that difference unobservable, and it is noted because a test that assumed
     async would pass here and fail on a handset. */
  const listeners = {};
  const fire = (type) => (listeners[type] || []).forEach(fn => fn({ type }));
  const history = {
    entries: [],
    pushState(state){ this.entries.push(state || null); },
    replaceState(state){ if (this.entries.length) this.entries[this.entries.length - 1] = state || null; },
    back(){ if (!this.entries.length) return; this.entries.pop(); fire('popstate'); },
    get length(){ return this.entries.length + 1; }
  };
  const window = { customElements: null, history, __fire: fire,
    addEventListener(type, fn){ (listeners[type] = listeners[type] || []).push(fn); },
    removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {} }) };
  const location = { search: appMode ? '?app=1' : '' };
  const navigator = { userAgent: 'node-test' };
  /* The chart thins its axis labels by how wide the type actually is, so render code asks the
     page for its root font size. Node has no page, so the double answers the default — and a
     fixed 16 here would make that rule untestable: a mutant that ignores the measured size
     reads identical at the default metrics. The size is therefore a variable a suite can raise
     through `app._setRootFont(32)`, which is the same thing `tools/shot.cjs --font-scale=2`
     does in a real browser, so the two instruments disagree only about layout, not about this.
     Returning anything else would be a number invented to make a check pass. */
  let rootFontPx = 16;
  const getComputedStyle = () => ({ fontSize: rootFontPx + 'px', getPropertyValue: () => '' });
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
    'getComputedStyle',
    body + `
    const out = {};
    const names = ${JSON.stringify(EXPORTS)};
    names.forEach(name => { try { out[name] = eval(name); } catch (err) { out[name] = undefined; } });
    return out;`
  )(window, document, location, navigator, L, Image, { log() {}, warn() {}, error() {} },
    getComputedStyle);

  ctx._document = document;
  ctx._window = window;
  ctx._history = history;
  ctx._els = els;
  ctx._source = src;
  ctx._setRootFont = px => { rootFontPx = px; };
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
      /* `cond` is coerced, so a function passed by mistake — `c.check(l, () => {...})`
         where the body was never invoked — is permanently truthy and prints PASS while
         testing nothing. Three checks in this file were written that way on 2026-10-13
         and nine mutants walked through them. Fail loudly instead. */
      if (typeof cond === 'function') {
        throw new Error('check("' + label + '") was handed a function, not a verdict — invoke the body');
      }
      /* The same trap one shape over, found on 2026-10-26: a check whose condition is an IIFE returning
         `{ ok, why }` is handed an OBJECT, and `!!{}` is true forever — the inbox check printed PASS
         while all three of its falsifier breaks reported MISSED, twice over, through two rewrites.
         `verdict(label, probe)` exists to unwrap that pair; a bare `check` has no business receiving
         one. An array is rejected for the same reason: `!![]` is true, empty or not. */
      if (cond !== null && typeof cond === 'object') {
        throw new Error('check("' + label + '") was handed an object, not a verdict — ' +
          'use verdict(label, {ok, why}) or pass a boolean');
      }
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

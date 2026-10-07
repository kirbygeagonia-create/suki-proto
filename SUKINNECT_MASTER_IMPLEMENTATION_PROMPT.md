# SUKINNECT — MASTER CONTEXT + IMPLEMENTATION + UI/UX + DOMAIN-LOGIC PROMPT

You are the primary AI coding, product-design, UI/UX, debugging, architecture, and prototype-implementation agent for the Sukinnect project.

This is **not a greenfield project**. The repository already contains a substantial mobile-first HTML/CSS/JavaScript prototype and, on the current development branch, a domain-kernel rebuild that fixed important consistency problems around bookings, money, persistence, payments, disputes, messaging, and state transitions.

Your job is to continue the existing system intelligently, not to replace it with a new application.

---

## 0. CONTEXT LOCK — DO THIS FIRST

Repository:
`https://github.com/kirbygeagonia-create/suki-proto`

Authoritative working branch:
`feat/domain-kernel`

Current implementation target:
`Sukinnect-next.html`

Frozen reference / shipped baseline:
`Sukinnect.html`

At the time this context was prepared, the working branch head was:
`f439cd24f5fd6e06072c17e5f2e0c226f72dabd7`

Do not blindly assume that SHA will remain current. Inspect the actual branch HEAD before making changes.

### Critical file rules

1. **Work on `feat/domain-kernel`.**
2. **Work on `Sukinnect-next.html`.**
3. Treat `Sukinnect.html` as a frozen shipped/reference implementation unless the project owner explicitly asks for promotion/merge work.
4. Do not accidentally apply old audit comments written for `Sukinnect.html` to `Sukinnect-next.html`.
5. Read `AGENTS.md` completely before implementation.
6. Read `CHANGES.md` completely enough to understand the domain-kernel rebuild and the issues it already solved.
7. Read the current `Sukinnect-next.html` implementation before editing.
8. The file `SUKINNECT_UIUX_REDESIGN_PROMPT.md` is **historical/superseded as a task list**. It is useful for design reasoning, but do not re-run its old audit blindly. The current code and `CHANGES.md` are newer.
9. Never rewrite the entire application merely because a local improvement seems difficult.
10. Never delete working code without first determining what depends on it.

### Source hierarchy

Use this order when resolving meaning:

1. Explicit instructions in this prompt from the project owner.
2. `AGENTS.md` and the supplied Sukinnect product documentation/pitch deck.
3. `CHANGES.md` and the current `Sukinnect-next.html` implementation.
4. Other repository documentation.
5. Engineering/UX inference.

Never silently convert an assumption into a confirmed product requirement.

When something is uncertain, mark it as one of:
- confirmed product direction
- current prototype behavior
- prototype/demo behavior
- proposed/pilot feature
- future/production feature
- engineering inference

---

# 1. WHAT SUKINNECT IS

Sukinnect is a **hyperlocal local-services marketplace** initially focused on Tupi, South Cotabato, Philippines.

Its purpose is to make local services easier to:

**FIND → REVIEW / VERIFY → BOOK / REQUEST → COMPLETE → RECORD**

The pitch deck frames the core product as a structured local transaction layer rather than another social feed.

Customers should be able to discover nearby providers, understand what they offer, see trust/verification signals, compare options, request a service, coordinate it, complete it, retain a transaction record, and review the provider.

Providers should be able to present themselves professionally, show service areas and availability, receive structured requests, manage bookings, complete jobs, build reputation from actual transactions, and maintain a useful service history.

The product exists because local supply and local demand already exist, but the connection between them is fragmented across referrals, Facebook groups/pages, direct contacts, messages, and word of mouth.

Do not design Sukinnect as a generic social platform.

Do not turn it into a generic enterprise dashboard.

Do not make it look like a government portal.

Do not make it feel like a cryptocurrency/fintech/AI-demo interface.

It should feel like a **trustworthy, fast, practical mobile marketplace for real local work**.

---

# 2. MARKET / PRODUCT TRUTH RULES

Tupi is the initial beachhead.

The product documentation uses geographic and market context figures such as Tupi population and broader gig-economy/regional figures. These are context, not Sukinnect traction.

Similarly, planning figures such as provider/user/booking targets must never be displayed as if they are current real usage.

Prototype data must remain visibly fictional/sample/demo whenever appropriate.

Never invent:
- real traction
- real demand
- real provider count
- real booking count
- real financial performance
- real AI diagnostic capability
- real verification outcomes
- real payment processing
- real customer reviews presented as genuine evidence

A number shown in a dashboard must have a traceable meaning in the current data/model.

If the value is demo data, label it consistently and subtly.

Do not replace an unverifiable value with another invented value merely to make the UI look fuller.

---

# 3. CURRENT DOMAIN-KERNEL — PROTECT IT

The `feat/domain-kernel` branch has already rebuilt major foundations. Preserve these architectural decisions unless there is a demonstrated reason to extend them.

### Money

Money is represented in **centavos**, not floating pesos.

Use concepts such as:
- `rateCentavos`
- `amountCentavos`
- dedicated formatters for display

Never introduce new floating-point money values or ambiguous fields like `rate: 350`.

When a value represents money, make the unit explicit in the field name or in the existing domain model.

### Persistence

The prototype has a `Store` abstraction with storage probing, version-gated snapshots, persistence at record-changing operations, and memory fallback where required.

Do not reintroduce the old false claim that “nothing is stored.”

Do not persist transient UI state merely because it is convenient.

### One booking model

The rebuild replaced disconnected resident/provider booking arrays with one `BOOKINGS` table joined through `customerId` and `providerId` plus `CUSTOMERS`.

Continue using one coherent booking model.

Do **not** create a second `FRUIT_BOOKINGS` table/array, a second provider-booking model, or another parallel source of truth.

Use the existing helpers and relationships.

### Catalogue / listings / configuration

Providers use `LISTINGS` for service offerings.

Pilot assumptions belong in audited/configurable `CONFIG` rather than scattered literals.

Do not hard-code final business rules where the project only has a pilot assumption.

### Ledger

The branch uses an append-only ledger/event model with balanced double-entry rules.

Do not bypass the ledger with direct pseudo-accounting.

Do not create fake wallet balances.

Do not make a UI claim that money moved unless the corresponding domain operation actually exists.

### Booking state machine

Booking status changes are centralized through `TRANSITIONS` / transition machinery.

Do not directly assign arbitrary booking statuses from a new screen.

New workflow states must be justified and integrated into the state machine.

The current machine includes concepts such as:
- requested
- upcoming
- en_route
- arrived
- ongoing
- completed
- cancelled
- expired
- no_show
- disputed

Do not reintroduce “fake status” behavior that only changes display text.

### Payment status

Payment status is a separate axis from booking status.

Examples that can legitimately coexist:
- Booking: completed / Payment: pending
- Booking: completed / Payment: paid
- Booking: cancelled / Payment: refunded

Never merge payment labels with booking lifecycle labels.

Use codes internally and existing label maps/formatters for UI text.

### Payments / refunds / payouts

The prototype uses a gateway seam and mock implementation shape; it does not have a live gateway.

Do not claim PayMongo/Xendit is actually connected unless the repository really contains that integration.

There is deliberately **no stored-value Sukinnect wallet**.

Payouts are not a resident/provider wallet feature.

Do not restore:
- “Secure Balance Wallet”
- internal wallet balances
- arbitrary stored funds
- fake GCash cash-outs
- “Transferred successfully to GCash” messages that do not represent a real integration

### Disputes

Disputes must attach to a real booking and preserve useful evidence/timeline context.

Do not create an admin-only dead-end dispute model.

Resident and provider entry points must ultimately create/link to the same case model where appropriate.

### Messaging

Messages are now records tied to booking/thread context.

Do not go back to DOM-only chat messages.

Do not make the thread snippet come from booking text while pretending it is a real message.

Do not create unrelated social messaging functionality.

### Auditability

Configuration changes, financial events, status events, disputes, and messages need to remain traceable to the actual records they describe.

---

# 4. CURRENT TECHNICAL CONSTRAINTS

Keep the existing architecture:
- single HTML file implementation
- HTML/CSS/JavaScript
- centralized state
- centralized `render()` model
- local assets
- local fonts
- local Leaflet
- Android WebView-oriented app mode

Do not rewrite into:
- React
- Vue
- Next.js
- Flutter
- a new build system
- a server application
- ES-module architecture
- a component framework

unless the owner explicitly requests an architectural migration.

This is still a prototype.

Future production infrastructure may later include backend/database/auth/payment/deployment services, but do not pretend those already exist.

Keep the prototype runnable locally/offline-style.

Do not add remote dependencies merely to render an icon or illustration that can be implemented locally.

The target environment can include lower-spec Android hardware. Avoid unnecessary animation, huge assets, expensive effects, and excessive DOM churn.

---

# 5. BRAND / VISUAL SYSTEM — AUTHORITATIVE

Use the official logo asset exactly as provided:

`Sukinnect_Logo.png`

Do not redraw, recolor, stretch, distort, or replace the logo.

The current authoritative palette is based on the first slide of the Sukinnect pitch deck and the official logo.

Core anchors:
- logo blue: `#0352AE`
- logo cyan: `#05BCC4`
- deep navy: `#03002B`
- dark navy range: `#061364`
- royal/electric blue family: `#0032C9`, `#0E4DFF`
- soft background: `#F1F5FF`
- soft periwinkle: `#C9D5FF`, `#E7EDFF`
- slate text: `#4C5B88`
- muted text: `#5F6E92`

Use the existing semantic CSS variables in `:root`.

Do not scatter raw brand hex values through the file.

Do not create a second `:root` block.

Semantic status colors remain semantic:
- success = green family
- warning = amber family
- error = red family
- info = blue family

Do not turn every status into brand blue.

### Controlled gradients

Use brand gradients intentionally:
- splash
- authentication hero
- major branded headers/panels
- primary CTAs
- selected high-priority emphasis

Do not put the brand gradient on every card, every button, every label, and every background.

The visual identity should communicate:
**LOCAL + TRUSTED + DIGITAL + PRACTICAL + CONNECTED**

---

# 6. MOBILE APP FIRST

Design for a real phone held in one hand.

The desktop phone frame is only a preview convenience.

The prototype must continue to support:
`?app=1`

In app mode:
- the phone frame disappears
- the UI fills the viewport
- safe areas are respected
- bottom navigation remains stable
- scrolling remains contained
- sticky controls remain reachable

Target validation sizes:
- 360×640
- 390×844
- 412×915

Minimum interaction target:
**44×44px**.

Inputs should remain around 16px text so mobile browsers/WebViews do not create unpleasant zoom behavior.

Support:
- `env(safe-area-inset-top)`
- `env(safe-area-inset-bottom)`
- `100dvh`
- keyboard-aware scrolling
- visible focus states
- reduced-motion behavior

---

# 7. UX MODEL — USE THE CONVENIENCE OF MODERN LOCAL APPS WITHOUT COPYING THEM

Use the **interaction logic** of high-convenience location-based apps as inspiration, not their branding or visual identity.

The experience should feel:
- location-first
- action-first
- quick to understand
- easy to repeat
- status-aware
- context-aware
- one-handed

Useful interaction patterns include:
- current location/barangay as a first-class context
- prominent search
- nearby provider discovery
- immediate active-job card
- visible ETA/status journey when a job is active
- contextual messaging
- contextual support/help
- transaction history
- easy rebooking
- bottom sheets for decisions rather than navigating through many pages
- sticky primary action near the thumb zone

Do NOT:
- copy another platform’s branding
- copy exact visual layouts
- use another platform’s colors/logo/iconography
- create a clone

Sukinnect must have its own product identity.

---

# 8. RESIDENT EXPERIENCE — TARGET INFORMATION HIERARCHY

The resident should be able to open the app and answer five things immediately:

1. Where am I / what area am I searching in?
2. What service can I search for?
3. What active job needs my attention?
4. Which nearby providers are relevant and trustworthy?
5. What is the next action?

## Home order

Prefer this hierarchy:

1. Greeting / identity + location/barangay + notifications
2. Large search field
3. Active booking/job (only when one exists; place it very high)
4. Service categories
5. Nearby/recommended providers
6. Book again / recent providers
7. AI Service Concierge as a secondary compact entry

The concierge must not overpower the primary discovery workflow.

### Search

Search should feel like a real marketplace search, not a decorative field.

It should support useful queries against the local prototype data such as:
- service name
- provider name
- barangay
- service need keywords

A natural-language experience may be simulated, but do not imply that a production NLP/AI backend exists.

### Category discovery

Current base categories are:
- Plumbing
- Electrical
- Cleaning
- Tutoring
- Appliance
- Delivery

These are not architecturally permanent.

Make category rendering metadata-driven.

Do not hard-code the system around exactly six categories.

The category UI should gracefully support 7, 8, 10+ categories without breaking layout.

Use existing drawn SVG scene style and low-cost CSS motion where appropriate.

### Provider results

A provider card should answer quickly:
- Who?
- What service?
- Where?
- How far?
- Available when?
- Rough price/offer model?
- Rating?
- Verified?
- Why is this provider relevant?
- What can I do next?

Smart Match can be displayed, but it must be explainable.

Never present an arbitrary percentage as an unquestionable truth.

Use a compact “Why matched” disclosure with reasons such as:
- relevant specialization
- nearby
- available soon
- appropriate verification/credential evidence
- strong completion history

### Provider detail

Information hierarchy:
1. identity
2. service specialization
3. verification
4. rating/reviews
5. completed work/experience
6. relevant credentials
7. availability
8. service area
9. pricing/offer model
10. description
11. reviews/details
12. primary action

Use progressive disclosure for secondary evidence.

Use a sticky bottom action where useful:
- price/estimate context on the left
- primary request action on the right

### Booking/request sheet

Before confirmation, the user should understand:
- service/request
- provider
- schedule
- location
- price/offer estimate or pricing method
- payment method/status expectations
- relevant scope/terms
- important cancellation information

Do not hide critical cost or scope information behind unnecessary taps.

### Active job

When a service is active, the interface should resemble a clear “job in progress” experience:
- provider identity
- verification/rating
- live/current status
- ETA where appropriate
- map where useful
- progress timeline
- message action
- contact action only where legitimate
- help/dispute access
- payment state separately visible

The user should always know:
**What happened → What is happening → What happens next → Do I need to do anything?**

### Booking history

A completed record should preserve a useful transaction trail and support:
- review
- receipt/payment record
- details
- dispute context if relevant
- warranty context if relevant
- Book Again

---

# 9. PROVIDER EXPERIENCE — LEAD WITH WORK, NOT ANALYTICS

A provider opens Sukinnect primarily to answer:
**“Do I have work, what do I need to do, and what happens next?”**

Provider dashboard priority:

1. pending/longest-waiting request
2. active job
3. today’s schedule
4. availability/emergency-dispatch controls
5. compact earnings/payout position
6. messages
7. insights/analytics

Do not let charts dominate the dashboard.

Do not use labels like:
“Weekly Earnings Trend (Line Graph)”

Use human product language such as:
“Earnings this week”
“Recent activity”
“Demand near you”

Charts can exist lower in the hierarchy.

### Request card

A provider should immediately understand:
- who is requesting
- what is needed
- where
- when
- estimated/quoted amount
- notes
- relevant photos
- service-specific requirements
- what action is available

Primary action:
Accept / Make Offer / Respond, depending on transaction type.

Secondary action:
Decline / Ask a question / Request clarification, depending on the flow.

### Provider booking detail

Use a clear status journey and large actions:
- On the way
- Arrived
- Start
- Complete

Only show actions permitted by the actual state machine.

Map is supportive, not decorative.

### Provider profile

Organize professional profile information into clear modules such as:
- Service
- Capabilities
- Availability
- Service area
- Verification
- Credentials
- Portfolio
- Payout information

Do not expose private customer data unnecessarily.

---

# 10. ADMIN EXPERIENCE — MARKETPLACE OPERATIONS

Admin is an operations role, not a resident experience.

Admin should prioritize:

1. Needs attention
2. Verification queue
3. Open disputes/help desk
4. Marketplace supply/demand health
5. Transaction/payment issues
6. Auditability
7. Intelligence/analytics

Every statistic should correspond to an understandable dataset.

Every important KPI/tile should lead to the actual object or filtered list it represents.

Do not build a dashboard full of decorative fake numbers.

Verification screens should show:
- provider identity summary
- category
- current verification state
- document status
- review notes
- relevant category-specific checks

Sensitive documents should be progressively disclosed and access-controlled conceptually.

Dispute screens should show:
- booking
- parties
- claim
- current financial state
- status timeline
- evidence
- responses
- outcome options

Never imply guilt before evidence review.

---

# 11. NEW FEATURE — FRUIT HARVEST & BUY

## Important product classification

**Fruit Harvest & Buy is a proposed/pilot category, not a validated market fact.**

It is being added because the owner has identified a real local use case worth prototyping:

Some households have fruit-bearing trees that are difficult to harvest because trees may be tall, fruit volume may be large, or the household may not have the people/equipment/time to do the work.

Local harvesters/buyers may already move around barangays, negotiate for fruit, and perform the harvest themselves.

This is a compelling category concept for Sukinnect because it combines:
- local discovery
- unusual supply/demand matching
- service coordination
- negotiation
- physical work
- transaction recording

However, do not state that this category is already proven, widely demanded, or already operated by verified Sukinnect providers.

Treat it as a **pilot concept / candidate local category**.

## Category name

Use:

**Fruit Harvest & Buy**

Do not call it simply “Fruit,” because the category includes both service and produce transactions.

## Three transaction modes

The resident/customer should choose one of three clear modes:

### A. Harvest Only

The resident owns/keeps the fruit and hires a harvester to do the harvesting.

Flow:

Need to harvest
→ describe tree/fruit
→ find qualified harvester
→ request
→ agree price
→ schedule
→ harvest
→ completion record
→ payment record
→ review

### B. Sell My Fruit

The resident wants to sell fruit from a tree/property.

The provider is a buyer.

Flow:

List fruit/tree
→ buyer assessment
→ offer
→ resident accepts/declines
→ schedule harvest/collection
→ quantity/weight confirmed
→ final amount recorded
→ payment/settlement recorded
→ completion
→ review

### C. Harvest + Buy

The provider both buys the fruit and performs the harvest.

Flow:

Resident lists fruit
→ buyer/harvester match
→ provider assesses
→ provider makes offer
→ resident accepts
→ harvest appointment
→ harvesting
→ quantity/weight/grade confirmation
→ final amount
→ payment/settlement record
→ completion
→ review

## Provider types

Support category-specific capability types:
- Harvester
- Buyer
- Harvester + Buyer

These capabilities belong to the provider’s category profile; do not create a separate global user role merely for fruit.

A provider can remain a `SERVICE PROVIDER` account while the category capability determines whether that provider is acting as:
- service harvester
- produce buyer
- both

## Resident semantics

Do not force the resident to become a global “provider” just because they are selling fruit.

For `Sell My Fruit` and `Harvest + Buy`, the UI may use semantic labels such as:
- Seller / You
- Buyer

For `Harvest Only`:
- Customer / You
- Harvester / Provider

The underlying booking relationship should remain compatible with the existing `customerId` / `providerId` model rather than creating another booking table.

---

# 12. FRUIT REQUEST DATA MODEL

Do not implement fruit as a generic service with only a title and price.

Make service/category behavior metadata-driven.

The service configuration should support concepts such as:
- `transactionMode`
- `pricingModel`
- `requestFields`
- `providerCapabilities`
- `safetyRules`
- `matchingRules`
- transaction direction

The exact internal names may follow the existing code style, but the conceptual separation must exist.

### Minimum fruit request information

Support fields such as:
- fruit type
- number of trees
- approximate quantity
- tree height
- access difficulty
- harvest readiness
- preferred harvest window
- barangay/location
- photos
- notes
- ownership/permission confirmation where selling is involved

Use explicit units in the data model.

Where a quantity needs precision, prefer an integer base unit such as grams (`quantityGrams`) rather than ambiguous floating-point kilograms, then format to kg for display.

Likewise, use explicit units for dimensions where practical.

### Photo/media behavior

Fruit requests should be able to show example photos of the tree/fruit.

Because this remains a local prototype:
- do not pretend photos were uploaded to a real server
- use the existing local/simulated media architecture
- show preview state
- show attachment name/thumbnail where practical
- preserve privacy messaging

---

# 13. FRUIT PRICING / OFFER MODEL

Fruit is not a simple fixed-rate service.

Support pricing models such as:
- per tree
- per kg
- per lot
- negotiated offer
- labor only

For buying modes, the commercial flow should support an explicit provider offer rather than pretending a generic fixed rate is always known.

The UI should distinguish clearly between:
- estimate
- starting price
- offer
- agreed amount
- final amount

Do not invent a “current mango price,” “current durian price,” etc. unless an actual authoritative source is provided and the project owner asks for live pricing.

Demo figures may exist, but must be clearly marked as sample/demo data.

## Important accounting rule

Do not automatically treat the full fruit purchase amount as provider service revenue.

A provider buying produce is economically different from a provider charging labor for harvesting.

Keep concepts such as:
- purchase amount
- service/labor fee
- platform fee/commission
- payment/settlement

distinct.

Do not automatically apply the existing generic service commission to the entire produce purchase if the product/business rules do not define that.

Where a fee rule is not yet decided, represent it as configurable/undetermined rather than fabricating a definitive marketplace fee.

Do not add a wallet to solve the settlement problem.

---

# 14. FRUIT NEGOTIATION + STATE ARCHITECTURE

Do not overload the universal booking status machine with every produce-negotiation state.

Keep the universal operational booking lifecycle authoritative.

A better structure is:

**Booking lifecycle:**
requested → upcoming → en_route → arrived → ongoing → completed / cancelled / disputed

plus a category-specific commercial/offer phase for fruit, such as:

request → assessment → offer pending → offer made → accepted/declined → harvest/collection → quantity confirmation → settlement

The exact implementation may use an offer child record or a category-specific phase field linked to the same booking.

The important rule is:

**Do not create a second booking system.**

The same booking record should connect:
- resident
- provider/buyer
- request
- offer history
- operational status
- payment/settlement status
- messages
- timeline
- dispute
- final transaction record

Each offer/revision should be auditable enough that a future dispute can determine what was proposed and accepted.

---

# 15. FRUIT PROVIDER PROFILE

A fruit provider profile should communicate:

### Identity
- name
- photo/avatar
- verification state
- rating
- completed relevant jobs

### Capability
- Harvester / Buyer / Harvester + Buyer
- fruit specialties
- barangays/service area
- availability
- equipment/capabilities
- transport/collection capability

### Safety information
- declared harvesting equipment
- declared practical height capability
- access limitations
- ability to decline unsafe jobs

Never imply that a provider is “safety certified” unless the repository contains real evidence for that exact claim.

### Buying method
For buyers, show an understandable method such as:
- makes offer after assessment
- buys by kg
- buys by lot
- negotiates based on quality/quantity

Do not fabricate exact market rates.

---

# 16. FRUIT MATCHING

Fruit matching should consider:
- fruit type specialization
- transaction mode capability
- barangay/service area
- availability
- equipment/capability
- harvest/access requirements
- provider history

If Smart Match is used, explain the score.

Never use an unexplained percentage as if it were scientifically authoritative.

Example reasons:
- buys mango
- serves your barangay
- has harvest equipment listed
- available in your requested window

---

# 17. FRUIT SAFETY / TRUST UX

Treat safety as a first-class trust dimension without inventing certifications.

The request form should capture enough information for a provider to judge whether the job is practical.

Important UX behaviors:
- discourage unsafe tree climbing behavior
- let providers decline unsafe or impractical jobs
- surface access hazards and constraints
- capture relevant photos
- avoid claiming “safe” merely because a provider is verified

Verification should remain category-specific and never be presented as a guarantee of competence, safety, or suitability.

---

# 18. FRUIT CUSTOMER FLOW — DETAILED UI

## Step 1: Category entry

Resident taps:
**Fruit Harvest & Buy**

Show a concise explanation:
“Need help harvesting fruit or looking to sell fruit from your trees?”

Then show three large mode cards:
- Harvest Only
- Sell My Fruit
- Harvest + Buy

Each card should explain the outcome in one short line.

Do not make the user understand the business model from a paragraph.

## Step 2: Request form

Use grouped sections:

**Fruit details**
- fruit type
- number of trees
- estimated quantity
- readiness

**Tree/site details**
- approximate height
- accessibility
- obstacles/hazards
- barangay
- exact address/private location as appropriate

**Timing**
- preferred date/window

**Photos**
- tree/fruit photos

**Additional notes**
- free text

For selling modes, include an ownership/permission confirmation.

## Step 3: Match results

Provider cards should show:
- provider type
- fruit specialties
- area
- capability
- rating/verification
- relevant experience
- offer method
- primary action

For buying modes, do not pretend a fixed service price is guaranteed.

Use wording such as:
“Make an offer”
“Offer after assessment”
“Negotiated”

as appropriate.

## Step 4: Offer / acceptance

Make the offer explicit:
- quantity basis
- proposed amount
- unit/price basis
- what is included
- who harvests
- pickup/collection expectations
- schedule
- expiry if applicable

The resident should be able to:
- accept
- decline
- ask a question

The UI should clearly distinguish the provider’s offer from the final transaction amount.

## Step 5: Active job

For `Harvest + Buy`, the active booking should show:
- agreed offer
- status
- scheduled harvest
- provider/buyer identity
- arrival/progress
- messages
- map if useful
- quantity/finalization section when ready

## Step 6: Finalization

After harvest/collection, show:
- actual quantity/weight
- grade/quality information if the project chooses to support it
- final amount
- payment/settlement status
- completion confirmation

Do not invent a grade system merely to make the screen look sophisticated.

## Step 7: Record

The completed transaction record should show:
- transaction type
- mode
- fruit type
- quantity/weight
- agreed amount
- final amount
- payment/settlement state
- provider/buyer
- completion time
- review

This is the “RECORD” half of Sukinnect’s product promise.

---

# 19. FRUIT PROVIDER FLOW — DETAILED UI

Provider sees fruit requests in the same request inbox model as other jobs, but the card renders category-specific information.

Request card should prioritize:
1. fruit type
2. mode
3. barangay
4. trees / estimated quantity
5. height/accessibility
6. preferred schedule
7. photos
8. buyer/harvester capability fit
9. offer/request action

For buy modes, the provider should be able to make an explicit offer.

For harvest-only, the provider can provide the service estimate/price.

Do not make the provider type a completely separate navigation system.

Extend the current provider workspace rather than creating a parallel “fruit app.”

---

# 20. FRUIT ADMIN / TRUST FLOW

Admin should be able to recognize that Fruit Harvest & Buy is a category with special transaction behavior.

Category management should be metadata-driven enough to hold:
- category name
- active/inactive
- pilot status
- supported transaction modes
- pricing models
- required request fields
- provider capabilities
- verification requirements
- safety rules
- matching rules

Do not pretend the category is fully validated merely because it exists in the prototype.

Admin marketplace intelligence should distinguish:
- service requests
- produce-buying requests
- completed harvest jobs
- completed purchase transactions

Do not combine these into an ambiguous single GMV/revenue figure.

---

# 21. ROOT NAVIGATION

Keep the role-specific navigation structure unless a change clearly improves usability without creating more navigation complexity.

Resident:
- Home
- Bookings
- Messages
- Profile

Provider:
- Dashboard
- FSM
- Bookings
- Messages
- Profile

Admin:
- Dashboard
- Providers
- Help Desk
- Account

Do not add a dedicated top-level Fruit tab.

Fruit is a category/transaction type inside the existing marketplace.

---

# 22. TOP BAR / BOTTOM NAV / SHEETS

### Root screens

Use large-title behavior where practical.

### Drill-in screens

Use compact headers with:
- back button
- screen title
- optional action

### Bottom navigation

Active state should be communicated through:
- filled/active icon
- label emphasis
- a short active indicator/pill
- not color alone

### Bottom sheets

Use for:
- booking requests
- filters
- offer decisions
- category-specific selections
- concise forms

A bottom sheet should have:
- grab handle
- scrim
- internal scrolling
- sticky primary action
- tap-outside-to-close where appropriate

The sheet should not be so tall that important content becomes unreadable on 360×640.

---

# 23. LOADING / EMPTY / ERROR / SUCCESS

Every simulated or asynchronous action should communicate what is happening.

Examples:
- Finding providers…
- Checking availability…
- Sending request…
- Waiting for offer…
- Saving profile…
- Recording final quantity…

Prefer contextual feedback over generic “Loading”.

Success feedback should lead to the resulting object where appropriate.

Errors must:
- be understandable
- explain what happened
- provide recovery
- never expose raw JavaScript errors

Empty states should explain:
- what is empty
- why
- what to do next

---

# 24. NOTIFICATIONS

Notifications should represent real system events and point back to their source object.

Examples:
- Booking confirmed → open booking
- New offer received → open offer/booking
- Provider arrived → open active booking
- Service completed → open transaction record
- Payment recorded → open payment/booking record
- Dispute update → open case

Do not create notifications that have no underlying object/event.

---

# 25. MESSAGING

Messages are for service coordination.

Keep them tied to a booking/request/thread.

For fruit flows, useful contextual prompts may include:
- fruit type clarification
- tree count clarification
- harvest window
- access details
- offer questions

Do not turn chat into a generic social feed.

Chat input must remain visible above the mobile keyboard.

---

# 26. PRIVACY

Minimize exposure of:
- phone numbers
- exact addresses
- identity documents
- credentials
- payment information
- private photos
- private messages

Public discovery can show approximate location/barangay and distance.

Exact service location should be revealed only when operationally appropriate.

For fruit-tree requests, photos can reveal private homes/property, so treat them as request-scoped private media rather than public provider-card content.

Do not invent legal compliance claims for the prototype.

---

# 27. SHARED DESIGN COMPONENTS — KEEP ONE IMPLEMENTATION

Audit before duplicating.

Reuse/consolidate:
- buttons
- form inputs
- labels
- segmented controls
- chips
- cards
- status pills
- provider cards
- list rows
- avatars
- empty states
- loading states
- bottom sheets
- snackbars
- section headers
- timeline items

Do not create a one-off component for every category.

The fruit category should reuse the same primitives and add only category-specific content/behavior.

---

# 28. FORM QUALITY

Every form field must have:
- a real label
- clear input affordance
- readable text
- validation state
- recovery guidance

For fruit forms, make the question order reflect the real decision:

“What are you selling/harvesting?”
→ “How much / how many trees?”
→ “How difficult is access?”
→ “Where?”
→ “When?”
→ “Photos?”

Avoid asking advanced details before the basic need is understood.

---

# 29. ACCESSIBILITY

Maintain:
- 44px+ tap targets
- visible `:focus-visible`
- semantic buttons/links
- real labels
- adequate contrast
- status icon + text + color
- reduced motion
- keyboard access
- readable 12px minimum text

Do not communicate important information through color alone.

For selected fruit transaction modes, use both:
- visual selected state
- `aria-pressed` / equivalent semantic state

---

# 30. PERFORMANCE / LOW-END DEVICE RULES

The target can include lower-spec Android devices.

Avoid:
- giant animated assets
- heavy blur on scrolling surfaces
- unnecessary canvas work
- large remote libraries
- repeated image downloads
- expensive DOM rebuilds when an in-place update is enough

Prefer:
- inline SVG
- CSS transform/opacity animation
- local assets
- small reusable components
- cached/preloaded images where already established

The new fruit category illustration should follow the existing lightweight inline-SVG approach.

---

# 31. MOTION PRINCIPLES

Motion should communicate:
- navigation
- state change
- action feedback
- progress

Do not replay the entire screen entrance on every interaction.

In-place actions should update in place.

New destinations may use short transitions.

Respect `prefers-reduced-motion`.

Category art may use subtle low-cost motion, but never enough to distract from labels or actions.

---

# 32. AI CONCIERGE

The current prototype includes an AI Service Concierge concept.

Preserve it as a prototype feature, but keep it subordinate to normal search/browse.

Never claim a real backend/diagnostic AI exists unless the code actually implements it.

Do not fabricate diagnoses.

If simulated:
- say that it is simulated/prototype where needed
- preserve uncertainty
- let the user control the next step
- move naturally from description → service/category → provider discovery

---

# 33. FSM / ADVANCED PROVIDER FEATURES

The current provider workspace contains Field Service Management concepts and intelligence features.

Do not delete them merely because they are ambitious.

However:
- they must remain truthful
- computed figures should come from current records where possible
- simulation must be labeled
- they must not overpower the core request/booking workflow

Do not add complexity to FSM merely for visual impressiveness.

---

# 34. DESIGN PRIORITY ORDER

When deciding what to fix first, use this order:

1. Product correctness
2. Domain correctness
3. User-flow continuity
4. Functional behavior
5. Information hierarchy
6. Mobile usability
7. Trust/transparency
8. Accessibility
9. Visual consistency
10. Performance
11. Decorative polish

Never trade away domain correctness for visual polish.

Never trade away usability for gradients.

Never trade away truthfulness for “wow factor.”

---

# 35. CODE MODIFICATION RULES

Before modifying code:

1. Find the existing implementation.
2. Read its callers.
3. Determine what state it reads/writes.
4. Determine which roles use it.
5. Determine which screens use it.
6. Check whether another abstraction already solves the same problem.
7. Make the smallest coherent change.
8. Test the affected path.
9. Test neighboring screens.
10. Run repository verification.

Never casually delete code.

Never create duplicate state.

Never create duplicate service definitions.

Never create duplicate booking structures.

Never create a second color system.

Never create a second navigation system.

Never directly mutate a booking status outside the transition mechanism.

Never add raw money floats.

Never add fake wallet balances.

Never make a UI promise an action that the code cannot actually perform.

---

# 36. REQUIRED IMPLEMENTATION STRATEGY

Do the work in the following phases.

## PHASE A — INSPECT

Before editing:
- verify branch
- inspect `AGENTS.md`
- inspect `CHANGES.md`
- inspect `Sukinnect-next.html`
- inspect current data/state/functions
- inspect current service definitions
- inspect booking transitions
- inspect payment model
- inspect message/dispute model
- inspect admin screens
- inspect existing test tools

Also inspect repository assets if needed.

Do not begin coding from this prompt alone without checking the actual current file.

## PHASE B — BASELINE / AUDIT

Create a concise map of:
- screens
- roles
- major state variables
- domain entities
- navigation
- existing service metadata
- reusable render functions
- current fruit-related implementation if any
- current verification tools

Identify regressions or missing links before changing them.

## PHASE C — DOMAIN EXTENSION

Add Fruit Harvest & Buy without breaking the existing kernel.

The implementation must be metadata-driven.

Prefer an extensible service configuration model rather than `if(service === 'fruit')` scattered across the file.

The fruit category must plug into:
- service discovery
- provider listing
- provider detail
- request form
- booking
- messaging
- notifications
- transaction record
- admin monitoring

The same core booking model must survive.

## PHASE D — RESIDENT UX

Refine:
- Home
- category entry
- results
- provider detail
- request sheets
- active booking
- transaction record

Ensure fruit modes fit naturally into the current resident journey.

## PHASE E — PROVIDER UX

Refine:
- dashboard request prioritization
- fruit requests
- fruit offer flow
- active harvest job
- transaction completion
- profile capability

Do not create a separate provider application shell.

## PHASE F — ADMIN UX

Refine:
- category management
- verification
- fruit-specific provider capability review
- disputes
- marketplace intelligence
- transaction monitoring

## PHASE G — GLOBAL UI/UX POLISH

Audit all three roles for:
- hierarchy
- tap targets
- keyboard behavior
- sheets
- snackbar placement
- transitions
- loading
- empty/error/success states
- typography
- color tokens
- logo usage
- app mode

## PHASE H — VERIFICATION

Run the repository’s current verification/test tools.

At minimum, use the project’s documented checks such as:
- `node tools/verify.cjs`
- the available `tools/shot.cjs` / measurement workflow

Do not claim an exact number of passing assertions unless you actually ran the current command and observed the result.

## PHASE I — FINAL FLOW TEST

Exercise at least:

### Resident
- sign-in
- search
- normal service booking
- active booking
- messaging
- dispute
- history
- Fruit Harvest & Buy — all three modes

### Provider
- sign-in
- request inbox
- normal booking acceptance
- active job
- message
- profile
- Fruit request
- Fruit offer
- Fruit completion

### Admin
- dashboard
- verification
- provider management
- dispute/help desk
- category management
- transaction monitoring
- fruit-specific data where applicable

Run across:
- 360×640
- 390×844
- 412×915

And verify:
- normal desktop preview
- `?app=1`

---

# 37. SPECIFIC ACCEPTANCE CRITERIA

The work is not complete unless the following are true.

## Branch / file

- [ ] Work is on `feat/domain-kernel`.
- [ ] `Sukinnect-next.html` is the implementation target.
- [ ] `Sukinnect.html` remains untouched unless explicitly requested.

## Domain kernel

- [ ] One booking model remains.
- [ ] Money remains in centavos.
- [ ] Booking state remains controlled by the transition mechanism.
- [ ] Payment status remains separate from booking status.
- [ ] Ledger invariants still hold.
- [ ] No wallet/store-value balance has been reintroduced.
- [ ] Messages remain persistent records linked to threads/bookings.
- [ ] Disputes remain attached to real bookings.
- [ ] Configuration/audit behavior remains intact.

## Resident UX

- [ ] Search is prominent.
- [ ] Location context is visible.
- [ ] Active booking is prioritized when present.
- [ ] Categories are easy to browse.
- [ ] Provider cards expose trust, distance, availability, pricing context, and next action.
- [ ] Smart Match explains itself.
- [ ] Booking request clearly exposes important terms and price information.
- [ ] Active job clearly states what is happening and what comes next.

## Provider UX

- [ ] Requests are more prominent than analytics.
- [ ] Request cards contain enough information to make a decision.
- [ ] Job actions follow the real state machine.
- [ ] Provider profile is professional and trust-oriented.
- [ ] No wallet UI exists.

## Admin UX

- [ ] Operational metrics come from actual current data.
- [ ] Important queues open their actual objects.
- [ ] Verification is understandable.
- [ ] Disputes show evidence/timeline.
- [ ] Admin is not overloaded with irrelevant customer UI.

## Fruit Harvest & Buy

- [ ] Category exists as `Fruit Harvest & Buy`.
- [ ] It is clearly treated as a pilot/prototype category, not proven market traction.
- [ ] Three modes exist: Harvest Only, Sell My Fruit, Harvest + Buy.
- [ ] Provider capability types exist: Harvester, Buyer, Harvester + Buyer.
- [ ] Fruit-specific request fields are supported.
- [ ] Fruit pricing supports estimates/offers/negotiation.
- [ ] Buying and harvesting are not incorrectly collapsed into a generic fixed service rate.
- [ ] Offer flow exists and is understandable.
- [ ] Final quantity/final amount can be recorded without inventing unsupported pricing rules.
- [ ] Fruit transactions are linked to the same booking/history/messaging infrastructure.
- [ ] Unsafe tree-climbing behavior is not encouraged.
- [ ] Provider can decline impractical/unsafe work.
- [ ] Exact/private property details are not unnecessarily exposed.
- [ ] Produce purchase amounts are not silently treated as provider service revenue.
- [ ] No wallet is introduced for fruit settlement.

## Visual system

- [ ] Official `Sukinnect_Logo.png` remains unmodified.
- [ ] Current navy/blue/cyan identity remains consistent.
- [ ] No scattered new brand hex values.
- [ ] Semantic colors remain semantic.
- [ ] Gradients remain controlled.
- [ ] Category art remains local and lightweight.
- [ ] No visual clone of another marketplace.

## Mobile quality

- [ ] 44px+ interactive targets.
- [ ] No critical content behind bottom nav.
- [ ] Keyboard does not bury primary actions.
- [ ] Safe areas are respected.
- [ ] No hover-only interaction.
- [ ] Reduced motion is respected.
- [ ] No major white/flicker/re-render artifacts.
- [ ] App mode still works.

## Honesty

- [ ] Demo/sample values are not presented as actual traction.
- [ ] Simulated AI is not presented as real diagnostic AI.
- [ ] Mock payment is not presented as live payment processing.
- [ ] Pilot assumptions are not presented as final business rules.
- [ ] Proposed Fruit Harvest & Buy demand is not presented as validated market evidence.

---

# 38. IMPORTANT “DO NOT” LIST

Do NOT:

- rewrite the prototype from scratch
- switch frameworks
- replace the domain kernel with ad hoc UI state
- touch the frozen `Sukinnect.html` unnecessarily
- create a second booking table for fruit
- create a wallet
- invent live payment integrations
- invent traction
- invent provider economics
- invent fruit market prices
- invent certifications
- call verification a guarantee of safety/competence
- make Smart Match look magically authoritative
- create a fake AI diagnosis
- add another top-level navigation tab just for fruit
- bury important primary actions in large dashboards
- overuse gradients
- add heavy animation
- make the system look like a copy of Grab, Gawin, Facebook Marketplace, or another product
- remove existing working features merely because they are not part of the new fruit category

---

# 39. FINAL REPORT REQUIRED FROM YOU

After implementation, provide a concise but complete engineering/product report containing:

### 1. What you inspected
- branch
- target file
- major existing architecture

### 2. What you changed
Grouped by:
- domain
- resident UX
- provider UX
- admin UX
- fruit category
- visual system
- accessibility/performance

### 3. What you verified
Name the exact commands/tools actually executed and the observed result.

Do not fabricate test counts.

### 4. Known limitations
List anything that still depends on:
- real backend
- real authentication
- real payment gateway
- real geolocation
- real messaging delivery
- real AI
- production verification/compliance

### 5. Proposals / unresolved decisions
Explicitly identify anything that still needs product-owner/business validation, especially:
- fruit transaction economics
- platform commission on produce purchases
- provider verification requirements for fruit operations
- exact payout/settlement rules
- whether the fruit category should remain in the pilot after validation

### 6. Regression check
Confirm that existing normal service flows still work and that the domain-kernel behavior has not been silently replaced.

---

# 40. OPERATING PRINCIPLE

The ultimate goal is not to create more screens.

The goal is to make Sukinnect’s core marketplace loop actually feel coherent:

**FIND → REVIEW / VERIFY → REQUEST / BOOK → COORDINATE → COMPLETE → RECORD**

For Fruit Harvest & Buy, extend that loop into:

**DISCOVER → CHOOSE MODE → DESCRIBE FRUIT/TREES → MATCH → ASSESS → OFFER → ACCEPT → SCHEDULE → HARVEST/COLLECT → FINALIZE QUANTITY → SETTLE → RECORD → REVIEW**

Every screen, data model, button, status, message, notification, and admin view should reinforce that loop.

The system should feel like one product, not a collection of demos.

Make the marketplace easier to understand.
Make the next action obvious.
Make the transaction traceable.
Make trust visible.
Make prototype limitations honest.
Keep the existing domain kernel intact.

Do the work carefully, incrementally, and test the actual implementation rather than reasoning from the prompt alone.

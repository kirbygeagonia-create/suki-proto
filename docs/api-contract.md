# Sukinnect API contract — proposal

**Status:** design only, 2026-11-07. There is no API server today. This contract does
not make the browser prototype authenticated, multi-user or production-ready. Endpoint
names and policies below require owner, security and counsel review before implementation.
No secrets, vendor credentials or production identifiers belong in this file or the
public HTML.

## Conventions

- Base path: `/v1`; JSON request and response bodies use UTF-8.
- Protected routes require a server-issued session. A role selected in the browser is
  not authentication. The server derives the actor and role from the validated session;
  it never trusts a client-supplied `actorId`, `role`, owner id or price.
- Money fields are integer centavos with names ending in `Centavos`. Booking state and
  payment state are separate. A state transition and its ledger consequences commit in
  one database transaction.
- Success: `{ "data": ... }`; errors:
  `{ "error": { "code": "...", "message": "...", "requestId": "..." } }`.
  Do not return stack traces, secret values, full payment credentials or identity
  document contents.
- Use opaque resource IDs. Lists are paginated with bounded `limit` (proposed maximum
  100), stable sort order and a cursor; do not accept arbitrary SQL fields or sort
  expressions from the client.
- Write requests that may be retried accept an `Idempotency-Key`. The server binds the
  key to actor, route and request-body digest and returns the original result for an
  identical retry; a conflicting replay returns `409`.
- Timestamps are ISO-8601 UTC instants. Date-only service dates remain date-only values.
- `source: "demo"` is never accepted as a production write source. Demo and live data
  must not be aggregated together unless the response labels the selected population.

## Proposed endpoint catalogue

All rows are **proposals**, not deployed routes. “Owner” means the authenticated actor
owns the record or is a permitted participant in its booking thread.

| Method and path | Access | Purpose and key validation |
|---|---|---|
| `POST /auth/register` | Public, rate-limited | Create a resident/provider account only after required, current Terms and Privacy consent records are validated. Validate email/phone format and role allow-list; never accept an admin role. |
| `POST /auth/session` | Public, rate-limited | Authenticate and issue a secure session; generic failure response; no account enumeration. |
| `DELETE /auth/session` | Authenticated | Revoke current session. |
| `GET /me` | Authenticated | Return only the current actor's profile and permitted role data. |
| `GET /service-categories` | Public | Return active category metadata and declared verification needs. |
| `GET /service-areas` | Public | Return supported barangay names and municipality; do not expose exact provider/customer coordinates. |
| `GET /providers` | Public, rate-limited | Filter by supported category, service area and availability; cap query length and result page. Do not return private credentials, contact data or precise location. |
| `GET /providers/{providerId}` | Public | Return public provider profile, explicit verification levels and record-derived reputation summary. |
| `POST /provider-applications` | Provider | Create/update own application. Reject document bytes in this endpoint; upload design is a separate, access-controlled vendor flow after privacy review. |
| `GET /provider-applications/{id}` | Owner, moderator, admin | Return own application or authorized review record. |
| `POST /provider-applications/{id}/submit` | Provider | Validate required profile fields and record submission; server assigns state and timestamp. |
| `POST /moderation/applications/{id}/decision` | Moderator/admin | Human decision with allow-listed outcome and coded reason. Reject self-review and stale state; preserve history and appeal path. |
| `GET /bookings` | Resident/provider owner, admin by permission | Return bookings visible to the actor only; filter and paginate. |
| `POST /bookings` | Authenticated resident | Validate service, provider coverage, appointment, location disclosure and terms. Price is an estimate or a quoted/fixed value with explicit scope. Use idempotency. |
| `POST /bookings/{id}/transitions` | Booking participant or system | Apply only an allowed state-machine transition; check actor, current version and prerequisites; persist status event and ledger effects atomically. |
| `POST /bookings/{id}/offers` | Booking participant | Validate integer amounts, scope and expiration; append a new offer revision rather than overwrite history. |
| `GET /bookings/{id}/payments` | Booking participant, authorized finance admin | Return payment status and amounts without payment instrument data. |
| `POST /bookings/{id}/payment-intents` | Booking resident | Create a payment attempt through a server-only licensed gateway adapter. Require idempotency and a confirmed fee quote/payer; refuse if that policy is unresolved. |
| `POST /payments/{id}/capture` | Server workflow only | Capture authorized amount once after the booking rules allow it. Never trust a browser request as proof of provider settlement. |
| `POST /payments/{id}/refunds` | Authorized server workflow/admin | Validate refundable balance and reason; append refund and balanced ledger event. |
| `GET /bookings/{id}/messages` | Booking participants | Return messages for that booking/thread only, with bounded page size. |
| `POST /bookings/{id}/messages` | Booking participants | Validate length and abuse controls; store no attachments until a privacy/retention design is approved. |
| `POST /bookings/{id}/disputes` | Booking participant | Open a case with an allow-listed reason and booking reference; do not decide fault automatically. |
| `POST /disputes/{id}/responses` | Case participant, moderator/admin | Append evidence metadata and response; enforce access, size/type limits and retention rules. |
| `GET /notifications` | Authenticated | Return only current actor's notifications. |
| `POST /notifications/{id}/read` | Owner | Mark one notification read; repeated calls are idempotent. |
| `GET /admin/pilot-metrics` | Admin with analytics permission | Aggregate live records by a documented definition; demo excluded by default. Return target and actual values in separate fields. |
| `GET /health` | Public minimal | Liveness only; no dependency details, secrets, database names or environment variables. |

## Authorization and validation rules

1. Enforce roles and ownership in server middleware and service functions, not only in
   the UI. A moderator may review but cannot change platform policy unless separately
   authorized. Admin actions are audited. Admin cannot approve their own provider
   application.
2. Reject unknown JSON keys for money, role, status and identity-bearing objects. Validate
   enums, string lengths, integer ranges, date/time bounds, referenced record existence
   and version numbers before writing.
3. Use parameterized database queries and transaction boundaries for every booking,
   payment and ledger write. Reject duplicate settlement, over-refund, out-of-order
   transitions and unbalanced ledger events.
4. A payment request must use a server-held credential, a signed merchant quote and a
   fee payer selected by the owner. Never pass a gateway secret to the browser. Do not
   hold, move or describe funds as held without legal review and a signed provider
   arrangement.
5. Match/recommendation output must identify whether it is rule-based, simulated or
   external-model output. Store the source/version and the user's acceptance or edit;
   never let a model decide verification, disputes or account access.

## Proposed abuse limits

The following are starting proposals only; security review must set final values and
storage policy. Apply limits at the edge and again at the service boundary where
appropriate; key by account and network source without exposing the key in responses.

| Surface | Proposed initial limit | Response |
|---|---|---|
| Registration/session attempts | 5 failures per account per 15 minutes; progressive cooldown | `429 RATE_LIMITED`, generic wording |
| Provider discovery | 60 requests per minute per session/IP | `429 RATE_LIMITED`; cache safe public responses |
| Messages | 30 writes per minute per user, plus content-size limit | `429 RATE_LIMITED` or `400 VALIDATION_FAILED` |
| Booking writes | 10 per minute per user; idempotency required | `429` or replay result |
| Payment mutations | Strict per-account limits, idempotency mandatory, gateway-specific policy | `409` for duplicate/conflicting operations; `429` for throttling |
| Verification upload/vendor calls | No public upload route until an approved vendor/data flow exists | `403 FEATURE_NOT_AVAILABLE` |

## Error codes

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_FAILED` | Invalid field, amount, enum, state or unsupported query |
| 401 | `UNAUTHENTICATED` | Missing/expired/invalid session |
| 403 | `FORBIDDEN` | Authenticated but not permitted |
| 404 | `NOT_FOUND` | Record absent or not visible to actor |
| 409 | `STATE_CONFLICT` | Stale state/version, duplicate action or idempotency-key mismatch |
| 422 | `BUSINESS_RULE_REJECTED` | Valid shape but domain rule refuses the operation |
| 429 | `RATE_LIMITED` | Request limit reached |
| 503 | `DEPENDENCY_UNAVAILABLE` | External adapter unavailable; no success-shaped fallback |
| 500 | `INTERNAL_ERROR` | Unexpected error; log request ID and sanitized diagnostics only |

## Contract status

No route, server, token, gateway adapter or rate limiter is implemented by this document.
Revisit this proposal after the owner chooses the production stack and legal/privacy
requirements. Add contract tests and a versioned OpenAPI document before exposing a
service.

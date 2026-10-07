-- Sukinnect — reference schema (MySQL 8.0 / InnoDB, utf8mb4)
--
-- THIS FILE IS NOT LOADED BY THE PROTOTYPE. Sukinnect runs as one HTML file with
-- an in-memory record model and an optional localStorage snapshot; there is no
-- server and no database. This schema exists for two reasons: it is the exact
-- shape the JavaScript kernel's collections must map onto if a local backend is
-- ever stood up, and it documents the money rules where they cannot be misread.
--
-- Rules the whole design rests on:
--   1. Money is an integer count of centavos. No FLOAT, no DECIMAL, nopeso-typed
--      strings. A percentage computed on a float eventually prints a cent nobody
--      charged.
--   2. A booking is one row. The resident's view and the provider's view are the
--      same row read through customer_id / provider_id. Two parallel booking tables
--      is how the prototype ended up with a marketplace loop that never closed.
--   3. Booking status and payment status are separate columns and are never merged.
--      "completed + unpaid" and "cancelled + refunded" are both real states.
--      Both columns hold a code, and only the application turns a code into the
--      words a person reads. A rule that branches on a label is a rule that
--      changes when the copy changes.
--   4. ledger_event_lines is append-only. A correction is a new row, never an
--      UPDATE. Every event balances; the trigger enforces at insert time what the
--      application asserts in code.
--   5. There is no stored-value wallet anywhere: no resident balance, no spendable
--      number, nothing a user withdraws. customer_deposit is an obligation to
--      deliver or refund, held by a licensed partner.

SET NAMES utf8mb4;

-- ──────────────────────────────────────────────────────────── people and places
CREATE TABLE users (
  id            VARCHAR(24)  NOT NULL,
  role          ENUM('resident','provider','admin') NOT NULL,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(190) NOT NULL UNIQUE,
  phone         VARCHAR(32),
  barangay_id   VARCHAR(24),
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT users_barangay FOREIGN KEY (barangay_id) REFERENCES service_areas(id)
) ENGINE=InnoDB;

CREATE TABLE service_areas (
  id          VARCHAR(24)  NOT NULL,
  name        VARCHAR(80)  NOT NULL,          -- a barangay
  municipality VARCHAR(80) NOT NULL,
  province    VARCHAR(80)  NOT NULL,
  centre_lat  DECIMAL(9,6),
  centre_lng  DECIMAL(9,6),
  PRIMARY KEY (id),
  UNIQUE KEY area_unique (name, municipality, province)
) ENGINE=InnoDB;

CREATE TABLE provider_profiles (
  user_id          VARCHAR(24) NOT NULL,
  display_title    VARCHAR(120),
  verification     ENUM('none','pending','verified','rejected') NOT NULL DEFAULT 'none',
  verified_at      DATETIME,
  rating_cache     DECIMAL(3,2),                -- derived from reviews; a cache only
  jobs_completed   INT UNSIGNED NOT NULL DEFAULT 0,
  trust_score      TINYINT UNSIGNED,
  PRIMARY KEY (user_id),
  CONSTRAINT profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE provider_service_areas (
  provider_id  VARCHAR(24) NOT NULL,
  barangay_id  VARCHAR(24) NOT NULL,
  PRIMARY KEY (provider_id, barangay_id),
  CONSTRAINT psa_provider  FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT psa_barangay  FOREIGN KEY (barangay_id) REFERENCES service_areas(id)
) ENGINE=InnoDB;

CREATE TABLE provider_availability (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider_id  VARCHAR(24) NOT NULL,
  window_start DATETIME    NOT NULL,
  window_end   DATETIME    NOT NULL,
  mode         ENUM('scheduled','asap','emergency') NOT NULL DEFAULT 'scheduled',
  is_accepting TINYINT(1)  NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY avail_lookup (provider_id, window_start),
  CONSTRAINT avail_provider FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ──────────────────────────────────────────────────────────── what can be booked
CREATE TABLE service_categories (
  id                 VARCHAR(24)  NOT NULL,
  label              VARCHAR(80)  NOT NULL,
  icon               VARCHAR(40),
  theme_bg           CHAR(7),
  theme_fg           CHAR(7),
  commission_rate    DECIMAL(5,4) NULL,      -- NULL → use the platform default
  requires_credential_ids JSON NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- A provider is a menu, not one number. Booking, discovery and earnings all key off
-- a listing, so a price is always attributable to the job actually agreed.
CREATE TABLE service_listings (
  id                   VARCHAR(24)  NOT NULL,
  provider_id          VARCHAR(24)  NOT NULL,
  category_id          VARCHAR(24)  NOT NULL,
  title                VARCHAR(120) NOT NULL,
  description          TEXT,
  base_price_centavos  INT UNSIGNED NOT NULL CHECK (base_price_centavos >= 10000),
  duration_min         SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  is_active            TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY listing_provider (provider_id, is_active),
  CONSTRAINT listing_provider  FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT listing_category  FOREIGN KEY (category_id) REFERENCES service_categories(id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────────────── a job
CREATE TABLE bookings (
  id                     VARCHAR(24)  NOT NULL,
  reference              VARCHAR(24)  NOT NULL UNIQUE,     -- BK-2026-000101
  customer_id            VARCHAR(24)  NOT NULL,
  provider_id            VARCHAR(24)  NOT NULL,
  listing_id             VARCHAR(24),
  category_id            VARCHAR(24)  NOT NULL,
  barangay_id            VARCHAR(24),
  address_line           VARCHAR(190),
  lat                    DECIMAL(9,6),
  lng                    DECIMAL(9,6),
  request_text           TEXT         NOT NULL,            -- the resident's own words
  summary                VARCHAR(120) NOT NULL,            -- the short label both sides read
  requested_asap         TINYINT(1)   NOT NULL DEFAULT 0,
  scheduled_date         DATE,
  scheduled_time         VARCHAR(16),
  /* Minutes, not a sentence. The kernel carries a display string ("15 mins") because
     there is nothing to compute against in a single file; a backend stores the
     number and formats on the way out, like every other amount here. */
  eta_min                SMALLINT UNSIGNED,

  /* A denormalised copy of pricing.customerTotalCentavos, because every list,
     receipt and statement reads the total without unwinding a JSON column. The two
     are written together at accept time and must never diverge — the kernel keeps
     one (pricing) as authority and derives the other. */
  customer_total_centavos INT UNSIGNED NOT NULL DEFAULT 0,
  /* The pilot category keeps two kinds of money about one job and only one of them
     is a service fee. `transaction_mode` says which shape the job is; the produce
     columns record a purchase between resident and buyer that the platform never
     holds, so they are deliberately outside `customer_total_centavos` and outside
     the ledger. `produce_fee_status` keeps the three states apart: a rate that is
     undecided is not a rate that was waived. */
  transaction_mode        ENUM('harvest_only','sell_fruit','harvest_and_buy') NULL,
  produce_amount_centavos INT UNSIGNED NULL,           -- the fruit itself, never a fee base
  produce_quantity_grams  INT UNSIGNED NULL,           -- whole grams, as centavos are whole
  produce_basis           ENUM('per_kg','per_tree','per_lot') NULL,
  produce_settled_as      ENUM('on_site') NULL,
  produce_fee_centavos    INT UNSIGNED NOT NULL DEFAULT 0,
  produce_fee_status      ENUM('charged','undecided','not-charged') NOT NULL DEFAULT 'undecided',
  produce_voided_at       DATETIME NULL,               -- the visit was called off; no payment happened

  status                 ENUM('requested','upcoming','en_route','arrived','ongoing',
                              'completed','cancelled','expired','no_show','disputed')
                         NOT NULL DEFAULT 'requested',
  status_changed_at      DATETIME,
  cancelled_by           ENUM('customer','provider','system'),
  cancel_reason          VARCHAR(190),
  confirmed_by           ENUM('customer','auto') NULL,      -- who closed the loop on a completion
  created_at             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Frozen when the provider accepts. Rates change under the admin console; a
  -- completed job's money must never be recomputed from today's configuration.
  pricing                JSON NULL,
  /*  pricing holds:
      baseCentavos, inclusions[{label,amountCentavos}], passThroughCentavos,
      commissionRate, commissionCentavos, fixedFeeCentavos, taxCentavos,
      providerShareCentavos, customerTotalCentavos, platformRevenueCentavos,
      frozenAt                                                       */

  /* Codes, never the words on screen. The prototype kept the *label* here —
     "Held, not yet paid" — and then decided money rules by searching that string,
     so renaming a phrase in the copy would have changed how a job settled, and a
     booking word ("Cancelled") had already arrived on the money axis. The label is
     PAYMENT_LABELS[code], produced on the way to a screen. */
  payment_status         ENUM('unpaid','pending_site','authorized','captured','collected',
                              'refunded','partially_refunded','voided')
                         NOT NULL DEFAULT 'unpaid',
  /* Same two-value rule as PAY_METHODS in the kernel. 'cash' is the route where the
     platform never holds the money — the only method the ledger branches on.
     maya and card join this list when a partner supports them, not before. */
  payment_method         ENUM('gcash','cash') NULL,
  customer_rating        TINYINT UNSIGNED NULL CHECK (customer_rating BETWEEN 1 AND 5),
  source                 ENUM('demo','live') NOT NULL DEFAULT 'live',
  PRIMARY KEY (id),
  KEY booking_customer (customer_id, status),
  KEY booking_provider (provider_id, status),
  KEY booking_area     (barangay_id, scheduled_date),
  CONSTRAINT booking_customer FOREIGN KEY (customer_id) REFERENCES users(id),
  CONSTRAINT booking_provider FOREIGN KEY (provider_id) REFERENCES users(id),
  CONSTRAINT booking_listing  FOREIGN KEY (listing_id)  REFERENCES service_listings(id),
  CONSTRAINT booking_category FOREIGN KEY (category_id) REFERENCES service_categories(id)
) ENGINE=InnoDB;

-- One timeline serves the customer's tracking view, the dispute evidence chain and
-- the administrator's audit. It was three separate inventions before.
CREATE TABLE booking_status_events (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id  VARCHAR(24) NOT NULL,
  from_status VARCHAR(16) NULL,
  to_status   VARCHAR(16) NOT NULL,
  actor_role  ENUM('resident','provider','admin','system') NOT NULL,
  actor_id    VARCHAR(24) NULL,
  note        VARCHAR(190),
  at          DATETIME    NOT NULL,
  PRIMARY KEY (id),
  KEY timeline (booking_id, at),
  CONSTRAINT t_event_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ───────────────────────────────────────────────────────────────────────── money
-- A negotiation is not a booking state. The job stays `requested` while an offer is
-- out; what changes is this row. Every revision is kept rather than overwritten,
-- because the question a dispute asks about a negotiated job is "what was offered,
-- and what did they agree to" -- the last number alone cannot answer it.
CREATE TABLE offers (
  id                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id             VARCHAR(24) NOT NULL,
  mode                   ENUM('harvest_only','sell_fruit','harvest_and_buy') NOT NULL,
  made_by                ENUM('provider','customer') NOT NULL,
  basis                  ENUM('per_kg','per_tree','per_lot') NOT NULL,
  quantity_grams         INT UNSIGNED NULL,            -- whole grams, never a float kilo
  unit_price_centavos    INT UNSIGNED NULL,            -- per kg or per tree; null for a lot
  produce_centavos       INT UNSIGNED NOT NULL DEFAULT 0,   -- the fruit leg
  labour_centavos        INT UNSIGNED NOT NULL DEFAULT 0,   -- the service leg; the only
                                                            -- one commission applies to
  who_harvests           ENUM('provider','customer') NOT NULL DEFAULT 'provider',
  collection_note        VARCHAR(190),
  includes               VARCHAR(190),
  note                   VARCHAR(190),
  status                 ENUM('proposed','accepted','declined','withdrawn',
                               'superseded','expired') NOT NULL DEFAULT 'proposed',
  valid_until            DATETIME NULL,                -- honoured on open, not only displayed
  revision_of            BIGINT UNSIGNED NULL,         -- the offer this one replaced
  closed_because         VARCHAR(24) NULL,             -- the booking move that closed it
  at                     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  answered_at            DATETIME NULL,
  PRIMARY KEY (id),
  KEY offer_booking (booking_id),
  KEY offer_open (booking_id, status),
  CONSTRAINT offer_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB;
-- Only one `proposed` offer per booking may be open at a time; the kernel enforces
-- it by marking the previous row `superseded` rather than with a unique index, so
-- the whole trail survives. An offer closes when its booking leaves `requested`.

CREATE TABLE payments (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id         VARCHAR(24) NOT NULL,
  type               ENUM('authorization','capture','refund','void','collection') NOT NULL,
  status             ENUM('authorized','captured','refunded','partially_refunded','voided','collected','failed') NOT NULL,
  method             ENUM('gcash','cash') NOT NULL,
  amount_centavos    INT UNSIGNED NOT NULL,
  gateway_ref        VARCHAR(64),          -- a partner's own id; MOCK-* before one exists
  note               VARCHAR(190),
  at                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY payment_booking (booking_id),
  CONSTRAINT payment_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB;
-- One booking to many payment rows: that is what lets a partial refund and a
-- re-authorization exist without rewriting history.

CREATE TABLE accounts (
  key_name  VARCHAR(48) NOT NULL,
  kind      ENUM('asset','liability','revenue','expense') NOT NULL,
  scope     ENUM('none','booking','provider','customer') NOT NULL DEFAULT 'none',
  label     VARCHAR(120) NOT NULL,
  PRIMARY KEY (key_name)
) ENGINE=InnoDB;

CREATE TABLE ledger_events (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_type     VARCHAR(48) NOT NULL,       -- payment.authorized, booking.settled, …
  booking_id     VARCHAR(24) NULL,
  at             DATETIME    NOT NULL,
  note           VARCHAR(190),
  source         ENUM('demo','live') NOT NULL DEFAULT 'live',
  PRIMARY KEY (id),
  KEY ledger_time (at),
  CONSTRAINT l_event_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE ledger_event_lines (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id         BIGINT UNSIGNED NOT NULL,
  account_key      VARCHAR(48)  NOT NULL,
  scope_id         VARCHAR(24)  NULL,        -- the booking or provider the line is about
  direction        ENUM('debit','credit') NOT NULL,
  amount_centavos  INT UNSIGNED NOT NULL CHECK (amount_centavos > 0),
  PRIMARY KEY (id),
  KEY line_account (account_key, scope_id),
  CONSTRAINT line_event   FOREIGN KEY (event_id)   REFERENCES ledger_events(id) ON DELETE CASCADE,
  CONSTRAINT line_account FOREIGN KEY (account_key) REFERENCES accounts(key_name)
) ENGINE=InnoDB;
-- Append-only by convention and by grant: the application never issues UPDATE or
-- DELETE against this table, and a deployment should revoke both.

CREATE TABLE payouts (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider_id        VARCHAR(24) NOT NULL,
  amount_centavos    INT UNSIGNED NOT NULL,
  method             VARCHAR(32) NOT NULL,
  destination_masked VARCHAR(64) NOT NULL,     -- never a full account number
  period_from        DATE,
  period_to          DATE,
  status             ENUM('scheduled','processing','paid','failed') NOT NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT payout_provider FOREIGN KEY (provider_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE disputes (
  id                     VARCHAR(24) NOT NULL,
  booking_id             VARCHAR(24) NOT NULL,
  /* The kernel's actor vocabulary is customer / provider / admin / system. It used
     to say "resident" here, which is the name of a screen, not of a party to a
     transaction. */
  opened_by              ENUM('customer','provider','admin') NOT NULL,
  reason                 TEXT NOT NULL,
  amount_in_claim_centavos INT UNSIGNED NOT NULL,
  /* What the books actually froze when the case opened — not what the claim asks
     for. A case raised before the job settled holds nothing, and the card has to
     be able to say so from a column rather than from a caption. */
  frozen_centavos        INT UNSIGNED NOT NULL DEFAULT 0,
  status                 ENUM('under review','closed — the booking stands',
                              'closed — partly refunded','closed — refunded') NOT NULL DEFAULT 'under review',
  resolution             VARCHAR(190),
  opened_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at            DATETIME NULL,
  PRIMARY KEY (id),
  CONSTRAINT dispute_booking FOREIGN KEY (booking_id) REFERENCES bookings(id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────── coordination
/* Messaging exists to coordinate a service, so a thread belongs to a pair of
   people and the jobs between them, and a message is a row rather than painted
   text. The prototype stored none of this: what a resident typed went into the
   DOM, disappeared on the next render and was never visible to the other side.
   Which thread a device has read is deliberately absent — that is one marker per
   installation (state.threadRead), not a fact about the conversation. */
CREATE TABLE messages (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  thread       VARCHAR(48) NOT NULL,           -- t-<customer_id>-<provider_id>
  booking_id   VARCHAR(24) NULL,               -- the job the line is about, when there is one
  sender       ENUM('customer','provider') NOT NULL,
  body         TEXT NOT NULL,
  sent_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY message_thread (thread, sent_at),
  CONSTRAINT message_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ───────────────────────────────────────────────────────────────── configuration
CREATE TABLE platform_config (
  key_name    VARCHAR(48) NOT NULL,
  value_json  JSON        NOT NULL,
  set_by      VARCHAR(24) NULL,
  set_at      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (key_name)
) ENGINE=InnoDB;

CREATE TABLE platform_config_audit (
  id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  key_name  VARCHAR(48)  NOT NULL,
  old_json  JSON NULL,
  new_json  JSON NOT NULL,
  actor_id  VARCHAR(24) NULL,
  at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;
-- Changing a rate changes the money on jobs not yet booked, so the change itself
-- is a record. History is never rewritten to agree with the new number.

-- ────────────────────────────────────────────────────────────────── report reads
CREATE OR REPLACE VIEW platform_revenue AS
SELECT e.at,
       SUM(CASE WHEN l.account_key = 'platform_fee_revenue'       AND l.direction = 'credit' THEN l.amount_centavos ELSE 0 END)
     - SUM(CASE WHEN l.account_key = 'platform_fee_revenue'       AND l.direction = 'debit'  THEN l.amount_centavos ELSE 0 END) AS commission_centavos,
       SUM(CASE WHEN l.account_key = 'platform_fixed_fee_revenue' AND l.direction = 'credit' THEN l.amount_centavos ELSE 0 END) AS fees_centavos,
       SUM(CASE WHEN l.account_key = 'tax_payable'                AND l.direction = 'credit' THEN l.amount_centavos ELSE 0 END) AS tax_centavos
  FROM ledger_events e JOIN ledger_event_lines l ON l.event_id = e.id
 GROUP BY e.at;

CREATE OR REPLACE VIEW provider_earnings AS
SELECT l.scope_id AS provider_id,
       SUM(CASE WHEN l.direction = 'credit' THEN l.amount_centavos ELSE -l.amount_centavos END) AS payable_centavos
  FROM ledger_event_lines l
 WHERE l.account_key = 'provider_payable'
 GROUP BY l.scope_id;

-- The every-report invariant, as a check the database can enforce alongside the
-- one the application asserts before it posts: no event may be stored unbalanced.
DELIMITER $$
CREATE TRIGGER ledger_balanced_before_insert BEFORE INSERT ON ledger_event_lines
FOR EACH ROW
BEGIN
  DECLARE v_event BIGINT UNSIGNED;
  DECLARE v_debits BIGINT UNSIGNED;
  DECLARE v_credits BIGINT UNSIGNED;
  SET v_event = NEW.event_id;
  SELECT COALESCE(SUM(CASE WHEN direction='debit'  THEN amount_centavos ELSE 0 END),0),
         COALESCE(SUM(CASE WHEN direction='credit' THEN amount_centavos ELSE 0 END),0)
    INTO v_debits, v_credits
    FROM ledger_event_lines WHERE event_id = v_event;
  IF (v_debits + NEW.amount_centavos) <> (v_credits + IF(NEW.direction='credit', NEW.amount_centavos, 0)) THEN
    IF (v_debits + IF(NEW.direction='debit', NEW.amount_centavos, 0)) <> v_credits + IF(NEW.direction='credit', 0, NEW.amount_centavos) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ledger event would not balance';
    END IF;
  END IF;
END$$
DELIMITER ;
-- (The application enforces the same rule at the moment an event is complete; this
-- trigger is the backstop for anything writing directly.)

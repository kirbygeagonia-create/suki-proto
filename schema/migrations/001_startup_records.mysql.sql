-- Additive Stage B reference migration for Sukinnect.
--
-- NOT RUN BY THE PROTOTYPE. Apply only to a reviewed database created from
-- schema/sukinnect.reference.sql, after the owner has selected a production stack.
-- MySQL 8.0.16+ is required for enforced CHECK constraints. CREATE IF NOT EXISTS
-- and INSERT IGNORE make a retry safe after a partial DDL run; DDL is not atomic.
--
-- This migration does not choose a commission rate, commission payer or gateway fee
-- payer policy. C1 is an owner decision. No real quotes or personal information belong
-- in this reference migration.

CREATE TABLE IF NOT EXISTS user_consents (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id            VARCHAR(24) NOT NULL,
  role               ENUM('resident','provider') NOT NULL,
  document_type      ENUM('terms','privacy') NOT NULL,
  document_version   VARCHAR(32) NOT NULL,
  document_sha256    BINARY(32) NOT NULL,
  accepted_at        DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY consent_doc_version (user_id, document_type, document_version),
  KEY consent_user_time (user_id, accepted_at),
  CONSTRAINT consent_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT consent_version_nonempty CHECK (CHAR_LENGTH(document_version) > 0)
) ENGINE=InnoDB;
-- Insert only after an explicit affirmative action; scrolling or reading alone is not consent.
-- Append-only: each accepted document version is a separate consent record.

CREATE TABLE IF NOT EXISTS verification_cases (
  id                 VARCHAR(24) NOT NULL,
  provider_id        VARCHAR(24) NOT NULL,
  level              TINYINT UNSIGNED NOT NULL,
  status             ENUM('draft','submitted','under_review','approved','rejected','appealed') NOT NULL,
  submitted_at       DATETIME NULL,
  decided_at         DATETIME NULL,
  reviewer_id        VARCHAR(24) NULL,
  decision_code      ENUM('identity_checked','credential_checked','insufficient_evidence','not_eligible') NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY verification_queue (status, submitted_at),
  KEY verification_provider (provider_id, created_at),
  CONSTRAINT verification_provider FOREIGN KEY (provider_id) REFERENCES users(id),
  CONSTRAINT verification_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id),
  CONSTRAINT verification_level CHECK (level BETWEEN 0 AND 3)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS verification_documents (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  case_id            VARCHAR(24) NOT NULL,
  document_kind      ENUM('identity','clearance','trade_credential','other_required') NOT NULL,
  status             ENUM('requested','submitted','reviewed','accepted','rejected','expired') NOT NULL,
  object_reference   VARCHAR(255) NULL, -- opaque pointer only; never document bytes or ID number
  submitted_at       DATETIME NULL,
  reviewed_at        DATETIME NULL,
  reviewer_id        VARCHAR(24) NULL,
  expires_at         DATE NULL,
  PRIMARY KEY (id),
  UNIQUE KEY verification_doc_kind (case_id, document_kind),
  CONSTRAINT verification_doc_case FOREIGN KEY (case_id) REFERENCES verification_cases(id),
  CONSTRAINT verification_doc_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id)
) ENGINE=InnoDB;
-- A real object store, access policy, retention rule and lawful vendor flow are required
-- before object_reference may point to a real person's document.

CREATE TABLE IF NOT EXISTS provider_credentials (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider_id        VARCHAR(24) NOT NULL,
  name               VARCHAR(120) NOT NULL,
  issuer             VARCHAR(120) NULL,
  credential_kind    VARCHAR(48) NOT NULL,
  status             ENUM('declared','pending','verified','rejected','expired') NOT NULL,
  checked_at         DATETIME NULL,
  checked_by         VARCHAR(24) NULL,
  expires_at         DATE NULL,
  PRIMARY KEY (id),
  KEY credential_provider (provider_id, status),
  CONSTRAINT credential_provider FOREIGN KEY (provider_id) REFERENCES users(id),
  CONSTRAINT credential_reviewer FOREIGN KEY (checked_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS price_references (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id        VARCHAR(24) NOT NULL,
  barangay_id        VARCHAR(24) NULL,
  unit_code          VARCHAR(32) NOT NULL,
  amount_low_centavos INT UNSIGNED NOT NULL,
  amount_typical_centavos INT UNSIGNED NOT NULL,
  amount_high_centavos INT UNSIGNED NOT NULL,
  source_kind        ENUM('provider_quote','public_schedule','published_listing') NOT NULL,
  source_key_hash    BINARY(32) NOT NULL, -- distinct-source control; no respondent contact
  source_reference   VARCHAR(255) NULL,   -- public URL or internal evidence code, not a person's details
  observed_on        DATE NOT NULL,
  status             ENUM('pending_review','approved','rejected','expired') NOT NULL DEFAULT 'pending_review',
  reviewed_by        VARCHAR(24) NULL,
  reviewed_at        DATETIME NULL,
  PRIMARY KEY (id),
  KEY price_band_lookup (category_id, barangay_id, unit_code, status, observed_on),
  UNIQUE KEY price_source_once (category_id, barangay_id, unit_code, source_key_hash, observed_on),
  CONSTRAINT price_category FOREIGN KEY (category_id) REFERENCES service_categories(id),
  CONSTRAINT price_area FOREIGN KEY (barangay_id) REFERENCES service_areas(id),
  CONSTRAINT price_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id),
  CONSTRAINT price_band_order CHECK (
    amount_low_centavos <= amount_typical_centavos AND
    amount_typical_centavos <= amount_high_centavos
  )
) ENGINE=InnoDB;
-- The application must require at least three independent approved source keys before
-- presenting a local range. Amounts are references, not guaranteed final prices.

CREATE TABLE IF NOT EXISTS gateway_fee_quotes (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  gateway_code       VARCHAR(32) NOT NULL,
  method_code        VARCHAR(32) NOT NULL,
  fixed_fee_centavos INT UNSIGNED NOT NULL DEFAULT 0,
  rate_basis_points  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  source_reference   VARCHAR(120) NOT NULL, -- signed merchant quote reference, not its secret contents
  quoted_at          DATETIME NOT NULL,
  valid_until        DATETIME NULL,
  status             ENUM('proposed','signed','expired','rejected') NOT NULL DEFAULT 'proposed',
  approved_by        VARCHAR(24) NULL,
  PRIMARY KEY (id),
  KEY gateway_quote_current (gateway_code, method_code, status, valid_until),
  CONSTRAINT gateway_quote_approver FOREIGN KEY (approved_by) REFERENCES users(id),
  CONSTRAINT gateway_rate_bound CHECK (rate_basis_points <= 10000)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payment_gateway_fees (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  payment_id         BIGINT UNSIGNED NOT NULL,
  quote_id           BIGINT UNSIGNED NOT NULL,
  payer              ENUM('customer','provider') NOT NULL,
  amount_centavos    INT UNSIGNED NOT NULL,
  status             ENUM('assessed','collected','remitted','reversed','failed') NOT NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  remitted_at        DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY gateway_fee_payment (payment_id),
  CONSTRAINT gateway_fee_payment FOREIGN KEY (payment_id) REFERENCES payments(id),
  CONSTRAINT gateway_fee_quote FOREIGN KEY (quote_id) REFERENCES gateway_fee_quotes(id),
  CONSTRAINT gateway_fee_positive CHECK (amount_centavos > 0)
) ENGINE=InnoDB;
-- No platform payer is permitted. A signed quote and owner-approved payer policy are
-- required before a fee record can be assessed. This row is a pass-through, not revenue.

INSERT IGNORE INTO accounts (key_name, kind, scope, label)
VALUES ('gateway_fee_payable', 'liability', 'booking', 'Gateway fee payable to licensed processor');

CREATE TABLE IF NOT EXISTS feature_flags (
  flag_key           VARCHAR(48) NOT NULL,
  enabled            TINYINT(1) NOT NULL DEFAULT 0,
  changed_by         VARCHAR(24) NULL,
  changed_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (flag_key),
  CONSTRAINT feature_flag_actor FOREIGN KEY (changed_by) REFERENCES users(id)
) ENGINE=InnoDB;

INSERT IGNORE INTO feature_flags (flag_key, enabled) VALUES
  ('subscriptions', 0),
  ('promoted_listings', 0),
  ('partner_revenue', 0),
  ('lending_referral', 0),
  ('voice_input', 0);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id                 VARCHAR(24) NOT NULL,
  plan_code          VARCHAR(32) NOT NULL,
  price_centavos     INT UNSIGNED NOT NULL,
  period_code        ENUM('month','year') NOT NULL,
  status             ENUM('proposed','active','retired') NOT NULL DEFAULT 'proposed',
  validated          TINYINT(1) NOT NULL DEFAULT 0,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY subscription_plan_code (plan_code),
  CONSTRAINT plan_price_nonnegative CHECK (price_centavos >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS provider_subscriptions (
  id                 VARCHAR(24) NOT NULL,
  provider_id        VARCHAR(24) NOT NULL,
  plan_id            VARCHAR(24) NOT NULL,
  status             ENUM('proposed','pending_payment','active','past_due','cancelled','expired') NOT NULL,
  starts_at          DATETIME NULL,
  ends_at            DATETIME NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY provider_subscription_status (provider_id, status),
  CONSTRAINT subscription_provider FOREIGN KEY (provider_id) REFERENCES users(id),
  CONSTRAINT subscription_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS promoted_listings (
  id                 VARCHAR(24) NOT NULL,
  listing_id         VARCHAR(24) NOT NULL,
  slot_code          VARCHAR(32) NOT NULL,
  price_centavos     INT UNSIGNED NOT NULL,
  status             ENUM('proposed','pending_payment','scheduled','active','ended','cancelled') NOT NULL DEFAULT 'proposed',
  starts_at          DATETIME NULL,
  ends_at            DATETIME NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY promoted_slot_time (slot_code, status, starts_at, ends_at),
  CONSTRAINT promotion_listing FOREIGN KEY (listing_id) REFERENCES service_listings(id),
  CONSTRAINT promotion_price_nonnegative CHECK (price_centavos >= 0)
) ENGINE=InnoDB;
-- A promotion is a separate, explicitly labelled placement; it must never change organic rank.

CREATE TABLE IF NOT EXISTS provider_portfolio_items (
  id                 VARCHAR(24) NOT NULL,
  provider_id        VARCHAR(24) NOT NULL,
  service_label      VARCHAR(80) NOT NULL,
  description        VARCHAR(500) NOT NULL,
  visibility         ENUM('private','public') NOT NULL DEFAULT 'private',
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY portfolio_provider_visibility (provider_id, visibility),
  CONSTRAINT portfolio_provider FOREIGN KEY (provider_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS moderation_actions (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_id           VARCHAR(24) NOT NULL,
  subject_user_id    VARCHAR(24) NOT NULL,
  action_code        ENUM('flag','restrict','suspend','reinstate','request_evidence','decide_case') NOT NULL,
  reason_code        ENUM('repeat_cancellation','suspected_fraud','safety_report','verification_issue','policy_review','other_reviewed') NOT NULL,
  appeal_status      ENUM('not_requested','pending','upheld','reversed') NOT NULL DEFAULT 'not_requested',
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY moderation_subject_time (subject_user_id, created_at),
  CONSTRAINT moderation_actor FOREIGN KEY (actor_id) REFERENCES users(id),
  CONSTRAINT moderation_subject FOREIGN KEY (subject_user_id) REFERENCES users(id)
) ENGINE=InnoDB;
-- Do not put an AI verdict or free-form sensitive narrative in this table. Human decision
-- and appeal outcome are separate, auditable records.

CREATE TABLE IF NOT EXISTS analytics_events (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_code         ENUM('search_submitted','request_created','request_accepted','booking_completed',
                          'booking_cancelled','dispute_opened','recommendation_shown',
                          'recommendation_accepted','onboarding_step_reached','onboarding_abandoned',
                          'price_reference_shown','price_reference_accepted','price_reference_edited') NOT NULL,
  actor_id           VARCHAR(24) NULL,
  subject_type       ENUM('provider','booking','category','onboarding','recommendation') NOT NULL,
  subject_id         VARCHAR(24) NULL,
  source             ENUM('demo','live') NOT NULL,
  occurred_at        DATETIME NOT NULL,
  schema_version     SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY event_code_time (event_code, occurred_at),
  KEY event_actor_time (actor_id, occurred_at),
  CONSTRAINT analytics_actor FOREIGN KEY (actor_id) REFERENCES users(id)
) ENGINE=InnoDB;
-- Intentionally no free-text, request body, address, message, document or payment data.

CREATE TABLE IF NOT EXISTS ai_suggestions (
  id                 VARCHAR(24) NOT NULL,
  actor_id           VARCHAR(24) NOT NULL,
  suggestion_kind    ENUM('provider_match','popular_category','price_guidance','portfolio_draft','concierge') NOT NULL,
  origin             ENUM('rule_based','simulated','external_model') NOT NULL,
  source_version     VARCHAR(64) NOT NULL,
  source_url          VARCHAR(512) NULL,
  source_fetched_at   DATETIME NULL,
  result_sha256       BINARY(32) NOT NULL,
  decision            ENUM('accepted','edited','rejected','dismissed') NULL,
  decided_at          DATETIME NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY suggestion_actor_time (actor_id, created_at),
  CONSTRAINT suggestion_actor FOREIGN KEY (actor_id) REFERENCES users(id)
) ENGINE=InnoDB;
-- Store an audit digest and the user's decision, not a raw prompt, identity data or model
-- output. A result digest is not anonymisation and must not contain a sensitive payload.

CREATE TABLE IF NOT EXISTS user_notifications (
  id                 VARCHAR(24) NOT NULL,
  user_id            VARCHAR(24) NOT NULL,
  notification_code  VARCHAR(48) NOT NULL,
  target_type        ENUM('booking','provider_application','dispute','message_thread') NULL,
  target_id          VARCHAR(24) NULL,
  created_at         DATETIME NOT NULL,
  read_at            DATETIME NULL,
  source             ENUM('demo','live') NOT NULL,
  PRIMARY KEY (id),
  KEY notification_user_time (user_id, created_at),
  CONSTRAINT notification_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;
-- The service must verify that the referenced target exists and is visible to this user.

CREATE TABLE IF NOT EXISTS audit_chain_entries (
  sequence_no        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_code         VARCHAR(48) NOT NULL,
  record_type        ENUM('booking_status','ledger_event','moderation_action','verification_case','config_change') NOT NULL,
  record_id          VARCHAR(24) NOT NULL,
  payload_sha256     BINARY(32) NOT NULL,
  previous_sha256    BINARY(32) NULL,
  entry_sha256       BINARY(32) NOT NULL,
  actor_id           VARCHAR(24) NULL,
  created_at         DATETIME NOT NULL,
  PRIMARY KEY (sequence_no),
  UNIQUE KEY audit_entry_hash (entry_sha256),
  KEY audit_record (record_type, record_id),
  CONSTRAINT audit_chain_actor FOREIGN KEY (actor_id) REFERENCES users(id)
) ENGINE=InnoDB;
-- Hash chaining detects an edited interior entry if a trusted head is retained. It is
-- not encryption, access control, blockchain or protection from rewriting the full chain.
-- Production DB grants must deny UPDATE and DELETE to the application role.

CREATE TABLE IF NOT EXISTS schema_migrations (
  migration_id       VARCHAR(80) NOT NULL,
  applied_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (migration_id)
) ENGINE=InnoDB;

INSERT IGNORE INTO schema_migrations (migration_id)
VALUES ('001_startup_records.mysql');

-- ─── Schema Convergence Migration ───────────────────────────────────────────
-- Aligns the live PostgreSQL database with the canonical schema in packages/db.
-- Run this ONCE after the schema ownership convergence commit.
--
-- This migration handles:
--   1. Enum value additions (safe, additive)
--   2. Column renames (from old local schema names to canonical names)
--   3. New required columns with defaults
--
-- IMPORTANT: Review each section before running. Some renames may not apply
-- if the database was originally created from packages/db (not a local schema).
-- Check current column names before running ALTER statements.
--
-- Run with: psql $DATABASE_URL -f packages/db/migrations/001_schema_convergence.sql

BEGIN;

-- ─── 1. Enum value additions (safe, idempotent) ────────────────────────────
-- PostgreSQL ADD VALUE IF NOT EXISTS is safe to run multiple times.

-- subscription_tier: ensure all canonical values exist
DO $$ BEGIN
  ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'pro';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'enterprise';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'premium';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'expert';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. payment_history: column renames ────────────────────────────────────
-- Old local schema had: amount, tier, billing_period
-- Canonical schema has: amount_cents, product, type
--
-- Only run these if the old column names exist:

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_history' AND column_name = 'amount')
  THEN
    ALTER TABLE payment_history RENAME COLUMN amount TO amount_cents;
    RAISE NOTICE 'Renamed payment_history.amount → amount_cents';
  END IF;
END $$;

-- Add product column if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_history' AND column_name = 'product')
  THEN
    -- Create product enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product') THEN
      CREATE TYPE product AS ENUM ('tuning', 'os');
    END IF;
    ALTER TABLE payment_history ADD COLUMN product product NOT NULL DEFAULT 'tuning';
    RAISE NOTICE 'Added payment_history.product';
  END IF;
END $$;

-- Add type column if missing (payment_type enum)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_history' AND column_name = 'type')
  THEN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_type') THEN
      CREATE TYPE payment_type AS ENUM ('subscription', 'one_time', 'donation');
    END IF;
    ALTER TABLE payment_history ADD COLUMN type payment_type NOT NULL DEFAULT 'subscription';
    RAISE NOTICE 'Added payment_history.type';
  END IF;
END $$;

-- Drop old tier/billing_period columns from payment_history if they exist
-- (these belong on subscriptions, not payment_history)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_history' AND column_name = 'tier')
  THEN
    ALTER TABLE payment_history DROP COLUMN tier;
    RAISE NOTICE 'Dropped stale payment_history.tier';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_history' AND column_name = 'billing_period')
  THEN
    ALTER TABLE payment_history DROP COLUMN billing_period;
    RAISE NOTICE 'Dropped stale payment_history.billing_period';
  END IF;
END $$;

-- ─── 3. telemetry_events: column renames ───────────────────────────────────
-- Old local schema had: event, properties, server_timestamp
-- Canonical schema has: event_type, metadata, created_at

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'telemetry_events' AND column_name = 'event')
  THEN
    ALTER TABLE telemetry_events RENAME COLUMN event TO event_type;
    RAISE NOTICE 'Renamed telemetry_events.event → event_type';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'telemetry_events' AND column_name = 'properties')
  THEN
    ALTER TABLE telemetry_events RENAME COLUMN properties TO metadata;
    RAISE NOTICE 'Renamed telemetry_events.properties → metadata';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'telemetry_events' AND column_name = 'server_timestamp')
  THEN
    ALTER TABLE telemetry_events RENAME COLUMN server_timestamp TO created_at;
    RAISE NOTICE 'Renamed telemetry_events.server_timestamp → created_at';
  END IF;
END $$;

-- Add product column to telemetry_events if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'telemetry_events' AND column_name = 'product')
  THEN
    ALTER TABLE telemetry_events ADD COLUMN product product NOT NULL DEFAULT 'tuning';
    RAISE NOTICE 'Added telemetry_events.product';
  END IF;
END $$;

-- ─── 4. admin_audit_log: convert enum column to text ───────────────────────
-- Old os-api schema used auditActionEnum; canonical uses text
-- This is safe: text accepts any string value

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_audit_log' AND column_name = 'action'
    AND data_type = 'USER-DEFINED'
  )
  THEN
    ALTER TABLE admin_audit_log ALTER COLUMN action TYPE text;
    RAISE NOTICE 'Converted admin_audit_log.action from enum to text';
  END IF;
END $$;

-- Drop the orphaned audit_action enum if it exists
DO $$
BEGIN
  DROP TYPE IF EXISTS audit_action;
  RAISE NOTICE 'Dropped audit_action enum (if it existed)';
EXCEPTION WHEN dependent_objects_still_exist THEN
  RAISE NOTICE 'audit_action enum still in use, skipping drop';
END $$;

COMMIT;

-- ─── Verification ──────────────────────────────────────────────────────────
-- After running, verify with:
--   SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'subscription_tier';
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'payment_history';
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'telemetry_events';

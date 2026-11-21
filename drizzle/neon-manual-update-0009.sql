-- Oopa: contract details form update. Paste into the Neon SQL Editor and click Run.
-- Safe to run more than once.
ALTER TABLE "lease_contract" ADD COLUMN IF NOT EXISTS "fields" jsonb;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "lessor_profile" jsonb;

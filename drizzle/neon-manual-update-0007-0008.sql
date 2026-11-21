-- Oopa: contract template update. Paste into the Neon SQL Editor and click Run.
-- Safe to run more than once. Removes the old fill-in contract data (no real contracts were sent yet).
DELETE FROM "lease_contract" WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns WHERE table_name = 'lease_contract' AND column_name = 'body'
);
ALTER TABLE "lease_contract" DROP COLUMN IF EXISTS "data";
ALTER TABLE "lease_contract" ADD COLUMN IF NOT EXISTS "body" text NOT NULL;
ALTER TABLE "user" DROP COLUMN IF EXISTS "lessor_details";
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "contract_template" text;

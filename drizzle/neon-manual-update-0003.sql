-- Oopa: admin dashboard update. Paste into the Neon SQL Editor and click Run.
-- Safe to run more than once.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "suspended_at" timestamp;
ALTER TABLE "property" ADD COLUMN IF NOT EXISTS "removed_at" timestamp;
ALTER TABLE "property" ADD COLUMN IF NOT EXISTS "removed_reason" text;

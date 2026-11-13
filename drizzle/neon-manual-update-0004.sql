-- Oopa: dormitories and bedspaces update. Paste into the Neon SQL Editor and click Run.
-- Safe to run more than once.
DO $$ BEGIN
  CREATE TYPE "public"."gender_policy" AS ENUM('any', 'male', 'female');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE "building" ADD COLUMN IF NOT EXISTS "is_dormitory" boolean DEFAULT false NOT NULL;
ALTER TABLE "building" ADD COLUMN IF NOT EXISTS "gender_policy" "gender_policy";
ALTER TABLE "building" ADD COLUMN IF NOT EXISTS "curfew" text;
ALTER TABLE "building" ADD COLUMN IF NOT EXISTS "house_rules" text;
ALTER TABLE "property" ADD COLUMN IF NOT EXISTS "beds_total" smallint;
ALTER TABLE "property" ADD COLUMN IF NOT EXISTS "beds_taken" smallint DEFAULT 0 NOT NULL;
ALTER TABLE "property" ADD COLUMN IF NOT EXISTS "gender_policy" "gender_policy";
ALTER TABLE "property" ADD COLUMN IF NOT EXISTS "curfew" text;
ALTER TABLE "property" ADD COLUMN IF NOT EXISTS "house_rules" text;

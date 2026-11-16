-- Oopa: lease application form update. Paste into the Neon SQL Editor and click Run.
-- Safe to run more than once.
CREATE TABLE IF NOT EXISTS "lease_application" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"form" jsonb NOT NULL,
	"terms" jsonb NOT NULL,
	"signed_name" text NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lease_application_application_id_unique" UNIQUE("application_id")
);
DO $$ BEGIN
  ALTER TABLE "lease_application" ADD CONSTRAINT "lease_application_application_id_application_id_fk"
    FOREIGN KEY ("application_id") REFERENCES "public"."application"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE "building" ADD COLUMN IF NOT EXISTS "reservation_fee_php" numeric(12, 2);
ALTER TABLE "building" ADD COLUMN IF NOT EXISTS "max_occupants" smallint;
ALTER TABLE "building" ADD COLUMN IF NOT EXISTS "lease_terms" text;
ALTER TABLE "property" ADD COLUMN IF NOT EXISTS "reservation_fee_php" numeric(12, 2);
ALTER TABLE "property" ADD COLUMN IF NOT EXISTS "max_occupants" smallint;
ALTER TABLE "property" ADD COLUMN IF NOT EXISTS "lease_terms" text;
ALTER TABLE "property" ADD COLUMN IF NOT EXISTS "apply_token" text;
DO $$ BEGIN
  ALTER TABLE "property" ADD CONSTRAINT "property_apply_token_unique" UNIQUE("apply_token");
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;

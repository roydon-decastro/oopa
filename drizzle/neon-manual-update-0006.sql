-- Oopa: lease contract update. Paste into the Neon SQL Editor and click Run.
-- Safe to run more than once.
CREATE TABLE IF NOT EXISTS "lease_contract" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"sent_at" timestamp,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lease_contract_application_id_unique" UNIQUE("application_id")
);
DO $$ BEGIN
  ALTER TABLE "lease_contract" ADD CONSTRAINT "lease_contract_application_id_application_id_fk"
    FOREIGN KEY ("application_id") REFERENCES "public"."application"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "lessor_details" jsonb;

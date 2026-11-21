ALTER TABLE "lease_contract" ADD COLUMN "body" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "contract_template" text;
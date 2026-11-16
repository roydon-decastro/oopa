CREATE TABLE "lease_contract" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"sent_at" timestamp,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lease_contract_application_id_unique" UNIQUE("application_id")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "lessor_details" jsonb;--> statement-breakpoint
ALTER TABLE "lease_contract" ADD CONSTRAINT "lease_contract_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."application"("id") ON DELETE cascade ON UPDATE no action;
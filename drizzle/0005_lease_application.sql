CREATE TABLE "lease_application" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"form" jsonb NOT NULL,
	"terms" jsonb NOT NULL,
	"signed_name" text NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lease_application_application_id_unique" UNIQUE("application_id")
);
--> statement-breakpoint
ALTER TABLE "building" ADD COLUMN "reservation_fee_php" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "building" ADD COLUMN "max_occupants" smallint;--> statement-breakpoint
ALTER TABLE "building" ADD COLUMN "lease_terms" text;--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "reservation_fee_php" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "max_occupants" smallint;--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "lease_terms" text;--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "apply_token" text;--> statement-breakpoint
ALTER TABLE "lease_application" ADD CONSTRAINT "lease_application_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property" ADD CONSTRAINT "property_apply_token_unique" UNIQUE("apply_token");
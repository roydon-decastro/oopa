ALTER TABLE "property" ADD COLUMN "removed_at" timestamp;--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "removed_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "suspended_at" timestamp;
DELETE FROM "lease_contract";--> statement-breakpoint
ALTER TABLE "lease_contract" DROP COLUMN "data";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "lessor_details";

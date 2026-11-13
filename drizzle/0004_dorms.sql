CREATE TYPE "public"."gender_policy" AS ENUM('any', 'male', 'female');--> statement-breakpoint
ALTER TABLE "building" ADD COLUMN "is_dormitory" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "building" ADD COLUMN "gender_policy" "gender_policy";--> statement-breakpoint
ALTER TABLE "building" ADD COLUMN "curfew" text;--> statement-breakpoint
ALTER TABLE "building" ADD COLUMN "house_rules" text;--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "beds_total" smallint;--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "beds_taken" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "gender_policy" "gender_policy";--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "curfew" text;--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "house_rules" text;
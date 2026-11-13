CREATE TYPE "public"."utility_billing" AS ENUM('submeter', 'included', 'direct', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."utility_kind" AS ENUM('electricity', 'water');--> statement-breakpoint
CREATE TABLE "meter_reading" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"utility" "utility_kind" NOT NULL,
	"reading_date" date NOT NULL,
	"reading" numeric(12, 2) NOT NULL,
	"previous_reading" numeric(12, 2),
	"previous_date" date,
	"consumption" numeric(12, 2),
	"rate_php" numeric(10, 4),
	"amount_php" numeric(12, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "meter_reading_unique" UNIQUE("property_id","utility","reading_date")
);
--> statement-breakpoint
ALTER TABLE "building" ADD COLUMN "electricity_billing" "utility_billing";--> statement-breakpoint
ALTER TABLE "building" ADD COLUMN "electricity_rate_php" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "building" ADD COLUMN "electricity_fixed_php" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "building" ADD COLUMN "water_billing" "utility_billing";--> statement-breakpoint
ALTER TABLE "building" ADD COLUMN "water_rate_php" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "building" ADD COLUMN "water_fixed_php" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "building" ADD COLUMN "water_minimum_php" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "electricity_billing" "utility_billing";--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "electricity_rate_php" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "electricity_fixed_php" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "water_billing" "utility_billing";--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "water_rate_php" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "water_fixed_php" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "water_minimum_php" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "electric_meter_no" text;--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "water_meter_no" text;--> statement-breakpoint
ALTER TABLE "meter_reading" ADD CONSTRAINT "meter_reading_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meter_reading_property_idx" ON "meter_reading" USING btree ("property_id","utility","reading_date");
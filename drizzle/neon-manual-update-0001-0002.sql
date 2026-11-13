-- Oopa database update: apartment buildings + electricity/water sub-meters.
-- Safe to run more than once: anything that already exists is skipped.
-- Paste into Neon > SQL Editor and click Run.

-- ===== 0001_buildings.sql =====
CREATE TABLE IF NOT EXISTS "building" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"floors" smallint DEFAULT 1 NOT NULL,
	"street" text,
	"barangay" text,
	"city" text NOT NULL,
	"province" text NOT NULL,
	"region" text,
	"latitude" double precision,
	"longitude" double precision,
	"amenities" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "building_photo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" uuid NOT NULL,
	"url" text NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "property" ADD COLUMN IF NOT EXISTS "building_id" uuid;
ALTER TABLE "property" ADD COLUMN IF NOT EXISTS "unit_label" text;
ALTER TABLE "property" ADD COLUMN IF NOT EXISTS "floor" smallint;
DO $$ BEGIN
  ALTER TABLE "building" ADD CONSTRAINT "building_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "building_photo" ADD CONSTRAINT "building_photo_building_id_building_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."building"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "building_owner_idx" ON "building" USING btree ("owner_id");
CREATE INDEX IF NOT EXISTS "building_photo_building_idx" ON "building_photo" USING btree ("building_id","position");
DO $$ BEGIN
  ALTER TABLE "property" ADD CONSTRAINT "property_building_id_building_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."building"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "property_building_idx" ON "property" USING btree ("building_id","floor");
DO $$ BEGIN
  ALTER TABLE "property" ADD CONSTRAINT "property_building_unit_uq" UNIQUE("building_id","unit_label");
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;

-- ===== 0002_utilities.sql =====
DO $$ BEGIN
  CREATE TYPE "public"."utility_billing" AS ENUM('submeter', 'included', 'direct', 'fixed');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "public"."utility_kind" AS ENUM('electricity', 'water');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS "meter_reading" (
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
ALTER TABLE "building" ADD COLUMN IF NOT EXISTS "electricity_billing" "utility_billing";
ALTER TABLE "building" ADD COLUMN IF NOT EXISTS "electricity_rate_php" numeric(10, 4);
ALTER TABLE "building" ADD COLUMN IF NOT EXISTS "electricity_fixed_php" numeric(12, 2);
ALTER TABLE "building" ADD COLUMN IF NOT EXISTS "water_billing" "utility_billing";
ALTER TABLE "building" ADD COLUMN IF NOT EXISTS "water_rate_php" numeric(10, 4);
ALTER TABLE "building" ADD COLUMN IF NOT EXISTS "water_fixed_php" numeric(12, 2);
ALTER TABLE "building" ADD COLUMN IF NOT EXISTS "water_minimum_php" numeric(12, 2);
ALTER TABLE "property" ADD COLUMN IF NOT EXISTS "electricity_billing" "utility_billing";
ALTER TABLE "property" ADD COLUMN IF NOT EXISTS "electricity_rate_php" numeric(10, 4);
ALTER TABLE "property" ADD COLUMN IF NOT EXISTS "electricity_fixed_php" numeric(12, 2);
ALTER TABLE "property" ADD COLUMN IF NOT EXISTS "water_billing" "utility_billing";
ALTER TABLE "property" ADD COLUMN IF NOT EXISTS "water_rate_php" numeric(10, 4);
ALTER TABLE "property" ADD COLUMN IF NOT EXISTS "water_fixed_php" numeric(12, 2);
ALTER TABLE "property" ADD COLUMN IF NOT EXISTS "water_minimum_php" numeric(12, 2);
ALTER TABLE "property" ADD COLUMN IF NOT EXISTS "electric_meter_no" text;
ALTER TABLE "property" ADD COLUMN IF NOT EXISTS "water_meter_no" text;
DO $$ BEGIN
  ALTER TABLE "meter_reading" ADD CONSTRAINT "meter_reading_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "meter_reading_property_idx" ON "meter_reading" USING btree ("property_id","utility","reading_date");

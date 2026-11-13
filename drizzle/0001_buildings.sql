CREATE TABLE "building" (
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
--> statement-breakpoint
CREATE TABLE "building_photo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" uuid NOT NULL,
	"url" text NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "building_id" uuid;--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "unit_label" text;--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "floor" smallint;--> statement-breakpoint
ALTER TABLE "building" ADD CONSTRAINT "building_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "building_photo" ADD CONSTRAINT "building_photo_building_id_building_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."building"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "building_owner_idx" ON "building" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "building_photo_building_idx" ON "building_photo" USING btree ("building_id","position");--> statement-breakpoint
ALTER TABLE "property" ADD CONSTRAINT "property_building_id_building_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."building"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "property_building_idx" ON "property" USING btree ("building_id","floor");--> statement-breakpoint
ALTER TABLE "property" ADD CONSTRAINT "property_building_unit_uq" UNIQUE("building_id","unit_label");
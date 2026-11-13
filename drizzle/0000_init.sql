CREATE TYPE "public"."application_status" AS ENUM('submitted', 'reviewing', 'approved', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."furnishing" AS ENUM('unfurnished', 'semi', 'fully');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('draft', 'active', 'rented', 'archived');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('condo', 'apartment', 'house', 'townhouse', 'room', 'bedspace', 'commercial');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"renter_id" text NOT NULL,
	"status" "application_status" DEFAULT 'submitted' NOT NULL,
	"move_in_date" date,
	"lease_months" smallint,
	"occupants" smallint DEFAULT 1 NOT NULL,
	"monthly_income_php" numeric(12, 2),
	"employment" text,
	"message" text,
	"owner_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "application_property_renter_uq" UNIQUE("property_id","renter_id")
);
--> statement-breakpoint
CREATE TABLE "property" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"type" "property_type" NOT NULL,
	"status" "listing_status" DEFAULT 'draft' NOT NULL,
	"monthly_rent_php" numeric(12, 2) NOT NULL,
	"deposit_months" smallint DEFAULT 1 NOT NULL,
	"advance_months" smallint DEFAULT 1 NOT NULL,
	"bedrooms" smallint DEFAULT 0 NOT NULL,
	"bathrooms" smallint DEFAULT 1 NOT NULL,
	"floor_area_sqm" numeric(8, 2),
	"furnishing" "furnishing",
	"pets_allowed" boolean DEFAULT false NOT NULL,
	"min_lease_months" smallint DEFAULT 12 NOT NULL,
	"available_from" date,
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
CREATE TABLE "property_photo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"url" text NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text DEFAULT 'renter',
	"phone" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application" ADD CONSTRAINT "application_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application" ADD CONSTRAINT "application_renter_id_user_id_fk" FOREIGN KEY ("renter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property" ADD CONSTRAINT "property_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_photo" ADD CONSTRAINT "property_photo_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "application_renter_idx" ON "application" USING btree ("renter_id");--> statement-breakpoint
CREATE INDEX "application_property_idx" ON "application" USING btree ("property_id","status");--> statement-breakpoint
CREATE INDEX "property_search_idx" ON "property" USING btree ("status","city","type","monthly_rent_php");--> statement-breakpoint
CREATE INDEX "property_owner_idx" ON "property" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "property_photo_property_idx" ON "property_photo" USING btree ("property_id","position");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");
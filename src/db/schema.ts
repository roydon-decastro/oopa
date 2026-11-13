import { relations } from "drizzle-orm";
import {
  pgTable, pgEnum, text, timestamp, boolean, index, uuid, numeric, smallint, date,
  doublePrecision, unique,
} from "drizzle-orm/pg-core";
// Database schema (Neon Postgres via Drizzle).
// Auth tables (user, session, account, verification) follow Better Auth's schema.

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text("role").default("renter"),
  phone: text("phone"),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// ---------- Rentals ----------

export const propertyType = pgEnum("property_type", [
  "condo", "apartment", "house", "townhouse", "room", "bedspace", "commercial",
]);
export const listingStatus = pgEnum("listing_status", ["draft", "active", "rented", "archived"]);
export const furnishing = pgEnum("furnishing", ["unfurnished", "semi", "fully"]);
export const applicationStatus = pgEnum("application_status", [
  "submitted", "reviewing", "approved", "rejected", "withdrawn",
]);

// How a utility is charged to the tenant.
//  submeter: owner reads the unit's sub-meter monthly and bills usage × rate
//  included: part of the rent
//  direct:   unit has its own account with the utility (e.g. Meralco, water district); tenant pays them directly
//  fixed:    flat monthly fee
export const utilityBilling = pgEnum("utility_billing", ["submeter", "included", "direct", "fixed"]);
export const utilityKind = pgEnum("utility_kind", ["electricity", "water"]);

const money = (name: string) => numeric(name, { precision: 12, scale: 2, mode: "number" });
const rate = (name: string) => numeric(name, { precision: 10, scale: 4, mode: "number" });

// Utility settings shared by buildings (defaults for every unit) and units (overrides; null = same as building).
const utilityColumns = () => ({
  electricityBilling: utilityBilling("electricity_billing"),
  electricityRatePhp: rate("electricity_rate_php"),
  electricityFixedPhp: money("electricity_fixed_php"),
  waterBilling: utilityBilling("water_billing"),
  waterRatePhp: rate("water_rate_php"),
  waterFixedPhp: money("water_fixed_php"),
  waterMinimumPhp: money("water_minimum_php"),
});

// A multi-unit building (apartment building, dormitory, etc). Each unit is a `property` row with buildingId set.
export const building = pgTable(
  "building",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    floors: smallint("floors").notNull().default(1),
    street: text("street"),
    barangay: text("barangay"),
    city: text("city").notNull(),
    province: text("province").notNull(),
    region: text("region"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    amenities: text("amenities").array().notNull().default([]),
    ...utilityColumns(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (t) => [index("building_owner_idx").on(t.ownerId)],
);

export const buildingPhoto = pgTable(
  "building_photo",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    buildingId: uuid("building_id").notNull().references(() => building.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    position: smallint("position").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("building_photo_building_idx").on(t.buildingId, t.position)],
);

// A rentable unit: either a standalone property (house, condo) or a unit inside a building.
export const property = pgTable(
  "property",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    buildingId: uuid("building_id").references(() => building.id, { onDelete: "cascade" }),
    unitLabel: text("unit_label"),
    floor: smallint("floor"),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    type: propertyType("type").notNull(),
    status: listingStatus("status").notNull().default("draft"),
    monthlyRentPhp: numeric("monthly_rent_php", { precision: 12, scale: 2, mode: "number" }).notNull(),
    depositMonths: smallint("deposit_months").notNull().default(1),
    advanceMonths: smallint("advance_months").notNull().default(1),
    bedrooms: smallint("bedrooms").notNull().default(0),
    bathrooms: smallint("bathrooms").notNull().default(1),
    floorAreaSqm: numeric("floor_area_sqm", { precision: 8, scale: 2, mode: "number" }),
    furnishing: furnishing("furnishing"),
    petsAllowed: boolean("pets_allowed").notNull().default(false),
    minLeaseMonths: smallint("min_lease_months").notNull().default(12),
    availableFrom: date("available_from"),
    // Philippine address
    street: text("street"),
    barangay: text("barangay"),
    city: text("city").notNull(),
    province: text("province").notNull(),
    region: text("region"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    amenities: text("amenities").array().notNull().default([]),
    ...utilityColumns(),
    electricMeterNo: text("electric_meter_no"),
    waterMeterNo: text("water_meter_no"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (t) => [
    index("property_search_idx").on(t.status, t.city, t.type, t.monthlyRentPhp),
    index("property_owner_idx").on(t.ownerId),
    index("property_building_idx").on(t.buildingId, t.floor),
    unique("property_building_unit_uq").on(t.buildingId, t.unitLabel),
  ],
);

export const propertyPhoto = pgTable(
  "property_photo",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id").notNull().references(() => property.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    position: smallint("position").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("property_photo_property_idx").on(t.propertyId, t.position)],
);

export const application = pgTable(
  "application",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id").notNull().references(() => property.id, { onDelete: "cascade" }),
    renterId: text("renter_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    status: applicationStatus("status").notNull().default("submitted"),
    moveInDate: date("move_in_date"),
    leaseMonths: smallint("lease_months"),
    occupants: smallint("occupants").notNull().default(1),
    monthlyIncomePhp: numeric("monthly_income_php", { precision: 12, scale: 2, mode: "number" }),
    employment: text("employment"),
    message: text("message"),
    ownerNotes: text("owner_notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (t) => [
    unique("application_property_renter_uq").on(t.propertyId, t.renterId),
    index("application_renter_idx").on(t.renterId),
    index("application_property_idx").on(t.propertyId, t.status),
  ],
);

// A sub-meter reading. Usage and charge are computed when saved, using the rate in effect then.
export const meterReading = pgTable(
  "meter_reading",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id").notNull().references(() => property.id, { onDelete: "cascade" }),
    utility: utilityKind("utility").notNull(),
    readingDate: date("reading_date").notNull(),
    reading: numeric("reading", { precision: 12, scale: 2, mode: "number" }).notNull(),
    previousReading: numeric("previous_reading", { precision: 12, scale: 2, mode: "number" }),
    previousDate: date("previous_date"),
    consumption: numeric("consumption", { precision: 12, scale: 2, mode: "number" }),
    ratePhp: rate("rate_php"),
    amountPhp: money("amount_php"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique("meter_reading_unique").on(t.propertyId, t.utility, t.readingDate),
    index("meter_reading_property_idx").on(t.propertyId, t.utility, t.readingDate),
  ],
);

// ---------- Relations ----------

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  properties: many(property),
  buildings: many(building),
  applications: many(application),
}));
export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));
export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));
export const buildingRelations = relations(building, ({ one, many }) => ({
  owner: one(user, { fields: [building.ownerId], references: [user.id] }),
  photos: many(buildingPhoto),
  units: many(property),
}));
export const buildingPhotoRelations = relations(buildingPhoto, ({ one }) => ({
  building: one(building, { fields: [buildingPhoto.buildingId], references: [building.id] }),
}));
export const propertyRelations = relations(property, ({ one, many }) => ({
  owner: one(user, { fields: [property.ownerId], references: [user.id] }),
  building: one(building, { fields: [property.buildingId], references: [building.id] }),
  photos: many(propertyPhoto),
  applications: many(application),
  readings: many(meterReading),
}));
export const meterReadingRelations = relations(meterReading, ({ one }) => ({
  property: one(property, { fields: [meterReading.propertyId], references: [property.id] }),
}));
export const propertyPhotoRelations = relations(propertyPhoto, ({ one }) => ({
  property: one(property, { fields: [propertyPhoto.propertyId], references: [property.id] }),
}));
export const applicationRelations = relations(application, ({ one }) => ({
  property: one(property, { fields: [application.propertyId], references: [property.id] }),
  renter: one(user, { fields: [application.renterId], references: [user.id] }),
}));

export type Property = typeof property.$inferSelect;
export type Building = typeof building.$inferSelect;
export type MeterReading = typeof meterReading.$inferSelect;
export type Application = typeof application.$inferSelect;
export type User = typeof user.$inferSelect;

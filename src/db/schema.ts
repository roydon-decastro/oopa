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

export const property = pgTable(
  "property",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (t) => [
    index("property_search_idx").on(t.status, t.city, t.type, t.monthlyRentPhp),
    index("property_owner_idx").on(t.ownerId),
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

// ---------- Relations ----------

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  properties: many(property),
  applications: many(application),
}));
export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));
export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));
export const propertyRelations = relations(property, ({ one, many }) => ({
  owner: one(user, { fields: [property.ownerId], references: [user.id] }),
  photos: many(propertyPhoto),
  applications: many(application),
}));
export const propertyPhotoRelations = relations(propertyPhoto, ({ one }) => ({
  property: one(property, { fields: [propertyPhoto.propertyId], references: [property.id] }),
}));
export const applicationRelations = relations(application, ({ one }) => ({
  property: one(property, { fields: [application.propertyId], references: [property.id] }),
  renter: one(user, { fields: [application.renterId], references: [user.id] }),
}));

export type Property = typeof property.$inferSelect;
export type Application = typeof application.$inferSelect;
export type User = typeof user.$inferSelect;

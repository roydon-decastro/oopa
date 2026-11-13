# Oopa

Rental marketplace for the Philippines: owners list properties, renters browse and apply.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · Neon Postgres · Drizzle ORM · Better Auth · Vercel

## Setup

1. Create a free project at https://neon.tech (region: AWS Asia Pacific (Singapore) is closest to PH).
2. Copy `.env.example` to `.env.local` and fill in `DATABASE_URL` (Neon > Connect, pooled string)
   and `BETTER_AUTH_SECRET` (`openssl rand -base64 32`).
3. `npm install`, then `npm run db:migrate` to create the tables.
4. `npm run dev` and open http://localhost:3000.

Local Postgres also works: any `DATABASE_URL` that isn't a neon.tech host uses the regular `pg` driver.

Updating the live Neon database by hand: run the SQL files in `drizzle/` in the Neon SQL editor.
`drizzle/neon-manual-update-0001-0002.sql` applies buildings + utilities and is safe to re-run.

Changing the schema: edit `src/db/schema.ts`, run `npm run db:generate`, then `npm run db:migrate`.

## Data model

- `user`, `session`, `account`, `verification`: Better Auth tables. `user.role` is `owner` or `renter`.
- `property`: listings with rent in PHP, deposit/advance months, PH address (barangay, city, province).
- `building`, `building_photo`: multi-unit buildings. Each unit is a `property` row with `building_id`, `unit_label` and `floor`; units inherit the building's address, photos and amenities.
- `meter_reading`: electricity/water sub-meter readings per unit, with usage, rate and charge saved at entry time. Utility terms (sub-metered, included, own meter, fixed fee) live on buildings (defaults) and units (overrides).
- `property_photo`: photo URLs. Uploads go to Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set, otherwise to `./.uploads` for local development.
- `application`: a renter's application to a property; owners approve or reject.

Access rules (owners edit only their own listings, renters see only their own applications) are enforced
in server code, since Neon has no built-in row level security tied to logins.

## Roadmap

1. ✅ Project setup
2. ✅ Owner side: sign up, list and manage properties
3. ✅ Renter side: browse, search, apply; owners approve or reject
4. ✅ Launch prep: owner landing page, SEO, terms and privacy (Data Privacy Act of 2012), email alerts

# Oopa

Rental marketplace for the Philippines: owners list properties, renters browse and apply.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres, Auth, Storage) · Vercel

## Setup

1. Create a free project at https://supabase.com (region: Singapore is closest to PH).
2. In the Supabase SQL editor, run `supabase/migrations/0001_init.sql`.
3. Copy `.env.example` to `.env.local` and fill in the URL and anon key from Project Settings > API.
4. `npm install` then `npm run dev` and open http://localhost:3000.

## Data model

- `profiles`: one per user, role `owner` or `renter` (created automatically on sign-up).
- `properties`: listings with rent in PHP, deposit/advance months, PH address (barangay, city, province).
- `property_photos`: photos stored in the public `property-photos` bucket under `<owner_id>/<property_id>/`.
- `applications`: a renter's application to a property; owners approve or reject.

Row level security is on for every table: anyone can read active listings, only owners edit their own
listings, renters only see their own applications, and owners only see applications to their properties.

## Roadmap

1. ✅ Project setup
2. Owner side: list and manage properties
3. Renter side: browse, search and apply
4. Launch: landing page, SEO, terms and privacy (Data Privacy Act of 2012)

import Link from "next/link";
import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { buildingPhoto, property, propertyPhoto } from "@/db/schema";
import { publicListing } from "@/lib/visibility";
import PropertyCard from "@/components/PropertyCard";

export const dynamic = "force-dynamic";

const cities = ["Makati", "Taguig", "Quezon City", "Pasig", "Manila", "Cebu City", "Davao City", "Baguio"];

async function latest() {
  if (!process.env.DATABASE_URL) return [];
  return db.query.property.findMany({
    where: publicListing(),
    orderBy: desc(property.createdAt),
    limit: 6,
    with: {
      photos: { orderBy: asc(propertyPhoto.position), limit: 1, columns: { url: true } },
      building: { columns: { name: true, genderPolicy: true }, with: { photos: { orderBy: asc(buildingPhoto.position), limit: 1, columns: { url: true } } } },
    },
  });
}

export default async function Home() {
  const listings = await latest();
  return (
    <main>
      <section className="bg-gradient-to-b from-emerald-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Find your next home in the Philippines</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Apartments, condos, houses, rooms and bedspaces. See the rent, advance, deposit and how electricity and water are charged before you apply.
          </p>
          <form action="/listings" className="mx-auto mt-8 flex max-w-xl gap-2">
            <input name="city" aria-label="City or area" placeholder="City, barangay or building name"
              className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-4 py-3 focus:border-emerald-600 focus:outline-none" />
            <button className="shrink-0 rounded-md bg-emerald-700 px-4 py-3 font-medium text-white hover:bg-emerald-800 sm:px-6">Search</button>
          </form>
          <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm">
            {cities.map((c) => (
              <Link key={c} href={`/listings?city=${encodeURIComponent(c)}`}
                className="rounded-full border border-slate-300 bg-white px-3 py-1 hover:border-emerald-600 hover:text-emerald-700">{c}</Link>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        {listings.length > 0 && (
          <section className="py-12">
            <div className="flex items-end justify-between">
              <h2 className="text-2xl font-bold">Newly listed</h2>
              <Link href="/listings" className="text-sm font-medium text-emerald-700 hover:underline">See all rentals →</Link>
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((p) => <PropertyCard key={p.id} p={p} />)}
            </div>
          </section>
        )}

        <section className="grid gap-6 py-12 sm:grid-cols-3">
          {[
            ["1", "Search", "Filter by city, budget, type and bedrooms. Every listing shows the full move-in cost."],
            ["2", "Apply online", "Send your move-in date and details to the owner in a couple of minutes. No fees."],
            ["3", "Get a reply", "Track your applications in one place and hear back when the owner decides."],
          ].map(([n, t, d]) => (
            <div key={n} className="rounded-xl border border-slate-200 p-6">
              <span className="flex size-8 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800">{n}</span>
              <h3 className="mt-3 font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-slate-600">{d}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 rounded-2xl bg-emerald-700 p-8 text-white sm:grid-cols-3 sm:items-center">
          <div className="sm:col-span-2">
            <h2 className="text-2xl font-semibold">Own a property or an apartment building?</h2>
            <p className="mt-2 text-emerald-50">
              List for free, receive applications, track occupancy floor by floor, and bill electricity and water from sub-meter readings.
            </p>
          </div>
          <div className="sm:text-right">
            <Link href="/owners" className="inline-block rounded-md bg-white px-6 py-3 font-medium text-emerald-800 hover:bg-emerald-50">For property owners</Link>
          </div>
        </section>
      </div>
    </main>
  );
}

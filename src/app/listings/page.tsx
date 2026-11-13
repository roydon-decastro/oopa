import Link from "next/link";
import { and, asc, count, desc, eq, gte, ilike, lte, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { property, propertyPhoto } from "@/db/schema";
import PropertyCard from "@/components/PropertyCard";
import { PROPERTY_TYPES } from "@/lib/ph";

export const metadata = { title: "Browse rentals · Oopa" };

const PAGE_SIZE = 12;
const SORTS = {
  newest: desc(property.createdAt),
  price_asc: asc(property.monthlyRentPhp),
  price_desc: desc(property.monthlyRentPhp),
};

type Search = { city?: string; type?: string; min?: string; max?: string; beds?: string; sort?: string; page?: string };

const num = (v?: string) => (v && !isNaN(Number(v)) ? Number(v) : undefined);

export default async function ListingsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const page = Math.max(1, num(sp.page) ?? 1);
  const where: SQL[] = [eq(property.status, "active")];
  const q = sp.city?.trim();
  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    where.push(or(ilike(property.city, like), ilike(property.barangay, like), ilike(property.province, like), ilike(property.title, like))!);
  }
  if (sp.type && PROPERTY_TYPES.some(([v]) => v === sp.type)) where.push(eq(property.type, sp.type as typeof property.type.enumValues[number]));
  if (num(sp.min) !== undefined) where.push(gte(property.monthlyRentPhp, num(sp.min)!));
  if (num(sp.max) !== undefined) where.push(lte(property.monthlyRentPhp, num(sp.max)!));
  if (num(sp.beds) !== undefined) where.push(gte(property.bedrooms, num(sp.beds)!));
  const filter = and(...where);
  const sort = SORTS[sp.sort as keyof typeof SORTS] ?? SORTS.newest;

  const [rows, [{ total }]] = await Promise.all([
    db.query.property.findMany({
      where: filter,
      orderBy: sort,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      with: { photos: { orderBy: asc(propertyPhoto.position), limit: 1, columns: { url: true } } },
    }),
    db.select({ total: count() }).from(property).where(filter),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (n: number) => {
    const params = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    params.set("page", String(n));
    return `/listings?${params}`;
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">Rentals{q ? ` in ${q}` : " across the Philippines"}</h1>

      <form className="mt-6 grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-3 lg:grid-cols-7">
        <input className="input lg:col-span-2" name="city" defaultValue={sp.city} placeholder="City, barangay or area" />
        <select className="input" name="type" defaultValue={sp.type ?? ""}>
          <option value="">Any type</option>
          {PROPERTY_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input className="input" name="min" type="number" min={0} defaultValue={sp.min} placeholder="Min ₱" />
        <input className="input" name="max" type="number" min={0} defaultValue={sp.max} placeholder="Max ₱" />
        <select className="input" name="beds" defaultValue={sp.beds ?? ""}>
          <option value="">Any bedrooms</option>
          {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+ BR</option>)}
        </select>
        <select className="input" name="sort" defaultValue={sp.sort ?? "newest"}>
          <option value="newest">Newest</option>
          <option value="price_asc">Lowest price</option>
          <option value="price_desc">Highest price</option>
        </select>
        <div className="flex gap-2 sm:col-span-3 lg:col-span-7">
          <button className="btn">Search</button>
          <Link href="/listings" className="btn-outline">Clear</Link>
        </div>
      </form>

      <p className="mt-6 text-sm text-slate-600">{total} {total === 1 ? "place" : "places"} found</p>

      {rows.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-600">
          No rentals match your search yet. Try a nearby city or a wider price range.
        </div>
      ) : (
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p) => <PropertyCard key={p.id} p={p} />)}
        </div>
      )}

      {pages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-4 text-sm">
          {page > 1 && <Link className="btn-outline" href={pageHref(page - 1)}>← Previous</Link>}
          <span>Page {page} of {pages}</span>
          {page < pages && <Link className="btn-outline" href={pageHref(page + 1)}>Next →</Link>}
        </nav>
      )}
    </main>
  );
}

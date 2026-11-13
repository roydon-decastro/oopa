import Link from "next/link";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { building, buildingPhoto, property, propertyPhoto } from "@/db/schema";
import { requireOwner } from "@/lib/session";
import { formatPHP } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/ph";
import ListingActions from "@/components/ListingActions";

export const metadata = { title: "My listings · Oopa" };

const BANNERS: Record<string, string> = {
  published: "Your listing is live.",
  draft: "Saved as a draft. Publish it when you're ready.",
  updated: "Changes saved.",
  deleted: "Building deleted.",
};

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  active: "bg-emerald-100 text-emerald-800",
  rented: "bg-blue-100 text-blue-800",
  archived: "bg-amber-100 text-amber-800",
};

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { user } = await requireOwner();
  const { saved } = await searchParams;
  const buildings = await db.query.building.findMany({
    where: eq(building.ownerId, user.id),
    orderBy: desc(building.createdAt),
    with: {
      photos: { orderBy: asc(buildingPhoto.position), limit: 1 },
      units: { columns: { status: true, bedsTotal: true, bedsTaken: true }, with: { applications: { columns: { status: true } } } },
    },
  });
  const listings = await db.query.property.findMany({
    where: and(eq(property.ownerId, user.id), isNull(property.buildingId)),
    orderBy: desc(property.createdAt),
    with: { photos: { orderBy: asc(propertyPhoto.position), limit: 1 }, applications: { columns: { id: true } } },
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">My listings</h1>
        <div className="flex gap-2">
          <Link href="/dashboard/applications" className="btn-outline">Applications</Link>
          <Link href="/dashboard/buildings/new" className="btn-outline">+ Add a building</Link>
          <Link href="/dashboard/properties/new" className="btn">+ Add a property</Link>
        </div>
      </div>
      {saved && BANNERS[saved] && (
        <p className="mt-6 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{BANNERS[saved]}</p>
      )}

      {buildings.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Buildings</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {buildings.map((b) => {
              const occupied = b.units.filter((u) => u.status === "rented").length;
              const vacant = b.units.filter((u) => u.status === "active").length;
              const pending = b.units.flatMap((u) => u.applications).filter((a) => a.status === "submitted").length;
              return (
                <Link key={b.id} href={`/dashboard/buildings/${b.id}`} className="flex gap-4 rounded-xl border border-slate-200 p-4 hover:border-emerald-600">
                  <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {b.photos[0] && <img src={b.photos[0].url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{b.name}</p>
                    <p className="text-sm text-slate-600">{b.city}, {b.province}</p>
                    <p className="mt-1 text-sm">
                      {b.isDormitory ? (() => {
                        const beds = b.units.reduce((n, u) => n + (u.bedsTotal ?? 0), 0);
                        const taken = b.units.reduce((n, u) => n + Math.min(u.bedsTaken, u.bedsTotal ?? 0), 0);
                        return <>{b.units.length} rooms · <span className="text-blue-800">{taken}/{beds} beds taken</span> · <span className="text-emerald-800">{beds - taken} free</span></>;
                      })() : <>{b.units.length} units · <span className="text-blue-800">{occupied} occupied</span> · <span className="text-emerald-800">{vacant} vacant</span></>}
                    </p>
                    {pending > 0 && <p className="mt-1 text-xs font-medium text-amber-800">{pending} new application{pending > 1 ? "s" : ""}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {buildings.length > 0 && listings.length > 0 && <h2 className="mt-10 text-xl font-semibold">Other properties</h2>}
      {listings.length === 0 && buildings.length > 0 ? null : listings.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-lg font-medium">You haven&apos;t listed a property yet</p>
          <p className="mt-1 text-slate-600">Add a single house or condo, or a whole apartment building with many units.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/dashboard/properties/new" className="btn">Add a property</Link>
            <Link href="/dashboard/buildings/new" className="btn-outline">Add a building</Link>
          </div>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-slate-200 rounded-xl border border-slate-200">
          {listings.map((l) => (
            <li key={l.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div className="aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:w-36">
                {l.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.photos[0].url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">No photo</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[l.status]}`}>
                    {STATUS_LABEL[l.status]}
                  </span>
                  {l.removedAt && (
                    <Link href={`/dashboard/properties/${l.id}/edit`} className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 hover:underline">
                      Taken down by Oopa · see why
                    </Link>
                  )}
                  <Link href={`/dashboard/applications?property=${l.id}`} className="text-xs text-slate-500 underline hover:text-emerald-700">
                    {l.applications.length} application{l.applications.length === 1 ? "" : "s"}
                  </Link>
                </div>
                <Link href={`/listings/${l.id}`} className="mt-1 block truncate font-semibold hover:text-emerald-700">{l.title}</Link>
                <p className="text-sm text-slate-600">
                  {formatPHP(l.monthlyRentPhp)}{l.bedsTotal != null ? "/bed" : ""}/mo · {[l.barangay, l.city, l.province].filter(Boolean).join(", ")}
                </p>
              </div>
              <ListingActions id={l.id} status={l.status} beds={l.bedsTotal != null ? { total: l.bedsTotal, taken: l.bedsTaken } : null} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

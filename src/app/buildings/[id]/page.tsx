import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { db } from "@/db";
import { building, buildingPhoto, property, propertyPhoto } from "@/db/schema";
import { getSession } from "@/lib/session";
import { formatPHP } from "@/lib/format";
import { describeTerms, effectiveTerms } from "@/lib/utilities";

const isUuid = (s: string) => /^[0-9a-f-]{36}$/.test(s);

async function load(id: string) {
  if (!isUuid(id)) return null;
  return db.query.building.findFirst({
    where: eq(building.id, id),
    with: {
      photos: { orderBy: asc(buildingPhoto.position) },
      owner: { columns: { name: true } },
      units: {
        where: eq(property.status, "active"),
        orderBy: [asc(property.floor), asc(property.unitLabel)],
        with: { photos: { orderBy: asc(propertyPhoto.position), limit: 1 } },
      },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const b = await load((await params).id);
  if (!b) return { title: "Building not found · Oopa" };
  const from = b.units.length ? ` from ${formatPHP(Math.min(...b.units.map((u) => u.monthlyRentPhp)))}/mo` : "";
  return {
    title: `${b.name}, ${b.city}: units for rent${from} · Oopa`,
    description: b.description.slice(0, 160),
    openGraph: { images: b.photos[0] ? [b.photos[0].url] : [] },
  };
}

export default async function BuildingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [b, session] = await Promise.all([load(id), getSession()]);
  if (!b) notFound();
  const isOwner = session?.user.id === b.ownerId;
  const total = await db.$count(property, and(eq(property.buildingId, b.id)));
  if (!isOwner && b.units.length === 0 && total === 0) notFound();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/listings" className="text-sm text-slate-500 hover:text-emerald-700">← All rentals</Link>

      <div className="mt-4 grid max-h-[420px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl">
        {b.photos.length === 0 && <div className="col-span-4 row-span-2 flex aspect-[16/6] items-center justify-center bg-slate-100 text-slate-400">No photos yet</div>}
        {b.photos.slice(0, 5).map((ph, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={ph.id} src={ph.url} alt=""
            className={`h-full w-full object-cover ${i === 0 ? (b.photos.length === 1 ? "col-span-4 row-span-2" : "col-span-4 row-span-2 sm:col-span-2") : "hidden sm:block"}`} />
        ))}
      </div>

      <h1 className="mt-6 text-3xl font-bold">{b.name}</h1>
      <p className="mt-1 text-slate-600">{[b.street, b.barangay, b.city, b.province].filter(Boolean).join(", ")}</p>
      <p className="mt-1 text-sm text-slate-500">{b.floors} floor{b.floors > 1 ? "s" : ""} · {total} units · managed by {b.owner.name}</p>

      <div className="mt-8 grid gap-10 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="text-xl font-semibold">
            {b.units.length ? `${b.units.length} unit${b.units.length > 1 ? "s" : ""} available` : "No units available right now"}
          </h2>
          {b.units.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr><th className="p-3">Unit</th><th className="p-3">Floor</th><th className="p-3">Layout</th><th className="hidden p-3 sm:table-cell">Size</th><th className="p-3">Rent</th><th className="p-3"></th></tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {b.units.map((u) => (
                    <tr key={u.id}>
                      <td className="p-3 font-semibold">{u.unitLabel}</td>
                      <td className="p-3">{u.floor}</td>
                      <td className="p-3">{u.bedrooms === 0 ? "Studio" : `${u.bedrooms} BR`} · {u.bathrooms} bath</td>
                      <td className="hidden p-3 sm:table-cell">{u.floorAreaSqm ? `${u.floorAreaSqm} sqm` : "—"}</td>
                      <td className="p-3 font-medium text-emerald-800">{formatPHP(u.monthlyRentPhp)}</td>
                      <td className="p-3 text-right"><Link href={`/listings/${u.id}`} className="btn px-3 py-1.5 text-sm">View & apply</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {b.description && (
            <>
              <h2 className="mt-10 text-xl font-semibold">About the building</h2>
              <p className="mt-2 whitespace-pre-line text-slate-700">{b.description}</p>
            </>
          )}
        </section>
        <aside className="h-fit space-y-6 rounded-2xl border border-slate-200 p-6">
          <div>
            <h2 className="font-semibold">Utilities</h2>
            <dl className="mt-2 space-y-1 text-sm text-slate-700">
              {(["electricity", "water"] as const).map((u) => (
                <div key={u}><dt className="inline font-medium">{u === "electricity" ? "⚡ Electricity: " : "💧 Water: "}</dt>
                  <dd className="inline">{describeTerms(effectiveTerms(b, null, u), u) ?? "Ask the owner"}</dd></div>
              ))}
            </dl>
          </div>
          {b.amenities.length > 0 && (
            <div>
              <h2 className="font-semibold">Building amenities</h2>
              <ul className="mt-3 space-y-1 text-slate-700">{b.amenities.map((a) => <li key={a}>✓ {a}</li>)}</ul>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

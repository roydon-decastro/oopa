import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { building, buildingPhoto, property } from "@/db/schema";
import { requireOwner } from "@/lib/session";
import UnitGrid from "@/components/UnitGrid";

export const metadata = { title: "Building · Oopa" };

export default async function BuildingDashboard({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; saved?: string }> }) {
  const { id } = await params;
  const { created, saved } = await searchParams;
  const { user } = await requireOwner(`/dashboard/buildings/${id}`);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const b = await db.query.building.findFirst({
    where: and(eq(building.id, id), eq(building.ownerId, user.id)),
    with: {
      photos: { orderBy: asc(buildingPhoto.position), limit: 1 },
      units: { orderBy: [asc(property.floor), asc(property.unitLabel)], with: { applications: { columns: { status: true } } } },
    },
  });
  if (!b) notFound();
  const units = b.units.map((u) => ({
    id: u.id, unitLabel: u.unitLabel, floor: u.floor, status: u.status, monthlyRentPhp: u.monthlyRentPhp, bedrooms: u.bedrooms,
    removed: !!u.removedAt,
    pending: u.applications.filter((a) => a.status === "submitted").length,
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/dashboard" className="text-sm text-slate-500 hover:text-emerald-700">← My listings</Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {b.photos[0] && <img src={b.photos[0].url} alt="" className="h-full w-full object-cover" />}
          </div>
          <div>
            <h1 className="text-3xl font-bold">{b.name}</h1>
            <p className="text-slate-600">{[b.street, b.barangay, b.city, b.province].filter(Boolean).join(", ")}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/dashboard/buildings/${b.id}/meters`} className="btn">⚡💧 Meter readings</Link>
          <Link href={`/buildings/${b.id}`} className="btn-outline">View public page</Link>
          <Link href={`/dashboard/buildings/${b.id}/edit`} className="btn-outline">Edit building</Link>
        </div>
      </div>
      {created && (
        <p className="mt-6 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Created {created} units. Tick the occupied ones and click <strong>Mark occupied</strong>, then list the vacant ones.
        </p>
      )}
      {saved && <p className="mt-6 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Changes saved.</p>}
      <div className="mt-8">
        <UnitGrid buildingId={b.id} units={units} />
      </div>
    </main>
  );
}

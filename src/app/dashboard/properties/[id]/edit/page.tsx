import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { property, propertyPhoto } from "@/db/schema";
import PropertyForm from "@/components/PropertyForm";
import PhotoManager from "@/components/PhotoManager";
import { deletePhotos, updateProperty } from "@/app/dashboard/actions";
import { requireOwner } from "@/lib/session";
import { CONTACT_EMAIL } from "@/lib/site";
import { describeTerms, effectiveTerms } from "@/lib/utilities";

export const metadata = { title: "Edit property · Oopa" };

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireOwner(`/dashboard/properties/${id}/edit`);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const row = await db.query.property.findFirst({
    where: and(eq(property.id, id), eq(property.ownerId, user.id)),
    with: { photos: { orderBy: asc(propertyPhoto.position) }, building: true },
  });
  if (!row) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      {row.building ? (
        <Link href={`/dashboard/buildings/${row.building.id}`} className="text-sm text-slate-500 hover:text-emerald-700">← {row.building.name}</Link>
      ) : (
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-emerald-700">← My listings</Link>
      )}
      <div className="mb-8 mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{row.building ? `Edit unit ${row.unitLabel}` : "Edit property"}</h1>
        <Link href={`/dashboard/properties/${row.id}/utilities`} className="btn-outline">⚡💧 Utility bills</Link>
      </div>
      {row.removedAt && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">This listing was taken down by Oopa and is hidden from renters.</p>
          {row.removedReason && <p className="mt-1">Reason: {row.removedReason}</p>}
          <p className="mt-1">You can still edit it, but renters won&apos;t see it until Oopa restores it. If you think this is a mistake, email {CONTACT_EMAIL}.</p>
        </div>
      )}
      {row.photos.length > 0 && <PhotoManager photos={row.photos} onDelete={deletePhotos.bind(null, row.id)} />}
      <PropertyForm action={updateProperty.bind(null, row.id)} initial={row} existingPhotoCount={row.photos.length} buildingName={row.building?.name}
        buildingUtilities={row.building ? {
          electricity: describeTerms(effectiveTerms(row.building, null, "electricity"), "electricity"),
          water: describeTerms(effectiveTerms(row.building, null, "water"), "water"),
        } : undefined} />
    </main>
  );
}

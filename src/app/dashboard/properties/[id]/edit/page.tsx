import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { property, propertyPhoto } from "@/db/schema";
import PropertyForm from "@/components/PropertyForm";
import PhotoManager from "@/components/PhotoManager";
import { updateProperty } from "@/app/dashboard/actions";
import { requireOwner } from "@/lib/session";

export const metadata = { title: "Edit property · Oopa" };

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireOwner(`/dashboard/properties/${id}/edit`);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const row = await db.query.property.findFirst({
    where: and(eq(property.id, id), eq(property.ownerId, user.id)),
    with: { photos: { orderBy: asc(propertyPhoto.position) } },
  });
  if (!row) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/dashboard" className="text-sm text-slate-500 hover:text-emerald-700">← My listings</Link>
      <h1 className="mb-8 mt-2 text-3xl font-bold">Edit property</h1>
      {row.photos.length > 0 && <PhotoManager propertyId={row.id} photos={row.photos} />}
      <PropertyForm action={updateProperty.bind(null, row.id)} initial={row} existingPhotoCount={row.photos.length} />
    </main>
  );
}

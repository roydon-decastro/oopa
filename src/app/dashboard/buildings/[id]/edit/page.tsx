import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { building, buildingPhoto } from "@/db/schema";
import BuildingForm from "@/components/BuildingForm";
import PhotoManager from "@/components/PhotoManager";
import DeleteBuilding from "@/components/DeleteBuilding";
import { deleteBuildingPhotos, updateBuilding } from "@/app/dashboard/buildings/actions";
import { requireOwner } from "@/lib/session";

export const metadata = { title: "Edit building · Oopa" };

export default async function EditBuildingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireOwner(`/dashboard/buildings/${id}/edit`);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const b = await db.query.building.findFirst({
    where: and(eq(building.id, id), eq(building.ownerId, user.id)),
    with: { photos: { orderBy: asc(buildingPhoto.position) } },
  });
  if (!b) notFound();
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href={`/dashboard/buildings/${id}`} className="text-sm text-slate-500 hover:text-emerald-700">← {b.name}</Link>
      <h1 className="mb-8 mt-2 text-3xl font-bold">Edit building</h1>
      {b.photos.length > 0 && <PhotoManager photos={b.photos} onDelete={deleteBuildingPhotos.bind(null, b.id)} />}
      <BuildingForm action={updateBuilding.bind(null, b.id)} initial={b} />
      <DeleteBuilding id={b.id} />
    </main>
  );
}

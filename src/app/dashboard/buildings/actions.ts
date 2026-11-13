"use server";

import { and, asc, eq, inArray, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { building, buildingPhoto, property, propertyPhoto } from "@/db/schema";
import { requireOwner } from "@/lib/session";
import { checkPhotos, photosFrom } from "@/lib/photos";
import { deletePhoto as removeFile, uploadPhoto } from "@/lib/storage";

export type BuildingFormState = { error?: string } | undefined;

const BuildingInput = z.object({
  name: z.string().trim().min(2, "Enter the building name.").max(120),
  description: z.string().trim().max(5000).default(""),
  street: z.string().trim().max(200).optional(),
  barangay: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2, "Enter the city or municipality.").max(120),
  province: z.string().trim().min(2, "Choose a province.").max(120),
  amenities: z.array(z.string().max(60)).max(30),
});

const opt = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().min(0).optional());

// Defaults applied to every generated unit; each unit can be edited afterwards.
const UnitTemplate = z.object({
  floors: z.coerce.number().int().min(1, "At least 1 floor.").max(60),
  unitsPerFloor: z.coerce.number().int().min(1, "At least 1 unit per floor.").max(40),
  type: z.enum(["condo", "apartment", "house", "townhouse", "room", "bedspace", "commercial"]),
  monthlyRentPhp: z.coerce.number({ message: "Enter the monthly rent." }).positive("Monthly rent must be more than ₱0."),
  depositMonths: z.coerce.number().int().min(0).max(12),
  advanceMonths: z.coerce.number().int().min(0).max(12),
  bedrooms: z.coerce.number().int().min(0).max(50),
  bathrooms: z.coerce.number().int().min(0).max(50),
  floorAreaSqm: opt,
  furnishing: z.preprocess((v) => v || undefined, z.enum(["unfurnished", "semi", "fully"]).optional()),
  petsAllowed: z.preprocess((v) => v === "on", z.boolean()),
  minLeaseMonths: z.coerce.number().int().min(1).max(120),
  publish: z.preprocess((v) => v === "on", z.boolean()),
});

const titleFor = (buildingName: string, label: string) => `${buildingName} – Unit ${label}`;
const labelFor = (floor: number, n: number) => `${floor}${String(n).padStart(2, "0")}`;

function parseBuilding(formData: FormData) {
  return BuildingInput.safeParse({ ...Object.fromEntries(formData), amenities: formData.getAll("amenities").map(String) });
}

async function ownedBuilding(id: string, ownerId: string) {
  const row = await db.query.building.findFirst({
    where: and(eq(building.id, id), eq(building.ownerId, ownerId)),
    with: { photos: true },
  });
  if (!row) throw new Error("Building not found.");
  return row;
}

async function saveBuildingPhotos(buildingId: string, ownerId: string, files: File[]) {
  if (!files.length) return;
  const [{ top }] = await db.select({ top: max(buildingPhoto.position) }).from(buildingPhoto).where(eq(buildingPhoto.buildingId, buildingId));
  let pos = (top ?? -1) + 1;
  for (const file of files) {
    const url = await uploadPhoto(file, `${ownerId}/buildings/${buildingId}`);
    await db.insert(buildingPhoto).values({ buildingId, url, position: pos++ });
  }
}

export async function createBuilding(_prev: BuildingFormState, formData: FormData): Promise<BuildingFormState> {
  const { user } = await requireOwner();
  const b = parseBuilding(formData);
  if (!b.success) return { error: b.error.issues[0].message };
  const t = UnitTemplate.safeParse(Object.fromEntries(formData));
  if (!t.success) return { error: t.error.issues[0].message };
  if (t.data.floors * t.data.unitsPerFloor > 500) return { error: "That's more than 500 units. Please contact us for very large buildings." };
  const files = photosFrom(formData);
  const photoErr = checkPhotos(files);
  if (photoErr) return { error: photoErr };

  const { floors, unitsPerFloor, publish, ...unit } = t.data;
  const [row] = await db.insert(building).values({ ...b.data, ownerId: user.id, floors }).returning({ id: building.id });

  const units = [];
  for (let f = 1; f <= floors; f++) {
    for (let n = 1; n <= unitsPerFloor; n++) {
      const label = labelFor(f, n);
      units.push({
        ...unit,
        ownerId: user.id,
        buildingId: row.id,
        unitLabel: label,
        floor: f,
        title: titleFor(b.data.name, label),
        status: publish ? ("active" as const) : ("draft" as const),
        street: b.data.street,
        barangay: b.data.barangay,
        city: b.data.city,
        province: b.data.province,
      });
    }
  }
  await db.insert(property).values(units);
  await saveBuildingPhotos(row.id, user.id, files);
  revalidatePath("/dashboard");
  redirect(`/dashboard/buildings/${row.id}?created=${units.length}`);
}

export async function updateBuilding(id: string, _prev: BuildingFormState, formData: FormData): Promise<BuildingFormState> {
  const { user } = await requireOwner();
  const existing = await ownedBuilding(id, user.id);
  const b = parseBuilding(formData);
  if (!b.success) return { error: b.error.issues[0].message };
  const files = photosFrom(formData);
  const photoErr = checkPhotos(files, existing.photos.length);
  if (photoErr) return { error: photoErr };

  await db.update(building).set(b.data).where(eq(building.id, id));
  // Keep every unit's address and title in sync with the building.
  const units = await db.select({ id: property.id, unitLabel: property.unitLabel }).from(property).where(eq(property.buildingId, id));
  for (const u of units) {
    await db.update(property).set({
      title: titleFor(b.data.name, u.unitLabel ?? ""),
      street: b.data.street, barangay: b.data.barangay, city: b.data.city, province: b.data.province,
    }).where(eq(property.id, u.id));
  }
  await saveBuildingPhotos(id, user.id, files);
  revalidatePath(`/dashboard/buildings/${id}`);
  revalidatePath(`/buildings/${id}`);
  redirect(`/dashboard/buildings/${id}?saved=1`);
}

/** Adds one unit, copying rent and size from the most similar existing unit (same position on the floor below). */
export async function addUnit(buildingId: string, _prev: BuildingFormState, formData: FormData): Promise<BuildingFormState> {
  const { user } = await requireOwner();
  const b = await ownedBuilding(buildingId, user.id);
  const label = String(formData.get("unitLabel") ?? "").trim();
  const floor = Number(formData.get("floor"));
  if (!label || label.length > 20) return { error: "Enter a unit number, e.g. 106." };
  if (!Number.isInteger(floor) || floor < 1 || floor > 200) return { error: "Enter a valid floor number." };

  const siblings = await db.query.property.findMany({ where: eq(property.buildingId, buildingId), orderBy: asc(property.unitLabel) });
  if (siblings.some((s) => s.unitLabel === label)) return { error: `Unit ${label} already exists.` };
  const template = siblings.find((s) => s.unitLabel?.slice(-2) === label.slice(-2)) ?? siblings[0];

  await db.insert(property).values({
    ownerId: user.id, buildingId, unitLabel: label, floor, title: titleFor(b.name, label), status: "draft",
    type: template?.type ?? "apartment",
    monthlyRentPhp: template?.monthlyRentPhp ?? 0.01,
    depositMonths: template?.depositMonths ?? 2, advanceMonths: template?.advanceMonths ?? 1,
    bedrooms: template?.bedrooms ?? 1, bathrooms: template?.bathrooms ?? 1,
    floorAreaSqm: template?.floorAreaSqm, furnishing: template?.furnishing, petsAllowed: template?.petsAllowed ?? false,
    minLeaseMonths: template?.minLeaseMonths ?? 12,
    street: b.street, barangay: b.barangay, city: b.city, province: b.province,
  });
  if (floor > b.floors) await db.update(building).set({ floors: floor }).where(eq(building.id, buildingId));
  revalidatePath(`/dashboard/buildings/${buildingId}`);
  return undefined;
}

export async function setUnitsStatus(buildingId: string, unitIds: string[], status: "draft" | "active" | "rented") {
  const { user } = await requireOwner();
  await ownedBuilding(buildingId, user.id);
  if (!unitIds.length) return;
  await db.update(property).set({ status })
    .where(and(eq(property.buildingId, buildingId), inArray(property.id, unitIds)));
  revalidatePath(`/dashboard/buildings/${buildingId}`);
}

export async function setUnitsRent(buildingId: string, unitIds: string[], rent: number) {
  const { user } = await requireOwner();
  await ownedBuilding(buildingId, user.id);
  if (!unitIds.length || !(rent > 0) || rent > 10_000_000) return;
  await db.update(property).set({ monthlyRentPhp: rent })
    .where(and(eq(property.buildingId, buildingId), inArray(property.id, unitIds)));
  revalidatePath(`/dashboard/buildings/${buildingId}`);
}

export async function deleteBuilding(id: string) {
  const { user } = await requireOwner();
  const b = await ownedBuilding(id, user.id);
  const unitPhotos = await db.select({ url: propertyPhoto.url }).from(propertyPhoto)
    .innerJoin(property, eq(property.id, propertyPhoto.propertyId)).where(eq(property.buildingId, id));
  await db.delete(building).where(eq(building.id, id));
  await Promise.all([...b.photos, ...unitPhotos].map((p) => removeFile(p.url)));
  revalidatePath("/dashboard");
  redirect("/dashboard?saved=deleted");
}

export async function deleteBuildingPhotos(buildingId: string, photoIds: string[]) {
  const { user } = await requireOwner();
  await ownedBuilding(buildingId, user.id);
  const rows = await db.delete(buildingPhoto)
    .where(and(eq(buildingPhoto.buildingId, buildingId), inArray(buildingPhoto.id, photoIds))).returning();
  await Promise.all(rows.map((p) => removeFile(p.url)));
  revalidatePath(`/dashboard/buildings/${buildingId}/edit`);
}

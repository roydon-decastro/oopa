"use server";

import { and, eq, inArray, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { building, property, propertyPhoto, user } from "@/db/schema";
import { requireOwner, requireUser } from "@/lib/session";
import { uploadPhoto, deletePhoto as removeFile } from "@/lib/storage";
import { checkPhotos, photosFrom } from "@/lib/photos";
import { parseUtilities } from "@/lib/utility-input";
import { auth } from "@/lib/auth";
import { parseBeds, parseRules, statusForBeds } from "@/lib/dorm";

export type FormState = { error?: string } | undefined;

const optionalNum = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().min(0).optional());

const PropertyInput = z.object({
  title: z.string().trim().min(5, "Title should be at least 5 characters.").max(120),
  description: z.string().trim().max(5000).default(""),
  type: z.enum(["condo", "apartment", "house", "townhouse", "room", "bedspace", "commercial"]),
  monthlyRentPhp: z.coerce.number({ message: "Enter the monthly rent." }).positive("Monthly rent must be more than ₱0."),
  depositMonths: z.coerce.number().int().min(0).max(12),
  advanceMonths: z.coerce.number().int().min(0).max(12),
  bedrooms: z.coerce.number().int().min(0).max(50),
  bathrooms: z.coerce.number().int().min(0).max(50),
  floorAreaSqm: optionalNum,
  furnishing: z.preprocess((v) => v || undefined, z.enum(["unfurnished", "semi", "fully"]).optional()),
  petsAllowed: z.preprocess((v) => v === "on", z.boolean()),
  minLeaseMonths: z.coerce.number().int().min(1).max(120),
  availableFrom: z.preprocess((v) => v || undefined, z.string().date().optional()),
  street: z.string().trim().max(200).optional(),
  barangay: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2, "Enter the city or municipality.").max(120),
  province: z.string().trim().min(2, "Choose a province.").max(120),
  amenities: z.array(z.string().max(60)).max(30),
});

function parse(formData: FormData) {
  return PropertyInput.safeParse({
    ...Object.fromEntries(formData),
    amenities: formData.getAll("amenities").map(String),
  });
}

async function savePhotos(propertyId: string, ownerId: string, files: File[]) {
  if (!files.length) return;
  const [{ top }] = await db
    .select({ top: max(propertyPhoto.position) })
    .from(propertyPhoto)
    .where(eq(propertyPhoto.propertyId, propertyId));
  let pos = (top ?? -1) + 1;
  for (const file of files) {
    const url = await uploadPhoto(file, `${ownerId}/${propertyId}`);
    await db.insert(propertyPhoto).values({ propertyId, url, position: pos++ });
  }
}

async function ownedProperty(id: string, ownerId: string) {
  const row = await db.query.property.findFirst({
    where: and(eq(property.id, id), eq(property.ownerId, ownerId)),
    with: { photos: true },
  });
  if (!row) throw new Error("Property not found.");
  return row;
}

export async function createProperty(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user: me } = await requireOwner();
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const util = parseUtilities(formData, true);
  if ("error" in util) return { error: util.error };
  const files = photosFrom(formData);
  const photoErr = checkPhotos(files);
  if (photoErr) return { error: photoErr };

  const beds = parseBeds(formData, parsed.data.type);
  if ("error" in beds) return { error: beds.error };
  const rules = parseRules(formData);

  const publish = formData.get("intent") === "publish";
  const [row] = await db
    .insert(property)
    .values({ ...parsed.data, ...util.data, ...beds, ...rules, ownerId: me.id, status: statusForBeds(publish ? "active" : "draft", beds) })
    .returning({ id: property.id });
  await savePhotos(row.id, me.id, files);
  revalidatePath("/dashboard");
  redirect(`/dashboard?saved=${publish ? "published" : "draft"}`);
}

export async function updateProperty(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { user: me } = await requireOwner();
  const existing = await ownedProperty(id, me.id);

  // Units in a building take their title and address from the building.
  let unitFields: { unitLabel: string; floor: number } | undefined;
  if (existing.buildingId) {
    const b = await db.query.building.findFirst({ where: eq(building.id, existing.buildingId) });
    if (!b) return { error: "Building not found." };
    const label = String(formData.get("unitLabel") ?? existing.unitLabel ?? "").trim();
    const floor = Number(formData.get("floor") ?? existing.floor);
    if (!label || label.length > 20) return { error: "Enter a unit number." };
    if (!Number.isInteger(floor) || floor < 1 || floor > 200) return { error: "Enter a valid floor number." };
    if (label !== existing.unitLabel) {
      const clash = await db.query.property.findFirst({
        where: and(eq(property.buildingId, b.id), eq(property.unitLabel, label)),
      });
      if (clash) return { error: `Unit ${label} already exists in this building.` };
    }
    unitFields = { unitLabel: label, floor };
    formData.set("title", `${b.name} – Unit ${label}`);
    for (const k of ["street", "barangay", "city", "province"] as const) formData.set(k, b[k] ?? "");
  }

  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const util = parseUtilities(formData, true);
  if ("error" in util) return { error: util.error };
  const files = photosFrom(formData);
  const photoErr = checkPhotos(files, existing.photos.length);
  if (photoErr) return { error: photoErr };

  const beds = parseBeds(formData, parsed.data.type);
  if ("error" in beds) return { error: beds.error };
  const rules = parseRules(formData);

  const intent = formData.get("intent");
  const status = statusForBeds(intent === "publish" ? "active" : intent === "draft" ? "draft" : existing.status, beds);
  await db.update(property).set({ ...parsed.data, ...util.data, ...unitFields, ...beds, ...rules, status }).where(eq(property.id, id));
  await savePhotos(id, me.id, files);
  revalidatePath("/dashboard");
  revalidatePath(`/listings/${id}`);
  if (existing.buildingId) {
    revalidatePath(`/dashboard/buildings/${existing.buildingId}`);
    redirect(`/dashboard/buildings/${existing.buildingId}?saved=1`);
  }
  redirect("/dashboard?saved=updated");
}

export async function setStatus(id: string, status: "draft" | "active" | "rented" | "archived") {
  const { user: me } = await requireOwner();
  const row = await ownedProperty(id, me.id);
  if (row.bedsTotal != null) {
    // Per-bed rooms: "Mark rented" fills every bed; relisting a full room frees them all.
    const bedsTaken = status === "rented" ? row.bedsTotal
      : status === "active" && row.bedsTaken >= row.bedsTotal ? 0 : row.bedsTaken;
    await db.update(property).set({ bedsTaken, status: statusForBeds(status, { bedsTotal: row.bedsTotal, bedsTaken }) })
      .where(eq(property.id, id));
  } else {
    await db.update(property).set({ status }).where(eq(property.id, id));
  }
  revalidatePath("/dashboard");
}

/** One bed more (+1) or less (-1) taken in a per-bed room. Publishes or hides the room as it fills up or frees up. */
export async function adjustBeds(id: string, delta: 1 | -1) {
  const { user: me } = await requireOwner();
  const row = await ownedProperty(id, me.id);
  if (row.bedsTotal == null) return;
  const bedsTaken = Math.min(row.bedsTotal, Math.max(0, row.bedsTaken + delta));
  await db.update(property).set({ bedsTaken, status: statusForBeds(row.status, { bedsTotal: row.bedsTotal, bedsTaken }) })
    .where(eq(property.id, id));
  revalidatePath("/dashboard");
  revalidatePath(`/listings/${id}`);
  if (row.buildingId) revalidatePath(`/dashboard/buildings/${row.buildingId}`);
}

export async function deleteProperty(id: string) {
  const { user: me } = await requireOwner();
  const row = await ownedProperty(id, me.id);
  await db.delete(property).where(eq(property.id, id));
  await Promise.all(row.photos.map((p) => removeFile(p.url)));
  revalidatePath("/dashboard");
}

export async function deletePhotos(propertyId: string, photoIds: string[]) {
  const { user: me } = await requireOwner();
  await ownedProperty(propertyId, me.id);
  const rows = await db
    .delete(propertyPhoto)
    .where(and(eq(propertyPhoto.propertyId, propertyId), inArray(propertyPhoto.id, photoIds)))
    .returning();
  await Promise.all(rows.map((p) => removeFile(p.url)));
  revalidatePath(`/dashboard/properties/${propertyId}/edit`);
}

export async function becomeOwner() {
  const session = await requireUser("/owners");
  await db.update(user).set({ role: "owner" }).where(eq(user.id, session.user.id));
  // Refresh the cached session so the new role shows up immediately.
  await auth.api.getSession({ headers: await headers(), query: { disableCookieCache: true } });
  redirect("/dashboard");
}

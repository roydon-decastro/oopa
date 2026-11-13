"use server";

import { and, desc, eq, inArray, lt, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { meterReading, property } from "@/db/schema";
import { requireOwner } from "@/lib/session";
import { charge, effectiveTerms } from "@/lib/utilities";

export type ReadingsState = { error?: string; saved?: number } | undefined;

const Input = z.object({
  utility: z.enum(["electricity", "water"]),
  readingDate: z.string().date("Choose the reading date."),
});

/**
 * Saves one reading per unit for a date. Usage = this reading − the unit's previous reading;
 * charge = usage × the unit's current rate (with the water minimum, if any). Blank rows are skipped.
 */
export async function saveReadings(propertyIds: string[], _prev: ReadingsState, formData: FormData): Promise<ReadingsState> {
  const { user } = await requireOwner();
  const parsed = Input.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { utility, readingDate } = parsed.data;
  if (readingDate > new Date(Date.now() + 864e5).toISOString().slice(0, 10)) return { error: "The reading date can't be in the future." };

  const units = await db.query.property.findMany({
    where: and(inArray(property.id, propertyIds), eq(property.ownerId, user.id)),
    with: { building: true },
  });

  let saved = 0;
  for (const u of units) {
    const raw = String(formData.get(`reading_${u.id}`) ?? "").trim();
    if (raw === "") continue;
    const reading = Number(raw);
    const label = u.unitLabel ? `Unit ${u.unitLabel}` : u.title;
    if (!Number.isFinite(reading) || reading < 0) return { error: `${label}: enter a valid meter reading.` };

    const later = await db.query.meterReading.findFirst({
      where: and(eq(meterReading.propertyId, u.id), eq(meterReading.utility, utility), gt(meterReading.readingDate, readingDate)),
    });
    if (later) return { error: `${label}: there's already a later reading (${later.readingDate}). Delete it first to enter an older one.` };

    const prev = await db.query.meterReading.findFirst({
      where: and(eq(meterReading.propertyId, u.id), eq(meterReading.utility, utility), lt(meterReading.readingDate, readingDate)),
      orderBy: desc(meterReading.readingDate),
    });
    if (prev && reading < prev.reading) {
      return { error: `${label}: ${reading} is lower than the previous reading (${prev.reading}). Check the meter, or delete the previous reading if the meter was replaced.` };
    }
    const terms = effectiveTerms(u, u.building, utility);
    const consumption = prev ? Math.round((reading - prev.reading) * 100) / 100 : null;
    const amountPhp = consumption != null ? charge(consumption, terms) : null;
    const values = {
      propertyId: u.id, utility, readingDate, reading,
      previousReading: prev?.reading ?? null, previousDate: prev?.readingDate ?? null,
      consumption, ratePhp: terms.ratePhp, amountPhp,
    };
    await db.insert(meterReading).values(values)
      .onConflictDoUpdate({ target: [meterReading.propertyId, meterReading.utility, meterReading.readingDate], set: values });
    saved++;
    revalidatePath(`/dashboard/properties/${u.id}/utilities`);
    if (u.buildingId) revalidatePath(`/dashboard/buildings/${u.buildingId}/meters`);
  }
  if (saved === 0) return { error: "Enter at least one reading." };
  return { saved };
}

/** Only a unit's latest reading can be deleted, so earlier usage figures stay consistent. */
export async function deleteReading(id: string) {
  const { user } = await requireOwner();
  const r = await db.query.meterReading.findFirst({ where: eq(meterReading.id, id), with: { property: true } });
  if (!r || r.property.ownerId !== user.id) throw new Error("Reading not found.");
  const newer = await db.query.meterReading.findFirst({
    where: and(eq(meterReading.propertyId, r.propertyId), eq(meterReading.utility, r.utility), gt(meterReading.readingDate, r.readingDate)),
  });
  if (newer) throw new Error("Only the latest reading can be deleted.");
  await db.delete(meterReading).where(eq(meterReading.id, id));
  revalidatePath(`/dashboard/properties/${r.propertyId}/utilities`);
  if (r.property.buildingId) revalidatePath(`/dashboard/buildings/${r.property.buildingId}/meters`);
}

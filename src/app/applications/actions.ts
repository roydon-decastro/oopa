"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { application, property } from "@/db/schema";
import { requireOwner, requireUser } from "@/lib/session";

export type ApplyState = { error?: string } | undefined;

const ApplyInput = z.object({
  moveInDate: z.string().date("Choose your preferred move-in date."),
  leaseMonths: z.coerce.number().int().min(1).max(120),
  occupants: z.coerce.number().int().min(1, "At least 1 occupant.").max(30),
  monthlyIncomePhp: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().min(0).optional()),
  employment: z.string().trim().max(200).optional(),
  message: z.string().trim().max(2000).optional(),
});

export async function applyToProperty(propertyId: string, _prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const { user } = await requireUser(`/listings/${propertyId}`);
  const parsed = ApplyInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const listing = await db.query.property.findFirst({ where: eq(property.id, propertyId) });
  if (!listing || listing.status !== "active") return { error: "This listing is no longer accepting applications." };
  if (listing.ownerId === user.id) return { error: "You can't apply to your own listing." };

  const existing = await db.query.application.findFirst({
    where: and(eq(application.propertyId, propertyId), eq(application.renterId, user.id)),
  });
  if (existing && existing.status !== "withdrawn") return { error: "You've already applied to this property." };

  if (existing) {
    await db.update(application).set({ ...parsed.data, status: "submitted", ownerNotes: null }).where(eq(application.id, existing.id));
  } else {
    await db.insert(application).values({ ...parsed.data, propertyId, renterId: user.id });
  }
  revalidatePath("/applications");
  revalidatePath("/dashboard");
  redirect("/applications?sent=1");
}

export async function withdrawApplication(id: string) {
  const { user } = await requireUser("/applications");
  await db
    .update(application)
    .set({ status: "withdrawn" })
    .where(and(eq(application.id, id), eq(application.renterId, user.id)));
  revalidatePath("/applications");
}

export async function decideApplication(id: string, status: "reviewing" | "approved" | "rejected") {
  const { user } = await requireOwner("/dashboard/applications");
  const row = await db.query.application.findFirst({ where: eq(application.id, id), with: { property: true } });
  if (!row || row.property.ownerId !== user.id) throw new Error("Application not found.");
  if (row.status === "withdrawn") throw new Error("The renter withdrew this application.");
  await db.update(application).set({ status }).where(eq(application.id, id));
  revalidatePath("/dashboard/applications");
  revalidatePath("/dashboard");
}

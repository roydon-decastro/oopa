"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { application, property, user as userTable } from "@/db/schema";
import { isPublicListing } from "@/lib/visibility";
import { statusForBeds } from "@/lib/dorm";
import { sendEmail } from "@/lib/email";
import { formatPHP } from "@/lib/format";
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
  if (!listing || !isPublicListing(listing)) return { error: "This listing is no longer accepting applications." };
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

  const d = parsed.data;
  after(async () => {
    const owner = await db.query.user.findFirst({ where: eq(userTable.id, listing.ownerId) });
    if (!owner) return;
    await sendEmail({
      to: owner.email,
      subject: `New application: ${listing.title}`,
      heading: `${user.name} applied for ${listing.title}`,
      lines: [
        `Move-in: ${d.moveInDate} · Lease: ${d.leaseMonths} months · Occupants: ${d.occupants}`,
        ...(d.monthlyIncomePhp ? [`Monthly income: ${formatPHP(d.monthlyIncomePhp)} (${(d.monthlyIncomePhp / listing.monthlyRentPhp).toFixed(1)}× rent)`] : []),
        ...(d.message ? [`Message: “${d.message.slice(0, 500)}”`] : []),
      ],
      cta: { label: "Review the application", path: `/dashboard/applications?property=${listing.id}` },
    });
  });
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
  // Per-bed rooms: approving a renter takes a bed; un-approving gives it back.
  const p = row.property;
  if (p.bedsTotal != null && (status === "approved") !== (row.status === "approved")) {
    const bedsTaken = Math.min(p.bedsTotal, Math.max(0, p.bedsTaken + (status === "approved" ? 1 : -1)));
    await db.update(property).set({ bedsTaken, status: statusForBeds(p.status, { bedsTotal: p.bedsTotal, bedsTaken }) })
      .where(eq(property.id, p.id));
    revalidatePath(`/listings/${p.id}`);
    if (p.buildingId) revalidatePath(`/dashboard/buildings/${p.buildingId}`);
  }
  if (status !== "reviewing" && status !== row.status) {
    after(async () => {
      const renter = await db.query.user.findFirst({ where: eq(userTable.id, row.renterId) });
      if (!renter) return;
      await sendEmail(status === "approved" ? {
        to: renter.email,
        subject: `Approved: ${row.property.title}`,
        heading: "Good news, your application was approved",
        lines: [
          `The owner approved your application for ${row.property.title}.`,
          `They now have your contact details and will reach out to arrange the viewing, contract and move-in. Please confirm the owner's identity and visit the property before paying anything.`,
        ],
        cta: { label: "View my applications", path: "/applications" },
      } : {
        to: renter.email,
        subject: `Update on your application: ${row.property.title}`,
        heading: "The owner chose another applicant",
        lines: [`Your application for ${row.property.title} wasn't accepted this time. There are more places waiting for you.`],
        cta: { label: "Browse rentals", path: "/listings" },
      });
    });
  }
  revalidatePath("/dashboard/applications");
  revalidatePath("/dashboard");
}

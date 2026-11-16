"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { after } from "next/server";
import { db } from "@/db";
import { application, leaseApplication, property, user as userTable } from "@/db/schema";
import { LeaseForm, leaseFormFrom, leaseTermsFor } from "@/lib/lease";
import { listingForToken } from "@/lib/apply-link";
import { statusForBeds } from "@/lib/dorm";
import { sendEmail } from "@/lib/email";
import { requireOwner, requireUser } from "@/lib/session";

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
        heading: "Good news, your lease application was approved",
        lines: [
          `The owner approved your lease application for ${row.property.title}.`,
          `They will contact you to sign the lease contract and arrange your move-in. Please confirm the owner's identity before paying anything.`,
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

// ---------- Private application link ----------

/** The owner's private application link for a listing, created on first use. */
export async function getApplyLink(propertyId: string, reset = false): Promise<string> {
  const { user } = await requireOwner();
  const p = await db.query.property.findFirst({ where: and(eq(property.id, propertyId), eq(property.ownerId, user.id)) });
  if (!p) throw new Error("Listing not found.");
  let token = p.applyToken;
  if (!token || reset) {
    token = randomBytes(18).toString("base64url");
    await db.update(property).set({ applyToken: token }).where(eq(property.id, p.id));
  }
  return `/apply/${token}`;
}

export type LeaseState = { error?: string } | undefined;

/** A renter's lease application, sent through the owner's private link. */
export async function submitLease(token: string, _prev: LeaseState, formData: FormData): Promise<LeaseState> {
  const { user } = await requireUser(`/apply/${token}`);
  const p = await listingForToken(token);
  if (!p) return { error: "This application link is no longer valid. Ask the owner for a new one." };
  if (p.ownerId === user.id) return { error: "This is your own listing." };
  const existing = await db.query.application.findFirst({
    where: and(eq(application.propertyId, p.id), eq(application.renterId, user.id)),
  });
  if (existing && existing.status !== "withdrawn") return { error: "You've already sent a lease application for this place." };

  const parsed = LeaseForm.safeParse(leaseFormFrom(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const terms = leaseTermsFor(p, p.building);
  const occupants = 1 + d.otherTenants.length;
  if (terms.maxOccupants && occupants > terms.maxOccupants) {
    return { error: `This place allows up to ${terms.maxOccupants} tenants in total, including kids.` };
  }
  if (formData.get("agree") !== "on") return { error: "Tick the box to confirm your answers and agree to the covenants." };
  const signedName = String(formData.get("signedName") ?? "").trim();
  if (signedName.toLowerCase() !== d.fullName.toLowerCase()) {
    return { error: "To sign, type your full name exactly as you wrote it for the primary tenant." };
  }

  const values = {
    status: "submitted" as const, moveInDate: d.leaseStart, occupants, employment: d.employerName,
    leaseMonths: null, monthlyIncomePhp: null, message: null, ownerNotes: null,
  };
  let applicationId: string;
  if (existing) {
    await db.delete(leaseApplication).where(eq(leaseApplication.applicationId, existing.id));
    await db.update(application).set(values).where(eq(application.id, existing.id));
    applicationId = existing.id;
  } else {
    const [row] = await db.insert(application).values({ ...values, propertyId: p.id, renterId: user.id }).returning({ id: application.id });
    applicationId = row.id;
  }
  await db.insert(leaseApplication).values({ applicationId, form: d, terms, signedName });
  revalidatePath("/applications");
  revalidatePath("/dashboard/applications");
  revalidatePath("/dashboard");

  after(async () => {
    await sendEmail({
      to: p.owner.email,
      subject: `Lease application received: ${p.title}`,
      heading: `${d.fullName} sent their lease application`,
      lines: [`Tentative lease start: ${d.leaseStart} · Tenants: ${occupants}`],
      cta: { label: "Review the lease application", path: `/applications/${applicationId}/lease` },
    });
  });
  redirect(`/applications/${applicationId}/lease?sent=1`);
}

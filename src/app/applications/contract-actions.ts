"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { db } from "@/db";
import { application, leaseContract, property, user as userTable } from "@/db/schema";
import { MAX_CONTRACT_LENGTH } from "@/lib/contract";
import { sendEmail } from "@/lib/email";
import { requireOwner, requireUser } from "@/lib/session";

export type ContractState = { error?: string } | undefined;

const isId = (id: string) => /^[0-9a-f-]{36}$/.test(id);

/** Owner saves the Contract of Lease for an approved application, and optionally sends it to the renter. */
export async function saveContract(applicationId: string, _prev: ContractState, formData: FormData): Promise<ContractState> {
  const { user } = await requireOwner(`/applications/${applicationId}/contract/edit`);
  if (!isId(applicationId)) return { error: "Application not found." };
  const row = await db.query.application.findFirst({
    where: eq(application.id, applicationId),
    with: {
      property: { columns: { id: true, ownerId: true, title: true, status: true, bedsTotal: true, buildingId: true }, with: { owner: { columns: { name: true } } } },
      renter: { columns: { email: true } }, contract: true,
    },
  });
  if (!row || row.property.ownerId !== user.id) return { error: "Application not found." };
  if (row.status !== "approved") return { error: "Approve the lease application before preparing the contract." };

  const body = String(formData.get("body") ?? "").replace(/\r\n/g, "\n").trim();
  if (body.length < 200) return { error: "The contract is empty or too short. Restore it from your template and try again." };
  if (body.length > MAX_CONTRACT_LENGTH) return { error: "The contract is too long." };
  const send = formData.get("intent") === "send" || !!row.contract?.sentAt;
  const wasSent = !!row.contract?.sentAt;

  const now = new Date();
  const values = { body, sentAt: send ? (row.contract?.sentAt ?? now) : null, reviewedAt: null };
  if (row.contract) await db.update(leaseContract).set(values).where(eq(leaseContract.id, row.contract.id));
  else await db.insert(leaseContract).values({ ...values, applicationId });

  // Once the contract goes out, the place is spoken for: take the listing off the site (same as "Unpublish").
  // Per-bed rooms stay listed while beds are free; approving the renter already took their bed.
  const unpublish = send && !wasSent && row.property.status === "active" && row.property.bedsTotal == null;
  if (unpublish) {
    await db.update(property).set({ status: "draft" }).where(eq(property.id, row.property.id));
    revalidatePath(`/listings/${row.property.id}`);
    revalidatePath("/listings");
    revalidatePath("/dashboard");
    if (row.property.buildingId) {
      revalidatePath(`/dashboard/buildings/${row.property.buildingId}`);
      revalidatePath(`/buildings/${row.property.buildingId}`);
    }
  }

  if (send) {
    after(async () => {
      await sendEmail({
        to: row.renter.email,
        subject: `${wasSent ? "Updated lease contract" : "Your lease contract"}: ${row.property.title}`,
        heading: wasSent ? "The owner updated your lease contract" : "Your lease contract is ready to review",
        lines: [
          wasSent
            ? `${row.property.owner.name} made changes to the Contract of Lease for ${row.property.title}. Please read it again.`
            : `${row.property.owner.name} sent you the Contract of Lease for ${row.property.title}.`,
          "Read it carefully and call the owner if you have questions. When you're happy with it, mark it as reviewed. You'll sign the printed copy together with two witnesses.",
        ],
        cta: { label: "Read the contract", path: `/applications/${applicationId}/contract` },
      });
    });
  }
  revalidatePath(`/applications/${applicationId}/contract`);
  revalidatePath("/dashboard/applications");
  revalidatePath("/applications");
  redirect(`/applications/${applicationId}/contract?saved=${send ? (wasSent ? "updated" : unpublish ? "sent-unpublished" : "sent") : "draft"}`);
}

/** The renter has read the contract and is ready to sign the printed copy. */
export async function markContractReviewed(applicationId: string) {
  const { user } = await requireUser(`/applications/${applicationId}/contract`);
  if (!isId(applicationId)) throw new Error("Contract not found.");
  const row = await db.query.application.findFirst({
    where: eq(application.id, applicationId),
    with: { contract: true, property: { columns: { title: true }, with: { owner: { columns: { email: true } } } }, renter: { columns: { name: true } } },
  });
  if (!row || row.renterId !== user.id || !row.contract?.sentAt) throw new Error("Contract not found.");
  if (row.contract.reviewedAt) return;
  await db.update(leaseContract).set({ reviewedAt: new Date() }).where(eq(leaseContract.id, row.contract.id));
  after(async () => {
    await sendEmail({
      to: row.property.owner.email,
      subject: `Contract reviewed: ${row.property.title}`,
      heading: `${row.renter.name} is ready to sign`,
      lines: [`${row.renter.name} has read the Contract of Lease for ${row.property.title} and marked it as reviewed. Print it and arrange the signing with two witnesses.`],
      cta: { label: "Open the contract", path: `/applications/${applicationId}/contract` },
    });
  });
  revalidatePath(`/applications/${applicationId}/contract`);
  revalidatePath("/dashboard/applications");
  revalidatePath("/applications");
}

// ---------- The lessor's own template ----------

export type TemplateState = { error?: string; saved?: boolean } | undefined;

/** Saves the owner's contract template. "reset" goes back to Oopa's default. */
export async function saveContractTemplate(_prev: TemplateState, formData: FormData): Promise<TemplateState> {
  const { user } = await requireOwner("/dashboard/contract-template");
  if (formData.get("intent") === "reset") {
    await db.update(userTable).set({ contractTemplate: null }).where(eq(userTable.id, user.id));
    revalidatePath("/dashboard/contract-template");
    redirect("/dashboard/contract-template?reset=1");
  }
  const template = String(formData.get("template") ?? "").replace(/\r\n/g, "\n").trim();
  if (template.length < 200) return { error: "Your template is empty or too short. Use Reset to Oopa default to start over." };
  if (template.length > MAX_CONTRACT_LENGTH) return { error: "Your template is too long." };
  await db.update(userTable).set({ contractTemplate: template }).where(eq(userTable.id, user.id));
  revalidatePath("/dashboard/contract-template");
  return { saved: true };
}

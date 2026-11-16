"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { db } from "@/db";
import { application, leaseContract, user as userTable } from "@/db/schema";
import { ContractForm, contractFormFrom } from "@/lib/contract";
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
    with: { property: { columns: { ownerId: true, title: true } }, renter: { columns: { email: true } }, contract: true },
  });
  if (!row || row.property.ownerId !== user.id) return { error: "Application not found." };
  if (row.status !== "approved") return { error: "Approve the lease application before preparing the contract." };

  const parsed = ContractForm.safeParse(contractFormFrom(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;
  const send = formData.get("intent") === "send" || !!row.contract?.sentAt;
  const wasSent = !!row.contract?.sentAt;

  const now = new Date();
  const values = { data, sentAt: send ? (row.contract?.sentAt ?? now) : null, reviewedAt: null };
  if (row.contract) await db.update(leaseContract).set(values).where(eq(leaseContract.id, row.contract.id));
  else await db.insert(leaseContract).values({ ...values, applicationId });

  // Remember the lessor's own details for their next contract.
  const { civilStatus, citizenship, address, capacity, idType, idNumber } = data.lessor;
  await db.update(userTable).set({ lessorDetails: { civilStatus, citizenship, address, capacity, idType, idNumber } }).where(eq(userTable.id, user.id));

  if (send) {
    after(async () => {
      await sendEmail({
        to: row.renter.email,
        subject: `${wasSent ? "Updated lease contract" : "Your lease contract"}: ${row.property.title}`,
        heading: wasSent ? "The owner updated your lease contract" : "Your lease contract is ready to review",
        lines: [
          wasSent
            ? `${data.lessor.name} made changes to the Contract of Lease for ${row.property.title}. Please read it again.`
            : `${data.lessor.name} sent you the Contract of Lease for ${row.property.title}.`,
          "Read it carefully and call the owner if you have questions. When you're happy with it, mark it as reviewed. You'll sign the printed copy together with two witnesses.",
        ],
        cta: { label: "Read the contract", path: `/applications/${applicationId}/contract` },
      });
    });
  }
  revalidatePath(`/applications/${applicationId}/contract`);
  revalidatePath("/dashboard/applications");
  revalidatePath("/applications");
  redirect(`/applications/${applicationId}/contract?saved=${send ? (wasSent ? "updated" : "sent") : "draft"}`);
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

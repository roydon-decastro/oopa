import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { application } from "@/db/schema";
import { requireUser } from "@/lib/session";
import ContractText from "@/components/ContractText";
import { ContractFields, fillContract } from "@/lib/contract";
import PrintButton from "@/components/PrintButton";
import PrintSheet from "@/components/PrintSheet";
import ReviewedButton from "@/components/ReviewedButton";

export const metadata = { title: "Contract of lease · Oopa", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const when = (d: Date) => d.toLocaleDateString("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" });

const SAVED: Record<string, string> = {
  draft: "Draft saved. The renter can't see it until you send it.",
  sent: "Sent. We emailed the renter a link to read the contract.",
  "sent-unpublished": "Sent. We emailed the renter a link to read the contract, and unpublished your listing so no one else applies. You can publish it again from My listings.",
  updated: "Changes saved. We emailed the renter to read the updated contract.",
};

export default async function ContractView({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
  const { user } = await requireUser(`/applications/${id}/contract`);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const row = await db.query.application.findFirst({
    where: eq(application.id, id),
    with: { contract: true, property: { columns: { title: true, ownerId: true } }, renter: { columns: { name: true, phone: true } } },
  });
  const isOwner = row?.property.ownerId === user.id;
  if (!row || (row.renterId !== user.id && !isOwner)) notFound();
  const c = row.contract;
  if (!c) {
    if (isOwner) redirect(`/applications/${id}/contract/edit`);
    notFound();
  }
  // The renter only sees the contract once the owner sends it.
  if (!isOwner && !c.sentAt) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 print:max-w-none print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={isOwner ? "/dashboard/applications" : "/applications"} className="text-sm text-slate-500 hover:text-emerald-700">
          ← {isOwner ? "Applications" : "My applications"}
        </Link>
        <div className="flex flex-wrap gap-2">
          {isOwner && <Link href={`/applications/${id}/contract/edit`} className="btn-outline">Edit contract</Link>}
          <PrintButton />
        </div>
      </div>
      {saved && SAVED[saved] && <p className="mb-6 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800 print:hidden">{SAVED[saved]}</p>}

      <div className="mb-8 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm print:hidden">
        <p className="font-semibold">{row.property.title}</p>
        {isOwner ? (
          !c.sentAt ? <p className="mt-1 text-amber-800">Draft. Not sent to {row.renter.name} yet. Click <strong>Edit contract</strong> to finish and send it.</p>
          : c.reviewedAt ? <p className="mt-1 text-emerald-800">✓ {row.renter.name} reviewed it on {when(c.reviewedAt)} and is ready to sign. Print two copies and sign them with two witnesses.</p>
          : <p className="mt-1 text-slate-700">Sent to {row.renter.name} on {when(c.sentAt)}. Waiting for them to review it.{row.renter.phone ? ` Their number: ${row.renter.phone}.` : ""}</p>
        ) : c.reviewedAt ? (
          <p className="mt-1 text-emerald-800">✓ You marked this as reviewed on {when(c.reviewedAt)}. The owner will arrange the signing with two witnesses.</p>
        ) : (
          <>
            <p className="mt-1 text-slate-700">Read the whole contract carefully. If anything is unclear or different from what you agreed, call the owner before signing. When you&apos;re happy with it, let the owner know:</p>
            <div className="mt-3"><ReviewedButton id={id} /></div>
          </>
        )}
      </div>

      <PrintSheet>
        <ContractText body={fillContract(c.body, c.fields ? (ContractFields.safeParse(c.fields).data ?? null) : null)} />
      </PrintSheet>
    </main>
  );
}

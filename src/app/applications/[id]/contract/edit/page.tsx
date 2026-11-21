import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { application, user as userTable } from "@/db/schema";
import { requireOwner } from "@/lib/session";
import { fillContract } from "@/lib/contract";
import { DEFAULT_CONTRACT_TEMPLATE } from "@/lib/contract-template";
import { leaseTermsFor, type LeaseFormData } from "@/lib/lease";
import ContractBodyForm from "@/components/ContractBodyForm";

export const metadata = { title: "Prepare contract · Oopa", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function EditContract({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireOwner(`/applications/${id}/contract/edit`);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const row = await db.query.application.findFirst({
    where: eq(application.id, id),
    with: { lease: true, contract: true, property: { with: { building: true } } },
  });
  if (!row || row.property.ownerId !== user.id) notFound();
  if (row.status !== "approved") redirect(`/applications/${id}/lease`);

  const me = await db.query.user.findFirst({ where: eq(userTable.id, user.id), columns: { name: true, contractTemplate: true } });
  const p = row.property;
  const b = p.building;
  const f = row.lease?.form as LeaseFormData | undefined;
  const terms = leaseTermsFor(p, b);
  const unit = p.unitLabel && b ? `${p.bedsTotal != null ? "Room" : "Unit"} ${p.unitLabel} of ${b.name}` : p.title;
  const filled = fillContract(me?.contractTemplate ?? DEFAULT_CONTRACT_TEMPLATE, {
    lessorName: me?.name ?? "",
    renterName: f?.fullName ?? "",
    renterAddress: f?.address ?? "",
    renterId: f?.ids[0] ? `${f.ids[0].type} ${f.ids[0].number}` : "",
    property: p.bedsTotal != null ? `one (1) bed space in ${unit}` : unit,
    propertyAddress: [p.street, p.barangay, p.city, p.province].filter(Boolean).join(", "),
    rentPhp: p.monthlyRentPhp,
    advanceMonths: p.advanceMonths,
    depositMonths: p.depositMonths,
    leaseMonths: p.minLeaseMonths || 12,
    startDate: f?.leaseStart ?? row.moveInDate ?? new Date().toISOString().slice(0, 10),
    maxOccupants: terms.maxOccupants ?? (row.occupants || null),
    houseRules: terms.covenants,
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href={row.contract ? `/applications/${id}/contract` : "/dashboard/applications"} className="text-sm text-slate-500 hover:text-emerald-700">
        ← {row.contract ? "Contract" : "Applications"}
      </Link>
      <h1 className="mt-2 text-3xl font-bold">{row.contract ? "Edit contract of lease" : "Prepare contract of lease"}</h1>
      <p className="mt-2 text-slate-600">
        For {f?.fullName ?? "the renter"} at {p.title}. This is{" "}
        <Link href="/dashboard/contract-template" className="text-emerald-700 underline">your contract template</Link>{" "}
        with this renter&apos;s details filled in. Change anything you agreed differently. Changes here apply to this contract only.
      </p>
      <div className="mt-8">
        <ContractBodyForm applicationId={id} initial={row.contract?.body ?? filled} fromTemplate={filled} sent={!!row.contract?.sentAt} />
      </div>
    </main>
  );
}

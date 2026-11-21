import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { application, user as userTable } from "@/db/schema";
import { requireOwner } from "@/lib/session";
import { ContractFields, LessorProfile, endDate, type ContractFieldsData } from "@/lib/contract";
import { DEFAULT_CONTRACT_TEMPLATE, upgradeTemplate } from "@/lib/contract-template";
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

  const me = await db.query.user.findFirst({ where: eq(userTable.id, user.id), columns: { name: true, contractTemplate: true, lessorProfile: true } });
  const profile = LessorProfile.safeParse(me?.lessorProfile ?? {});
  const lp = profile.success ? profile.data : { civilStatus: "", citizenship: "", address: "" };
  const p = row.property;
  const b = p.building;
  const f = row.lease?.form as LeaseFormData | undefined;
  const terms = leaseTermsFor(p, b);
  const unit = p.unitLabel && b ? `${p.bedsTotal != null ? "Room" : "Unit"} ${p.unitLabel} of ${b.name}` : p.title;
  const start = f?.leaseStart ?? row.moveInDate ?? new Date().toISOString().slice(0, 10);
  const months = p.minLeaseMonths || 12;
  const fresh: ContractFieldsData = {
    lessorName: me?.name ?? "",
    lessorCivilStatus: lp.civilStatus,
    lessorCitizenship: lp.citizenship || "Filipino",
    lessorAddress: lp.address,
    renterName: f?.fullName ?? "",
    renterCivilStatus: f?.spouseName ? "married" : "",
    renterCitizenship: "Filipino",
    renterAddress: f?.address ?? "",
    renterId: f?.ids[0] ? `${f.ids[0].type} ${f.ids[0].number}` : "",
    property: p.bedsTotal != null ? `one (1) bed space in ${unit}` : unit,
    propertyAddress: [p.street, p.barangay, p.city, p.province].filter(Boolean).join(", "),
    rentPhp: String(p.monthlyRentPhp),
    advanceMonths: String(p.advanceMonths),
    depositMonths: String(p.depositMonths),
    leaseMonths: String(months),
    startDate: start,
    endDate: endDate(start, months),
    maxOccupants: String(terms.maxOccupants ?? (row.occupants || "")),
    houseRules: terms.covenants ?? "",
  };
  const template = upgradeTemplate(me?.contractTemplate ?? DEFAULT_CONTRACT_TEMPLATE);
  const saved = row.contract?.fields ? ContractFields.safeParse(row.contract.fields) : null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href={row.contract ? `/applications/${id}/contract` : "/dashboard/applications"} className="text-sm text-slate-500 hover:text-emerald-700">
        ← {row.contract ? "Contract" : "Applications"}
      </Link>
      <h1 className="mt-2 text-3xl font-bold">{row.contract ? "Edit contract of lease" : "Prepare contract of lease"}</h1>
      <p className="mt-2 text-slate-600">
        For {f?.fullName ?? "the renter"} at {p.title}. This is{" "}
        <Link href="/dashboard/contract-template" className="text-emerald-700 underline">your contract template</Link>{" "}
        with this renter&apos;s details. Check the details below; they&apos;re filled in from your profile, the listing and the renter&apos;s lease application. Change anything you agreed differently. Changes here apply to this contract only.
      </p>
      <div className="mt-8">
        <ContractBodyForm applicationId={id} initialBody={row.contract?.body ?? template} template={template}
          initialFields={saved?.success ? saved.data : fresh} sent={!!row.contract?.sentAt} />
      </div>
    </main>
  );
}

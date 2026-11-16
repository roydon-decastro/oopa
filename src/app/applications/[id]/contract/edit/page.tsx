import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { application, user as userTable } from "@/db/schema";
import { requireOwner } from "@/lib/session";
import { CONTRACT_DEFAULTS, LessorDetails, type ContractData } from "@/lib/contract";
import { leaseTermsFor, type LeaseFormData } from "@/lib/lease";
import ContractFormView from "@/components/ContractForm";

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

  let initial: ContractData;
  if (row.contract) {
    initial = row.contract.data as ContractData;
  } else {
    const me = await db.query.user.findFirst({ where: eq(userTable.id, user.id), columns: { name: true, lessorDetails: true } });
    const saved = LessorDetails.safeParse(me?.lessorDetails);
    const p = row.property;
    const b = p.building;
    const f = row.lease?.form as LeaseFormData | undefined;
    const terms = leaseTermsFor(p, b);
    const premises = p.bedsTotal != null
      ? `one (1) bed space in ${p.unitLabel ? `Room ${p.unitLabel}${b ? ` of ${b.name}` : ""}` : p.title}`
      : b && p.unitLabel ? `Unit ${p.unitLabel} of ${b.name}` : p.title;
    initial = {
      ...CONTRACT_DEFAULTS,
      lessor: {
        name: me?.name ?? "",
        ...(saved.success ? saved.data : { civilStatus: "" as never, citizenship: "Filipino", address: "", capacity: "owner", idType: "", idNumber: "" }),
      },
      lessee: {
        name: f?.fullName ?? "", civilStatus: (f?.spouseName ? "married" : "") as never, citizenship: "Filipino",
        address: f?.address ?? "", idType: f?.ids[0]?.type ?? "", idNumber: f?.ids[0]?.number ?? "",
      },
      premises,
      address: [p.street, p.barangay, p.city, p.province].filter(Boolean).join(", "),
      startDate: f?.leaseStart ?? row.moveInDate ?? new Date().toISOString().slice(0, 10),
      months: p.minLeaseMonths || CONTRACT_DEFAULTS.months,
      rentPhp: p.monthlyRentPhp,
      depositMonths: p.depositMonths,
      maxOccupants: terms.maxOccupants ?? Math.max(row.occupants, 1),
      noPets: !p.petsAllowed,
      otherRules: terms.covenants ?? "",
      witness1: "", witness2: "",
    };
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href={row.contract ? `/applications/${id}/contract` : "/dashboard/applications"} className="text-sm text-slate-500 hover:text-emerald-700">
        ← {row.contract ? "Contract" : "Applications"}
      </Link>
      <h1 className="mt-2 text-3xl font-bold">{row.contract ? "Edit contract of lease" : "Prepare contract of lease"}</h1>
      <p className="mt-2 text-slate-600">
        For {row.property.title}. The fields below fill in the highlighted parts of the contract. The rest of the wording is fixed.
        Values start from the listing, the renter&apos;s lease application, and the usual terms. Change anything you agreed differently.
      </p>
      <div className="mt-8">
        <ContractFormView applicationId={id} initial={initial} sent={!!row.contract?.sentAt} />
      </div>
    </main>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { application } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { formatPHP } from "@/lib/format";
import { APP_STATUS } from "@/lib/status";
import type { LeaseFormData, LeaseTerms } from "@/lib/lease";
import { Covenants } from "@/components/LeaseApplicationForm";
import DecisionButtons from "@/components/DecisionButtons";
import PrintButton from "@/components/PrintButton";

export const metadata = { title: "Lease application · Oopa", robots: { index: false, follow: false } };

const date = (d: string | Date, style: "medium" | "long" = "long") =>
  new Date(d).toLocaleDateString("en-PH", { dateStyle: style, timeZone: "Asia/Manila" });

export default async function LeaseView({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string }>;
}) {
  const { id } = await params;
  const { sent } = await searchParams;
  const { user } = await requireUser(`/applications/${id}/lease`);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const row = await db.query.application.findFirst({
    where: eq(application.id, id),
    with: { lease: true, contract: { columns: { id: true } }, property: { columns: { id: true, title: true, ownerId: true } }, renter: { columns: { email: true } } },
  });
  // Only the renter who sent it and the listing's owner can see a lease application.
  const isOwner = row?.property.ownerId === user.id;
  if (!row || !row.lease || (row.renterId !== user.id && !isOwner)) notFound();
  const f = row.lease.form as LeaseFormData;
  const t = row.lease.terms as LeaseTerms;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 print:max-w-none print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={isOwner ? "/dashboard/applications" : "/applications"} className="text-sm text-slate-500 hover:text-emerald-700">
          ← {isOwner ? "Applications" : "My applications"}
        </Link>
        <PrintButton />
      </div>
      {sent && <p className="mb-6 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800 print:hidden">Lease application sent to the owner. We&apos;ll email you when they decide.</p>}

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-wide">Lease application form</h1>
          <p className="text-sm text-slate-600">{t.propertyTitle}</p>
        </div>
        <div className="text-right print:hidden">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${APP_STATUS[row.status].style}`}>{APP_STATUS[row.status].label}</span>
          {isOwner && <div className="mt-2"><DecisionButtons id={row.id} status={row.status} /></div>}
          {isOwner && row.status === "approved" && (
            <Link href={`/applications/${row.id}/contract${row.contract ? "" : "/edit"}`} className="btn mt-2 px-3 py-1.5 text-sm">
              📝 {row.contract ? "Open contract" : "Prepare contract"}
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-4 text-sm">
        <Band title="Property information">
          <Item label="Address" value={t.address} wide />
        </Band>
        <Band title="Personal / contact information">
          <Item label="Name of primary tenant (signatory to the lease contract)" value={f.fullName} />
          <Item label="Nickname" value={f.nickname} />
          <Item label="Contact numbers" value={f.contactNumbers} />
          <Item label="Religion" value={f.religion} />
          <Item label="Email" value={row.renter.email} />
          <Item label="Permanent / current address" value={f.address} wide />
          <Item label="Valid IDs presented / ID number" wide value={f.ids.map((x, i) => `${i + 1}. ${x.type} · ${x.number}`).join("\n")} />
          <Item label="Name of spouse / partner" value={f.spouseName} wide />
        </Band>
        <Band title="Employment / business information">
          <Item label="Name of employer / business / school" value={f.employerName} wide />
          <Item label="Employer / business / school address" value={f.employerAddress} wide />
          <Item label="Contact numbers" value={f.employerContact} />
        </Band>
        <Band title="Emergency contact information">
          <Item label="Emergency contact name" value={f.emergencyName} />
          <Item label="Contact numbers" value={f.emergencyContact} />
        </Band>
        <Band title="Lease / rental information" cols={3}>
          <Item label={t.perBed ? "Current base rent (per bed)" : "Current base rent"} value={formatPHP(t.rentPhp)} />
          <Item label="Start of lease period (tentative)" value={date(f.leaseStart)} />
          <Item label="Security deposit amount" value={formatPHP(t.rentPhp * t.depositMonths)} />
        </Band>
        <Covenants terms={t} />
        <Band title="Other tenants information">
          {f.otherTenants.length === 0 ? <p className="text-slate-500 sm:col-span-2">None. The primary tenant lives alone.</p> : (
            <table className="w-full sm:col-span-2">
              <thead className="text-left text-xs uppercase text-slate-500"><tr><th className="py-1">Name</th><th>Age</th><th>Company / school</th></tr></thead>
              <tbody>{f.otherTenants.map((o, i) => <tr key={i}><td className="py-1">{i + 1}. {o.name}</td><td>{o.age}</td><td>{o.work}</td></tr>)}</tbody>
            </table>
          )}
          {t.maxOccupants && <p className="text-xs text-slate-500 sm:col-span-2">*** Up to {t.maxOccupants} tenants only, including kids ***</p>}
        </Band>
        <section className="grid grid-cols-2 gap-4 rounded-lg border border-slate-300 p-4">
          <Item label="Signature" value={row.lease.signedName} serif />
          <Item label="Date" value={date(row.lease.submittedAt)} />
        </section>
        <p className="text-center text-xs text-slate-500">
          *This document shall be used for background check of potential tenants and shall form part of the Lease Agreement Contract.
        </p>
      </div>
    </main>
  );
}

function Band({ title, children, cols = 2 }: { title: string; children: React.ReactNode; cols?: 2 | 3 }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-300 break-inside-avoid">
      <h2 className="bg-slate-100 px-4 py-1.5 text-center text-xs font-semibold uppercase tracking-wide">{title}</h2>
      <div className={`grid gap-3 p-4 ${cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>{children}</div>
    </section>
  );
}

function Item({ label, value, wide, serif }: { label: string; value?: string | null; wide?: boolean; serif?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className={`whitespace-pre-line font-medium ${serif ? "font-serif text-lg italic" : ""}`}>{value || "—"}</p>
    </div>
  );
}

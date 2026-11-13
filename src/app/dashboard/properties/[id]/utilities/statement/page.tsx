import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { application, meterReading, property } from "@/db/schema";
import { requireOwner } from "@/lib/session";
import PrintButton from "@/components/PrintButton";
import { effectiveTerms, formatPHP2, formatRate, UNIT, UTILITY_LABEL, type Utility } from "@/lib/utilities";

export const metadata = { title: "Utility statement · Oopa" };

export default async function Statement({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ month?: string }>;
}) {
  const { id } = await params;
  const { month } = await searchParams;
  const { user } = await requireOwner(`/dashboard/properties/${id}/utilities`);
  if (!/^[0-9a-f-]{36}$/.test(id) || !month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) notFound();
  const [y, m] = month.split("-").map(Number);
  const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const p = await db.query.property.findFirst({
    where: and(eq(property.id, id), eq(property.ownerId, user.id)),
    with: {
      building: true,
      owner: { columns: { name: true, phone: true, email: true } },
      readings: { where: and(gte(meterReading.readingDate, `${month}-01`), lt(meterReading.readingDate, nextMonth)), orderBy: desc(meterReading.readingDate) },
      applications: { where: eq(application.status, "approved"), orderBy: desc(application.updatedAt), limit: 1, with: { renter: { columns: { name: true } } } },
    },
  });
  if (!p) notFound();

  const monthName = new Date(month + "-01").toLocaleDateString("en-PH", { month: "long", year: "numeric" });
  const lines: { label: string; detail: string; amount: number }[] = [];
  for (const u of ["electricity", "water"] as Utility[]) {
    const r = p.readings.find((x) => x.utility === u && x.amountPhp != null);
    const terms = effectiveTerms(p, p.building, u);
    if (r) {
      lines.push({
        label: `${UTILITY_LABEL[u]} (sub-meter)`,
        detail: `${r.previousDate} → ${r.readingDate}: ${r.previousReading} → ${r.reading} = ${r.consumption} ${UNIT[u]} × ${formatRate(r.ratePhp ?? 0)}${terms.minimumPhp && r.amountPhp === terms.minimumPhp ? " (minimum charge)" : ""}`,
        amount: r.amountPhp!,
      });
    } else if (terms.billing === "fixed" && terms.fixedPhp != null) {
      lines.push({ label: `${UTILITY_LABEL[u]} (fixed)`, detail: "Monthly fee", amount: terms.fixedPhp });
    }
  }
  const total = lines.reduce((s, l) => s + l.amount, 0);
  const tenant = p.applications[0]?.renter.name;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 print:py-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href={`/dashboard/properties/${p.id}/utilities`} className="text-sm text-slate-500 hover:text-emerald-700">← Utility bills</Link>
        <PrintButton />
      </div>
      <article className="rounded-xl border border-slate-200 p-8 print:border-0 print:p-0">
        <header className="flex justify-between gap-6 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold">Utility statement</h1>
            <p className="text-slate-600">{monthName}</p>
          </div>
          <div className="text-right text-sm text-slate-600">
            <p className="font-semibold text-slate-900">{p.owner.name}</p>
            {p.owner.phone && <p>{p.owner.phone}</p>}
            <p>{p.owner.email}</p>
          </div>
        </header>
        <dl className="grid grid-cols-2 gap-4 py-6 text-sm">
          <div><dt className="text-slate-500">Tenant</dt><dd className="font-medium">{tenant ?? "—"}</dd></div>
          <div><dt className="text-slate-500">Unit</dt><dd className="font-medium">{p.building ? `${p.building.name}, Unit ${p.unitLabel}` : p.title}</dd></div>
          <div className="col-span-2"><dt className="text-slate-500">Address</dt><dd>{[p.street, p.barangay, p.city, p.province].filter(Boolean).join(", ")}</dd></div>
        </dl>
        {lines.length === 0 ? (
          <p className="text-slate-600">No utility charges for this month.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-200 border-y border-slate-200">
              {lines.map((l) => (
                <tr key={l.label}>
                  <td className="py-3"><p className="font-medium">{l.label}</p><p className="text-xs text-slate-500">{l.detail}</p></td>
                  <td className="py-3 text-right font-medium">{formatPHP2(l.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td className="pt-4 text-base font-bold">Total due</td><td className="pt-4 text-right text-xl font-bold">{formatPHP2(total)}</td></tr>
            </tfoot>
          </table>
        )}
        <p className="mt-8 text-xs text-slate-500">Generated with Oopa. Please settle together with your monthly rent unless agreed otherwise.</p>
      </article>
    </main>
  );
}

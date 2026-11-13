import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { meterReading, property } from "@/db/schema";
import { requireOwner } from "@/lib/session";
import MeterEntry from "@/components/MeterEntry";
import DeleteReadingButton from "@/components/DeleteReadingButton";
import { saveReadings } from "@/app/dashboard/utilities/actions";
import { meterRows, validDate } from "@/lib/meter-rows";
import { describeTerms, effectiveTerms, formatPHP2, formatRate, UNIT, UTILITY_LABEL, type Utility } from "@/lib/utilities";

export const metadata = { title: "Utility bills · Oopa" };

export default async function PropertyUtilities({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ date?: string }>;
}) {
  const { id } = await params;
  const date = validDate((await searchParams).date);
  const { user } = await requireOwner(`/dashboard/properties/${id}/utilities`);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const p = await db.query.property.findFirst({
    where: and(eq(property.id, id), eq(property.ownerId, user.id)),
    with: { building: true, readings: { orderBy: desc(meterReading.readingDate) } },
  });
  if (!p) notFound();
  const name = p.building ? `${p.building.name} · Unit ${p.unitLabel}` : p.title;
  const months = [...new Set(p.readings.filter((r) => r.amountPhp != null).map((r) => r.readingDate.slice(0, 7)))];

  const sections = await Promise.all((["electricity", "water"] as Utility[]).map(async (u) => ({
    utility: u,
    terms: effectiveTerms(p, p.building, u),
    rows: await meterRows([p], u, date),
    history: p.readings.filter((r) => r.utility === u),
  })));

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href={p.building ? `/dashboard/buildings/${p.building.id}` : "/dashboard"} className="text-sm text-slate-500 hover:text-emerald-700">
        ← {p.building ? p.building.name : "My listings"}
      </Link>
      <h1 className="mt-2 text-3xl font-bold">Utility bills</h1>
      <p className="text-slate-600">{name}</p>

      {months.length > 0 && (
        <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm">
          <strong>Statements for the tenant:</strong>{" "}
          {months.map((m, i) => (
            <span key={m}>{i > 0 && " · "}
              <Link className="text-emerald-800 underline" href={`/dashboard/properties/${p.id}/utilities/statement?month=${m}`}>
                {new Date(m + "-01").toLocaleDateString("en-PH", { month: "long", year: "numeric" })}
              </Link>
            </span>
          ))}
        </div>
      )}

      {sections.map(({ utility, terms, rows, history }) => (
        <section key={utility} className="mt-10">
          <h2 className="text-xl font-semibold">{utility === "electricity" ? "⚡" : "💧"} {UTILITY_LABEL[utility]}</h2>
          <p className="text-sm text-slate-600">
            {describeTerms(terms, utility) ?? "Not set"} ·{" "}
            <Link className="text-emerald-700 underline" href={`/dashboard/properties/${p.id}/edit`}>change</Link>
          </p>
          {terms.billing === "submeter" && (
            <>
              <div className="mt-4"><MeterEntry utility={utility} date={date} rows={rows} action={saveReadings.bind(null, [p.id])} /></div>
              {history.length > 0 && (
                <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr><th className="p-3">Date</th><th className="p-3">Reading</th><th className="p-3">Used</th><th className="p-3">Rate</th><th className="p-3 text-right">Charge</th><th className="p-3"></th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {history.map((r, i) => (
                        <tr key={r.id}>
                          <td className="p-3">{r.readingDate}</td>
                          <td className="p-3">{r.reading.toLocaleString("en-PH")}</td>
                          <td className="p-3">{r.consumption != null ? `${r.consumption.toLocaleString("en-PH")} ${UNIT[utility]}` : <span className="text-xs text-slate-500">Starting reading</span>}</td>
                          <td className="p-3">{r.ratePhp != null ? formatRate(r.ratePhp) : "—"}</td>
                          <td className="p-3 text-right font-medium">{r.amountPhp != null ? formatPHP2(r.amountPhp) : "—"}</td>
                          <td className="p-3 text-right">{i === 0 && <DeleteReadingButton id={r.id} />}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      ))}
    </main>
  );
}

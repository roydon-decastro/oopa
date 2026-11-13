import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { building, property } from "@/db/schema";
import { requireOwner } from "@/lib/session";
import MeterEntry from "@/components/MeterEntry";
import { saveReadings } from "@/app/dashboard/utilities/actions";
import { meterRows, validDate } from "@/lib/meter-rows";
import { describeTerms, effectiveTerms, UTILITY_LABEL, type Utility } from "@/lib/utilities";

export const metadata = { title: "Meter readings · Oopa" };

export default async function BuildingMeters({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ utility?: string; date?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const utility: Utility = sp.utility === "water" ? "water" : "electricity";
  const date = validDate(sp.date);
  const { user } = await requireOwner(`/dashboard/buildings/${id}/meters`);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const b = await db.query.building.findFirst({
    where: and(eq(building.id, id), eq(building.ownerId, user.id)),
    with: { units: { orderBy: [asc(property.floor), asc(property.unitLabel)] } },
  });
  if (!b) notFound();
  const units = b.units.map((u) => ({ ...u, building: b }));
  const rows = await meterRows(units, utility, date);
  const notMetered = units.filter((u) => effectiveTerms(u, b, utility).billing !== "submeter");

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Link href={`/dashboard/buildings/${b.id}`} className="text-sm text-slate-500 hover:text-emerald-700">← {b.name}</Link>
      <h1 className="mt-2 text-3xl font-bold">Meter readings</h1>
      <p className="mt-1 text-slate-600">Enter this month&apos;s sub-meter readings. Usage and charges are worked out for you.</p>

      <nav className="mt-6 flex gap-2">
        {(["electricity", "water"] as const).map((u) => (
          <Link key={u} href={`?utility=${u}&date=${date}`}
            className={u === utility ? "btn" : "btn-outline"}>{u === "electricity" ? "⚡" : "💧"} {UTILITY_LABEL[u]}</Link>
        ))}
      </nav>
      <p className="mt-3 text-sm text-slate-600">
        Building setting: {describeTerms(effectiveTerms(b, null, utility), utility) ?? "not set"} ·{" "}
        <Link className="text-emerald-700 underline" href={`/dashboard/buildings/${b.id}/edit`}>change</Link>
      </p>

      <div className="mt-6">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-600">
            No units are sub-metered for {utility}. Set {utility} to “Sub-metered” in the building settings or on individual units.
          </div>
        ) : (
          <MeterEntry key={`${utility}-${date}`} utility={utility} date={date} rows={rows}
            action={saveReadings.bind(null, rows.map((r) => r.propertyId))} />
        )}
      </div>
      {notMetered.length > 0 && rows.length > 0 && (
        <p className="mt-6 text-sm text-slate-500">
          Not listed here because they aren&apos;t sub-metered for {utility}: {notMetered.map((u) => u.unitLabel).join(", ")}.
        </p>
      )}
      {rows.length > 0 && (
        <p className="mt-6 text-sm text-slate-600">
          Bills for each unit:{" "}
          {rows.map((r, i) => (
            <span key={r.propertyId}>{i > 0 && " · "}<Link className="text-emerald-700 underline" href={`/dashboard/properties/${r.propertyId}/utilities`}>{r.label.replace("Unit ", "")}</Link></span>
          ))}
        </p>
      )}
    </main>
  );
}

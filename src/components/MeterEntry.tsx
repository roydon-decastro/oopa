"use client";

import { useActionState, useState } from "react";
import type { ReadingsState } from "@/app/dashboard/utilities/actions";
import { formatPHP2, UNIT, type Utility } from "@/lib/utilities";

export type MeterRow = {
  propertyId: string;
  label: string;
  sublabel?: string;
  meterNo: string | null;
  prevReading: number | null;
  prevDate: string | null;
  ratePhp: number | null;
  minimumPhp: number | null;
  current?: number | null; // reading already saved for the selected date
};

export default function MeterEntry({ utility, rows, action, date }: {
  utility: Utility;
  rows: MeterRow[];
  action: (prev: ReadingsState, fd: FormData) => Promise<ReadingsState>;
  date: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(rows.map((r) => [r.propertyId, r.current != null ? String(r.current) : ""])),
  );
  const unit = UNIT[utility];

  const calc = (r: MeterRow) => {
    const v = values[r.propertyId];
    if (v === "" || v == null || r.prevReading == null) return null;
    const used = Math.round((Number(v) - r.prevReading) * 100) / 100;
    if (!(used >= 0)) return { used, amount: null, bad: true };
    const amount = r.ratePhp == null ? null : Math.max(Math.round(used * r.ratePhp * 100) / 100, r.minimumPhp ?? 0);
    return { used, amount, bad: false };
  };
  const total = rows.reduce((sum, r) => sum + (calc(r)?.amount ?? 0), 0);

  return (
    <form action={formAction}>
      <input type="hidden" name="utility" value={utility} />
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="label">Reading date</span>
          <input className="input" type="date" name="readingDate" defaultValue={date} required
            onChange={(e) => { const u = new URL(window.location.href); u.searchParams.set("date", e.target.value); window.location.href = u.toString(); }} />
        </label>
        <p className="pb-2 text-sm text-slate-500">Changing the date reloads the page with that date&apos;s saved readings.</p>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3">Unit</th>
              <th className="p-3">Previous</th>
              <th className="p-3">New reading ({unit})</th>
              <th className="p-3 text-right">Used</th>
              <th className="p-3 text-right">Charge</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((r) => {
              const c = calc(r);
              return (
                <tr key={r.propertyId}>
                  <td className="p-3">
                    <p className="font-semibold">{r.label}</p>
                    <p className="text-xs text-slate-500">{[r.sublabel, r.meterNo && `Meter ${r.meterNo}`].filter(Boolean).join(" · ")}</p>
                  </td>
                  <td className="p-3">
                    {r.prevReading != null ? (
                      <>{r.prevReading.toLocaleString("en-PH")}<span className="block text-xs text-slate-500">{r.prevDate}</span></>
                    ) : (
                      <span className="text-xs text-slate-500">First reading: sets the starting point, no charge</span>
                    )}
                  </td>
                  <td className="p-3">
                    <input className={`input w-36 ${c?.bad ? "border-red-500" : ""}`} type="number" min={0} step="0.01" inputMode="decimal"
                      name={`reading_${r.propertyId}`} aria-label={`${r.label} reading`} value={values[r.propertyId]}
                      onChange={(e) => setValues((v) => ({ ...v, [r.propertyId]: e.target.value }))} />
                  </td>
                  <td className={`p-3 text-right ${c?.bad ? "text-red-700" : ""}`}>{c ? `${c.used.toLocaleString("en-PH")} ${unit}` : "—"}</td>
                  <td className="p-3 text-right font-medium">
                    {c?.amount != null ? formatPHP2(c.amount) : r.ratePhp == null && c ? <span className="text-xs text-amber-700">Set a rate</span> : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-50">
            <tr><td className="p-3 font-semibold" colSpan={4}>Total to collect</td><td className="p-3 text-right font-bold">{formatPHP2(total)}</td></tr>
          </tfoot>
        </table>
      </div>

      {state?.error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state?.saved && <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Saved {state.saved} reading{state.saved > 1 ? "s" : ""}.</p>}
      <button className="btn mt-4" disabled={pending}>{pending ? "Saving…" : "Save readings"}</button>
    </form>
  );
}

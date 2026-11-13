"use client";

import { useState } from "react";
import { BILLING_OPTIONS, type Billing, type Utility } from "@/lib/utilities";

type Values = {
  electricityBilling?: Billing | null; electricityRatePhp?: number | null; electricityFixedPhp?: number | null;
  waterBilling?: Billing | null; waterRatePhp?: number | null; waterFixedPhp?: number | null; waterMinimumPhp?: number | null;
  electricMeterNo?: string | null; waterMeterNo?: string | null;
};

/**
 * Electricity and water billing inputs.
 * mode "building": defaults for every unit. "unit": blank = same as building, plus meter numbers. "property": standalone.
 */
export default function UtilityFields({ initial, mode, buildingSummary }: {
  initial?: Values; mode: "building" | "unit" | "property"; buildingSummary?: Record<Utility, string | null>;
}) {
  return (
    <fieldset>
      <legend className="mb-1 text-lg font-semibold">Electricity and water</legend>
      <p className="mb-3 text-sm text-slate-600">
        {mode === "building"
          ? "How tenants pay for utilities. These apply to every unit; you can change individual units later."
          : mode === "unit"
            ? "Leave on “Same as building” unless this unit is different (e.g. it has its own Meralco account)."
            : "How the tenant pays for utilities."}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <One utility="electricity" mode={mode} initial={initial} inherited={buildingSummary?.electricity} />
        <One utility="water" mode={mode} initial={initial} inherited={buildingSummary?.water} />
      </div>
    </fieldset>
  );
}

function One({ utility, mode, initial, inherited }: { utility: Utility; mode: string; initial?: Values; inherited?: string | null }) {
  const e = utility === "electricity";
  const [billing, setBilling] = useState<string>((e ? initial?.electricityBilling : initial?.waterBilling) ?? "");
  const prefix = e ? "electricity" : "water";
  const unit = e ? "kWh" : "m³";
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="font-medium">{e ? "⚡ Electricity" : "💧 Water"}</p>
      <label className="mt-2 block">
        <span className="label">How it&apos;s charged</span>
        <select className="input" name={`${prefix}Billing`} value={billing} onChange={(ev) => setBilling(ev.target.value)}>
          {mode === "unit" && <option value="">Same as building{inherited ? ` (${inherited})` : ""}</option>}
          {mode !== "unit" && <option value="">Not specified</option>}
          {BILLING_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      {billing === "submeter" && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label">Rate (₱ per {unit})</span>
            <input className="input" name={`${prefix}RatePhp`} type="number" min={0} step="0.0001" required={mode !== "unit"}
              defaultValue={(e ? initial?.electricityRatePhp : initial?.waterRatePhp) ?? ""} placeholder={e ? "e.g. 13.50" : "e.g. 85"} />
          </label>
          {!e && (
            <label className="block">
              <span className="label">Minimum charge (₱)</span>
              <input className="input" name="waterMinimumPhp" type="number" min={0} step="0.01"
                defaultValue={initial?.waterMinimumPhp ?? ""} placeholder="Optional" />
            </label>
          )}
        </div>
      )}
      {billing === "fixed" && (
        <label className="mt-3 block">
          <span className="label">Monthly fee (₱)</span>
          <input className="input" name={`${prefix}FixedPhp`} type="number" min={0} step="0.01" required
            defaultValue={(e ? initial?.electricityFixedPhp : initial?.waterFixedPhp) ?? ""} />
        </label>
      )}
      {mode !== "building" && (
        <label className="mt-3 block">
          <span className="label">{e ? "Electric" : "Water"} meter number <span className="text-slate-400">(optional)</span></span>
          <input className="input" name={e ? "electricMeterNo" : "waterMeterNo"} maxLength={60}
            defaultValue={(e ? initial?.electricMeterNo : initial?.waterMeterNo) ?? ""} />
        </label>
      )}
    </div>
  );
}

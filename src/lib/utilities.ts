import { formatPHP } from "./format";

export type Billing = "submeter" | "included" | "direct" | "fixed";
export type Utility = "electricity" | "water";

type UtilityFields = {
  electricityBilling: Billing | null;
  electricityRatePhp: number | null;
  electricityFixedPhp: number | null;
  waterBilling: Billing | null;
  waterRatePhp: number | null;
  waterFixedPhp: number | null;
  waterMinimumPhp: number | null;
};

export type UtilityTerms = { billing: Billing | null; ratePhp: number | null; fixedPhp: number | null; minimumPhp: number | null };

export const UNIT: Record<Utility, string> = { electricity: "kWh", water: "m³" };
export const UTILITY_LABEL: Record<Utility, string> = { electricity: "Electricity", water: "Water" };

export const BILLING_OPTIONS: [Billing, string][] = [
  ["submeter", "Sub-metered (billed by usage)"],
  ["included", "Included in rent"],
  ["direct", "Own meter, tenant pays the utility directly"],
  ["fixed", "Fixed monthly fee"],
];

/** A unit's own setting wins; a unit in a building falls back to the building's setting. */
export function effectiveTerms(unit: UtilityFields, building: UtilityFields | null | undefined, utility: Utility): UtilityTerms {
  const pick = <K extends keyof UtilityFields>(k: K) => unit[k] ?? building?.[k] ?? null;
  if (utility === "electricity") {
    return { billing: pick("electricityBilling"), ratePhp: pick("electricityRatePhp"), fixedPhp: pick("electricityFixedPhp"), minimumPhp: null };
  }
  return { billing: pick("waterBilling"), ratePhp: pick("waterRatePhp"), fixedPhp: pick("waterFixedPhp"), minimumPhp: pick("waterMinimumPhp") };
}

/** Charge for a usage amount under sub-meter terms, rounded to centavos. */
export function charge(consumption: number, terms: Pick<UtilityTerms, "ratePhp" | "minimumPhp">): number | null {
  if (terms.ratePhp == null) return null;
  const amount = Math.round(consumption * terms.ratePhp * 100) / 100;
  return terms.minimumPhp != null ? Math.max(amount, terms.minimumPhp) : amount;
}

export function describeTerms(t: UtilityTerms, utility: Utility): string | null {
  switch (t.billing) {
    case "submeter":
      return `Sub-metered${t.ratePhp != null ? ` · ${formatRate(t.ratePhp)}/${UNIT[utility]}` : ""}${t.minimumPhp ? ` · minimum ${formatPHP(t.minimumPhp)}` : ""}`;
    case "included":
      return "Included in rent";
    case "direct":
      return utility === "electricity" ? "Own meter · tenant pays the electric company directly" : "Own meter · tenant pays the water provider directly";
    case "fixed":
      return t.fixedPhp != null ? `Fixed ${formatPHP(t.fixedPhp)}/month` : "Fixed monthly fee";
    default:
      return null;
  }
}

export const formatRate = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(n);

export const formatPHP2 = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 }).format(n);

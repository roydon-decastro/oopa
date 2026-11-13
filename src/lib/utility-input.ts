import { z } from "zod";

const billing = z.preprocess((v) => (v === "" || v == null ? null : v), z.enum(["submeter", "included", "direct", "fixed"]).nullable());
const num = (max: number) =>
  z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().min(0, "Rates can't be negative.").max(max).nullable());
const text = z.preprocess((v) => (v === "" || v == null ? null : String(v).trim()), z.string().max(60).nullable());

/** Utility settings posted from building, property and unit forms. Blank means "not set" (for units: same as building). */
export const UtilityInput = z.object({
  electricityBilling: billing,
  electricityRatePhp: num(1000),
  electricityFixedPhp: num(1_000_000),
  waterBilling: billing,
  waterRatePhp: num(10_000),
  waterFixedPhp: num(1_000_000),
  waterMinimumPhp: num(1_000_000),
});

export const MeterNumbers = z.object({ electricMeterNo: text, waterMeterNo: text });

export function parseUtilities(formData: FormData, withMeters = false) {
  const raw = Object.fromEntries(formData);
  const u = UtilityInput.safeParse(raw);
  if (!u.success) return { error: u.error.issues[0].message } as const;
  if (!withMeters) return { data: u.data } as const;
  const m = MeterNumbers.safeParse(raw);
  if (!m.success) return { error: m.error.issues[0].message } as const;
  return { data: { ...u.data, ...m.data } } as const;
}

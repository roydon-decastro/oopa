// Dormitories, boarding houses and bedspaces: rooms rented per bed.

export type Gender = "any" | "male" | "female";
export const GENDER_OPTIONS: [Gender, string][] = [["any", "Anyone (mixed)"], ["male", "Male only"], ["female", "Female only"]];
export const GENDER_LABEL: Record<Gender, string> = { any: "Mixed", male: "Male only", female: "Female only" };

export type DormRules = { genderPolicy: Gender | null; curfew: string | null; houseRules: string | null };

/** A room's own rules win; otherwise the building's. */
export function effectiveRules(unit: Partial<DormRules>, b?: Partial<DormRules> | null): DormRules {
  return {
    genderPolicy: unit.genderPolicy ?? b?.genderPolicy ?? null,
    curfew: unit.curfew || b?.curfew || null,
    houseRules: unit.houseRules || b?.houseRules || null,
  };
}

const text = (v: FormDataEntryValue | null, max: number) => {
  const s = String(v ?? "").trim().slice(0, max);
  return s || null;
};

export function parseRules(formData: FormData): DormRules {
  const g = String(formData.get("genderPolicy") ?? "");
  return {
    genderPolicy: g === "any" || g === "male" || g === "female" ? g : null,
    curfew: text(formData.get("curfew"), 40),
    houseRules: text(formData.get("houseRules"), 2000),
  };
}

export type Beds = { bedsTotal: number | null; bedsTaken: number };

/** Bed counts for a listing. Only bedspace listings are rented per bed. */
export function parseBeds(formData: FormData, type: string): Beds | { error: string } {
  if (type !== "bedspace") return { bedsTotal: null, bedsTaken: 0 };
  const total = Number(formData.get("bedsTotal"));
  const taken = Number(formData.get("bedsTaken") || 0);
  if (!Number.isInteger(total) || total < 1 || total > 50) return { error: "Enter how many beds the room has (1 to 50)." };
  if (!Number.isInteger(taken) || taken < 0 || taken > total) return { error: `Beds taken must be between 0 and ${total}.` };
  return { bedsTotal: total, bedsTaken: taken };
}

export const bedsLeft = (p: { bedsTotal: number | null; bedsTaken: number }) =>
  p.bedsTotal == null ? null : Math.max(0, p.bedsTotal - p.bedsTaken);

type Status = "draft" | "active" | "rented" | "archived";
/** A published bed listing is "rented" when every bed is taken, and listed again as soon as one frees up. */
export function statusForBeds(status: Status, beds: Beds): Status {
  if (beds.bedsTotal == null || (status !== "active" && status !== "rented")) return status;
  return beds.bedsTaken >= beds.bedsTotal ? "rented" : "active";
}

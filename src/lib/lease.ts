import { z } from "zod";
import { formatPHP } from "./format";

// Lease application form, modelled on the owner's paper "Lease Application Form".

const t = (max: number) => z.string().trim().max(max);
const req = (max: number, msg: string) => z.string().trim().min(1, msg).max(max);

export const LeaseForm = z.object({
  fullName: req(120, "Enter the full name of the primary tenant."),
  nickname: t(60).default(""),
  contactNumbers: req(120, "Enter your contact number."),
  religion: t(60).default(""),
  address: req(300, "Enter your permanent or current address."),
  ids: z.array(z.object({
    type: req(60, "Enter the type of each ID, e.g. Driver's license."),
    number: req(60, "Enter the number of each ID."),
  })).min(1, "Enter at least one valid ID.").max(2),
  spouseName: t(120).default(""),
  employerName: req(160, "Enter your employer, business or school."),
  employerAddress: t(300).default(""),
  employerContact: t(120).default(""),
  emergencyName: req(120, "Enter an emergency contact."),
  emergencyContact: req(120, "Enter your emergency contact's number."),
  leaseStart: z.string().date("Choose the tentative start of your lease."),
  otherTenants: z.array(z.object({
    name: req(120, "Enter the name of each other tenant."),
    age: z.string().trim().regex(/^\d{0,3}$/, "Enter each tenant's age as a number."),
    work: t(160),
  })).max(20),
});
export type LeaseFormData = z.infer<typeof LeaseForm>;

/** What the renter is agreeing to, frozen at the time they submit. */
export type LeaseTerms = {
  propertyTitle: string;
  address: string;
  rentPhp: number;
  perBed: boolean;
  advanceMonths: number;
  depositMonths: number;
  reservationFeePhp: number | null;
  maxOccupants: number | null;
  covenants: string | null;
};

type TermSource = {
  reservationFeePhp: number | null; maxOccupants: number | null; leaseTerms: string | null;
};

export function leaseTermsFor(
  p: TermSource & {
    title: string; street: string | null; barangay: string | null; city: string; province: string; unitLabel: string | null;
    monthlyRentPhp: number; advanceMonths: number; depositMonths: number; bedsTotal: number | null;
  },
  b?: (TermSource & { name: string }) | null,
): LeaseTerms {
  return {
    propertyTitle: p.title,
    address: [p.unitLabel && b ? `${b.name}, ${p.unitLabel}` : null, p.street, p.barangay, p.city, p.province].filter(Boolean).join(", "),
    rentPhp: p.monthlyRentPhp,
    perBed: p.bedsTotal != null,
    advanceMonths: p.advanceMonths,
    depositMonths: p.depositMonths,
    reservationFeePhp: p.reservationFeePhp ?? b?.reservationFeePhp ?? null,
    maxOccupants: p.maxOccupants ?? b?.maxOccupants ?? null,
    covenants: p.leaseTerms || b?.leaseTerms || null,
  };
}

const months = (n: number) => `${n} month${n === 1 ? "" : "s"}`;

/** The payment covenants every form starts with, worded like the paper form. */
export function paymentCovenants(terms: LeaseTerms): string[] {
  const unit = terms.perBed ? "per bed" : "for the unit";
  const lines: string[] = [];
  if (terms.advanceMonths || terms.depositMonths) {
    lines.push(`Upon signing of the lease contract, the following shall be paid by the Lessee to the Lessor:`);
    if (terms.advanceMonths) lines.push(`  ${months(terms.advanceMonths)} advance lease of ${formatPHP(terms.rentPhp * terms.advanceMonths)} ${unit}`);
    if (terms.depositMonths) lines.push(`  ${months(terms.depositMonths)} security deposit of ${formatPHP(terms.rentPhp * terms.depositMonths)} ${unit}`);
  }
  if (terms.reservationFeePhp) {
    lines.push(`A non-refundable reservation fee of ${formatPHP(terms.reservationFeePhp)} is required to hold the preferred unit. This shall be deducted from the advance rental upon signing of the lease contract should the tenant push through with the lease.`);
  }
  return lines;
}

/** Turns the posted form into the shape LeaseForm validates. */
export function leaseFormFrom(formData: FormData) {
  const rows = <K extends string>(prefix: string, keys: K[], n: number) =>
    Array.from({ length: n }, (_, i) => Object.fromEntries(keys.map((k) => [k, String(formData.get(`${prefix}${i}_${k}`) ?? "")])) as Record<K, string>)
      .filter((r) => Object.values<string>(r).some((v) => v.trim()));
  const s = (k: string) => String(formData.get(k) ?? "");
  return {
    fullName: s("fullName"), nickname: s("nickname"), contactNumbers: s("contactNumbers"), religion: s("religion"),
    address: s("address"), ids: rows("id", ["type", "number"], 2), spouseName: s("spouseName"),
    employerName: s("employerName"), employerAddress: s("employerAddress"), employerContact: s("employerContact"),
    emergencyName: s("emergencyName"), emergencyContact: s("emergencyContact"), leaseStart: s("leaseStart"),
    otherTenants: rows("tenant", ["name", "age", "work"], 20),
  };
}

/** Owner's lease terms from the listing or building form. Blank means "not set" (units then use the building's). */
export function parseLeaseTerms(formData: FormData): { reservationFeePhp: number | null; maxOccupants: number | null; leaseTerms: string | null } | { error: string } {
  const fee = String(formData.get("reservationFeePhp") ?? "").trim();
  const max = String(formData.get("maxOccupants") ?? "").trim();
  const reservationFeePhp = fee === "" ? null : Number(fee);
  const maxOccupants = max === "" ? null : Number(max);
  if (reservationFeePhp != null && !(reservationFeePhp >= 0 && reservationFeePhp <= 10_000_000)) return { error: "Enter a valid reservation fee." };
  if (maxOccupants != null && !(Number.isInteger(maxOccupants) && maxOccupants >= 1 && maxOccupants <= 50)) return { error: "Maximum tenants must be between 1 and 50." };
  const leaseTerms = String(formData.get("leaseTerms") ?? "").trim().slice(0, 5000) || null;
  return { reservationFeePhp, maxOccupants, leaseTerms };
}

import { z } from "zod";

// Contract of Lease: plain text from the lessor's own template (or Oopa's default). The [BLANKS] in it are
// filled from the contract details form, so the lessor never has to find and replace them by hand.

export const MAX_CONTRACT_LENGTH = 60_000;

/** The contract details form. Each field fills one or more [BLANKS] in the contract text. All values are as typed. */
export const ContractFields = z.object({
  lessorName: z.string().max(120),
  lessorCivilStatus: z.string().max(40),
  lessorCitizenship: z.string().max(60),
  lessorAddress: z.string().max(300),
  renterName: z.string().max(120),
  renterCivilStatus: z.string().max(40),
  renterCitizenship: z.string().max(60),
  renterAddress: z.string().max(300),
  renterId: z.string().max(120),
  property: z.string().max(300),
  propertyAddress: z.string().max(300),
  rentPhp: z.string().max(20),
  advanceMonths: z.string().max(3),
  depositMonths: z.string().max(3),
  leaseMonths: z.string().max(4),
  startDate: z.string().max(10),
  endDate: z.string().max(10),
  maxOccupants: z.string().max(3),
  houseRules: z.string().max(5000),
});
export type ContractFieldsData = z.infer<typeof ContractFields>;

/** The lessor's own details, remembered from their last contract. */
export const LessorProfile = z.object({
  civilStatus: z.string().max(40).default(""),
  citizenship: z.string().max(60).default(""),
  address: z.string().max(300).default(""),
});
export type LessorProfileData = z.infer<typeof LessorProfile>;

export const CIVIL_STATUS = ["single", "married", "widowed", "separated", "annulled"];

/** Each blank, the form field that fills it, and the label shown on the form and the template page. */
export const CONTRACT_BLANKS: { blank: string; field: keyof ContractFieldsData; label: string }[] = [
  { blank: "[LESSOR NAME]", field: "lessorName", label: "Your full name" },
  { blank: "[LESSOR CIVIL STATUS]", field: "lessorCivilStatus", label: "Your civil status" },
  { blank: "[LESSOR CITIZENSHIP]", field: "lessorCitizenship", label: "Your citizenship" },
  { blank: "[LESSOR ADDRESS]", field: "lessorAddress", label: "Your residence address" },
  { blank: "[RENTER NAME]", field: "renterName", label: "Renter's full name" },
  { blank: "[RENTER CIVIL STATUS]", field: "renterCivilStatus", label: "Renter's civil status" },
  { blank: "[RENTER CITIZENSHIP]", field: "renterCitizenship", label: "Renter's citizenship" },
  { blank: "[RENTER ADDRESS]", field: "renterAddress", label: "Renter's residence address" },
  { blank: "[RENTER ID]", field: "renterId", label: "Renter's ID type and number" },
  { blank: "[PROPERTY]", field: "property", label: "Unit being leased" },
  { blank: "[PROPERTY ADDRESS]", field: "propertyAddress", label: "Address of the unit" },
  { blank: "[RENT]", field: "rentPhp", label: "Monthly rent (₱)" },
  { blank: "[ADVANCE MONTHS]", field: "advanceMonths", label: "Advance (months)" },
  { blank: "[ADVANCE]", field: "advanceMonths", label: "Advance amount (from rent × months)" },
  { blank: "[DEPOSIT MONTHS]", field: "depositMonths", label: "Security deposit (months)" },
  { blank: "[DEPOSIT]", field: "depositMonths", label: "Deposit amount (from rent × months)" },
  { blank: "[LEASE MONTHS]", field: "leaseMonths", label: "Lease period (months)" },
  { blank: "[START DATE]", field: "startDate", label: "Start of lease" },
  { blank: "[END DATE]", field: "endDate", label: "End of lease" },
  { blank: "[MAX OCCUPANTS]", field: "maxOccupants", label: "Maximum occupants" },
  { blank: "[HOUSE RULES]", field: "houseRules", label: "House rules (one per line)" },
];

const num = (s: string) => (/^\d+(\.\d+)?$/.test(s.trim()) ? Number(s) : null);
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

/** What each blank becomes for these details. A blank whose details are missing maps to "". */
export function blankValues(f: ContractFieldsData): Record<string, string> {
  const rent = num(f.rentPhp);
  const adv = num(f.advanceMonths);
  const dep = num(f.depositMonths);
  const lease = num(f.leaseMonths);
  const occ = num(f.maxOccupants);
  const words = (n: number | null) => (n == null ? "" : `${numberWords(n)} (${n})`);
  const rules = f.houseRules.split("\n").map((l) => l.trim()).filter(Boolean);
  return {
    "[LESSOR NAME]": f.lessorName.trim().toUpperCase(),
    "[LESSOR CIVIL STATUS]": f.lessorCivilStatus.trim(),
    "[LESSOR CITIZENSHIP]": f.lessorCitizenship.trim(),
    "[LESSOR ADDRESS]": f.lessorAddress.trim(),
    "[RENTER NAME]": f.renterName.trim().toUpperCase(),
    "[RENTER CIVIL STATUS]": f.renterCivilStatus.trim(),
    "[RENTER CITIZENSHIP]": f.renterCitizenship.trim(),
    "[RENTER ADDRESS]": f.renterAddress.trim(),
    "[RENTER ID]": f.renterId.trim(),
    "[PROPERTY]": f.property.trim(),
    "[PROPERTY ADDRESS]": f.propertyAddress.trim(),
    "[RENT]": rent ? pesoWords(rent) : "",
    "[ADVANCE MONTHS]": words(adv),
    "[ADVANCE]": rent && adv != null ? pesoWords(rent * adv) : "",
    "[DEPOSIT MONTHS]": words(dep),
    "[DEPOSIT]": rent && dep != null ? pesoWords(rent * dep) : "",
    "[LEASE MONTHS]": lease ? counted(lease, "month").toUpperCase() : "",
    "[START DATE]": isDate(f.startDate) ? longDate(f.startDate) : "",
    "[END DATE]": isDate(f.endDate) ? longDate(f.endDate) : "",
    "[MAX OCCUPANTS]": occ ? words(occ).toUpperCase() : "",
    "[HOUSE RULES]": rules.length ? rules.map((r, i) => `${String.fromCharCode(97 + (i % 26))}. ${r}`).join("\n") : "None, other than those stated in this contract.",
  };
}

/** Fills the [BLANKS] in contract text. Blanks without details print as a line to write on by hand. */
export function fillContract(text: string, f: ContractFieldsData | null): string {
  if (!f) return text;
  const values = blankValues(f);
  return text.replace(/\[[A-Z ]+\]/g, (m) => (m in values ? values[m] || "____________________" : m));
}

/** Blanks used in the text whose details are still empty. */
export function missingBlanks(text: string, f: ContractFieldsData): string[] {
  const values = blankValues(f);
  const used = new Set(text.match(/\[[A-Z ]+\]/g) ?? []);
  return CONTRACT_BLANKS.filter((b) => used.has(b.blank) && !values[b.blank]).map((b) => b.label);
}

// ---------- Wording helpers ----------

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function below1000(n: number): string {
  const parts: string[] = [];
  if (n >= 100) { parts.push(`${ONES[Math.floor(n / 100)]} hundred`); n %= 100; }
  if (n >= 20) parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ""));
  else if (n > 0) parts.push(ONES[n]);
  return parts.join(" ");
}

/** 22000 → "twenty-two thousand" */
export function numberWords(n: number): string {
  n = Math.floor(n);
  if (n === 0) return "zero";
  const parts: string[] = [];
  for (const [size, name] of [[1e9, "billion"], [1e6, "million"], [1e3, "thousand"]] as const) {
    if (n >= size) { parts.push(`${below1000(Math.floor(n / size))} ${name}`); n %= size; }
  }
  if (n) parts.push(below1000(n));
  return parts.join(" ");
}

/** "thirty (30) days", "six (6) months" */
export const counted = (n: number, unit: string) => `${numberWords(n)} (${n}) ${unit}${n === 1 ? "" : "s"}`;

/** 11000 → "ELEVEN THOUSAND PESOS ONLY (₱11,000.00)" */
export function pesoWords(n: number): string {
  const whole = Math.floor(n);
  const cents = Math.round((n - whole) * 100);
  const amount = new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  return `${numberWords(whole).toUpperCase()} PESOS${cents ? ` AND ${cents}/100` : " ONLY"} (₱${amount})`;
}

export const ordinal = (n: number) => {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${s}`;
};

/** The last day of the lease: start + months − 1 day (Nov 7 + 6 months → May 6). */
export function endDate(start: string, months: number): string {
  const [y, m, d] = start.split("-").map(Number);
  const end = new Date(Date.UTC(y, m - 1 + months, d));
  // Clamp to month end (e.g. Aug 31 + 6 months → Feb 28) before subtracting a day.
  if (end.getUTCDate() !== d) end.setUTCDate(0); else end.setUTCDate(end.getUTCDate() - 1);
  return end.toISOString().slice(0, 10);
}

export const longDate = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric", timeZone: "UTC" }).toUpperCase();

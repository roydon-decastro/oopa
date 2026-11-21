// Contract of Lease: plain text, from the lessor's own template (or Oopa's default) with the
// [BLANKS] filled in for one renter. The lessor can edit the filled-in text before sending it.

export const MAX_CONTRACT_LENGTH = 60_000;

/** The blanks Oopa fills in, with what each becomes. Shown on the template page. */
export const CONTRACT_BLANKS: [string, string][] = [
  ["[LESSOR NAME]", "Your name"],
  ["[RENTER NAME]", "The renter's full name from their lease application"],
  ["[RENTER ADDRESS]", "The renter's address from their lease application"],
  ["[RENTER ID]", "The renter's first ID type and number"],
  ["[PROPERTY]", "The unit, e.g. Unit 4B of Casa Verde, or one (1) bed space in Room 201"],
  ["[PROPERTY ADDRESS]", "The listing's address"],
  ["[RENT]", "Monthly rent in words and figures"],
  ["[ADVANCE MONTHS]", "Months of advance rent, e.g. one (1)"],
  ["[ADVANCE]", "Advance rent in words and figures"],
  ["[DEPOSIT MONTHS]", "Months of security deposit, e.g. two (2)"],
  ["[DEPOSIT]", "Security deposit in words and figures"],
  ["[LEASE MONTHS]", "Lease period, from the listing's minimum lease, e.g. SIX (6) MONTHS"],
  ["[START DATE]", "Lease start from the renter's application"],
  ["[END DATE]", "The day before the same date, [LEASE MONTHS] later"],
  ["[MAX OCCUPANTS]", "Maximum tenants from the listing, e.g. THREE (3)"],
  ["[HOUSE RULES]", "The listing's lease terms, one per line"],
];

export type ContractFacts = {
  lessorName: string; renterName: string; renterAddress: string; renterId: string;
  property: string; propertyAddress: string; rentPhp: number; advanceMonths: number; depositMonths: number;
  leaseMonths: number; startDate: string; maxOccupants: number | null; houseRules: string | null;
};

/** Fills the [BLANKS] in a template. Blanks without a value are left for the lessor to fill in by hand. */
export function fillContract(template: string, f: ContractFacts): string {
  const end = endDate(f.startDate, f.leaseMonths);
  const rules = (f.houseRules ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  const values: Record<string, string> = {
    "[LESSOR NAME]": f.lessorName.toUpperCase(),
    "[RENTER NAME]": f.renterName.toUpperCase(),
    "[RENTER ADDRESS]": f.renterAddress,
    "[RENTER ID]": f.renterId,
    "[PROPERTY]": f.property,
    "[PROPERTY ADDRESS]": f.propertyAddress,
    "[RENT]": pesoWords(f.rentPhp),
    "[ADVANCE MONTHS]": `${numberWords(f.advanceMonths)} (${f.advanceMonths})`,
    "[ADVANCE]": pesoWords(f.rentPhp * f.advanceMonths),
    "[DEPOSIT MONTHS]": `${numberWords(f.depositMonths)} (${f.depositMonths})`,
    "[DEPOSIT]": pesoWords(f.rentPhp * f.depositMonths),
    "[LEASE MONTHS]": counted(f.leaseMonths, "month").toUpperCase(),
    "[START DATE]": longDate(f.startDate),
    "[END DATE]": longDate(end),
    "[MAX OCCUPANTS]": f.maxOccupants ? `${numberWords(f.maxOccupants).toUpperCase()} (${f.maxOccupants})` : "____",
    "[HOUSE RULES]": rules.length ? rules.map((r, i) => `${String.fromCharCode(97 + (i % 26))}. ${r}`).join("\n") : "None, other than those stated in this contract.",
  };
  return template.replace(/\[[A-Z ]+\]/g, (m) => (m in values && values[m] ? values[m] : m));
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

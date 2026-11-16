import { z } from "zod";

// Contract of Lease, modelled on the owner's Word template. The owner fills in the highlighted
// fields when preparing it; everything else is fixed wording (see ContractDocument).

export const CIVIL_STATUS = ["single", "married", "widowed", "separated", "annulled"] as const;

export const CAPACITY = {
  owner: "the owner",
  coowner: "a co-owner and the appointed representative of the owners",
  agent: "the duly authorized agent of the owner",
} as const;
export type Capacity = keyof typeof CAPACITY;

const t = (max: number) => z.string().trim().max(max);
const req = (max: number, msg: string) => z.string().trim().min(1, msg).max(max);
const int = (min: number, max: number, label: string) =>
  z.coerce.number({ message: `Enter ${label}.` }).int(`${label} must be a whole number.`).min(min, `${label} must be at least ${min}.`).max(max, `${label} can't be more than ${max}.`);

/** The lessor's own details, remembered on their account for the next contract. */
export const LessorDetails = z.object({
  civilStatus: z.enum(CIVIL_STATUS, { message: "Choose your civil status." }),
  citizenship: req(60, "Enter your citizenship."),
  address: req(300, "Enter your residence address."),
  capacity: z.enum(["owner", "coowner", "agent"]),
  idType: t(60),
  idNumber: t(60),
});
export type LessorDetailsData = z.infer<typeof LessorDetails>;

export const ContractForm = z.object({
  lessor: LessorDetails.extend({ name: req(120, "Enter your full name as lessor.") }),
  lessee: z.object({
    name: req(120, "Enter the lessee's full name."),
    civilStatus: z.enum(CIVIL_STATUS, { message: "Choose the lessee's civil status." }),
    citizenship: req(60, "Enter the lessee's citizenship."),
    address: req(300, "Enter the lessee's residence address."),
    idType: t(60),
    idNumber: t(60),
  }),
  premises: req(300, "Describe the leased premises, e.g. Unit 4B of the five-storey residential building."),
  address: req(300, "Enter the address of the leased premises."),
  startDate: z.string().date("Choose the start date of the lease."),
  months: int(1, 120, "Lease period (months)"),
  rentPhp: z.coerce.number({ message: "Enter the monthly rent." }).positive("Enter the monthly rent.").max(10_000_000),
  dueDay: int(1, 31, "Rent due day"),
  graceDays: int(0, 60, "Grace period"),
  penalty1: int(0, 100, "1st month penalty"),
  penalty2: int(0, 100, "2nd month penalty"),
  penalty3: int(0, 100, "Later months penalty"),
  unpaidTerminateDays: int(1, 365, "Unpaid days before termination"),
  depositMonths: int(0, 12, "Security deposit (months)"),
  depositRefundDays: int(1, 365, "Deposit refund days"),
  renewalMonths: int(1, 120, "Renewal period"),
  renewalNoticeDays: int(1, 365, "Renewal notice days"),
  ownerUseNoticeDays: int(1, 365, "Owner's own use notice days"),
  idsWithinDays: int(1, 90, "Days to submit IDs"),
  maxOccupants: int(1, 50, "Maximum occupants"),
  noPets: z.boolean(),
  noGasul: z.boolean(),
  calamityRefundDays: int(1, 365, "Refund days after a calamity"),
  violationNoticeDays: int(1, 365, "Notice days for violations"),
  unpaidMonths: int(1, 12, "Unpaid months for violation"),
  abandonDays: int(1, 365, "Days vacated without notice"),
  preterminationNoticeDays: int(1, 365, "Pre-termination notice days"),
  preterminationMonths: int(0, 12, "Pre-termination penalty (months)"),
  preterminationRefundDays: int(1, 365, "Pre-termination refund days"),
  otherRules: t(5000),
  witness1: t(120),
  witness2: t(120),
});
export type ContractData = z.infer<typeof ContractForm>;

/** Values from the owner's template, used until the owner changes them. */
export const CONTRACT_DEFAULTS = {
  months: 6, dueDay: 7, graceDays: 5, penalty1: 5, penalty2: 10, penalty3: 20, unpaidTerminateDays: 30,
  depositRefundDays: 30, renewalMonths: 6, renewalNoticeDays: 30, ownerUseNoticeDays: 60, idsWithinDays: 7,
  noGasul: true, calamityRefundDays: 60, violationNoticeDays: 10, unpaidMonths: 1, abandonDays: 30,
  preterminationNoticeDays: 30, preterminationMonths: 2, preterminationRefundDays: 30,
} satisfies Partial<ContractData>;

/** Turns the posted form into the shape ContractForm validates. */
export function contractFormFrom(formData: FormData) {
  const s = (k: string) => String(formData.get(k) ?? "");
  const party = (p: string) => ({
    name: s(`${p}.name`), civilStatus: s(`${p}.civilStatus`), citizenship: s(`${p}.citizenship`),
    address: s(`${p}.address`), idType: s(`${p}.idType`), idNumber: s(`${p}.idNumber`),
  });
  const nums = [
    "months", "rentPhp", "dueDay", "graceDays", "penalty1", "penalty2", "penalty3", "unpaidTerminateDays", "depositMonths",
    "depositRefundDays", "renewalMonths", "renewalNoticeDays", "ownerUseNoticeDays", "idsWithinDays", "maxOccupants",
    "calamityRefundDays", "violationNoticeDays", "unpaidMonths", "abandonDays", "preterminationNoticeDays",
    "preterminationMonths", "preterminationRefundDays",
  ] as const;
  return {
    lessor: { ...party("lessor"), capacity: s("lessor.capacity") },
    lessee: party("lessee"),
    premises: s("premises"), address: s("address"), startDate: s("startDate"),
    ...Object.fromEntries(nums.map((k) => [k, s(k)])),
    noPets: formData.get("noPets") === "on", noGasul: formData.get("noGasul") === "on",
    otherRules: s("otherRules"), witness1: s("witness1"), witness2: s("witness2"),
  };
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

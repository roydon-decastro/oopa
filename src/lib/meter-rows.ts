import "server-only";
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { meterReading, type Building, type Property } from "@/db/schema";
import { effectiveTerms, type Utility } from "./utilities";
import type { MeterRow } from "@/components/MeterEntry";

const STATUS: Record<string, string> = { rented: "Occupied", active: "Vacant", draft: "Not listed", archived: "Archived" };

/** Builds meter-entry rows for the sub-metered units among `units`, for one utility and reading date. */
export async function meterRows(units: (Property & { building?: Building | null })[], utility: Utility, date: string): Promise<MeterRow[]> {
  const metered = units.filter((u) => effectiveTerms(u, u.building, utility).billing === "submeter");
  if (!metered.length) return [];
  const ids = metered.map((u) => u.id);
  const [current, older] = await Promise.all([
    db.select().from(meterReading).where(and(inArray(meterReading.propertyId, ids), eq(meterReading.utility, utility), eq(meterReading.readingDate, date))),
    db.select().from(meterReading)
      .where(and(inArray(meterReading.propertyId, ids), eq(meterReading.utility, utility), lt(meterReading.readingDate, date)))
      .orderBy(desc(meterReading.readingDate)),
  ]);
  return metered.map((u) => {
    const terms = effectiveTerms(u, u.building, utility);
    const prev = older.find((r) => r.propertyId === u.id);
    return {
      propertyId: u.id,
      label: u.unitLabel ? `Unit ${u.unitLabel}` : u.title,
      sublabel: STATUS[u.status],
      meterNo: utility === "electricity" ? u.electricMeterNo : u.waterMeterNo,
      prevReading: prev?.reading ?? null,
      prevDate: prev?.readingDate ?? null,
      ratePhp: terms.ratePhp,
      minimumPhp: terms.minimumPhp,
      current: current.find((r) => r.propertyId === u.id)?.reading ?? null,
    };
  });
}

export const today = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10); // Philippine date
export const validDate = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : today());

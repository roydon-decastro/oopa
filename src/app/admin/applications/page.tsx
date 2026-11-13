import Link from "next/link";
import { aliasedTable, and, count, desc, eq, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { application, property, user } from "@/db/schema";
import { formatPHP } from "@/lib/format";
import { APP_STATUS } from "@/lib/status";
import { PAGE_SIZE, Pager, dateFmt, pageNum, qs } from "../ui";

export const metadata = { title: "Applications · Admin · Oopa" };

const STATUSES = ["", "submitted", "reviewing", "approved", "rejected", "withdrawn"] as const;
type AppStatus = Exclude<(typeof STATUSES)[number], "">;

export default async function AdminApplications({ searchParams }: { searchParams: Promise<{ status?: string; renter?: string; page?: string }> }) {
  const sp = await searchParams;
  const status = (STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status ?? "") : "";
  const renter = sp.renter ?? "";
  const page = pageNum(sp.page);
  const owner = aliasedTable(user, "owner");

  const where: SQL[] = [];
  if (status) where.push(eq(application.status, status as AppStatus));
  if (renter) where.push(eq(application.renterId, renter));
  const filter = where.length ? and(...where) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db.select({
      id: application.id, status: application.status, createdAt: application.createdAt, moveIn: application.moveInDate,
      propertyId: property.id, title: property.title, rent: property.monthlyRentPhp,
      renterName: user.name, renterEmail: user.email, ownerName: owner.name, ownerEmail: owner.email,
    }).from(application)
      .innerJoin(property, eq(property.id, application.propertyId))
      .innerJoin(user, eq(user.id, application.renterId))
      .innerJoin(owner, eq(owner.id, property.ownerId))
      .where(filter).orderBy(desc(application.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(application).where(filter),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-bold">Applications</h1>
      <p className="mt-2 text-sm text-slate-600">Read-only. Owners accept or decline applications from their own dashboard.</p>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin/applications${qs({ status: s, renter })}`}
            className={`rounded-full border px-3 py-1 ${status === s ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-300 hover:border-emerald-600"}`}>
            {s ? APP_STATUS[s].label : "All"}
          </Link>
        ))}
        {renter && <Link href={`/admin/applications${qs({ status })}`} className="text-slate-500 underline">Clear renter filter</Link>}
      </div>
      <p className="mt-4 text-sm text-slate-500">{total.toLocaleString("en-PH")} application{total === 1 ? "" : "s"}</p>

      <ul className="mt-2 divide-y divide-slate-200 rounded-xl border border-slate-200 text-sm">
        {rows.length === 0 && <li className="p-6 text-center text-slate-500">No applications match.</li>}
        {rows.map((r) => (
          <li key={r.id} className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${APP_STATUS[r.status].style}`}>{APP_STATUS[r.status].label}</span>
              <span className="text-xs text-slate-500">{dateFmt(r.createdAt)}</span>
            </div>
            <Link href={`/listings/${r.propertyId}`} className="mt-1 block truncate font-semibold hover:text-emerald-700">{r.title}</Link>
            <p className="text-slate-600">{formatPHP(r.rent)}/mo{r.moveIn ? ` · move-in ${r.moveIn}` : ""}</p>
            <p className="text-xs text-slate-500">
              Renter: {r.renterName} ({r.renterEmail}) · Owner: {r.ownerName} ({r.ownerEmail})
            </p>
          </li>
        ))}
      </ul>
      <Pager page={page} total={total} href={(p) => `/admin/applications${qs({ status, renter, page: p })}`} />
    </div>
  );
}

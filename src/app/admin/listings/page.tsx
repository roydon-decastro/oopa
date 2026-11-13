import Link from "next/link";
import { and, count, desc, eq, ilike, isNotNull, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { property, user } from "@/db/schema";
import { formatPHP } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/ph";
import { publicListing } from "@/lib/visibility";
import { PAGE_SIZE, Pager, dateFmt, pageNum, qs } from "../ui";
import ListingModeration from "./ListingModeration";

export const metadata = { title: "Listings · Admin · Oopa" };

const FILTERS = [["", "All"], ["live", "Live"], ["removed", "Taken down"]] as const;

export default async function AdminListings({ searchParams }: { searchParams: Promise<{ q?: string; show?: string; owner?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const show = sp.show ?? "";
  const owner = sp.owner ?? "";
  const page = pageNum(sp.page);

  const where: SQL[] = [];
  if (q) where.push(or(ilike(property.title, `%${q}%`), ilike(property.city, `%${q}%`), ilike(user.email, `%${q}%`), ilike(user.name, `%${q}%`))!);
  if (show === "live") where.push(publicListing());
  if (show === "removed") where.push(isNotNull(property.removedAt));
  if (owner) where.push(eq(property.ownerId, owner));
  const filter = where.length ? and(...where) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db.select({
      id: property.id, title: property.title, city: property.city, province: property.province,
      rent: property.monthlyRentPhp, status: property.status, createdAt: property.createdAt,
      removedAt: property.removedAt, removedReason: property.removedReason,
      ownerId: user.id, ownerName: user.name, ownerEmail: user.email,
    }).from(property).innerJoin(user, eq(user.id, property.ownerId))
      .where(filter).orderBy(desc(property.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(property).innerJoin(user, eq(user.id, property.ownerId)).where(filter),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-bold">Listings</h1>
      <form className="mt-6 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search title, city or owner" className="input max-w-sm min-w-0 flex-1" />
        {show && <input type="hidden" name="show" value={show} />}
        {owner && <input type="hidden" name="owner" value={owner} />}
        <button className="btn shrink-0">Search</button>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        {FILTERS.map(([v, label]) => (
          <Link key={v} href={`/admin/listings${qs({ q, show: v, owner })}`}
            className={`rounded-full border px-3 py-1 ${show === v ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-300 hover:border-emerald-600"}`}>
            {label}
          </Link>
        ))}
        {owner && <Link href={`/admin/listings${qs({ q, show })}`} className="text-slate-500 underline">Clear owner filter</Link>}
      </div>
      <p className="mt-4 text-sm text-slate-500">{total.toLocaleString("en-PH")} listing{total === 1 ? "" : "s"}</p>

      <ul className="mt-2 divide-y divide-slate-200 rounded-xl border border-slate-200 text-sm">
        {rows.length === 0 && <li className="p-6 text-center text-slate-500">No listings match.</li>}
        {rows.map((r) => (
          <li key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{STATUS_LABEL[r.status]}</span>
                {r.removedAt && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">Taken down {dateFmt(r.removedAt)}</span>}
              </div>
              <Link href={`/listings/${r.id}`} className="mt-1 block truncate font-semibold hover:text-emerald-700">{r.title}</Link>
              <p className="text-slate-600">{formatPHP(r.rent)}/mo · {r.city}, {r.province}</p>
              <p className="text-xs text-slate-500">
                By <Link className="underline hover:text-emerald-700" href={`/admin/users${qs({ q: r.ownerEmail })}`}>{r.ownerName}</Link> ({r.ownerEmail}) · Added {dateFmt(r.createdAt)}
              </p>
              {r.removedReason && <p className="mt-1 text-xs text-red-700">Reason: {r.removedReason}</p>}
            </div>
            <ListingModeration id={r.id} removed={!!r.removedAt} />
          </li>
        ))}
      </ul>
      <Pager page={page} total={total} href={(p) => `/admin/listings${qs({ q, show, owner, page: p })}`} />
    </div>
  );
}

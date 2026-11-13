import Link from "next/link";
import { and, count, desc, eq, ilike, isNotNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { property, user } from "@/db/schema";
import { getSession } from "@/lib/session";
import { isAdmin } from "@/lib/admin";
import { PAGE_SIZE, Pager, dateFmt, pageNum, qs } from "../ui";
import SuspendButton from "./SuspendButton";

export const metadata = { title: "Users · Admin · Oopa" };

const FILTERS = [["", "Everyone"], ["owner", "Owners"], ["renter", "Renters"], ["suspended", "Suspended"]] as const;

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; show?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const show = sp.show ?? "";
  const page = pageNum(sp.page);
  const me = (await getSession())!.user;

  const where: SQL[] = [];
  if (q) where.push(or(ilike(user.name, `%${q}%`), ilike(user.email, `%${q}%`), ilike(user.phone, `%${q}%`))!);
  if (show === "owner" || show === "renter") where.push(eq(user.role, show));
  if (show === "suspended") where.push(isNotNull(user.suspendedAt));
  const filter = where.length ? and(...where) : undefined;

  const listings = db.select({ ownerId: property.ownerId, n: count().as("n") }).from(property).groupBy(property.ownerId).as("l");
  const [rows, [{ total }]] = await Promise.all([
    db.select({
      id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role,
      createdAt: user.createdAt, suspendedAt: user.suspendedAt,
      listings: sql<number>`coalesce(${listings.n}, 0)`.mapWith(Number),
    }).from(user).leftJoin(listings, eq(listings.ownerId, user.id))
      .where(filter).orderBy(desc(user.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(user).where(filter),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-bold">Users</h1>
      <form className="mt-6 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search name, email or phone" className="input max-w-sm min-w-0 flex-1" />
        {show && <input type="hidden" name="show" value={show} />}
        <button className="btn shrink-0">Search</button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        {FILTERS.map(([v, label]) => (
          <Link key={v} href={`/admin/users${qs({ q, show: v })}`}
            className={`rounded-full border px-3 py-1 ${show === v ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-300 hover:border-emerald-600"}`}>
            {label}
          </Link>
        ))}
      </div>
      <p className="mt-4 text-sm text-slate-500">{total.toLocaleString("en-PH")} {total === 1 ? "person" : "people"}</p>

      <ul className="mt-2 divide-y divide-slate-200 rounded-xl border border-slate-200 text-sm">
        {rows.length === 0 && <li className="p-6 text-center text-slate-500">No one matches.</li>}
        {rows.map((r) => (
          <li key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{r.name}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-700">{r.role}</span>
                {isAdmin(r.email) && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">Admin</span>}
                {r.suspendedAt && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">Suspended {dateFmt(r.suspendedAt)}</span>}
              </div>
              <p className="truncate text-slate-600">{r.email}{r.phone ? ` · ${r.phone}` : ""}</p>
              <p className="text-xs text-slate-500">
                Joined {dateFmt(r.createdAt)}
                {r.listings > 0 && <> · <Link className="underline hover:text-emerald-700" href={`/admin/listings${qs({ owner: r.id })}`}>{r.listings} listing{r.listings === 1 ? "" : "s"}</Link></>}
                {" · "}<Link className="underline hover:text-emerald-700" href={`/admin/applications${qs({ renter: r.id })}`}>applications</Link>
              </p>
            </div>
            {r.id !== me.id && <SuspendButton userId={r.id} name={r.name} suspended={!!r.suspendedAt} />}
          </li>
        ))}
      </ul>
      <Pager page={page} total={total} href={(p) => `/admin/users${qs({ q, show, page: p })}`} />
    </div>
  );
}

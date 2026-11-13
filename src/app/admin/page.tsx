import Link from "next/link";
import { count, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { application, building, property, user } from "@/db/schema";
import { publicListing } from "@/lib/visibility";
import { dateFmt } from "./ui";

export default async function AdminOverview() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [users, listings, buildings, apps, recent] = await Promise.all([
    db.select({
      total: count(),
      owners: sql<number>`count(*) filter (where ${user.role} = 'owner')`.mapWith(Number),
      thisWeek: sql<number>`count(*) filter (where ${user.createdAt} >= ${weekAgo.toISOString()}::timestamp)`.mapWith(Number),
      suspended: sql<number>`count(*) filter (where ${user.suspendedAt} is not null)`.mapWith(Number),
    }).from(user),
    db.select({
      total: count(),
      live: sql<number>`count(*) filter (where ${publicListing()})`.mapWith(Number),
      rented: sql<number>`count(*) filter (where ${property.status} = 'rented')`.mapWith(Number),
      removed: sql<number>`count(*) filter (where ${property.removedAt} is not null)`.mapWith(Number),
    }).from(property),
    db.select({ total: count() }).from(building),
    db.select({
      total: count(),
      open: sql<number>`count(*) filter (where ${application.status} in ('submitted', 'reviewing'))`.mapWith(Number),
      thisWeek: sql<number>`count(*) filter (where ${application.createdAt} >= ${weekAgo.toISOString()}::timestamp)`.mapWith(Number),
    }).from(application),
    db.select({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt })
      .from(user).orderBy(desc(user.createdAt)).limit(8),
  ]);
  const u = users[0], l = listings[0], a = apps[0];

  const cards: { label: string; value: number; sub: string; href: string }[] = [
    { label: "Users", value: u.total, sub: `${u.owners} owners · ${u.total - u.owners} renters`, href: "/admin/users" },
    { label: "New users this week", value: u.thisWeek, sub: u.suspended ? `${u.suspended} suspended` : "None suspended", href: "/admin/users" },
    { label: "Live listings", value: l.live, sub: `${l.total} total · ${l.rented} rented`, href: "/admin/listings?show=live" },
    { label: "Taken down", value: l.removed, sub: "Hidden by an admin", href: "/admin/listings?show=removed" },
    { label: "Buildings", value: buildings[0].total, sub: "Apartment buildings", href: "/admin/listings" },
    { label: "Applications", value: a.total, sub: `${a.open} open · ${a.thisWeek} this week`, href: "/admin/applications" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold">Overview</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="rounded-xl border border-slate-200 p-4 hover:border-emerald-600">
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className="mt-1 text-3xl font-bold">{c.value.toLocaleString("en-PH")}</p>
            <p className="mt-1 text-xs text-slate-500">{c.sub}</p>
          </Link>
        ))}
      </div>

      <h2 className="mt-10 text-xl font-semibold">Newest sign-ups</h2>
      {recent.length === 0 ? (
        <p className="mt-3 text-slate-600">No one has signed up yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 text-sm">
          {recent.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <Link href={`/admin/users?q=${encodeURIComponent(r.email)}`} className="font-medium hover:text-emerald-700">{r.name}</Link>
                <p className="truncate text-slate-500">{r.email}</p>
              </div>
              <div className="text-right text-slate-500">
                <span className="capitalize">{r.role}</span> · {dateFmt(r.createdAt)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { application, property } from "@/db/schema";
import { requireOwner } from "@/lib/session";
import { formatPHP } from "@/lib/format";
import { APP_STATUS } from "@/lib/status";
import DecisionButtons from "@/components/DecisionButtons";

export const metadata = { title: "Applications · Oopa" };

export default async function OwnerApplications({ searchParams }: { searchParams: Promise<{ property?: string }> }) {
  const { user } = await requireOwner("/dashboard/applications");
  const { property: only } = await searchParams;
  const mine = await db.select({ id: property.id }).from(property).where(eq(property.ownerId, user.id));
  const ids = mine.map((m) => m.id).filter((id) => !only || id === only);

  const apps = ids.length
    ? await db.query.application.findMany({
        where: inArray(application.propertyId, ids),
        orderBy: desc(application.createdAt),
        with: {
          property: { columns: { id: true, title: true, monthlyRentPhp: true } },
          renter: { columns: { name: true, email: true, phone: true } },
        },
      })
    : [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/dashboard" className="text-sm text-slate-500 hover:text-emerald-700">← My listings</Link>
      <h1 className="mt-2 text-3xl font-bold">Applications</h1>
      {only && <p className="mt-2 text-sm text-slate-600">Showing one property. <Link className="text-emerald-700 underline" href="/dashboard/applications">Show all</Link></p>}

      {apps.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-600">
          No applications yet. They&apos;ll appear here as soon as renters apply to your published listings.
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {apps.map((a) => {
            const ratio = a.monthlyIncomePhp ? a.monthlyIncomePhp / a.property.monthlyRentPhp : null;
            return (
              <li key={a.id} className="rounded-xl border border-slate-200 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${APP_STATUS[a.status].style}`}>{APP_STATUS[a.status].label}</span>
                    <h2 className="mt-1 text-lg font-semibold">{a.renter.name}</h2>
                    <p className="text-sm text-slate-600">
                      for <Link href={`/listings/${a.property.id}`} className="underline">{a.property.title}</Link>
                    </p>
                  </div>
                  <DecisionButtons id={a.id} status={a.status} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div><dt className="text-slate-500">Move-in</dt><dd>{a.moveInDate ? new Date(a.moveInDate).toLocaleDateString("en-PH", { dateStyle: "medium" }) : "—"}</dd></div>
                  <div><dt className="text-slate-500">Lease</dt><dd>{a.leaseMonths ? `${a.leaseMonths} months` : "—"}</dd></div>
                  <div><dt className="text-slate-500">Occupants</dt><dd>{a.occupants}</dd></div>
                  <div>
                    <dt className="text-slate-500">Monthly income</dt>
                    <dd>{a.monthlyIncomePhp ? `${formatPHP(a.monthlyIncomePhp)}${ratio ? ` (${ratio.toFixed(1)}× rent)` : ""}` : "Not given"}</dd>
                  </div>
                  <div className="col-span-2"><dt className="text-slate-500">Work or school</dt><dd>{a.employment || "—"}</dd></div>
                  <div className="col-span-2">
                    <dt className="text-slate-500">Contact</dt>
                    <dd>
                      {a.status === "approved" || a.status === "reviewing" ? (
                        <>{a.renter.email}{a.renter.phone ? ` · ${a.renter.phone}` : ""}</>
                      ) : (
                        <span className="text-slate-400">Shown when you review or approve</span>
                      )}
                    </dd>
                  </div>
                </dl>
                {a.message && <p className="mt-4 whitespace-pre-line rounded-md bg-slate-50 p-3 text-sm text-slate-700">{a.message}</p>}
                <p className="mt-3 text-xs text-slate-500">Applied {a.createdAt.toLocaleDateString("en-PH", { dateStyle: "medium" })}</p>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

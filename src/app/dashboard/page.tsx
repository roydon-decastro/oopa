import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { property, propertyPhoto } from "@/db/schema";
import { requireOwner } from "@/lib/session";
import { formatPHP } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/ph";
import ListingActions from "@/components/ListingActions";

export const metadata = { title: "My listings · Oopa" };

const BANNERS: Record<string, string> = {
  published: "Your listing is live.",
  draft: "Saved as a draft. Publish it when you're ready.",
  updated: "Changes saved.",
};

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  active: "bg-emerald-100 text-emerald-800",
  rented: "bg-blue-100 text-blue-800",
  archived: "bg-amber-100 text-amber-800",
};

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { user } = await requireOwner();
  const { saved } = await searchParams;
  const listings = await db.query.property.findMany({
    where: eq(property.ownerId, user.id),
    orderBy: desc(property.createdAt),
    with: { photos: { orderBy: asc(propertyPhoto.position), limit: 1 }, applications: { columns: { id: true } } },
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">My listings</h1>
        <Link href="/dashboard/properties/new" className="btn">+ Add a property</Link>
      </div>
      {saved && BANNERS[saved] && (
        <p className="mt-6 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{BANNERS[saved]}</p>
      )}

      {listings.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-lg font-medium">You haven&apos;t listed a property yet</p>
          <p className="mt-1 text-slate-600">Add your first property and start receiving applications.</p>
          <Link href="/dashboard/properties/new" className="btn mt-6">Add a property</Link>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-slate-200 rounded-xl border border-slate-200">
          {listings.map((l) => (
            <li key={l.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div className="aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:w-36">
                {l.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.photos[0].url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">No photo</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[l.status]}`}>
                    {STATUS_LABEL[l.status]}
                  </span>
                  <span className="text-xs text-slate-500">
                    {l.applications.length} application{l.applications.length === 1 ? "" : "s"}
                  </span>
                </div>
                <h2 className="mt-1 truncate font-semibold">{l.title}</h2>
                <p className="text-sm text-slate-600">
                  {formatPHP(l.monthlyRentPhp)}/mo · {[l.barangay, l.city, l.province].filter(Boolean).join(", ")}
                </p>
              </div>
              <ListingActions id={l.id} status={l.status} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

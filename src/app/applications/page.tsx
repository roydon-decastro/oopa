import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { application, propertyPhoto } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { formatPHP } from "@/lib/format";
import { APP_STATUS } from "@/lib/status";
import WithdrawButton from "@/components/WithdrawButton";

export const metadata = { title: "My applications · Oopa" };

const NEXT_STEP: Record<string, string> = {
  submitted: "The owner hasn't opened your application yet.",
  reviewing: "The owner is reviewing your application.",
  approved: "Approved! The owner will contact you to arrange the contract and move-in.",
  rejected: "The owner chose another applicant. Keep browsing, there are more places.",
  withdrawn: "You withdrew this application.",
};

export default async function MyApplications({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { user } = await requireUser("/applications");
  const { sent } = await searchParams;
  const apps = await db.query.application.findMany({
    where: eq(application.renterId, user.id),
    orderBy: desc(application.createdAt),
    with: {
      property: {
        columns: { id: true, title: true, monthlyRentPhp: true, city: true, province: true },
        with: { photos: { orderBy: asc(propertyPhoto.position), limit: 1 } },
      },
    },
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">My applications</h1>
      {sent && <p className="mt-6 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Application sent. We&apos;ll show the owner&apos;s decision here.</p>}
      {apps.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-lg font-medium">No applications yet</p>
          <Link href="/listings" className="btn mt-6">Browse rentals</Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {apps.map((a) => (
            <li key={a.id} className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row">
              <Link href={`/listings/${a.property.id}`} className="aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:w-36">
                {a.property.photos[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.property.photos[0].url} alt="" className="h-full w-full object-cover" />
                )}
              </Link>
              <div className="flex-1">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${APP_STATUS[a.status].style}`}>{APP_STATUS[a.status].label}</span>
                <Link href={`/listings/${a.property.id}`} className="mt-1 block font-semibold hover:text-emerald-700">{a.property.title}</Link>
                <p className="text-sm text-slate-600">{formatPHP(a.property.monthlyRentPhp)}/mo · {a.property.city}, {a.property.province}</p>
                <p className="mt-2 text-sm text-slate-700">{NEXT_STEP[a.status]}</p>
                <p className="mt-1 text-xs text-slate-500">Applied {a.createdAt.toLocaleDateString("en-PH", { dateStyle: "medium" })}</p>
              </div>
              {(a.status === "submitted" || a.status === "reviewing") && <WithdrawButton id={a.id} />}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

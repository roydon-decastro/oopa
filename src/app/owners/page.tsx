import Link from "next/link";
import { getSession } from "@/lib/session";
import { becomeOwner } from "@/app/dashboard/actions";

export const metadata = {
  title: "List your rental property for free · Oopa",
  description: "Free listings for Philippine landlords. Manage apartment buildings floor by floor, review applications, and bill sub-metered electricity and water.",
};

const features = [
  ["🏢", "Whole buildings in minutes", "Enter your building once and we create every unit, 101 to 405 and beyond. Update rent or status for a whole floor at once."],
  ["📋", "Applications you can compare", "Renters apply with move-in date, lease length, occupants and income. See the income-to-rent ratio and approve or decline in one click."],
  ["⚡", "Sub-meter billing", "Type in this month's electricity and water readings; usage and charges are calculated per unit, with a printable statement for each tenant."],
  ["📊", "Occupancy at a glance", "See which units are occupied, vacant or unlisted, and how full each building is."],
  ["🔒", "Your contact stays private", "Renters never see your email or phone. You see theirs once you review an application."],
  ["₱", "Free to list", "No listing fees and no commission."],
];

const faqs = [
  ["Is it really free?", "Yes. Listing properties and receiving applications is free."],
  ["Can I list a single condo or house?", "Yes. Add single properties and multi-unit buildings from the same account."],
  ["My units have their own Meralco meters.", "Set each utility to sub-metered, included in rent, own meter, or a fixed monthly fee, for the whole building or unit by unit."],
  ["Who sees my tenants' data?", "Only you. Applications to your properties are visible to you and the renter who sent them, handled under the Data Privacy Act of 2012."],
];

export default async function OwnersPage({ searchParams }: { searchParams: Promise<{ upgrade?: string }> }) {
  const session = await getSession();
  const user = session?.user;
  const { upgrade } = await searchParams;

  const cta = !user ? (
    <Link href="/signup?role=owner" className="btn px-6 py-3 text-lg">Create a free owner account</Link>
  ) : user.role === "owner" ? (
    <div className="flex flex-wrap gap-3">
      <Link href="/dashboard/buildings/new" className="btn px-6 py-3">Add a building</Link>
      <Link href="/dashboard/properties/new" className="btn-outline px-6 py-3">Add a single property</Link>
    </div>
  ) : (
    <form action={becomeOwner}>
      <p className="mb-3 text-sm text-slate-600">You&apos;re signed in as a renter. Switch on owner features to list a property.</p>
      <button className="btn px-6 py-3">Start listing as an owner</button>
    </form>
  );

  return (
    <main>
      <section className="bg-gradient-to-b from-emerald-50 to-white">
        <div className="mx-auto max-w-5xl px-4 py-16">
          {upgrade && <p className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">That page is for property owners.</p>}
          <p className="font-medium text-emerald-700">For landlords and property managers</p>
          <h1 className="mt-2 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">Fill your units faster and stop managing them on paper</h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            List condos, houses and whole apartment buildings for free. Get applications from renters across the Philippines, and keep occupancy and
            utility billing in one place.
          </p>
          <div className="mt-8">{cta}</div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4">
        <section className="grid gap-6 py-12 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(([icon, t, d]) => (
            <div key={t} className="rounded-xl border border-slate-200 p-6">
              <span className="text-2xl" aria-hidden>{icon}</span>
              <h2 className="mt-2 font-semibold">{t}</h2>
              <p className="mt-1 text-sm text-slate-600">{d}</p>
            </div>
          ))}
        </section>

        <section className="py-8">
          <h2 className="text-2xl font-bold">How it works</h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-3">
            {[
              ["Create your account", "Takes a minute. Choose “List my property”."],
              ["Add your property or building", "Photos, rent, advance and deposit, utility rates. Publish when ready."],
              ["Review applications", "Approve the best fit; their contact details appear so you can arrange the viewing and contract."],
            ].map(([t, d], i) => (
              <li key={t} className="rounded-xl bg-slate-50 p-6">
                <span className="text-sm font-bold text-emerald-700">Step {i + 1}</span>
                <h3 className="mt-1 font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-slate-600">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="py-8">
          <h2 className="text-2xl font-bold">Questions</h2>
          <dl className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200">
            {faqs.map(([q, a]) => (
              <div key={q} className="p-5">
                <dt className="font-semibold">{q}</dt>
                <dd className="mt-1 text-slate-600">{a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-8 rounded-2xl bg-emerald-700 p-8 text-center text-white">
          <h2 className="text-2xl font-semibold">Ready to list?</h2>
          <p className="mt-2 text-emerald-50">It&apos;s free, and your first building takes about five minutes.</p>
          {!user && <Link href="/signup?role=owner" className="mt-6 inline-block rounded-md bg-white px-6 py-3 font-medium text-emerald-800">Create a free owner account</Link>}
        </section>
      </div>
    </main>
  );
}

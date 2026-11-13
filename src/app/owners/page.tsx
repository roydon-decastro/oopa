import Link from "next/link";
import { getSession } from "@/lib/session";
import { becomeOwner } from "@/app/dashboard/actions";

export const metadata = { title: "List your property · Oopa" };

const perks = [
  ["Free to list", "Post condos, apartments, houses, rooms and bedspaces at no cost."],
  ["Qualified applicants", "Renters apply online with their move-in date, income and details."],
  ["One dashboard", "Publish, edit, and mark units as rented from anywhere."],
];

export default async function OwnersPage() {
  const session = await getSession();
  const user = session?.user;
  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Rent out your property faster</h1>
      <p className="mt-4 text-lg text-slate-600">
        Reach renters across the Philippines and manage every application in one place.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {perks.map(([t, d]) => (
          <div key={t} className="rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold">{t}</h2>
            <p className="mt-1 text-sm text-slate-600">{d}</p>
          </div>
        ))}
      </div>
      <div className="mt-10">
        {!user && <Link href="/signup?role=owner" className="btn">Create an owner account</Link>}
        {user?.role === "owner" && <Link href="/dashboard/properties/new" className="btn">Add a property</Link>}
        {user && user.role !== "owner" && (
          <form action={becomeOwner}>
            <p className="mb-3 text-sm text-slate-600">You&apos;re signed in as a renter. Switch on owner features to list a property.</p>
            <button className="btn">Start listing as an owner</button>
          </form>
        )}
      </div>
    </main>
  );
}

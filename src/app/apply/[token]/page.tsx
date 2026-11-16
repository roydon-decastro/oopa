import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { application } from "@/db/schema";
import { listingForToken } from "@/lib/apply-link";
import { getSession } from "@/lib/session";
import { leaseTermsFor } from "@/lib/lease";
import { submitLease } from "@/app/applications/actions";
import LeaseApplicationForm from "@/components/LeaseApplicationForm";

export const metadata = { title: "Lease application · Oopa", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ApplyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [p, session] = await Promise.all([listingForToken(token), getSession()]);

  if (!p) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">This application link isn&apos;t valid</h1>
        <p className="mt-3 text-slate-600">It may have been replaced by a newer link, or the listing was removed. Ask the owner to send you a new link.</p>
        <Link href="/listings" className="btn mt-6">Browse rentals</Link>
      </main>
    );
  }

  const terms = leaseTermsFor(p, p.building);
  const header = (
    <>
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Lease application form</p>
      <h1 className="mt-1 text-3xl font-bold">{p.title}</h1>
      <p className="mt-1 text-slate-600">Owner: {p.owner.name}</p>
    </>
  );

  if (!session) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        {header}
        <p className="mt-6 text-slate-700">
          {p.owner.name} sent you this link to apply for the lease. Create a free Oopa account or log in to fill in the form.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/signup?next=/apply/${token}`} className="btn">Create an account</Link>
          <Link href={`/login?next=/apply/${token}`} className="btn-outline">Log in</Link>
        </div>
      </main>
    );
  }
  if (session.user.id === p.ownerId) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        {header}
        <p className="mt-6 rounded-md bg-amber-50 p-4 text-sm text-amber-800">
          This is your own listing. Send this page&apos;s link to the renter you&apos;ve agreed with, and they&apos;ll fill in the form here.
        </p>
      </main>
    );
  }
  const existing = await db.query.application.findFirst({
    where: and(eq(application.propertyId, p.id), eq(application.renterId, session.user.id)),
  });
  if (existing && existing.status !== "withdrawn") {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        {header}
        <p className="mt-6 rounded-md bg-emerald-50 p-4 text-sm text-emerald-800">
          You already sent your lease application for this place.{" "}
          <Link href={`/applications/${existing.id}/lease`} className="underline">View it</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      {header}
      <p className="mt-3 text-sm text-slate-600">
        Fill this in after you&apos;ve viewed the place and agreed on the rental with the owner. Only the owner of this listing will see your answers.
      </p>
      <div className="mt-8">
        <LeaseApplicationForm action={submitLease.bind(null, token)} terms={terms}
          defaults={{ fullName: session.user.name, contactNumbers: session.user.phone ?? "" }} />
      </div>
    </main>
  );
}

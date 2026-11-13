import Link from "next/link";
import PropertyForm from "@/components/PropertyForm";
import { createProperty } from "@/app/dashboard/actions";
import { requireOwner } from "@/lib/session";

export const metadata = { title: "Add a property · Oopa" };

export default async function NewPropertyPage() {
  await requireOwner("/dashboard/properties/new");
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/dashboard" className="text-sm text-slate-500 hover:text-emerald-700">← My listings</Link>
      <h1 className="mb-8 mt-2 text-3xl font-bold">Add a property</h1>
      <PropertyForm action={createProperty} />
    </main>
  );
}

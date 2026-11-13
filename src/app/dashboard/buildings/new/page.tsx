import Link from "next/link";
import BuildingForm from "@/components/BuildingForm";
import { createBuilding } from "@/app/dashboard/buildings/actions";
import { requireOwner } from "@/lib/session";

export const metadata = { title: "Add a building · Oopa" };

export default async function NewBuildingPage() {
  await requireOwner("/dashboard/buildings/new");
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/dashboard" className="text-sm text-slate-500 hover:text-emerald-700">← My listings</Link>
      <h1 className="mt-2 text-3xl font-bold">Add an apartment building</h1>
      <p className="mb-8 mt-2 text-slate-600">Enter the building once, and we&apos;ll create all its units for you.</p>
      <BuildingForm action={createBuilding} />
    </main>
  );
}

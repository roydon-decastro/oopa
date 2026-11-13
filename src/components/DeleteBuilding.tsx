"use client";

import { useState, useTransition } from "react";
import { deleteBuilding } from "@/app/dashboard/buildings/actions";

export default function DeleteBuilding({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  return (
    <section className="mt-12 rounded-xl border border-red-200 p-5">
      <h2 className="font-semibold text-red-800">Delete this building</h2>
      <p className="mt-1 text-sm text-slate-600">This removes the building, all its units, photos and applications. It can&apos;t be undone.</p>
      {confirming ? (
        <div className="mt-3 flex gap-3">
          <button className="rounded-md bg-red-600 px-4 py-2 text-white" disabled={pending} onClick={() => start(() => deleteBuilding(id))}>
            {pending ? "Deleting…" : "Yes, delete everything"}
          </button>
          <button className="text-slate-600" onClick={() => setConfirming(false)}>Cancel</button>
        </div>
      ) : (
        <button className="mt-3 text-sm font-medium text-red-700 hover:underline" onClick={() => setConfirming(true)}>Delete building</button>
      )}
    </section>
  );
}

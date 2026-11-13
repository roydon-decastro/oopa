"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { adjustBeds, deleteProperty, setStatus } from "@/app/dashboard/actions";

type Status = "draft" | "active" | "rented" | "archived";

export default function ListingActions({ id, status, beds }: { id: string; status: Status; beds?: { total: number; taken: number } | null }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const run = (fn: () => Promise<void>) => start(fn);

  const toggles: [Status, string][] =
    beds && (status === "active" || status === "rented") ? [["draft", "Unpublish"]]
    : status === "active" ? [["rented", "Mark rented"], ["draft", "Unpublish"]]
    : status === "rented" ? [["active", "Relist"], ["archived", "Archive"]]
    : [["active", "Publish"]];

  return (
    <div className={`flex flex-wrap gap-2 text-sm ${pending ? "opacity-50" : ""}`}>
      <Link href={`/dashboard/properties/${id}/edit`} className="btn-outline px-3 py-1.5">Edit</Link>
      {beds && (
        <span className="flex items-center gap-1 rounded-md border border-slate-300 px-2">
          <button className="px-1 disabled:opacity-40" aria-label="One less bed taken" disabled={pending || beds.taken <= 0}
            onClick={() => run(() => adjustBeds(id, -1))}>−</button>
          <span className="whitespace-nowrap">{beds.taken}/{beds.total} beds taken</span>
          <button className="px-1 disabled:opacity-40" aria-label="One more bed taken" disabled={pending || beds.taken >= beds.total}
            onClick={() => run(() => adjustBeds(id, 1))}>+</button>
        </span>
      )}
      {toggles.map(([s, label]) => (
        <button key={s} className="btn-outline px-3 py-1.5" disabled={pending} onClick={() => run(() => setStatus(id, s))}>
          {label}
        </button>
      ))}
      {confirming ? (
        <span className="flex items-center gap-2">
          <button className="rounded-md bg-red-600 px-3 py-1.5 text-white" disabled={pending}
            onClick={() => run(() => deleteProperty(id))}>Confirm delete</button>
          <button className="text-slate-500" onClick={() => setConfirming(false)}>Cancel</button>
        </span>
      ) : (
        <button className="px-2 py-1.5 text-red-700 hover:underline" onClick={() => setConfirming(true)}>Delete</button>
      )}
    </div>
  );
}

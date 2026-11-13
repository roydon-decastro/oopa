"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteProperty, setStatus } from "@/app/dashboard/actions";

type Status = "draft" | "active" | "rented" | "archived";

export default function ListingActions({ id, status }: { id: string; status: Status }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const run = (fn: () => Promise<void>) => start(fn);

  const toggles: [Status, string][] =
    status === "active" ? [["rented", "Mark rented"], ["draft", "Unpublish"]]
    : status === "rented" ? [["active", "Relist"], ["archived", "Archive"]]
    : [["active", "Publish"]];

  return (
    <div className={`flex flex-wrap gap-2 text-sm ${pending ? "opacity-50" : ""}`}>
      <Link href={`/dashboard/properties/${id}/edit`} className="btn-outline px-3 py-1.5">Edit</Link>
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

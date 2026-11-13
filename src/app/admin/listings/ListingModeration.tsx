"use client";

import { useState, useTransition } from "react";
import { removeListing, restoreListing } from "../actions";

const REASONS = [
  "Fake or scam listing",
  "Duplicate listing",
  "Wrong or misleading details",
  "Inappropriate photos or text",
  "Not a rental property",
];

export default function ListingModeration({ id, removed }: { id: string; removed: boolean }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);

  if (removed) {
    return (
      <button className="btn-outline shrink-0 px-3 py-1.5 text-sm" disabled={pending}
        onClick={() => start(async () => { await restoreListing(id); })}>
        {pending ? "Restoring…" : "Restore"}
      </button>
    );
  }
  if (!open) {
    return <button className="shrink-0 px-3 py-1.5 text-sm text-red-700 hover:underline" onClick={() => setOpen(true)}>Take down</button>;
  }
  return (
    <div className="w-full max-w-xs rounded-lg border border-red-200 bg-red-50 p-3 text-sm sm:w-72">
      <label className="label" htmlFor={`reason-${id}`}>Reason (the owner will see this)</label>
      <select id={`reason-${id}`} className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
        {REASONS.map((r) => <option key={r}>{r}</option>)}
      </select>
      <div className="mt-2 flex gap-2">
        <button className="rounded-md bg-red-600 px-3 py-1.5 text-white disabled:opacity-50" disabled={pending}
          onClick={() => start(async () => { await removeListing(id, reason); setOpen(false); })}>
          {pending ? "Taking down…" : "Take down"}
        </button>
        <button className="text-slate-600" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}

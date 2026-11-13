"use client";

import { useState, useTransition } from "react";
import { suspendUser, unsuspendUser } from "../actions";

export default function SuspendButton({ userId, name, suspended }: { userId: string; name: string; suspended: boolean }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (suspended) {
    return (
      <button className="btn-outline px-3 py-1.5 text-sm" disabled={pending}
        onClick={() => start(async () => { await unsuspendUser(userId); })}>
        {pending ? "Restoring…" : "Unsuspend"}
      </button>
    );
  }
  if (!confirming) {
    return <button className="px-3 py-1.5 text-sm text-red-700 hover:underline" onClick={() => setConfirming(true)}>Suspend</button>;
  }
  return (
    <div className="max-w-xs rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
      <p className="text-red-800">Suspend {name}? They&apos;ll be logged out, can&apos;t log in, and all their listings will be hidden.</p>
      {error && <p className="mt-1 text-red-700">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button className="rounded-md bg-red-600 px-3 py-1.5 text-white disabled:opacity-50" disabled={pending}
          onClick={() => start(async () => {
            const res = await suspendUser(userId);
            if (res?.error) setError(res.error); else setConfirming(false);
          })}>
          {pending ? "Suspending…" : "Yes, suspend"}
        </button>
        <button className="text-slate-600" onClick={() => setConfirming(false)}>Cancel</button>
      </div>
    </div>
  );
}

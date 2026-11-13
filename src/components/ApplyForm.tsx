"use client";

import { useActionState } from "react";
import type { ApplyState } from "@/app/applications/actions";

export default function ApplyForm({
  action,
  minLease,
}: {
  action: (prev: ApplyState, formData: FormData) => Promise<ApplyState>;
  minLease: number;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">Move-in date</span>
          <input className="input" type="date" name="moveInDate" min={today} required />
        </label>
        <label className="block">
          <span className="label">Lease (months)</span>
          <input className="input" type="number" name="leaseMonths" min={1} max={120} defaultValue={minLease} required />
        </label>
        <label className="block">
          <span className="label">Occupants</span>
          <input className="input" type="number" name="occupants" min={1} max={30} defaultValue={1} required />
        </label>
        <label className="block">
          <span className="label">Monthly income (₱)</span>
          <input className="input" type="number" name="monthlyIncomePhp" min={0} placeholder="Optional" />
        </label>
      </div>
      <label className="block">
        <span className="label">Work or school</span>
        <input className="input" name="employment" placeholder="e.g. Software engineer at Accenture" />
      </label>
      <label className="block">
        <span className="label">Message to the owner</span>
        <textarea className="input min-h-24" name="message" placeholder="Introduce yourself and ask any questions." />
      </label>
      {state?.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <button className="btn w-full" disabled={pending}>{pending ? "Sending…" : "Send application"}</button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { saveLessorProfile, type TemplateState } from "@/app/applications/contract-actions";
import { CIVIL_STATUS, type LessorProfileData } from "@/lib/contract";

/** The owner's own details for their contracts, filled into the [LESSOR …] blanks. */
export default function LessorProfileForm({ name, profile }: { name: string; profile: LessorProfileData }) {
  const [state, action, pending] = useActionState<TemplateState, FormData>(saveLessorProfile, undefined);
  return (
    <form action={action} className="rounded-xl border border-slate-200 p-5">
      <h2 className="font-semibold">Your details</h2>
      <p className="mt-1 text-sm text-slate-600">Filled in automatically on every contract you prepare. You can still change them on each contract.</p>
      <datalist id="civil-status-profile">{CIVIL_STATUS.map((c) => <option key={c} value={c} />)}</datalist>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <span className="mb-1 block text-sm font-medium">Your full name</span>
          <p className="input bg-slate-50 text-slate-600">{name}</p>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Civil status</span>
          <input className="input" name="civilStatus" list="civil-status-profile" defaultValue={profile.civilStatus} placeholder="e.g. married" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Citizenship</span>
          <input className="input" name="citizenship" defaultValue={profile.citizenship || "Filipino"} />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium">Residence address</span>
          <input className="input" name="address" defaultValue={profile.address} placeholder="e.g. 51 Seattle Street, Cubao, Quezon City" />
        </label>
      </div>
      {state?.error && <p className="mt-3 text-sm text-red-700">{state.error}</p>}
      <div className="mt-4 flex items-center gap-3">
        <button className="btn" disabled={pending}>Save my details</button>
        {state?.saved && <span className="text-sm text-emerald-700">Saved.</span>}
      </div>
    </form>
  );
}

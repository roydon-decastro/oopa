"use client";

import { useActionState, useState } from "react";
import type { LeaseState } from "@/app/applications/actions";
import { formatPHP } from "@/lib/format";
import { paymentCovenants, type LeaseTerms } from "@/lib/lease";

type Props = {
  action: (prev: LeaseState, formData: FormData) => Promise<LeaseState>;
  terms: LeaseTerms;
  defaults: { fullName: string; contactNumbers: string };
};

/** The lease application form, laid out like the paper form owners use. */
export default function LeaseApplicationForm({ action, terms, defaults }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const maxOthers = Math.max(0, (terms.maxOccupants ?? 6) - 1);
  const [others, setOthers] = useState(Math.min(1, maxOthers));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-6">
      <Band title="Property information">
        <Row label="Address" value={terms.address} wide />
      </Band>

      <Band title="Personal / contact information">
        <Field label="Name of primary tenant (signatory to the lease contract)" name="fullName" required defaultValue={defaults.fullName} wide />
        <Field label="Nickname" name="nickname" />
        <Field label="Contact numbers" name="contactNumbers" required defaultValue={defaults.contactNumbers} placeholder="e.g. 0917 123 4567" />
        <Field label="Religion (optional)" name="religion" />
        <Field label="Permanent / current address" name="address" required wide />
        <div className="sm:col-span-2">
          <p className="label">Valid IDs presented / ID number</p>
          <p className="mb-2 text-xs text-slate-500">Bring a photocopy of each ID when you sign the contract.</p>
          {[0, 1].map((i) => (
            <div key={i} className="mb-2 grid grid-cols-[auto_1fr_1fr] items-center gap-2">
              <span className="text-sm text-slate-500">{i + 1}.</span>
              <input className="input" name={`id${i}_type`} aria-label={`ID ${i + 1} type`} placeholder="ID type, e.g. Driver's license" required={i === 0} />
              <input className="input" name={`id${i}_number`} aria-label={`ID ${i + 1} number`} placeholder="ID number" required={i === 0} />
            </div>
          ))}
        </div>
        <Field label="Name of spouse / partner" name="spouseName" wide />
      </Band>

      <Band title="Employment / business information">
        <Field label="Name of employer / business / school" name="employerName" required wide />
        <Field label="Employer / business / school address" name="employerAddress" wide />
        <Field label="Contact numbers" name="employerContact" />
      </Band>

      <Band title="Emergency contact information">
        <Field label="Emergency contact name" name="emergencyName" required />
        <Field label="Contact numbers" name="emergencyContact" required />
      </Band>

      <Band title="Lease / rental information">
        <Row label={terms.perBed ? "Current base rent (per bed)" : "Current base rent"} value={formatPHP(terms.rentPhp)} />
        <label className="block">
          <span className="label">Start of lease period (tentative)</span>
          <input className="input bg-yellow-50" type="date" name="leaseStart" min={today} required />
        </label>
        <Row label="Security deposit amount" value={formatPHP(terms.rentPhp * terms.depositMonths)} />
      </Band>

      <Covenants terms={terms} />

      <Band title="Other tenants information">
        <p className="-mt-1 text-xs text-slate-500 sm:col-span-2">
          Everyone else who will live in the {terms.perBed ? "bedspace" : "unit"}. Bring a copy of each tenant&apos;s valid ID.
          {terms.maxOccupants ? <strong> Up to {terms.maxOccupants} tenants only, including kids.</strong> : null}
        </p>
        <div className="space-y-2 sm:col-span-2">
          {Array.from({ length: others }, (_, i) => (
            <div key={i} className="grid grid-cols-[auto_2fr_4rem_2fr] items-center gap-2">
              <span className="text-sm text-slate-500">{i + 1}.</span>
              <input className="input" name={`tenant${i}_name`} aria-label={`Tenant ${i + 1} name`} placeholder="Name" />
              <input className="input" name={`tenant${i}_age`} aria-label={`Tenant ${i + 1} age`} placeholder="Age" inputMode="numeric" maxLength={3} />
              <input className="input" name={`tenant${i}_work`} aria-label={`Tenant ${i + 1} company or school`} placeholder="Company / school" />
            </div>
          ))}
          {others < maxOthers && (
            <button type="button" className="text-sm text-emerald-700 underline" onClick={() => setOthers(others + 1)}>+ Add another tenant</button>
          )}
        </div>
      </Band>

      <section className="rounded-lg border border-slate-300 p-4">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="agree" required className="mt-0.5 size-4 accent-emerald-700" />
          <span>
            I confirm the information above is true, and I agree to the special covenants. I understand this form will be used for a
            background check and will form part of the lease agreement contract.
          </span>
        </label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">Signature (type your full name)</span>
            <input className="input font-serif italic" name="signedName" required autoComplete="off" />
          </label>
          <Row label="Date" value={new Date().toLocaleDateString("en-PH", { dateStyle: "long", timeZone: "Asia/Manila" })} />
        </div>
      </section>

      {state?.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <button className="btn w-full sm:w-auto" disabled={pending}>{pending ? "Sending…" : "Send lease application"}</button>
    </form>
  );
}

export function Covenants({ terms }: { terms: LeaseTerms }) {
  const pay = paymentCovenants(terms);
  if (!pay.length && !terms.covenants) return null;
  return (
    <section className="rounded-lg border border-slate-300 p-4 text-sm">
      <h3 className="font-semibold uppercase tracking-wide">Special covenants or agreements</h3>
      <ul className="mt-2 space-y-1 text-slate-700">
        {pay.map((l, i) => <li key={i} className={l.startsWith("  ") ? "pl-6" : ""}>{l.startsWith("  ") ? l.trim() : `– ${l}`}</li>)}
        {terms.covenants?.split(/\n+/).filter((l) => l.trim()).map((l, i) => <li key={`c${i}`}>– {l.replace(/^[-–•]\s*/, "")}</li>)}
      </ul>
    </section>
  );
}

function Band({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="overflow-hidden rounded-lg border border-slate-300">
      <legend className="sr-only">{title}</legend>
      <p aria-hidden className="bg-slate-100 px-4 py-1.5 text-center text-sm font-semibold uppercase tracking-wide">{title}</p>
      <div className="grid gap-4 p-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({ label, name, required, defaultValue, placeholder, wide }: {
  label: string; name: string; required?: boolean; defaultValue?: string; placeholder?: string; wide?: boolean;
}) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="label">{label}</span>
      <input className="input" name={name} required={required} defaultValue={defaultValue} placeholder={placeholder} />
    </label>
  );
}

function Row({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <p className="label">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

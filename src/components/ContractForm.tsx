"use client";

import { useActionState, useState } from "react";
import { saveContract, type ContractState } from "@/app/applications/contract-actions";
import { CAPACITY, CIVIL_STATUS, endDate, longDate, type ContractData } from "@/lib/contract";

type Draft = Omit<ContractData, "lessor" | "lessee"> & {
  lessor: Omit<ContractData["lessor"], "civilStatus"> & { civilStatus: string };
  lessee: Omit<ContractData["lessee"], "civilStatus"> & { civilStatus: string };
};

function Field({ label, hint, children, wide }: { label: string; hint?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-slate-200 p-5">
      <legend className="px-1 font-semibold">{title}</legend>
      {note && <p className="mb-3 text-sm text-slate-600">{note}</p>}
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/** A small number input followed by its unit, e.g. [30] days. */
function Num({ name, value, unit, min = 0, max }: { name: string; value: number; unit: string; min?: number; max?: number }) {
  return (
    <span className="flex items-center gap-2">
      <input className="input w-24" type="number" name={name} defaultValue={value} min={min} max={max} required />
      <span className="text-sm text-slate-600">{unit}</span>
    </span>
  );
}

function Party({ prefix, p, who }: { prefix: "lessor" | "lessee"; p: Draft["lessor"] | Draft["lessee"]; who: string }) {
  return (
    <>
      <Field label="Full name"><input className="input" name={`${prefix}.name`} defaultValue={p.name} required /></Field>
      <Field label="Civil status">
        <select className="input" name={`${prefix}.civilStatus`} defaultValue={p.civilStatus} required>
          <option value="" disabled>Choose…</option>
          {CIVIL_STATUS.map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
        </select>
      </Field>
      <Field label="Citizenship"><input className="input" name={`${prefix}.citizenship`} defaultValue={p.citizenship} required /></Field>
      <Field label="Residence address" wide><input className="input" name={`${prefix}.address`} defaultValue={p.address} required /></Field>
      <Field label="ID type" hint={`Printed in the notary's acknowledgment for the ${who}. Optional.`}><input className="input" name={`${prefix}.idType`} defaultValue={p.idType} placeholder="e.g. National ID, UMID" /></Field>
      <Field label="ID number"><input className="input" name={`${prefix}.idNumber`} defaultValue={p.idNumber} /></Field>
    </>
  );
}

export default function ContractFormView({ applicationId, initial, sent }: { applicationId: string; initial: Draft; sent: boolean }) {
  const [state, action, pending] = useActionState<ContractState, FormData>(saveContract.bind(null, applicationId), undefined);
  const [start, setStart] = useState(initial.startDate);
  const [months, setMonths] = useState(initial.months);
  const d = initial;
  const lastDay = /^\d{4}-\d{2}-\d{2}$/.test(start) && months > 0 ? longDate(endDate(start, months)) : null;

  return (
    <form action={action} className="space-y-6">
      <Section title="You, the lessor" note="Oopa remembers these for your next contract.">
        <Party prefix="lessor" p={d.lessor} who="lessor" />
        <Field label="You are…" wide>
          <select className="input" name="lessor.capacity" defaultValue={d.lessor.capacity}>
            {Object.entries(CAPACITY).map(([k, v]) => <option key={k} value={k}>{v[0].toUpperCase() + v.slice(1)}</option>)}
          </select>
        </Field>
      </Section>

      <Section title="The renter, the lessee" note="Filled in from their lease application. Check the civil status and citizenship.">
        <Party prefix="lessee" p={d.lessee} who="lessee" />
      </Section>

      <Section title="Leased premises">
        <Field label="Premises" wide hint={`Appears as "the LESSOR is the owner of …". E.g. "Unit 4B of the five-storey residential building".`}>
          <input className="input" name="premises" defaultValue={d.premises} required />
        </Field>
        <Field label="Address" wide><input className="input" name="address" defaultValue={d.address} required /></Field>
        <Field label="Maximum occupants" hint="Including the lessee and children."><Num name="maxOccupants" value={d.maxOccupants} unit="occupants" min={1} max={50} /></Field>
      </Section>

      <Section title="Period and rent">
        <Field label="Start of lease"><input className="input" type="date" name="startDate" value={start} onChange={(e) => setStart(e.target.value)} required /></Field>
        <Field label="Lease period" hint={lastDay ? `Ends ${lastDay}` : undefined}>
          <span className="flex items-center gap-2">
            <input className="input w-24" type="number" name="months" min={1} max={120} value={months} onChange={(e) => setMonths(Number(e.target.value))} required />
            <span className="text-sm text-slate-600">months</span>
          </span>
        </Field>
        <Field label="Monthly rent (₱)"><input className="input" type="number" name="rentPhp" min={1} step="0.01" defaultValue={d.rentPhp} required /></Field>
        <Field label="Rent due every"><Num name="dueDay" value={d.dueDay} unit="day of the month" min={1} max={31} /></Field>
        <Field label="Security deposit"><Num name="depositMonths" value={d.depositMonths} unit="months' rent" max={12} /></Field>
        <Field label="Deposit refunded within"><Num name="depositRefundDays" value={d.depositRefundDays} unit="days after the lease ends" min={1} /></Field>
      </Section>

      <Section title="Late payment">
        <Field label="Grace period"><Num name="graceDays" value={d.graceDays} unit="days" /></Field>
        <Field label="Terminate if unpaid for"><Num name="unpaidTerminateDays" value={d.unpaidTerminateDays} unit="days" min={1} /></Field>
        <Field label="Penalty, 1st month late"><Num name="penalty1" value={d.penalty1} unit="%" max={100} /></Field>
        <Field label="Penalty, 2nd month late"><Num name="penalty2" value={d.penalty2} unit="%" max={100} /></Field>
        <Field label="Penalty, each month after"><Num name="penalty3" value={d.penalty3} unit="%" max={100} /></Field>
      </Section>

      <Section title="Renewal, notices and refunds">
        <Field label="Renewal period"><Num name="renewalMonths" value={d.renewalMonths} unit="months" min={1} /></Field>
        <Field label="Renter tells you about renewal"><Num name="renewalNoticeDays" value={d.renewalNoticeDays} unit="days before it ends" min={1} /></Field>
        <Field label="You tell the renter you'll use the unit yourself"><Num name="ownerUseNoticeDays" value={d.ownerUseNoticeDays} unit="days before it ends" min={1} /></Field>
        <Field label="Renter gives copies of all occupants' IDs within"><Num name="idsWithinDays" value={d.idsWithinDays} unit="days of signing" min={1} /></Field>
        <Field label="Refund after fire or calamity within"><Num name="calamityRefundDays" value={d.calamityRefundDays} unit="days" min={1} /></Field>
        <Field label="Notice before cancelling for violations"><Num name="violationNoticeDays" value={d.violationNoticeDays} unit="days" min={1} /></Field>
        <Field label="Cancel if rent unpaid for"><Num name="unpaidMonths" value={d.unpaidMonths} unit="months" min={1} max={12} /></Field>
        <Field label="Cancel if vacated without notice for"><Num name="abandonDays" value={d.abandonDays} unit="days" min={1} /></Field>
        <Field label="Pre-termination notice"><Num name="preterminationNoticeDays" value={d.preterminationNoticeDays} unit="days" min={1} /></Field>
        <Field label="Pre-termination penalty"><Num name="preterminationMonths" value={d.preterminationMonths} unit="months' rent" max={12} /></Field>
        <Field label="Unused rent returned within"><Num name="preterminationRefundDays" value={d.preterminationRefundDays} unit="days after leaving" min={1} /></Field>
      </Section>

      <Section title="House rules">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="noPets" defaultChecked={d.noPets} /> No pets</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="noGasul" defaultChecked={d.noGasul} /> No LPG (gasul), electric stove only</label>
        <Field label="Other rules" wide hint="One per line. Added to the contract as its own clause. Smoking, parties, drilling and blocking hallways are already prohibited.">
          <textarea className="input min-h-24" name="otherRules" defaultValue={d.otherRules} />
        </Field>
      </Section>

      <Section title="Witnesses" note="Optional. Leave blank to write the names by hand when signing.">
        <Field label="Witness 1"><input className="input" name="witness1" defaultValue={d.witness1} /></Field>
        <Field label="Witness 2"><input className="input" name="witness2" defaultValue={d.witness2} /></Field>
      </Section>

      {state?.error && <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}
      <div className="flex flex-wrap gap-3">
        {sent ? (
          <button className="btn" name="intent" value="send" disabled={pending}>Save and send update to renter</button>
        ) : (
          <>
            <button className="btn" name="intent" value="send" disabled={pending}>Save and send to renter</button>
            <button className="btn-outline" name="intent" value="draft" disabled={pending}>Save draft</button>
          </>
        )}
      </div>
      <p className="text-xs text-slate-500">The renter gets an email and can read the contract on Oopa. Either of you can print it for signing.{!sent && " Sending it also unpublishes your listing, so no one else applies."}</p>
    </form>
  );
}

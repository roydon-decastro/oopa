"use client";

import { useActionState, useState } from "react";
import { saveContract, type ContractState } from "@/app/applications/contract-actions";
import { CIVIL_STATUS, endDate, fillContract, missingBlanks, type ContractFieldsData } from "@/lib/contract";
import ContractText from "./ContractText";

type Key = keyof ContractFieldsData;

/**
 * Prepare a contract: a details form whose values fill the [BLANKS] in the contract, with a live preview.
 * The wording itself (from the owner's template) can be edited too, but most owners only need the form.
 */
export default function ContractBodyForm({ applicationId, initialBody, template, initialFields, sent }: {
  applicationId: string; initialBody: string; template: string; initialFields: ContractFieldsData; sent: boolean;
}) {
  const [state, action, pending] = useActionState<ContractState, FormData>(saveContract.bind(null, applicationId), undefined);
  const [body, setBody] = useState(initialBody);
  const [fields, setFields] = useState(initialFields);
  const [tab, setTab] = useState<"preview" | "wording">("preview");
  const missing = missingBlanks(body, fields);

  const set = (k: Key, v: string) => setFields((f) => {
    const next = { ...f, [k]: v };
    // Keep the end date in step with the start date and lease period.
    if ((k === "startDate" || k === "leaseMonths") && /^\d{4}-\d{2}-\d{2}$/.test(next.startDate) && Number(next.leaseMonths) > 0) {
      next.endDate = endDate(next.startDate, Number(next.leaseMonths));
    }
    return next;
  });
  const input = (k: Key, label: string, opts: { type?: string; wide?: boolean; list?: string; hint?: string; min?: number } = {}) => (
    <label className={`block ${opts.wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input className="input" aria-label={label} type={opts.type ?? "text"} list={opts.list} min={opts.min}
        value={fields[k]} onChange={(e) => set(k, e.target.value)} />
      {opts.hint && <span className="mt-1 block text-xs text-slate-500">{opts.hint}</span>}
    </label>
  );
  const group = (title: string, children: React.ReactNode, note?: string) => (
    <fieldset className="rounded-xl border border-slate-200 p-5">
      <legend className="px-1 font-semibold">{title}</legend>
      {note && <p className="mb-3 text-sm text-slate-600">{note}</p>}
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );

  return (
    <form action={action} className="space-y-6">
      <datalist id="civil-status">{CIVIL_STATUS.map((c) => <option key={c} value={c} />)}</datalist>
      <input type="hidden" name="body" value={body} />
      <input type="hidden" name="fields" value={JSON.stringify(fields)} />

      <h2 className="text-xl font-semibold">Contract details</h2>
      {group("You, the lessor", <>
        {input("lessorName", "Your full name", { wide: true })}
        {input("lessorCivilStatus", "Your civil status", { list: "civil-status", hint: "e.g. single, married" })}
        {input("lessorCitizenship", "Your citizenship")}
        {input("lessorAddress", "Your residence address", { wide: true })}
      </>, "Oopa remembers your civil status, citizenship and address for your next contract.")}
      {group("The renter", <>
        {input("renterName", "Renter's full name", { wide: true })}
        {input("renterCivilStatus", "Renter's civil status", { list: "civil-status", hint: "e.g. single, married" })}
        {input("renterCitizenship", "Renter's citizenship")}
        {input("renterAddress", "Renter's residence address", { wide: true })}
        {input("renterId", "Renter's ID type and number", { wide: true, hint: "Printed in the notary's acknowledgment." })}
      </>, "From the renter's lease application.")}
      {group("The unit and payments", <>
        {input("property", "Unit being leased", { wide: true, hint: 'e.g. "Unit 4B of the five-storey residential building"' })}
        {input("propertyAddress", "Address of the unit", { wide: true })}
        {input("rentPhp", "Monthly rent (₱)", { type: "number", min: 0 })}
        {input("maxOccupants", "Maximum occupants", { type: "number", min: 1, hint: "Including the renter and children." })}
        {input("advanceMonths", "Advance rent (months)", { type: "number", min: 0 })}
        {input("depositMonths", "Security deposit (months)", { type: "number", min: 0 })}
      </>)}
      {group("Lease period", <>
        {input("startDate", "Start of lease", { type: "date" })}
        {input("leaseMonths", "Lease period (months)", { type: "number", min: 1 })}
        {input("endDate", "End of lease", { type: "date", hint: "Worked out from the start and period. You can change it." })}
      </>)}
      {group("House rules", (
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium">House rules (one per line)</span>
          <textarea className="input min-h-24" aria-label="House rules" value={fields.houseRules} onChange={(e) => set("houseRules", e.target.value)} />
        </label>
      ), "From your listing's lease terms. Added to the contract as its own clause.")}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        <h2 className="text-xl font-semibold">Contract</h2>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
          <button type="button" onClick={() => setTab("preview")} className={`rounded-md px-3 py-1 ${tab === "preview" ? "bg-white shadow-sm" : ""}`}>Preview</button>
          <button type="button" onClick={() => setTab("wording")} className={`rounded-md px-3 py-1 ${tab === "wording" ? "bg-white shadow-sm" : ""}`}>Edit wording</button>
        </div>
      </div>
      {tab === "preview" ? (
        <div className="rounded-xl border border-slate-200 p-6"><ContractText body={fillContract(body, fields)} /></div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-slate-600">
            Change the wording for this renter only. Leave words in [BRACKETS] as they are; they&apos;re filled in from the details above.
            {" "}<button type="button" className="text-slate-500 underline hover:text-emerald-700"
              onClick={() => { if (confirm("Replace the wording with a fresh copy of your template? Your wording changes for this contract will be lost.")) setBody(template); }}>
              Start again from my template
            </button>
          </p>
          <textarea aria-label="Contract wording" className="input min-h-[70vh] font-mono text-sm leading-relaxed" value={body} onChange={(e) => setBody(e.target.value)} spellCheck />
        </div>
      )}

      {missing.length > 0 && (
        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Not filled in yet: {missing.join(", ")}. These print as blank lines to write on by hand.
        </p>
      )}
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
      <p className="text-xs text-slate-500">
        The renter gets an email and can read the contract on Oopa. Either of you can print it for signing.
        {!sent && " Sending it also unpublishes your listing, so no one else applies."}
      </p>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { saveContract, type ContractState } from "@/app/applications/contract-actions";
import ContractText from "./ContractText";

/** The owner's one-box contract editor for one renter, with a preview of how it will print. */
export default function ContractBodyForm({ applicationId, initial, fromTemplate, sent }: {
  applicationId: string; initial: string; fromTemplate: string; sent: boolean;
}) {
  const [state, action, pending] = useActionState<ContractState, FormData>(saveContract.bind(null, applicationId), undefined);
  const [body, setBody] = useState(initial);
  const [preview, setPreview] = useState(false);
  const blanks = [...new Set(body.match(/\[[A-Z ]+\]/g) ?? [])].filter((b) => b !== "[PAGE BREAK]");

  return (
    <form action={action} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
          <button type="button" onClick={() => setPreview(false)} className={`rounded-md px-3 py-1 ${!preview ? "bg-white shadow-sm" : ""}`}>Edit</button>
          <button type="button" onClick={() => setPreview(true)} className={`rounded-md px-3 py-1 ${preview ? "bg-white shadow-sm" : ""}`}>Preview</button>
        </div>
        <button type="button" className="text-sm text-slate-500 underline hover:text-emerald-700"
          onClick={() => { if (confirm("Replace this contract with a fresh copy from your template? Your changes here will be lost.")) setBody(fromTemplate); }}>
          Start again from my template
        </button>
      </div>
      <input type="hidden" name="body" value={body} />
      {preview ? (
        <div className="rounded-xl border border-slate-200 p-6"><ContractText body={body} /></div>
      ) : (
        <textarea aria-label="Contract text" className="input min-h-[70vh] font-mono text-sm leading-relaxed" value={body} onChange={(e) => setBody(e.target.value)} spellCheck />
      )}
      {blanks.length > 0 && (
        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Still blank: {blanks.join(", ")}. Type the details in, or leave them to fill in by hand when printing.
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

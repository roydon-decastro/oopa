"use client";

import { useActionState, useState } from "react";
import { saveContractTemplate, type TemplateState } from "@/app/applications/contract-actions";
import ContractText from "./ContractText";

export default function ContractTemplateForm({ initial, isDefault }: { initial: string; isDefault: boolean }) {
  const [state, action, pending] = useActionState<TemplateState, FormData>(saveContractTemplate, undefined);
  const [text, setText] = useState(initial);
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);

  return (
    <form action={action} className="space-y-4">
      <div className="flex gap-1 self-start rounded-lg bg-slate-100 p-1 text-sm w-fit">
        <button type="button" onClick={() => setPreview(false)} className={`rounded-md px-3 py-1 ${!preview ? "bg-white shadow-sm" : ""}`}>Edit</button>
        <button type="button" onClick={() => setPreview(true)} className={`rounded-md px-3 py-1 ${preview ? "bg-white shadow-sm" : ""}`}>Preview</button>
      </div>
      <input type="hidden" name="template" value={text} />
      {preview ? (
        <div className="rounded-xl border border-slate-200 p-6"><ContractText body={text} /></div>
      ) : (
        <textarea aria-label="Contract template" className="input min-h-[70vh] font-mono text-sm leading-relaxed" value={text}
          onChange={(e) => { setText(e.target.value); setDirty(true); }} spellCheck />
      )}
      {state?.error && <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}
      {state?.saved && !dirty && <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Saved. Your next contracts will start from this template.</p>}
      <div className="flex flex-wrap gap-3">
        <button className="btn" name="intent" value="save" disabled={pending} onClick={() => setDirty(false)}>Save my template</button>
        {!isDefault && (
          <button className="btn-outline" name="intent" value="reset" disabled={pending} formNoValidate
            onClick={(e) => { if (!confirm("Replace your template with Oopa's default? Your changes will be lost. Contracts you already prepared won't change.")) e.preventDefault(); }}>
            Reset to Oopa default
          </button>
        )}
      </div>
    </form>
  );
}

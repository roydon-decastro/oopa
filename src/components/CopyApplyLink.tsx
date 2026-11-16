"use client";

import { useState, useTransition } from "react";
import { getApplyLink } from "@/app/applications/actions";

/** Owner-only: shows and copies the private lease application link to send to a renter they've agreed with. */
export default function CopyApplyLink({ propertyId, compact = false }: { propertyId: string; compact?: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const [confirmReset, setConfirmReset] = useState(false);

  const load = (reset = false) => start(async () => {
    const path = await getApplyLink(propertyId, reset);
    const full = window.location.origin + path;
    setUrl(full);
    try { await navigator.clipboard.writeText(full); setCopied(true); } catch { setCopied(false); }
  });

  if (!url) {
    return (
      <button type="button" className={`btn-outline ${compact ? "px-3 py-1.5 text-sm" : ""}`} disabled={pending} onClick={() => load()}>
        {pending ? "Getting link…" : "🔗 Application link"}
      </button>
    );
  }
  return (
    <div className="w-full rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
      <p className="font-medium text-emerald-900">{copied ? "Copied! " : ""}Send this link only to the renter you&apos;ve agreed with:</p>
      <input readOnly value={url} aria-label="Application link" className="input mt-2 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        <button type="button" className="text-emerald-800 underline" onClick={() => navigator.clipboard?.writeText(url).then(() => setCopied(true))}>Copy again</button>
        {confirmReset ? (
          <span>
            The old link will stop working.{" "}
            <button type="button" className="font-medium text-red-700 underline" disabled={pending}
              onClick={() => { setConfirmReset(false); load(true); }}>Make a new link</button>{" "}
            <button type="button" className="text-slate-600 underline" onClick={() => setConfirmReset(false)}>Cancel</button>
          </span>
        ) : (
          <button type="button" className="text-slate-600 underline" onClick={() => setConfirmReset(true)}>Make a new link</button>
        )}
        <button type="button" className="text-slate-600 underline" onClick={() => setUrl(null)}>Hide</button>
      </div>
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { markContractReviewed } from "@/app/applications/contract-actions";

export default function ReviewedButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button className="btn" disabled={pending} onClick={() => start(() => markContractReviewed(id))}>
      {pending ? "Saving…" : "I've reviewed it, ready to sign"}
    </button>
  );
}

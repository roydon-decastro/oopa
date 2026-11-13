"use client";

import { useTransition } from "react";
import { withdrawApplication } from "@/app/applications/actions";

export default function WithdrawButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button className="text-sm text-red-700 hover:underline disabled:opacity-50" disabled={pending}
      onClick={() => start(() => withdrawApplication(id))}>
      {pending ? "Withdrawing…" : "Withdraw"}
    </button>
  );
}

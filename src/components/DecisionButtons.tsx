"use client";

import { useTransition } from "react";
import { decideApplication } from "@/app/applications/actions";

export default function DecisionButtons({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const act = (s: "reviewing" | "approved" | "rejected") => start(() => decideApplication(id, s));
  if (status === "withdrawn") return null;
  return (
    <div className={`flex flex-wrap gap-2 text-sm ${pending ? "opacity-50" : ""}`}>
      {status !== "approved" && <button className="btn px-3 py-1.5" disabled={pending} onClick={() => act("approved")}>Approve</button>}
      {status !== "rejected" && <button className="btn-outline px-3 py-1.5" disabled={pending} onClick={() => act("rejected")}>Reject</button>}
      {status === "submitted" && <button className="btn-outline px-3 py-1.5" disabled={pending} onClick={() => act("reviewing")}>Mark reviewing</button>}
    </div>
  );
}

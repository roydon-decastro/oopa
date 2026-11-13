"use client";

import { useTransition } from "react";
import { deleteReading } from "@/app/dashboard/utilities/actions";

export default function DeleteReadingButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button className="text-xs text-red-700 hover:underline disabled:opacity-50" disabled={pending}
      onClick={() => start(() => deleteReading(id))}>{pending ? "Deleting…" : "Delete"}</button>
  );
}

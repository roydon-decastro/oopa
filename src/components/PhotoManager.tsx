"use client";

import { useState, useTransition } from "react";
import { deletePhotos } from "@/app/dashboard/actions";

export default function PhotoManager({ propertyId, photos }: { propertyId: string; photos: { id: string; url: string }[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold">Current photos</h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {photos.map((p, i) => (
          <button type="button" key={p.id} onClick={() => toggle(p.id)}
            className={`relative overflow-hidden rounded-md ring-2 ${selected.includes(p.id) ? "ring-red-500" : "ring-transparent"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="" className="aspect-square w-full object-cover" />
            {i === 0 && <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 text-xs text-white">Cover</span>}
          </button>
        ))}
      </div>
      {selected.length > 0 && (
        <button type="button" disabled={pending} className="mt-3 text-sm font-medium text-red-700 hover:underline"
          onClick={() => start(async () => { await deletePhotos(propertyId, selected); setSelected([]); })}>
          {pending ? "Removing…" : `Remove ${selected.length} selected photo${selected.length > 1 ? "s" : ""}`}
        </button>
      )}
    </section>
  );
}

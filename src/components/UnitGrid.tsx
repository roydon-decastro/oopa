"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { addUnit, setUnitsRent, setUnitsStatus, type BuildingFormState } from "@/app/dashboard/buildings/actions";
import { formatPHP } from "@/lib/format";
import { adjustBeds } from "@/app/dashboard/actions";

type Unit = {
  id: string;
  unitLabel: string | null;
  floor: number | null;
  status: "draft" | "active" | "rented" | "archived";
  removed?: boolean;
  monthlyRentPhp: number;
  bedrooms: number;
  pending: number;
  bedsTotal: number | null;
  bedsTaken: number;
};

const STYLE: Record<Unit["status"], string> = {
  active: "border-emerald-300 bg-emerald-50",
  rented: "border-blue-300 bg-blue-50",
  draft: "border-slate-200 bg-white",
  archived: "border-amber-200 bg-amber-50",
};
const LABEL: Record<Unit["status"], string> = { active: "Vacant · listed", rented: "Occupied", draft: "Not listed", archived: "Archived" };
const DORM_LABEL: Record<Unit["status"], string> = { active: "Has free beds · listed", rented: "Full", draft: "Not listed", archived: "Archived" };

export default function UnitGrid({ buildingId, units, dorm = false }: { buildingId: string; units: Unit[]; dorm?: boolean }) {
  const word = dorm ? "room" : "unit";
  const [selected, setSelected] = useState<string[]>([]);
  const [rent, setRent] = useState("");
  const [pending, start] = useTransition();
  const [addState, addAction, adding] = useActionState(
    (prev: BuildingFormState, fd: FormData) => addUnit(buildingId, prev, fd),
    undefined,
  );

  const floors = [...new Set(units.map((u) => u.floor ?? 1))].sort((a, b) => b - a);
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleFloor = (f: number) => {
    const ids = units.filter((u) => (u.floor ?? 1) === f).map((u) => u.id);
    const all = ids.every((id) => selected.includes(id));
    setSelected((s) => (all ? s.filter((x) => !ids.includes(x)) : [...new Set([...s, ...ids])]));
  };
  const bulk = (fn: () => Promise<void>) => start(async () => { await fn(); setSelected([]); });
  const counts = {
    vacant: units.filter((u) => u.status === "active").length,
    occupied: units.filter((u) => u.status === "rented").length,
    draft: units.filter((u) => u.status === "draft").length,
  };

  const beds = units.reduce((n, u) => n + (u.bedsTotal ?? 0), 0);
  const bedsTaken = units.reduce((n, u) => n + (u.bedsTotal != null ? Math.min(u.bedsTaken, u.bedsTotal) : 0), 0);
  const bedsListed = units.filter((u) => u.status === "active" && u.bedsTotal != null)
    .reduce((n, u) => n + Math.max(0, (u.bedsTotal ?? 0) - u.bedsTaken), 0);

  return (
    <div>
      {dorm ? (
      <div className="flex flex-wrap gap-3 text-sm">
        <Stat label="Rooms" value={units.length} />
        <Stat label="Beds" value={beds} />
        <Stat label="Beds taken" value={bedsTaken} tone="text-blue-800" />
        <Stat label="Free beds listed" value={bedsListed} tone="text-emerald-800" />
        <Stat label="Occupancy" value={beds ? `${Math.round((bedsTaken / beds) * 100)}%` : "–"} />
      </div>
      ) : (
      <div className="flex flex-wrap gap-3 text-sm">
        <Stat label="Units" value={units.length} />
        <Stat label="Occupied" value={counts.occupied} tone="text-blue-800" />
        <Stat label="Vacant & listed" value={counts.vacant} tone="text-emerald-800" />
        <Stat label="Not listed" value={counts.draft} tone="text-slate-600" />
        <Stat label="Occupancy" value={units.length ? `${Math.round((counts.occupied / units.length) * 100)}%` : "–"} />
      </div>
      )}

      <div className={`sticky top-0 z-10 mt-6 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm ${pending ? "opacity-60" : ""}`}>
        {selected.length === 0 ? (
          <span className="text-slate-500">Tip: tick {word}s (or a whole floor) to update them together.</span>
        ) : (
          <>
            <strong>{selected.length} selected</strong>
            <button className="btn px-3 py-1.5" disabled={pending} onClick={() => bulk(() => setUnitsStatus(buildingId, selected, "active"))}>List as vacant</button>
            <button className="btn-outline px-3 py-1.5" disabled={pending} onClick={() => bulk(() => setUnitsStatus(buildingId, selected, "rented"))}>{dorm ? "Mark full" : "Mark occupied"}</button>
            <button className="btn-outline px-3 py-1.5" disabled={pending} onClick={() => bulk(() => setUnitsStatus(buildingId, selected, "draft"))}>Unlist</button>
            <span className="flex items-center gap-1">
              <input className="input w-28 py-1.5" type="number" min={1} placeholder={dorm ? "₱ per bed" : "Rent ₱"} value={rent} onChange={(e) => setRent(e.target.value)} />
              <button className="btn-outline px-3 py-1.5" disabled={pending || !(Number(rent) > 0)}
                onClick={() => bulk(async () => { await setUnitsRent(buildingId, selected, Number(rent)); setRent(""); })}>Set rent</button>
            </span>
            <button className="text-slate-500 hover:underline" onClick={() => setSelected([])}>Clear</button>
          </>
        )}
      </div>

      <div className="mt-4 space-y-4">
        {floors.map((f) => (
          <div key={f} className="rounded-xl border border-slate-200 p-3">
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" className="size-4 accent-emerald-700"
                checked={units.filter((u) => (u.floor ?? 1) === f).every((u) => selected.includes(u.id))}
                onChange={() => toggleFloor(f)} />
              Floor {f}
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {units.filter((u) => (u.floor ?? 1) === f).map((u) => (
                <div key={u.id} className={`relative rounded-lg border p-3 ${STYLE[u.status]} ${selected.includes(u.id) ? "ring-2 ring-emerald-600" : ""}`}>
                  <input type="checkbox" aria-label={`Select ${word} ${u.unitLabel}`} className="absolute right-2 top-2 size-4 accent-emerald-700"
                    checked={selected.includes(u.id)} onChange={() => toggle(u.id)} />
                  <Link href={`/dashboard/properties/${u.id}/edit`} className="block">
                    <p className="text-lg font-bold">{u.unitLabel}</p>
                    <p className="text-xs font-medium text-slate-600">{u.removed ? "Taken down by Oopa" : (u.bedsTotal != null ? DORM_LABEL : LABEL)[u.status]}</p>
                    <p className="mt-1 text-sm">{formatPHP(u.monthlyRentPhp)}{u.bedsTotal != null && <span className="text-xs text-slate-500">/bed</span>}</p>
                    {u.bedsTotal == null && <p className="text-xs text-slate-500">{u.bedrooms === 0 ? "Studio" : `${u.bedrooms} BR`}</p>}
                  </Link>
                  {u.bedsTotal != null && (
                    <div className="mt-1 flex items-center gap-1 text-xs">
                      <button type="button" aria-label={`One less bed taken in room ${u.unitLabel}`} disabled={pending || u.bedsTaken <= 0}
                        className="size-6 rounded border border-slate-300 bg-white disabled:opacity-40"
                        onClick={() => start(() => adjustBeds(u.id, -1))}>−</button>
                      <span className="min-w-16 text-center font-medium">{u.bedsTaken}/{u.bedsTotal} beds</span>
                      <button type="button" aria-label={`One more bed taken in room ${u.unitLabel}`} disabled={pending || u.bedsTaken >= u.bedsTotal}
                        className="size-6 rounded border border-slate-300 bg-white disabled:opacity-40"
                        onClick={() => start(() => adjustBeds(u.id, 1))}>+</button>
                    </div>
                  )}
                  {u.pending > 0 && (
                    <Link href={`/dashboard/applications?property=${u.id}`}
                      className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      {u.pending} new application{u.pending > 1 ? "s" : ""}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <form action={addAction} className="mt-6 flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-slate-300 p-4 text-sm">
        <span className="w-full font-semibold">Add a {word}</span>
        <label><span className="label">{dorm ? "Room number" : "Unit number"}</span><input className="input w-28" name="unitLabel" required placeholder="e.g. 106" /></label>
        <label><span className="label">Floor</span><input className="input w-20" name="floor" type="number" min={1} required defaultValue={floors[0] ?? 1} /></label>
        <button className="btn-outline" disabled={adding}>{adding ? "Adding…" : `Add ${word}`}</button>
        {addState?.error && <span className="w-full text-red-700">{addState.error}</span>}
        <span className="w-full text-xs text-slate-500">New {word}s copy rent{dorm ? ", beds" : ""} and size from a similar {word} and start as not listed.</span>
      </form>
    </div>
  );
}

function Stat({ label, value, tone = "" }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="min-w-24 rounded-lg border border-slate-200 px-4 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

"use client";

import { useActionState, useState } from "react";
import type { Building } from "@/db/schema";
import type { BuildingFormState } from "@/app/dashboard/buildings/actions";
import { AMENITIES, FURNISHING, PROPERTY_TYPES, PROVINCES } from "@/lib/ph";

type Props = {
  action: (prev: BuildingFormState, formData: FormData) => Promise<BuildingFormState>;
  initial?: Building;
};

const BUILDING_AMENITIES = [...AMENITIES, "Rooftop deck", "Generator backup", "Water tank", "Bike rack"];

export default function BuildingForm({ action, initial }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [floors, setFloors] = useState(4);
  const [perFloor, setPerFloor] = useState(5);
  const [previews, setPreviews] = useState<string[]>([]);
  const b = initial;
  const creating = !b;

  return (
    <form action={formAction} className="space-y-8">
      <Section title="Building">
        <Field label="Building name" className="sm:col-span-2">
          <input className="input" name="name" required maxLength={120} defaultValue={b?.name} placeholder="e.g. Casa Verde Apartments" />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <textarea className="input min-h-28" name="description" maxLength={5000} defaultValue={b?.description}
            placeholder="Describe the building, the neighborhood, house rules, and nearby schools, malls and transport." />
        </Field>
      </Section>

      <Section title="Location">
        <Field label="Street address" className="sm:col-span-2">
          <input className="input" name="street" defaultValue={b?.street ?? ""} placeholder="e.g. 123 Gorordo Ave" />
        </Field>
        <Field label="Barangay"><input className="input" name="barangay" defaultValue={b?.barangay ?? ""} /></Field>
        <Field label="City / municipality"><input className="input" name="city" required defaultValue={b?.city ?? ""} /></Field>
        <Field label="Province">
          <input className="input" name="province" required list="provinces" defaultValue={b?.province ?? ""} />
          <datalist id="provinces">{PROVINCES.map((x) => <option key={x} value={x} />)}</datalist>
        </Field>
      </Section>

      <Section title="Building amenities">
        <div className="grid grid-cols-2 gap-2 sm:col-span-2 sm:grid-cols-3">
          {BUILDING_AMENITIES.map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="amenities" value={a} defaultChecked={b?.amenities.includes(a)} className="size-4 accent-emerald-700" />
              {a}
            </label>
          ))}
        </div>
      </Section>

      {creating && (
        <>
          <Section title="Units">
            <Field label="Number of floors">
              <input className="input" name="floors" type="number" min={1} max={60} value={floors} onChange={(e) => setFloors(+e.target.value)} required />
            </Field>
            <Field label="Units per floor">
              <input className="input" name="unitsPerFloor" type="number" min={1} max={40} value={perFloor} onChange={(e) => setPerFloor(+e.target.value)} required />
            </Field>
            <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600 sm:col-span-2">
              This creates <strong>{Math.max(0, floors * perFloor) || 0} units</strong>
              {floors > 0 && perFloor > 0 && <> numbered {`${1}01`}–{`1${String(perFloor).padStart(2, "0")}`} on floor 1, up to {`${floors}01`}–{`${floors}${String(perFloor).padStart(2, "0")}`} on floor {floors}</>}.
              You can rename, edit or add units afterwards.
            </div>
          </Section>

          <Section title="Typical unit (applied to every unit; edit individual units later)">
            <Field label="Unit type">
              <select className="input" name="type" defaultValue="apartment">
                {PROPERTY_TYPES.filter(([v]) => v !== "house" && v !== "townhouse").map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Monthly rent (₱)">
              <input className="input" name="monthlyRentPhp" type="number" min={1} required placeholder="12000" />
            </Field>
            <Field label="Bedrooms (0 for studio)"><input className="input" name="bedrooms" type="number" min={0} max={50} defaultValue={1} /></Field>
            <Field label="Bathrooms"><input className="input" name="bathrooms" type="number" min={0} max={50} defaultValue={1} /></Field>
            <Field label="Floor area (sqm)"><input className="input" name="floorAreaSqm" type="number" min={0} step="0.01" /></Field>
            <Field label="Furnishing">
              <select className="input" name="furnishing" defaultValue="">
                <option value="">Not specified</option>
                {FURNISHING.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Advance (months)"><input className="input" name="advanceMonths" type="number" min={0} max={12} defaultValue={1} /></Field>
            <Field label="Security deposit (months)"><input className="input" name="depositMonths" type="number" min={0} max={12} defaultValue={2} /></Field>
            <Field label="Minimum lease (months)"><input className="input" name="minLeaseMonths" type="number" min={1} max={120} defaultValue={12} /></Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" name="petsAllowed" className="size-4 accent-emerald-700" /> Pets allowed
            </label>
            <label className="flex items-start gap-2 rounded-md border border-slate-200 p-3 text-sm sm:col-span-2">
              <input type="checkbox" name="publish" className="mt-0.5 size-4 accent-emerald-700" />
              <span>
                <strong>Publish all units as vacant now.</strong> Leave this off to start them as drafts, then mark which are
                occupied and publish only the vacant ones from the floor plan.
              </span>
            </label>
          </Section>
        </>
      )}

      <Section title={creating ? "Building photos" : "Add more building photos"}>
        <div className="sm:col-span-2">
          <input type="file" name="photos" multiple accept="image/jpeg,image/png,image/webp"
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-emerald-800"
            onChange={(e) => setPreviews(Array.from(e.target.files ?? []).map((f) => URL.createObjectURL(f)))} />
          <p className="mt-1 text-xs text-slate-500">Facade, lobby, hallways, amenities. Shown on every unit. JPG, PNG or WebP, up to 5 MB each.</p>
          {previews.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {previews.map((src) => <img key={src} src={src} alt="" className="aspect-square rounded-md object-cover" />)}
            </div>
          )}
        </div>
      </Section>

      {state?.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <div className="border-t border-slate-200 pt-6">
        <button className="btn" disabled={pending}>{pending ? "Saving…" : creating ? "Create building and units" : "Save building"}</button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 text-lg font-semibold">{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

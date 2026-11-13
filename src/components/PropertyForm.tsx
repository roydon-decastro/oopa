"use client";

import { useActionState, useState } from "react";
import type { Property } from "@/db/schema";
import type { FormState } from "@/app/dashboard/actions";
import { AMENITIES, FURNISHING, PROPERTY_TYPES, PROVINCES } from "@/lib/ph";
import UtilityFields from "./UtilityFields";
import type { Utility } from "@/lib/utilities";
import { GENDER_OPTIONS } from "@/lib/dorm";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: Property;
  existingPhotoCount?: number;
  /** Set when editing a unit inside a building: title and address come from the building. */
  buildingName?: string;
  /** For units: the building's utility terms, shown on the "Same as building" option. */
  buildingUtilities?: Record<Utility, string | null>;
};

export default function PropertyForm({ action, initial, existingPhotoCount = 0, buildingName, buildingUtilities }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [previews, setPreviews] = useState<string[]>([]);
  const p = initial;
  const [type, setType] = useState<string>(p?.type ?? "condo");
  const perBed = type === "bedspace";
  const showRules = perBed || type === "room";

  return (
    <form action={formAction} className="space-y-8">
      <Section title="Basics">
        {buildingName ? (
          <>
            <Field label={perBed ? "Room number" : "Unit number"}>
              <input className="input" name="unitLabel" required maxLength={20} defaultValue={p?.unitLabel ?? ""} />
            </Field>
            <Field label="Floor">
              <input className="input" name="floor" type="number" min={1} max={200} required defaultValue={p?.floor ?? 1} />
            </Field>
          </>
        ) : (
          <Field label="Listing title" className="sm:col-span-2">
            <input className="input" name="title" required minLength={5} maxLength={120}
              defaultValue={p?.title} placeholder="e.g. Fully furnished 1BR condo near BGC" />
          </Field>
        )}
        <Field label="Property type">
          <select className="input" name="type" value={type} onChange={(e) => setType(e.target.value)}>
            {PROPERTY_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Furnishing">
          <select className="input" name="furnishing" defaultValue={p?.furnishing ?? ""}>
            <option value="">Not specified</option>
            {FURNISHING.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <textarea className="input min-h-32" name="description" maxLength={5000} defaultValue={p?.description}
            placeholder={buildingName ? "Anything specific to this unit, e.g. corner unit, balcony, street view…" : "Describe the unit, the building, nearby malls, schools and transport…"} />
        </Field>
      </Section>

      <Section title="Rent and terms">
        <Field label={perBed ? "Rent per bed, per month (₱)" : "Monthly rent (₱)"}>
          <input className="input" name="monthlyRentPhp" type="number" min={1} step="1" required
            defaultValue={p?.monthlyRentPhp} placeholder={perBed ? "3000" : "25000"} />
        </Field>
        <Field label="Minimum lease (months)">
          <input className="input" name="minLeaseMonths" type="number" min={1} max={120} defaultValue={p?.minLeaseMonths ?? 12} />
        </Field>
        <Field label="Advance (months)">
          <input className="input" name="advanceMonths" type="number" min={0} max={12} defaultValue={p?.advanceMonths ?? 1} />
        </Field>
        <Field label="Security deposit (months)">
          <input className="input" name="depositMonths" type="number" min={0} max={12} defaultValue={p?.depositMonths ?? 2} />
        </Field>
        <Field label="Available from">
          <input className="input" name="availableFrom" type="date" defaultValue={p?.availableFrom ?? ""} />
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" name="petsAllowed" defaultChecked={p?.petsAllowed} className="size-4 accent-emerald-700" />
          Pets allowed
        </label>
      </Section>

      {showRules && (
        <Section title={perBed ? "Beds and house rules" : "House rules"}>
          {perBed && (
            <>
              <Field label="Beds in this room">
                <input className="input" name="bedsTotal" type="number" min={1} max={50} required defaultValue={p?.bedsTotal ?? 4} />
              </Field>
              <Field label="Beds already taken">
                <input className="input" name="bedsTaken" type="number" min={0} max={50} defaultValue={p?.bedsTaken ?? 0} />
              </Field>
              <p className="-mt-2 text-xs text-slate-500 sm:col-span-2">
                Renters apply for one bed. Each time you approve an application, one more bed is marked taken. When every bed is taken the room stops showing in search.
              </p>
            </>
          )}
          <Field label="Who can stay">
            <select className="input" name="genderPolicy" defaultValue={p?.genderPolicy ?? ""}>
              <option value="">{buildingName ? "Same as building" : "Not specified"}</option>
              {GENDER_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Curfew">
            <input className="input" name="curfew" maxLength={40} defaultValue={p?.curfew ?? ""}
              placeholder={buildingName ? "Leave blank to use the building's" : "e.g. 10:00 PM, or None"} />
          </Field>
          <Field label="House rules" className="sm:col-span-2">
            <textarea className="input min-h-24" name="houseRules" maxLength={2000} defaultValue={p?.houseRules ?? ""}
              placeholder={buildingName ? "Leave blank to use the building's rules" : "e.g. No visitors after 8 PM. No cooking in rooms. Lights out at 11 PM."} />
          </Field>
        </Section>
      )}

      <Section title="Size">
        <Field label="Bedrooms (0 for studio)">
          <input className="input" name="bedrooms" type="number" min={0} max={50} defaultValue={p?.bedrooms ?? 1} />
        </Field>
        <Field label="Bathrooms">
          <input className="input" name="bathrooms" type="number" min={0} max={50} defaultValue={p?.bathrooms ?? 1} />
        </Field>
        <Field label="Floor area (sqm)">
          <input className="input" name="floorAreaSqm" type="number" min={0} step="0.01" defaultValue={p?.floorAreaSqm ?? ""} />
        </Field>
      </Section>

      {!buildingName && <Section title="Location">
        <Field label="Street / building / unit" className="sm:col-span-2">
          <input className="input" name="street" defaultValue={p?.street ?? ""} placeholder="e.g. Unit 12B, One Serendra, 11th Ave" />
        </Field>
        <Field label="Barangay">
          <input className="input" name="barangay" defaultValue={p?.barangay ?? ""} placeholder="e.g. Fort Bonifacio" />
        </Field>
        <Field label="City / municipality">
          <input className="input" name="city" required defaultValue={p?.city ?? ""} placeholder="e.g. Taguig" />
        </Field>
        <Field label="Province">
          <input className="input" name="province" required list="provinces" defaultValue={p?.province ?? ""} placeholder="e.g. Metro Manila" />
          <datalist id="provinces">{PROVINCES.map((x) => <option key={x} value={x} />)}</datalist>
        </Field>
      </Section>}

      <Section title={buildingName ? "Unit amenities (building amenities are added automatically)" : "Amenities"}>
        <div className="grid grid-cols-2 gap-2 sm:col-span-2 sm:grid-cols-3">
          {AMENITIES.map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="amenities" value={a} defaultChecked={p?.amenities.includes(a)} className="size-4 accent-emerald-700" />
              {a}
            </label>
          ))}
        </div>
      </Section>

      <UtilityFields mode={buildingName ? "unit" : "property"} initial={p} buildingSummary={buildingUtilities} />

      <Section title={existingPhotoCount ? "Add more photos" : "Photos"}>
        <div className="sm:col-span-2">
          <input
            type="file" name="photos" multiple accept="image/jpeg,image/png,image/webp"
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-emerald-800"
            onChange={(e) => setPreviews(Array.from(e.target.files ?? []).map((f) => URL.createObjectURL(f)))}
          />
          <p className="mt-1 text-xs text-slate-500">JPG, PNG or WebP, up to 5 MB each, 20 photos max. The first photo is the cover.</p>
          {previews.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {previews.map((src) => <img key={src} src={src} alt="" className="aspect-square rounded-md object-cover" />)}
            </div>
          )}
        </div>
      </Section>

      {state?.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

      <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-6">
        {p && p.status !== "draft" ? (
          <button className="btn" name="intent" value="save" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </button>
        ) : (
          <>
            <button className="btn" name="intent" value="publish" disabled={pending}>
              {pending ? "Saving…" : "Publish listing"}
            </button>
            <button className="btn-outline" name="intent" value="draft" disabled={pending}>Save as draft</button>
          </>
        )}
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

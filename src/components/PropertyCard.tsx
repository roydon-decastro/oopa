import Link from "next/link";
import { formatPHP } from "@/lib/format";
import { PROPERTY_TYPES } from "@/lib/ph";
import { GENDER_LABEL, type Gender } from "@/lib/dorm";

const typeLabel = Object.fromEntries(PROPERTY_TYPES) as Record<string, string>;

export type CardProperty = {
  id: string;
  title: string;
  type: string;
  monthlyRentPhp: number;
  bedrooms: number;
  bathrooms: number;
  floorAreaSqm: number | null;
  barangay: string | null;
  city: string;
  province: string;
  photos: { url: string }[];
  unitLabel?: string | null;
  bedsTotal?: number | null;
  bedsTaken?: number;
  genderPolicy?: Gender | null;
  building?: { name: string; photos: { url: string }[]; genderPolicy?: Gender | null } | null;
};

export default function PropertyCard({ p }: { p: CardProperty }) {
  const cover = p.photos[0] ?? p.building?.photos[0];
  const perBed = p.bedsTotal != null;
  const free = perBed ? Math.max(0, p.bedsTotal! - (p.bedsTaken ?? 0)) : 0;
  const gender = p.genderPolicy ?? p.building?.genderPolicy;
  return (
    <Link href={`/listings/${p.id}`} className="group block overflow-hidden rounded-xl border border-slate-200 hover:shadow-md">
      <div className="aspect-[4/3] bg-slate-100">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover.url} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">No photo yet</div>
        )}
      </div>
      <div className="p-4">
        <p className="text-lg font-semibold text-emerald-800">
          {formatPHP(p.monthlyRentPhp)}<span className="text-sm font-normal text-slate-500">{perBed ? "/bed" : ""}/month</span>
        </p>
        <h3 className="mt-1 line-clamp-1 font-medium">{p.title}</h3>
        <p className="mt-1 line-clamp-1 text-sm text-slate-600">{[p.barangay, p.city, p.province].filter(Boolean).join(", ")}</p>
        <p className="mt-2 text-xs text-slate-500">
          {perBed ? (
            <>
              {typeLabel[p.type]} · <span className="font-medium text-emerald-700">{free} of {p.bedsTotal} beds free</span>
              {gender && gender !== "any" ? ` · ${GENDER_LABEL[gender]}` : ""}
            </>
          ) : (
            <>
              {typeLabel[p.type]} · {p.bedrooms === 0 ? "Studio" : `${p.bedrooms} BR`} · {p.bathrooms} bath
              {p.floorAreaSqm ? ` · ${p.floorAreaSqm} sqm` : ""}
              {gender && gender !== "any" ? ` · ${GENDER_LABEL[gender]}` : ""}
            </>
          )}
        </p>
      </div>
    </Link>
  );
}

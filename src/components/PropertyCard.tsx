import Link from "next/link";
import { formatPHP } from "@/lib/format";
import { PROPERTY_TYPES } from "@/lib/ph";

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
  building?: { name: string; photos: { url: string }[] } | null;
};

export default function PropertyCard({ p }: { p: CardProperty }) {
  const cover = p.photos[0] ?? p.building?.photos[0];
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
          {formatPHP(p.monthlyRentPhp)}<span className="text-sm font-normal text-slate-500">/month</span>
        </p>
        <h3 className="mt-1 line-clamp-1 font-medium">{p.title}</h3>
        <p className="mt-1 line-clamp-1 text-sm text-slate-600">{[p.barangay, p.city, p.province].filter(Boolean).join(", ")}</p>
        <p className="mt-2 text-xs text-slate-500">
          {typeLabel[p.type]} · {p.bedrooms === 0 ? "Studio" : `${p.bedrooms} BR`} · {p.bathrooms} bath
          {p.floorAreaSqm ? ` · ${p.floorAreaSqm} sqm` : ""}
        </p>
      </div>
    </Link>
  );
}

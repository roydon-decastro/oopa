import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { db } from "@/db";
import { application, buildingPhoto, property, propertyPhoto } from "@/db/schema";
import { getSession } from "@/lib/session";
import { formatPHP } from "@/lib/format";
import { FURNISHING, PROPERTY_TYPES } from "@/lib/ph";
import ApplyForm from "@/components/ApplyForm";
import { applyToProperty } from "@/app/applications/actions";
import { describeTerms, effectiveTerms } from "@/lib/utilities";

const typeLabel = Object.fromEntries(PROPERTY_TYPES) as Record<string, string>;
const furnishingLabel = Object.fromEntries(FURNISHING) as Record<string, string>;
const isUuid = (s: string) => /^[0-9a-f-]{36}$/.test(s);

async function load(id: string) {
  if (!isUuid(id)) return null;
  return db.query.property.findFirst({
    where: eq(property.id, id),
    with: {
      photos: { orderBy: asc(propertyPhoto.position) },
      owner: { columns: { name: true, createdAt: true } },
      building: { with: { photos: { orderBy: asc(buildingPhoto.position) } } },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = await load((await params).id);
  if (!p || p.status !== "active") return { title: "Listing not found · Oopa" };
  return {
    title: `${p.title} · ${formatPHP(p.monthlyRentPhp)}/mo · Oopa`,
    description: p.description.slice(0, 160),
    openGraph: { images: [...p.photos, ...(p.building?.photos ?? [])].slice(0, 1).map((x) => x.url) },
  };
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, session] = await Promise.all([load(id), getSession()]);
  const isOwner = session?.user.id === p?.ownerId;
  if (!p || (p.status !== "active" && !isOwner)) notFound();

  const myApp = session
    ? await db.query.application.findFirst({
        where: and(eq(application.propertyId, p.id), eq(application.renterId, session.user.id)),
      })
    : null;

  // Units show their own photos first, then the building's; amenities combine both.
  const photos = [...p.photos, ...(p.building?.photos ?? [])];
  const amenities = [...new Set([...(p.building?.amenities ?? []), ...p.amenities])];
  const moveInCost = p.monthlyRentPhp * (p.advanceMonths + p.depositMonths);
  const facts: [string, string][] = [
    ...(p.building ? [["Unit", `${p.unitLabel} · Floor ${p.floor}`] as [string, string]] : []),
    ["Type", typeLabel[p.type]],
    ["Bedrooms", p.bedrooms === 0 ? "Studio" : String(p.bedrooms)],
    ["Bathrooms", String(p.bathrooms)],
    ...(p.floorAreaSqm ? [["Floor area", `${p.floorAreaSqm} sqm`] as [string, string]] : []),
    ...(p.furnishing ? [["Furnishing", furnishingLabel[p.furnishing]] as [string, string]] : []),
    ["Pets", p.petsAllowed ? "Allowed" : "Not allowed"],
    ...(["electricity", "water"] as const).flatMap((u) => {
      const d = describeTerms(effectiveTerms(p, p.building, u), u);
      return d ? [[u === "electricity" ? "Electricity" : "Water", d] as [string, string]] : [];
    }),
    ["Minimum lease", `${p.minLeaseMonths} months`],
    ["Available", p.availableFrom ? new Date(p.availableFrom).toLocaleDateString("en-PH", { dateStyle: "medium" }) : "Now"],
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/listings" className="text-sm text-slate-500 hover:text-emerald-700">← All rentals</Link>
      {p.status !== "active" && (
        <p className="mt-4 rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Only you can see this listing because it isn&apos;t published.
        </p>
      )}

      {photos.length <= 1 ? (
        <div className="mt-4 aspect-[16/9] max-h-[480px] w-full overflow-hidden rounded-2xl bg-slate-100">
          {photos[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photos[0].url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">No photos yet</div>
          )}
        </div>
      ) : (
        <div className="mt-4 grid max-h-[480px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl">
          {photos.slice(0, 5).map((ph, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={ph.id} src={ph.url} alt=""
              className={`h-full w-full object-cover ${i === 0 ? `col-span-4 row-span-2 sm:row-span-2 ${photos.length === 2 ? "sm:col-span-3" : "sm:col-span-2"}` : "hidden sm:block"}`} />
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h1 className="text-3xl font-bold">{p.title}</h1>
          <p className="mt-1 text-slate-600">{[p.street, p.barangay, p.city, p.province].filter(Boolean).join(", ")}</p>
          {p.building && (
            <Link href={`/buildings/${p.building.id}`} className="mt-2 inline-block text-sm text-emerald-700 underline">
              See all available units in {p.building.name}
            </Link>
          )}

          <dl className="mt-6 grid grid-cols-2 gap-4 rounded-xl border border-slate-200 p-5 sm:grid-cols-4">
            {facts.map(([k, v]) => (
              <div key={k} className={k === "Electricity" || k === "Water" ? "col-span-2" : ""}>
                <dt className="text-xs text-slate-500">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>

          {p.description && (
            <section className="mt-8">
              <h2 className="text-xl font-semibold">{p.building ? "About this unit" : "About this place"}</h2>
              <p className="mt-2 whitespace-pre-line text-slate-700">{p.description}</p>
            </section>
          )}
          {p.building?.description && (
            <section className="mt-8">
              <h2 className="text-xl font-semibold">About {p.building.name}</h2>
              <p className="mt-2 whitespace-pre-line text-slate-700">{p.building.description}</p>
            </section>
          )}

          {amenities.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xl font-semibold">Amenities</h2>
              <ul className="mt-3 grid grid-cols-2 gap-2 text-slate-700 sm:grid-cols-3">
                {amenities.map((a) => <li key={a}>✓ {a}</li>)}
              </ul>
            </section>
          )}

          <p className="mt-8 text-sm text-slate-500">
            Listed by {p.owner.name} · on Oopa since {p.owner.createdAt.getFullYear()}
          </p>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 p-6 shadow-sm lg:sticky lg:top-6">
          <p className="text-3xl font-bold text-emerald-800">
            {formatPHP(p.monthlyRentPhp)}<span className="text-base font-normal text-slate-500">/month</span>
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {p.advanceMonths} month{p.advanceMonths === 1 ? "" : "s"} advance + {p.depositMonths} month{p.depositMonths === 1 ? "" : "s"} deposit
          </p>
          <p className="text-sm text-slate-600">Move-in cost: <strong>{formatPHP(moveInCost)}</strong></p>

          <div className="mt-6 border-t border-slate-200 pt-6">
            {isOwner ? (
              <Link href={`/dashboard/properties/${p.id}/edit`} className="btn w-full">Edit your listing</Link>
            ) : !session ? (
              <>
                <p className="mb-3 text-sm text-slate-600">Create a free account to apply for this place.</p>
                <Link href={`/signup?next=/listings/${p.id}`} className="btn w-full">Sign up to apply</Link>
                <Link href={`/login?next=/listings/${p.id}`} className="mt-2 block text-center text-sm text-emerald-700 underline">I already have an account</Link>
              </>
            ) : myApp && myApp.status !== "withdrawn" ? (
              <div className="rounded-md bg-emerald-50 p-4 text-sm text-emerald-800">
                You applied on {myApp.createdAt.toLocaleDateString("en-PH", { dateStyle: "medium" })}.{" "}
                <Link href="/applications" className="underline">Track your application</Link>
              </div>
            ) : p.status !== "active" ? null : (
              <>
                <h2 className="mb-3 font-semibold">Apply for this place</h2>
                <ApplyForm action={applyToProperty.bind(null, p.id)} minLease={p.minLeaseMonths} />
              </>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

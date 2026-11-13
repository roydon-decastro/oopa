import Link from "next/link";

const cities = ["Makati", "Taguig (BGC)", "Quezon City", "Pasig", "Cebu City", "Davao City"];

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4">
      <section className="py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Find your next home in the Philippines
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Browse condos, apartments, houses and rooms from verified owners, then apply online in minutes.
        </p>
        <form action="/listings" className="mx-auto mt-8 flex max-w-xl gap-2">
          <input
            name="city"
            placeholder="City or area, e.g. Makati"
            className="flex-1 rounded-md border border-slate-300 px-4 py-3 focus:border-emerald-600 focus:outline-none"
          />
          <button className="rounded-md bg-emerald-700 px-6 py-3 font-medium text-white hover:bg-emerald-800">
            Search
          </button>
        </form>
        <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm">
          {cities.map((c) => (
            <Link key={c} href={`/listings?city=${encodeURIComponent(c)}`}
              className="rounded-full border border-slate-300 px-3 py-1 hover:border-emerald-600 hover:text-emerald-700">
              {c}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 rounded-2xl bg-emerald-50 p-8 sm:grid-cols-2">
        <div>
          <h2 className="text-2xl font-semibold">Own a property?</h2>
          <p className="mt-2 text-slate-600">
            List it for free, receive applications from qualified renters, and manage everything in one place.
          </p>
        </div>
        <div className="flex items-center sm:justify-end">
          <Link href="/owners" className="rounded-md bg-emerald-700 px-6 py-3 font-medium text-white hover:bg-emerald-800">
            List your property
          </Link>
        </div>
      </section>
    </main>
  );
}

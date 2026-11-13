import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getSession } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";

export const metadata: Metadata = {
  title: "Oopa: Rentals across the Philippines",
  description: "Find condos, apartments, houses and rooms for rent, and apply online.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  const user = session?.user;
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        <header className="border-b border-slate-200">
          <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
            <Link href="/" className="text-xl font-bold text-emerald-700">Oopa</Link>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <Link href="/listings" className="hover:text-emerald-700">Browse rentals</Link>
              {user ? (
                <>
                  {user.role === "owner" ? (
                    <Link href="/dashboard" className="hover:text-emerald-700">My listings</Link>
                  ) : (
                    <Link href="/owners" className="hover:text-emerald-700">List your property</Link>
                  )}
                  <span className="text-slate-500">Hi, {user.name.split(" ")[0]}</span>
                  <LogoutButton />
                </>
              ) : (
                <>
                  <Link href="/owners" className="hover:text-emerald-700">List your property</Link>
                  <Link href="/login" className="rounded-md bg-emerald-700 px-3 py-1.5 text-white hover:bg-emerald-800">Log in</Link>
                </>
              )}
            </div>
          </nav>
        </header>
        {children}
        <footer className="mt-24 border-t border-slate-200 py-8 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} Oopa · Made in the Philippines
        </footer>
      </body>
    </html>
  );
}

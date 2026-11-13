import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export const metadata = { title: "Admin · Oopa", robots: { index: false } };
export const dynamic = "force-dynamic";

const TABS = [
  ["/admin", "Overview"],
  ["/admin/users", "Users"],
  ["/admin/listings", "Listings"],
  ["/admin/applications", "Applications"],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Site admin</p>
      <nav className="mt-2 flex gap-1 overflow-x-auto border-b border-slate-200 text-sm">
        {TABS.map(([href, label]) => (
          <Link key={href} href={href} className="whitespace-nowrap rounded-t-md px-3 py-2 font-medium text-slate-600 hover:bg-slate-50 hover:text-emerald-700">
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-8">{children}</div>
    </main>
  );
}

import Link from "next/link";

export const PAGE_SIZE = 25;

export const dateFmt = (d: Date) =>
  d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Manila" });

export function Pager({ page, total, href }: { page: number; total: number; href: (p: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages === 1) return null;
  return (
    <div className="mt-6 flex items-center justify-between text-sm text-slate-600">
      {page > 1 ? <Link className="btn-outline px-3 py-1.5" href={href(page - 1)}>← Previous</Link> : <span />}
      <span>Page {page} of {pages}</span>
      {page < pages ? <Link className="btn-outline px-3 py-1.5" href={href(page + 1)}>Next →</Link> : <span />}
    </div>
  );
}

export function qs(params: Record<string, string | number | undefined>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "" && !(k === "page" && v === 1)) u.set(k, String(v));
  const s = u.toString();
  return s ? `?${s}` : "";
}

export const pageNum = (p?: string) => Math.max(1, Math.floor(Number(p)) || 1);

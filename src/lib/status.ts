export const APP_STATUS: Record<string, { label: string; style: string }> = {
  submitted: { label: "Submitted", style: "bg-slate-100 text-slate-700" },
  reviewing: { label: "Under review", style: "bg-amber-100 text-amber-800" },
  approved: { label: "Approved", style: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Not accepted", style: "bg-red-100 text-red-700" },
  withdrawn: { label: "Withdrawn", style: "bg-slate-100 text-slate-500" },
};

export const safeNext = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : undefined);

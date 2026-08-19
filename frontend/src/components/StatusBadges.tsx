import type { Project } from "@/lib/types";

export function StatusBadge({ status }: { status: Project["status"] }) {
  if (status === "Final") {
    return <span className="badge bg-emerald-100 text-emerald-700">Final</span>;
  }
  return <span className="badge bg-slate-100 text-slate-600">Taslak</span>;
}

const BUSINESS_STATUS_STYLES: Record<string, string> = {
  Aktif: "bg-sky-100 text-sky-700",
  Beklemede: "bg-amber-100 text-amber-700",
  "Tamamlandı": "bg-emerald-100 text-emerald-700",
};

export function BusinessStatusBadge({ status }: { status: string }) {
  return <span className={`badge ${BUSINESS_STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600"}`}>{status}</span>;
}

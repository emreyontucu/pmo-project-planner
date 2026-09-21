"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ArrowUpDown,
  Ban,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  FileSpreadsheet,
  GitFork,
  History,
  PlusCircle,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { api } from "@/lib/api";
import type { ProjectAuditLog } from "@/lib/types";

interface Props {
  projectId: number;
}

const ACTION_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; dotColor: string }
> = {
  PROJE_OLUŞTURULDU: {
    label: "Proje Oluşturuldu",
    icon: <Sparkles size={14} className="text-indigo-600" />,
    color: "bg-indigo-50 border-indigo-200 text-indigo-800",
    dotColor: "bg-indigo-600",
  },
  PROJE_GÜNCELLENDİ: {
    label: "Proje Güncellendi",
    icon: <Edit3 size={14} className="text-blue-600" />,
    color: "bg-blue-50 border-blue-200 text-blue-800",
    dotColor: "bg-blue-600",
  },
  PROJE_İPTAL_EDİLDİ: {
    label: "Proje İptal Edildi",
    icon: <Ban size={14} className="text-rose-600" />,
    color: "bg-rose-50 border-rose-200 text-rose-800",
    dotColor: "bg-rose-600",
  },
  GÖREV_EKLENDİ: {
    label: "Görev Eklendi",
    icon: <PlusCircle size={14} className="text-emerald-600" />,
    color: "bg-emerald-50 border-emerald-200 text-emerald-800",
    dotColor: "bg-emerald-600",
  },
  GÖREV_GÜNCELLENDİ: {
    label: "Görev Güncellendi",
    icon: <Edit3 size={14} className="text-amber-600" />,
    color: "bg-amber-50 border-amber-200 text-amber-800",
    dotColor: "bg-amber-600",
  },
  GÖREV_İPTAL_EDİLDİ: {
    label: "Görev İptal Edildi",
    icon: <Ban size={14} className="text-rose-600" />,
    color: "bg-rose-50 border-rose-200 text-rose-800",
    dotColor: "bg-rose-600",
  },
  GÖREV_SİLİNDİ: {
    label: "Görev Silindi",
    icon: <Trash2 size={14} className="text-red-600" />,
    color: "bg-red-50 border-red-200 text-red-800",
    dotColor: "bg-red-600",
  },
  SIRALAMA_GÜNCELLENDİ: {
    label: "Sıralama Değişti",
    icon: <ArrowUpDown size={14} className="text-violet-600" />,
    color: "bg-violet-50 border-violet-200 text-violet-800",
    dotColor: "bg-violet-600",
  },
  BAĞIMLILIK_EKLENDİ: {
    label: "Bağımlılık Eklendi",
    icon: <GitFork size={14} className="text-indigo-600" />,
    color: "bg-indigo-50 border-indigo-200 text-indigo-800",
    dotColor: "bg-indigo-600",
  },
  BAĞIMLILIK_SİLİNDİ: {
    label: "Bağımlılık Kaldırıldı",
    icon: <GitFork size={14} className="text-slate-500" />,
    color: "bg-slate-50 border-slate-200 text-slate-700",
    dotColor: "bg-slate-500",
  },
  EXCEL_YÜKLENDİ: {
    label: "Excel İçe Aktarıldı",
    icon: <FileSpreadsheet size={14} className="text-emerald-600" />,
    color: "bg-emerald-50 border-emerald-200 text-emerald-800",
    dotColor: "bg-emerald-600",
  },
  TARİHLER_HESAPLANDI: {
    label: "Tarihler Hesaplandı",
    icon: <Calendar size={14} className="text-cyan-600" />,
    color: "bg-cyan-50 border-cyan-200 text-cyan-800",
    dotColor: "bg-cyan-600",
  },
  PLAN_YAYINLANDI: {
    label: "Final Plan Yayınlandı",
    icon: <CheckCircle2 size={14} className="text-emerald-600" />,
    color: "bg-emerald-50 border-emerald-200 text-emerald-800",
    dotColor: "bg-emerald-600",
  },
  WBS_SİHİRBAZI_UYGULANDI: {
    label: "WBS Sihirbazı",
    icon: <Wand2 size={14} className="text-violet-600" />,
    color: "bg-violet-50 border-violet-200 text-violet-800",
    dotColor: "bg-violet-600",
  },
};

function formatDate(isoStr: string) {
  try {
    const d = new Date(isoStr);
    return d.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return isoStr;
  }
}

export default function AuditLogTimeline({ projectId }: Props) {
  const [logs, setLogs] = useState<ProjectAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  async function loadLogs() {
    setLoading(true);
    try {
      const data = await api.getProjectAuditLogs(projectId);
      setLogs(data);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, [projectId]);

  const filteredLogs = logs.filter(
    (l) =>
      l.details.toLowerCase().includes(query.toLowerCase()) ||
      l.action.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="card p-6 bg-white border border-slate-200/90 shadow-sm space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <History size={18} className="text-indigo-600" />
            Akış Tarihçesi & Değişiklik Günlüğü (Audit Logs)
          </h2>
          <p className="text-xs text-slate-500 font-light pt-0.5">
            Proje üzerinde yapılan tüm görev ekleme, tarih güncelleme, sıralama ve Excel işlemleri
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tarihçede ara..."
              className="input pl-8 py-1.5 text-xs w-48 bg-slate-50 focus:bg-white"
            />
          </div>
          <button
            onClick={loadLogs}
            disabled={loading}
            className="btn btn-secondary btn-sm p-2 text-slate-500 hover:text-slate-900"
            title="Günlüğü Yenile"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-3 py-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          Henüz kayıtlı bir akış hareketi bulunmuyor.
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {filteredLogs.map((log) => {
            const config = ACTION_CONFIG[log.action] || {
              label: log.action,
              icon: <Activity size={14} className="text-slate-600" />,
              color: "bg-slate-50 border-slate-200 text-slate-700",
              dotColor: "bg-slate-400",
            };

            return (
              <div key={log.id} className="relative group">
                {/* Timeline Dot */}
                <span
                  className={`absolute -left-[19px] top-3 h-3 w-3 rounded-full border-2 border-white shadow-xs ${config.dotColor}`}
                />

                <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-slate-300 hover:shadow-xs transition-all space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white border border-slate-200 shadow-2xs">
                        {config.icon}
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${config.color}`}>
                        {config.label}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                      <Clock size={12} />
                      {formatDate(log.created_at)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-light pl-8">
                    {log.details}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

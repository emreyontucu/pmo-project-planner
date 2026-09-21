"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Ban,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileSpreadsheet,
  Filter,
  Layers,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { PROJECT_SECTORS } from "@/lib/constants";
import { useRole } from "@/context/RoleContext";
import { BusinessStatusBadge } from "@/components/StatusBadges";
import type { Project, ProjectDetail } from "@/lib/types";

export default function ManagerPortalPage() {
  const { setRole } = useRole();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedSector, setSelectedSector] = useState<string>("ALL");
  const [selectedManager, setSelectedManager] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  useEffect(() => {
    // Ensure executive role is active on this page
    setRole("executive");
    async function load() {
      setLoading(true);
      try {
        const list = await api.listProjects();
        setProjects(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Projeler yüklenemedi");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [setRole]);

  // Unique managers list
  const managers = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.manager && p.manager.trim()) {
        set.add(p.manager.trim());
      }
    });
    return Array.from(set).sort();
  }, [projects]);

  // Filtered projects
  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.manager && p.manager.toLowerCase().includes(q)) ||
        (p.sector && p.sector.toLowerCase().includes(q)) ||
        (p.companies && p.companies.toLowerCase().includes(q));

      const matchSector = selectedSector === "ALL" || p.sector === selectedSector;

      const matchManager =
        selectedManager === "ALL" || (p.manager && p.manager.trim() === selectedManager);

      const matchStatus =
        selectedStatus === "ALL" || p.business_status === selectedStatus;

      return matchSearch && matchSector && matchManager && matchStatus;
    });
  }, [projects, search, selectedSector, selectedManager, selectedStatus]);

  // KPI Metrics
  const totalProjects = projects.length;
  const finalProjects = projects.filter((p) => p.status === "Final").length;
  const activeProjects = projects.filter((p) => p.business_status === "Aktif").length;
  const completedProjects = projects.filter((p) => p.business_status === "Tamamlandı").length;
  const cancelledProjects = projects.filter((p) => p.business_status === "İptal Edildi").length;
  const draftPlans = projects.filter((p) => p.status === "Draft").length;

  return (
    <div className="space-y-8">
      
      {/* Executive Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-950 p-8 text-white shadow-xl border border-purple-900/30">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="relative space-y-3 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 px-3.5 py-1 text-xs font-bold text-purple-200 border border-purple-400/20">
            <Eye size={13} className="text-purple-300" />
            Yönetici Portalı & Portföy İzleme
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
            PMO Kurumsal Yönetici Ekranı
          </h1>
          <p className="text-sm text-slate-300 font-light leading-relaxed">
            Kurum genelindeki tüm projelerin ilerleme durumlarını, onaylı final planlarını, yönetici bazlı dağılımlarını ve operasyonel akış tarihçelerini salt okunur modda inceleyin.
          </p>
        </div>
      </div>

      {/* KPI Stats Cards - 5 Columns */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="card p-4 bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Toplam Proje
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Layers size={14} />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{totalProjects}</p>
          <span className="text-[10px] text-slate-400 font-medium">Kayıtlı Portföy</span>
        </div>

        <div className="card p-4 bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Onaylı Planlar
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Sparkles size={14} />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-700">{finalProjects}</p>
          <span className="text-[10px] text-emerald-600 font-medium">Final Yayınlanan</span>
        </div>

        <div className="card p-4 bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Aktif Projeler
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <TrendingUp size={14} />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-sky-700">{activeProjects}</p>
          <span className="text-[10px] text-sky-600 font-medium">Yürütme Aşamasında</span>
        </div>

        <div className="card p-4 bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Tamamlanan
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <CheckCircle2 size={14} />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-blue-700">{completedProjects}</p>
          <span className="text-[10px] text-blue-600 font-medium">Kapatılan Projeler</span>
        </div>

        <div className="card p-4 bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              İptal Edilenler
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <Ban size={14} />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-rose-600">{cancelledProjects}</p>
          <span className="text-[10px] text-rose-500 font-medium">Durdurulan</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-5 bg-white border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Proje adı, kodu veya yönetici ara..."
            className="input pl-9 text-xs w-full bg-slate-50 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sector Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Building2 size={14} className="text-slate-400" />
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="input py-1.5 px-2.5 text-xs bg-slate-50 focus:bg-white font-medium cursor-pointer"
            >
              <option value="ALL">Tüm Sektörler ({PROJECT_SECTORS.length + 1})</option>
              {PROJECT_SECTORS.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name} {s.is_group_wide ? "(Merkezi Holding)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Manager Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <User size={14} className="text-slate-400" />
            <select
              value={selectedManager}
              onChange={(e) => setSelectedManager(e.target.value)}
              className="input py-1.5 px-2.5 text-xs bg-slate-50 focus:bg-white font-medium cursor-pointer"
            >
              <option value="ALL">Tüm Yöneticiler ({managers.length})</option>
              {managers.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter size={14} className="text-slate-400" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input py-1.5 px-2.5 text-xs bg-slate-50 focus:bg-white font-medium cursor-pointer"
            >
              <option value="ALL">Tüm Durumlar</option>
              <option value="Aktif">Aktif</option>
              <option value="Beklemede">Beklemede</option>
              <option value="Tamamlandı">Tamamlandı</option>
              <option value="İptal Edildi">İptal Edildi</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects List Table */}
      <div className="card overflow-hidden bg-white border border-slate-200/90 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">Yönetici Proje Listesi</h2>
            <span className="rounded-full bg-purple-100 text-purple-700 font-bold px-2 py-0.5 text-xs">
              {filtered.length} Proje
            </span>
          </div>
          <span className="text-xs text-slate-400 font-medium">Göz (👁️) simgesiyle detayları inceleyin</span>
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Arama kriterlerine uygun proje bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-6">Proje Kodu & Adı</th>
                  <th className="py-3.5 px-4">Sektör & Şirket</th>
                  <th className="py-3.5 px-4">Proje Yöneticisi</th>
                  <th className="py-3.5 px-4">Başlangıç Tarihi</th>
                  <th className="py-3.5 px-4">Plan Statüsü</th>
                  <th className="py-3.5 px-4">Durum</th>
                  <th className="py-3.5 px-6 text-right">İncele</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const isCancelled = p.business_status === "İptal Edildi";
                  const companyList = p.companies ? p.companies.split(",").map((c) => c.trim()).filter(Boolean) : [];
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-purple-50/30 transition-colors group"
                    >
                      {/* Project Name & Code */}
                      <td className="py-4 px-6">
                        <div className="space-y-0.5">
                          <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {p.code}
                          </span>
                          <h3 className={`text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors ${isCancelled ? "line-through text-slate-400" : ""}`}>
                            {p.name}
                          </h3>
                        </div>
                      </td>

                      {/* Sector & Companies */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          {p.sector ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                              <Building2 size={11} /> {p.sector}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                          {companyList.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {companyList.map((c, i) => (
                                <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                                  {c}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Manager */}
                      <td className="py-4 px-4 font-semibold text-slate-800">
                        {p.manager || <span className="text-slate-400 font-normal">Belirtilmemiş</span>}
                      </td>

                      {/* Start Date */}
                      <td className="py-4 px-4 font-mono text-slate-600">
                        {p.start_date || <span className="text-slate-400">Tarih Yok</span>}
                      </td>

                      {/* Plan Status */}
                      <td className="py-4 px-4">
                        {p.status === "Final" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={11} /> Final
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                            Taslak
                          </span>
                        )}
                      </td>

                      {/* Business Status */}
                      <td className="py-4 px-4">
                        {p.business_status && <BusinessStatusBadge status={p.business_status} />}
                      </td>

                      {/* Action Button: Eye */}
                      <td className="py-4 px-6 text-right">
                        <Link
                          href={`/projects/${p.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700 shadow-2xs hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all cursor-pointer"
                          title="Projeyi ve Akış Tarihçesini İncele"
                        >
                          <Eye size={14} />
                          <span>İncele</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

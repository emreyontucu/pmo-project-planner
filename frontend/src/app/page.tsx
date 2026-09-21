"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Filter,
  FolderKanban,
  MessageCircleQuestion,
  Plus,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  User,
  Waypoints,
  X,
  Calendar,
  Layers,
  BarChart3,
} from "lucide-react";
import { api } from "@/lib/api";
import { PROJECT_BUSINESS_STATUSES, PROJECT_SECTORS } from "@/lib/constants";
import { useRole } from "@/context/RoleContext";
import type { Project } from "@/lib/types";
import CalendarIllustration from "@/components/CalendarIllustration";
import { BusinessStatusBadge, StatusBadge } from "@/components/StatusBadges";

export default function HomePage() {
  const { setRole } = useRole();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showExcelUploadModal, setShowExcelUploadModal] = useState(false);
  const [selectedExcelFile, setSelectedExcelFile] = useState<File | null>(null);
  const quickFileInputRef = useRef<HTMLInputElement>(null);

  // Search and Filters
  const [search, setSearch] = useState("");
  const [selectedSector, setSelectedSector] = useState("ALL");
  const [selectedCompany, setSelectedCompany] = useState("ALL");

  async function refresh() {
    setLoading(true);
    try {
      setProjects(await api.listProjects());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Explicitly ensure planner mode on main planning page
    setRole("planner");
    refresh();
  }, [setRole]);

  async function handleCancelProject(id: number, name: string) {
    if (!confirm(`'${name}' projesini iptal etmek istediğinize emin misiniz?`)) return;
    setError(null);
    try {
      await api.cancelProject(id);
      setNotice(`'${name}' projesi iptal edildi.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Proje iptal edilemedi");
    }
    await refresh();
  }

  async function handleDelete(id: number) {
    if (!confirm("Bu projeyi ve tüm görevlerini kalıcı olarak silmek istediğinize emin misiniz?")) return;
    setError(null);
    try {
      await api.deleteProject(id);
      setNotice("Proje silindi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Proje silinemedi");
    }
    await refresh();
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedExcelFile(file);
    setShowExcelUploadModal(true);
    if (quickFileInputRef.current) quickFileInputRef.current.value = "";
  }

  // Active companies options based on selected sector filter
  const availableFilterCompanies = useMemo(() => {
    if (selectedSector === "ALL") {
      const set = new Set<string>();
      PROJECT_SECTORS.forEach((s) => s.companies.forEach((c) => set.add(c)));
      return Array.from(set);
    }
    const sec = PROJECT_SECTORS.find((s) => s.name === selectedSector);
    return sec ? sec.companies : [];
  }, [selectedSector]);

  // Filtered Projects
  const filteredProjects = useMemo(() => {
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
      const matchCompany = selectedCompany === "ALL" || (p.companies && p.companies.includes(selectedCompany));

      return matchSearch && matchSector && matchCompany;
    });
  }, [projects, search, selectedSector, selectedCompany]);

  const finalCount = projects.filter((p) => p.status === "Final").length;
  const activeCount = projects.filter((p) => p.business_status !== "İptal Edildi").length;

  return (
    <div className="space-y-8">
      {/* Premium Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-8 text-white shadow-xl shadow-indigo-950/10 border border-slate-800">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-violet-600/10 blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl space-y-3.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-indigo-200 border border-white/15 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
              PMO Akıllı Yönetim Platformu
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Proje Planlama ve <span className="bg-gradient-to-r from-indigo-300 via-indigo-200 to-violet-300 bg-clip-text text-transparent">Zamanlama</span> Portalı
            </h1>
            <p className="text-sm sm:text-[0.92rem] leading-relaxed text-slate-300 font-light">
              S1-S5 İş Kırılım Yapısı (WBS), kilitli takvim baseline&apos;ı, sektör ve çoklu şirket yönetimi ile kurumsal planlama sistemi.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
            <a
              href="/Gorev_Takip_Sablonu.xlsx"
              download
              className="btn bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md text-xs font-semibold py-2.5 px-4 shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Download size={15} className="text-emerald-400" />
              Boş Excel Şablonunu İndir (.xlsx)
            </a>

            <label className="btn bg-emerald-600 hover:bg-emerald-500 text-white border-0 text-xs font-semibold py-2.5 px-4 shadow-md shadow-emerald-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer">
              <Upload size={15} />
              Excel Dosyası ile Proje Yükle
              <input
                ref={quickFileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileSelected}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Dashboard Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="card relative overflow-hidden p-6 hover:shadow-md transition-all duration-300 group hover:-translate-y-0.5">
          <div className="absolute right-0 top-0 h-16 w-16 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-bl-full" />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-[var(--muted)]">Aktif Projeler</span>
              <div className="text-2xl font-bold text-slate-900">
                {loading ? "..." : activeCount}
              </div>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform duration-300">
              <Layers size={20} />
            </span>
          </div>
        </div>

        <div className="card relative overflow-hidden p-6 hover:shadow-md transition-all duration-300 group hover:-translate-y-0.5">
          <div className="absolute right-0 top-0 h-16 w-16 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-bl-full" />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-[var(--muted)]">Onaylı Planlar</span>
              <div className="text-2xl font-bold text-slate-900">
                {loading ? "..." : finalCount}
              </div>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform duration-300">
              <BarChart3 size={20} />
            </span>
          </div>
        </div>

        <div 
          onClick={() => setShowNewForm(true)}
          className="card relative overflow-hidden p-6 bg-gradient-to-br from-indigo-50/50 to-violet-50/30 border-indigo-100 hover:border-indigo-200 cursor-pointer hover:shadow-md transition-all duration-300 group hover:-translate-y-0.5"
        >
          <div className="absolute right-0 top-0 h-16 w-16 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-bl-full" />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-indigo-700">Hızlı İşlem</span>
              <div className="text-sm font-bold text-slate-800 flex items-center gap-1 group-hover:text-indigo-900 transition-colors">
                <Plus size={16} /> Yeni Manuel Proje Ekle
              </div>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-300 group-hover:scale-110 transition-transform duration-300">
              <TrendingUp size={18} />
            </span>
          </div>
        </div>
      </div>

      {/* Notice / Error banners */}
      {notice && (
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <Sparkles size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">{notice}</span>
          <button onClick={() => setNotice(null)} className="shrink-0 text-emerald-500 hover:text-emerald-800">
            <X size={15} />
          </button>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="shrink-0 text-red-400 hover:text-red-700">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Projects Section with Search & Sector Filter */}
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Projeleriniz</h2>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Kayıtlı projelerinizin listesi, sektör dağılımları ve planlama durumları
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-primary" onClick={() => setShowNewForm((v) => !v)}>
              {showNewForm ? <X size={16} /> : <Plus size={16} />}
              {showNewForm ? "Vazgeç" : "Yeni Proje Ekle"}
            </button>
          </div>
        </div>

        {/* Search & Sector/Company Filter Bar */}
        <div className="card p-4 bg-white border border-slate-200/90 shadow-2xs space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Proje adı, kodu veya yönetici ara..."
                className="input pl-10 text-xs w-full"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Sector Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 shrink-0 flex items-center gap-1">
                <Building2 size={14} /> Sektör:
              </span>
              <select
                value={selectedSector}
                onChange={(e) => {
                  setSelectedSector(e.target.value);
                  setSelectedCompany("ALL");
                }}
                className="input text-xs w-full"
              >
                <option value="ALL">Tüm Sektörler ({projects.length})</option>
                {PROJECT_SECTORS.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} {s.is_group_wide ? "(Merkezi Holding)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Company Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 shrink-0 flex items-center gap-1">
                <Filter size={14} /> Şirket:
              </span>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="input text-xs w-full"
              >
                <option value="ALL">Tüm Şirketler</option>
                {availableFilterCompanies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {showNewForm && (
          <NewProjectForm
            onCreated={(newProj) => {
              setShowNewForm(false);
              setNotice(`'${newProj.name}' projesi başarıyla oluşturuldu.`);
              // Reset search and filters so newly created project is visible right away
              setSearch("");
              setSelectedSector("ALL");
              setSelectedCompany("ALL");
              // Update state immediately and trigger fresh fetch
              setProjects((prev) => [newProj, ...prev.filter((p) => p.id !== newProj.id)]);
              refresh();
            }}
            onError={setError}
          />
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[0, 1].map((i) => (
              <div key={i} className="card h-32 animate-pulse bg-white p-6" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="card relative flex flex-col items-center gap-5 overflow-hidden px-6 py-14 text-center">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.08),transparent_60%)]" />
            <CalendarIllustration className="relative h-32 w-32" />
            <div className="relative space-y-1.5">
              <h3 className="text-sm font-semibold text-slate-900">
                {search || selectedSector !== "ALL" || selectedCompany !== "ALL"
                  ? "Arama kriterlerine uygun proje bulunamadı"
                  : "Henüz kayıtlı bir projeniz yok"}
              </h3>
              <p className="max-w-sm text-xs text-[var(--muted)]">
                {search || selectedSector !== "ALL" || selectedCompany !== "ALL"
                  ? "Filtreleri temizleyerek veya arama terimini değiştirerek tekrar deneyebilirsiniz."
                  : "Yukarıdaki 'Excel Dosyası ile Proje Yükle' butonunu kullanarak veya yeni manuel proje açabilirsiniz."}
              </p>
            </div>
            {search || selectedSector !== "ALL" || selectedCompany !== "ALL" ? (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSearch("");
                  setSelectedSector("ALL");
                  setSelectedCompany("ALL");
                }}
              >
                Filtreleri Temizle
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button className="btn btn-primary btn-sm" onClick={() => setShowNewForm(true)}>
                  <Plus size={16} />
                  Yeni Proje Oluştur
                </button>
                <a href="/Gorev_Takip_Sablonu.xlsx" download className="btn btn-secondary btn-sm">
                  <Download size={15} />
                  Boş Şablon İndir
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredProjects.map((p) => {
              const isCancelled = p.business_status === "İptal Edildi";
              const borderColors = isCancelled
                ? "bg-red-500"
                : p.status === "Final"
                ? "bg-emerald-500"
                : "bg-indigo-500";

              const companyList = p.companies ? p.companies.split(",").map((c) => c.trim()).filter(Boolean) : [];

              return (
                <div 
                  key={p.id} 
                  className={`group relative bg-white border border-slate-200/80 rounded-xl p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[160px] ${
                    isCancelled ? "opacity-80" : ""
                  }`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${borderColors}`} />
                  
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-3 pl-2">
                      <Link href={`/projects/${p.id}`} className="min-w-0 block hover:underline">
                        <h3 className={`font-bold text-[1.05rem] text-slate-900 truncate ${isCancelled ? "line-through text-slate-500" : ""}`}>
                          {p.name}
                        </h3>
                      </Link>
                      <div className="flex gap-1.5 shrink-0">
                        <StatusBadge status={p.status} />
                        {p.business_status && <BusinessStatusBadge status={p.business_status} />}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pl-2">
                      <span className="font-mono text-xs px-2 py-0.5 bg-slate-50 text-slate-600 rounded-md border border-slate-200/50 font-semibold">
                        {p.code}
                      </span>
                      {p.sector && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                          <Building2 size={11} /> {p.sector}
                        </span>
                      )}
                    </div>

                    {companyList.length > 0 && (
                      <div className="flex flex-wrap gap-1 pl-2 pt-0.5">
                        {companyList.map((comp, idx) => (
                          <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200/60 font-medium">
                            {comp}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between pl-2">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      {p.manager && (
                        <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                          <User size={13} className="text-slate-400" />
                          {p.manager}
                        </span>
                      )}
                      {p.start_date && (
                        <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                          <Calendar size={13} className="text-slate-400" />
                          {p.start_date}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Link 
                        href={`/projects/${p.id}`} 
                        className="btn btn-ghost btn-sm text-[var(--accent)] font-semibold p-1 hover:bg-[var(--accent-soft)] rounded-md"
                      >
                        Detay
                        <ChevronRight size={14} />
                      </Link>

                      {!isCancelled && (
                        <button
                          onClick={() => handleCancelProject(p.id, p.name)}
                          className="btn btn-ghost btn-sm text-amber-600 hover:bg-amber-50 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                          title="Projeyi İptal Et"
                        >
                          <span className="text-xs font-semibold px-1">İptal</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(p.id)}
                        className="btn btn-ghost btn-sm text-slate-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                        title="Projeyi Kalıcı Olarak Sil"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Excel Upload Modal */}
      {showExcelUploadModal && selectedExcelFile && (
        <ExcelNewProjectModal
          file={selectedExcelFile}
          onClose={() => {
            setShowExcelUploadModal(false);
            setSelectedExcelFile(null);
          }}
          onSuccess={(proj) => {
            setShowExcelUploadModal(false);
            setSelectedExcelFile(null);
            setNotice(`'${proj.name}' projesi Excel dosyasından başarıyla oluşturuldu.`);
            setSearch("");
            setSelectedSector("ALL");
            setSelectedCompany("ALL");
            setProjects((prev) => [proj, ...prev.filter((p) => p.id !== proj.id)]);
            refresh();
          }}
          onError={setError}
        />
      )}

      {/* Platform Features Section */}
      <div className="pt-8 border-t border-slate-200/80 space-y-5">
        <div>
          <h3 className="text-xs font-extrabold tracking-wider text-slate-400 uppercase">Platform Özellikleri</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">Akıllı planlama sisteminin sunduğu temel araçlar ve modüller</p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<Layers size={18} />}
            tone="text-indigo-600 bg-indigo-50"
            title="S1-S5 WBS İş Kırılımı"
            text="Tüm görevlerinizi ve fazlarınızı tek bir büyük hiyerarşik iş kırılım paneli altında yönetin."
          />
          <FeatureCard
            icon={<Waypoints size={18} />}
            tone="text-violet-600 bg-violet-50"
            title="Bağımlılık Motoru"
            text="Görevleri birbirine bağlayın, tarihler çalışma takvimine göre zincirleme otomatik hesaplansın."
          />
          <FeatureCard
            icon={<Building2 size={18} />}
            tone="text-amber-600 bg-amber-50"
            title="Sektör & Çoklu Şirket"
            text="Vestel, Enerji, Maden, Tekstil ve Holding merkezi projelerini şirket bazında yönetin."
          />
          <FeatureCard
            icon={<FileSpreadsheet size={18} />}
            tone="text-emerald-600 bg-emerald-50"
            title="Excel İçe & Dışa Aktar"
            text="Excel şablonundan görevleri yükleyin veya tüm WBS yapısını Excel olarak indirin."
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  tone,
  title,
  text,
}: {
  icon: React.ReactNode;
  tone: string;
  title: string;
  text: string;
}) {
  return (
    <div className="card p-5">
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>{icon}</span>
      <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{text}</p>
    </div>
  );
}

function NewProjectForm({ onCreated, onError }: { onCreated: (newProj: Project) => void; onError: (msg: string) => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [manager, setManager] = useState("");
  const [startDate, setStartDate] = useState("");
  const [businessStatus, setBusinessStatus] = useState("Aktif");
  const [sector, setSector] = useState("Vestel");
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Available companies for selected sector
  const currentSectorObj = PROJECT_SECTORS.find((s) => s.name === sector);
  const availableCompanies = currentSectorObj ? currentSectorObj.companies : [];

  function handleCompanyToggle(companyName: string) {
    setSelectedCompanies((prev) =>
      prev.includes(companyName) ? prev.filter((c) => c !== companyName) : [...prev, companyName]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await api.createProject({
        code,
        name,
        manager: manager || undefined,
        start_date: startDate || undefined,
        business_status: businessStatus || undefined,
        sector: sector || undefined,
        companies: selectedCompanies.length > 0 ? selectedCompanies.join(", ") : undefined,
        description: description || undefined,
      });
      onCreated(created);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Proje oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-6 bg-white border border-slate-200 shadow-sm">
      <h2 className="text-sm font-bold text-slate-900">Yeni Manuel Proje Oluştur</h2>
      
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">Proje Kodu *</span>
          <input required value={code} onChange={(e) => setCode(e.target.value)} className="input" placeholder="Örn: PRJ-001" />
        </label>
        <label className="block">
          <span className="field-label">Proje Adı *</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Örn: Müşteri Analitik Portalı" />
        </label>
        <label className="block">
          <span className="field-label">Proje Yöneticisi</span>
          <input value={manager} onChange={(e) => setManager(e.target.value)} className="input" placeholder="Yönetici Adı Soyadı" />
        </label>
        <label className="block">
          <span className="field-label">Başlangıç Tarihi (Opsiyonel)</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="field-label">Proje Durumu</span>
          <select value={businessStatus} onChange={(e) => setBusinessStatus(e.target.value)} className="input">
            {PROJECT_BUSINESS_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        {/* Sektör Seçimi */}
        <label className="block">
          <span className="field-label">Sektör *</span>
          <select
            value={sector}
            onChange={(e) => {
              setSector(e.target.value);
              setSelectedCompanies([]);
            }}
            className="input"
          >
            {PROJECT_SECTORS.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name} {s.is_group_wide ? "(Merkezi Holding - Tüm Sektörler)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Çoklu Şirket Seçimi */}
      <div className="space-y-2 rounded-xl bg-slate-50 p-4 border border-slate-200/70">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Building2 size={14} className="text-indigo-600" />
            Bağlı Şirketler (Birden fazla seçebilirsiniz):
          </span>
          {currentSectorObj?.is_group_wide && (
            <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-medium">
              Holding projeleri merkezi projelerdir (Zorlu Akademi, EBA vb.)
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
          {availableCompanies.map((comp) => {
            const isChecked = selectedCompanies.includes(comp);
            return (
              <label
                key={comp}
                className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                  isChecked
                    ? "bg-indigo-50/80 border-indigo-300 text-indigo-950 font-semibold"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleCompanyToggle(comp)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>{comp}</span>
              </label>
            );
          })}
        </div>
      </div>

      <label className="block">
        <span className="field-label">Proje Açıklaması (Opsiyonel)</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input" rows={2} placeholder="Proje hedefleri ve genel kapsamı..." />
      </label>

      <button type="submit" disabled={submitting} className="btn btn-primary">
        <Plus size={16} />
        {submitting ? "Oluşturuluyor..." : "Projeyi Kaydet"}
      </button>
    </form>
  );
}

function ExcelNewProjectModal({
  file,
  onClose,
  onSuccess,
  onError,
}: {
  file: File;
  onClose: () => void;
  onSuccess: (proj: Project) => void;
  onError: (msg: string) => void;
}) {
  const defaultName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
  const [name, setName] = useState(defaultName);
  const [code, setCode] = useState("");
  const [manager, setManager] = useState("");
  const [startDate, setStartDate] = useState("");
  const [sector, setSector] = useState("Vestel");
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const currentSectorObj = PROJECT_SECTORS.find((s) => s.name === sector);
  const availableCompanies = currentSectorObj ? currentSectorObj.companies : [];

  function handleCompanyToggle(companyName: string) {
    setSelectedCompanies((prev) =>
      prev.includes(companyName) ? prev.filter((c) => c !== companyName) : [...prev, companyName]
    );
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.importNewProjectFromExcel(file, {
        code: code || undefined,
        name: name || undefined,
        manager: manager || undefined,
        start_date: startDate || undefined,
        sector: sector || undefined,
        companies: selectedCompanies.length > 0 ? selectedCompanies.join(", ") : undefined,
        description: description || undefined,
      });
      onSuccess(res.project);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Excel ile proje oluşturulamadı");
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="card w-full max-w-xl bg-white p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <FileSpreadsheet size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">Excel ile Yeni Proje Oluştur</h3>
              <p className="text-xs text-slate-500 font-mono truncate max-w-xs">{file.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Proje Kodu (Otomatik Boş Bırakılabilir)</span>
              <input value={code} onChange={(e) => setCode(e.target.value)} className="input text-xs" placeholder="Örn: PRJ-001" />
            </label>
            <label className="block">
              <span className="field-label">Proje Adı *</span>
              <input required value={name} onChange={(e) => setName(e.target.value)} className="input text-xs" />
            </label>
            <label className="block">
              <span className="field-label">Proje Yöneticisi</span>
              <input value={manager} onChange={(e) => setManager(e.target.value)} className="input text-xs" placeholder="Ad Soyad" />
            </label>
            <label className="block">
              <span className="field-label">Başlangıç Tarihi</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input text-xs" />
            </label>
            <label className="block sm:col-span-2">
              <span className="field-label">Sektör *</span>
              <select
                value={sector}
                onChange={(e) => {
                  setSector(e.target.value);
                  setSelectedCompanies([]);
                }}
                className="input text-xs"
              >
                {PROJECT_SECTORS.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} {s.is_group_wide ? "(Merkezi Holding - Tüm Sektörler)" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Çoklu Şirket Seçimi */}
          <div className="space-y-2 rounded-xl bg-slate-50 p-3 border border-slate-200/70">
            <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
              <Building2 size={13} className="text-indigo-600" />
              Bağlı Şirketler:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableCompanies.map((comp) => {
                const isChecked = selectedCompanies.includes(comp);
                return (
                  <label
                    key={comp}
                    className={`flex items-center gap-2 p-1.5 rounded-lg border text-[11px] cursor-pointer transition-all ${
                      isChecked
                        ? "bg-indigo-50/80 border-indigo-300 text-indigo-950 font-semibold"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleCompanyToggle(comp)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                    />
                    <span>{comp}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="field-label">Açıklama (Opsiyonel)</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input text-xs" rows={2} placeholder="Proje notları..." />
          </label>

          <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 p-3 text-[11px] text-emerald-900 leading-relaxed">
            💡 Excel dosyanızdaki tüm görevler ve tarihler okunup proje oluşturulduktan sonra doğrudan sisteme aktarılacaktır.
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} disabled={submitting} className="btn btn-secondary text-xs">
              Vazgeç
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-xs">
              {submitting ? "Yükleniyor..." : "Projeyi ve Görevleri Yükle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  ChevronRight,
  FileSpreadsheet,
  FolderKanban,
  MessageCircleQuestion,
  Plus,
  Trash2,
  Waypoints,
  X,
  User,
  Calendar,
  Layers,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api";
import { PROJECT_BUSINESS_STATUSES } from "@/lib/constants";
import type { Project } from "@/lib/types";
import CalendarIllustration from "@/components/CalendarIllustration";
import { BusinessStatusBadge, StatusBadge } from "@/components/StatusBadges";

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

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
    // fetch-on-mount: setLoading/setProjects land inside the async call, standard pattern
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);

  async function handleDelete(id: number) {
    if (!confirm("Bu proje silinsin mi?")) return;
    setError(null);
    try {
      await api.deleteProject(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Proje silinemedi");
    }
    await refresh(); // always re-sync with the server, even on failure (e.g. already deleted elsewhere)
  }

  const finalCount = projects.filter((p) => p.status === "Final").length;

  return (
    <div className="space-y-10">
      {/* Premium Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-8 text-white shadow-xl shadow-indigo-950/10 border border-slate-800">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-violet-600/10 blur-3xl" />
        
        <div className="relative max-w-3xl space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-indigo-200 border border-white/15 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
            PMO Akıllı Yönetim Platformu
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Proje Planlama ve <span className="bg-gradient-to-r from-indigo-300 via-indigo-200 to-violet-300 bg-clip-text text-transparent">Zamanlama</span> Portalı
          </h1>
          <p className="text-sm sm:text-[0.95rem] leading-relaxed text-slate-300 max-w-2xl font-light">
            Excel şablonlarınızla tam entegre çalışan, görev bağımlılıklarını otomatik olarak çözümleyen ve resmi tatil/haftasonu takvim verilerini göz önünde bulunduran gelişmiş planlama paneli.
          </p>
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
                {loading ? "..." : projects.length}
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
                <Plus size={16} /> Yeni Proje Ekle
              </div>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-300 group-hover:scale-110 transition-transform duration-300">
              <TrendingUp size={18} />
            </span>
          </div>
        </div>
      </div>

      {/* Projects Section */}
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Projeleriniz</h2>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Kayıtlı projelerinizin listesi ve mevcut planlama aşamaları
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNewForm((v) => !v)}>
            {showNewForm ? <X size={16} /> : <Plus size={16} />}
            {showNewForm ? "Vazgeç" : "Yeni Proje"}
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="shrink-0 text-red-400 hover:text-red-700">
              <X size={15} />
            </button>
          </div>
        )}

        {showNewForm && <NewProjectForm onCreated={() => { setShowNewForm(false); refresh(); }} onError={setError} />}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[0, 1].map((i) => (
              <div key={i} className="card h-32 animate-pulse bg-white p-6" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="card relative flex flex-col items-center gap-5 overflow-hidden px-6 py-14 text-center">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.08),transparent_60%)]" />
            <CalendarIllustration className="relative h-32 w-32" />
            <div className="relative space-y-1.5">
              <h3 className="text-sm font-semibold text-slate-900">Henüz kayıtlı bir projeniz yok</h3>
              <p className="max-w-sm text-xs text-[var(--muted)]">
                İlk projenizi oluşturarak başlayın — Görev Takip Excel&apos;inizi daha sonra proje detayı sayfasından yükleyebilirsiniz.
              </p>
            </div>
            <button className="btn btn-primary relative btn-sm" onClick={() => setShowNewForm(true)}>
              <Plus size={16} />
              Yeni Proje Oluştur
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {projects.map((p) => {
              const borderColors = p.status === "Final" ? "bg-emerald-500" : "bg-indigo-500";
              return (
                <div 
                  key={p.id} 
                  className="group relative bg-white border border-slate-200/80 rounded-xl p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[140px]"
                >
                  {/* Status Indicator Left Stripe */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${borderColors}`} />
                  
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-3 pl-2">
                      <Link href={`/projects/${p.id}`} className="min-w-0 block hover:underline">
                        <h3 className="font-bold text-[1.05rem] text-slate-900 truncate">
                          {p.name}
                        </h3>
                      </Link>
                      <div className="flex gap-1.5 shrink-0">
                        <StatusBadge status={p.status} />
                        {p.business_status && <BusinessStatusBadge status={p.business_status} />}
                      </div>
                    </div>

                    <div className="pl-2">
                      <span className="font-mono text-xs px-2 py-0.5 bg-slate-50 text-slate-600 rounded-md border border-slate-200/50">
                        {p.code}
                      </span>
                    </div>
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

                    <div className="flex items-center gap-2">
                      <Link 
                        href={`/projects/${p.id}`} 
                        className="btn btn-ghost btn-sm text-[var(--accent)] font-semibold p-1 hover:bg-[var(--accent-soft)] rounded-md"
                      >
                        Detay
                        <ChevronRight size={14} />
                      </Link>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="btn btn-ghost btn-sm text-red-500 hover:bg-red-50 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        title="Projeyi sil"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Platform Features Section */}
      <div className="pt-8 border-t border-slate-200/80 space-y-5">
        <div>
          <h3 className="text-xs font-extrabold tracking-wider text-slate-400 uppercase">Platform Özellikleri</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">Akıllı planlama sisteminin sunduğu temel araçlar ve modüller</p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<FileSpreadsheet size={18} />}
            tone="text-indigo-600 bg-indigo-50"
            title="Görev Takip Excel'i"
            text="Projeyi oluşturduktan sonra, detay sayfasından Görev Takip şablonunu yükle."
          />
          <FeatureCard
            icon={<Waypoints size={18} />}
            tone="text-violet-600 bg-violet-50"
            title="Bağımlılık Motoru"
            text="Görevleri birbirine bağla, tarihler zincirleme otomatik hesaplansın."
          />
          <FeatureCard
            icon={<CalendarClock size={18} />}
            tone="text-emerald-600 bg-emerald-50"
            title="Akıllı Takvim"
            text="Resmi tatil, hafta sonu ve köprü günleri otomatik hesaba katılır."
          />
          <FeatureCard
            icon={<MessageCircleQuestion size={18} />}
            tone="text-sky-600 bg-sky-50"
            title="Eksik Bilgi Asistanı"
            text="Excel'de olmayan bilgileri kısa sorularla senden tamamlar."
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

function NewProjectForm({ onCreated, onError }: { onCreated: () => void; onError: (msg: string) => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [manager, setManager] = useState("");
  const [startDate, setStartDate] = useState("");
  const [businessStatus, setBusinessStatus] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createProject({
        code,
        name,
        manager: manager || undefined,
        start_date: startDate || undefined,
        business_status: businessStatus || undefined,
        description: description || undefined,
      });
      onCreated();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Proje oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-6">
      <h2 className="text-sm font-semibold text-slate-900">Yeni Proje</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">Proje Kodu</span>
          <input required value={code} onChange={(e) => setCode(e.target.value)} className="input" placeholder="PRJ-001" />
        </label>
        <label className="block">
          <span className="field-label">Proje Adı</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="field-label">Proje Yöneticisi</span>
          <input value={manager} onChange={(e) => setManager(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="field-label">Başlangıç Tarihi</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="field-label">Proje Durumu</span>
          <select value={businessStatus} onChange={(e) => setBusinessStatus(e.target.value)} className="input">
            <option value="">Seç...</option>
            {PROJECT_BUSINESS_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="field-label">Açıklama</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input" rows={2} />
      </label>
      <button type="submit" disabled={submitting} className="btn btn-primary">
        <Plus size={16} />
        {submitting ? "Oluşturuluyor..." : "Projeyi Oluştur"}
      </button>
    </form>
  );
}

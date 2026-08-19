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
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[1.65rem] font-semibold tracking-tight text-slate-900">Projeler</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {loading ? "Yükleniyor…" : `${projects.length} proje · ${finalCount} final`}
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
        <div className="card flex flex-col gap-3 p-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <>
          <div className="card relative flex flex-col items-center gap-5 overflow-hidden px-6 py-14 text-center">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.08),transparent_60%)]" />
            <CalendarIllustration className="relative h-40 w-40" />
            <div className="relative space-y-1.5">
              <h2 className="text-base font-semibold text-slate-900">Henüz bir projen yok</h2>
              <p className="max-w-sm text-sm text-[var(--muted)]">
                Yeni bir proje oluştur — Görev Takip Excel&apos;ini o projenin içine daha sonra yükleyebilirsin.
              </p>
            </div>
            <button className="btn btn-primary relative" onClick={() => setShowNewForm(true)}>
              <Plus size={16} />
              Yeni Proje
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        </>
      ) : (
        <div className="card divide-y divide-[var(--border)] overflow-hidden">
          {projects.map((p) => (
            <div key={p.id} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/80">
              <Link href={`/projects/${p.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                  <FolderKanban size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium text-slate-900">{p.name}</span>
                    <StatusBadge status={p.status} />
                    {p.business_status && <BusinessStatusBadge status={p.business_status} />}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--muted)]">
                    <span className="font-mono">{p.code}</span>
                    {p.manager && <span>· {p.manager}</span>}
                    {p.start_date && <span>· {p.start_date}</span>}
                  </span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-400" />
              </Link>
              <button
                onClick={() => handleDelete(p.id)}
                className="btn btn-ghost btn-sm shrink-0 opacity-0 group-hover:opacity-100"
                title="Projeyi sil"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
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

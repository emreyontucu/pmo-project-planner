"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  Sparkles,
  X,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { BusinessStatusBadge } from "@/components/StatusBadges";
import type { PendingQuestion, ProjectDetail } from "@/lib/types";
import TasksSection from "./TasksSection";
import DependenciesSection from "./DependenciesSection";
import QuestionsSection from "./QuestionsSection";
import CalendarView from "./CalendarView";

export default function ProjectDetailClient({ projectId }: { projectId: number }) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [questions, setQuestions] = useState<PendingQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [missingDateTaskIds, setMissingDateTaskIds] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [p, q] = await Promise.all([api.getProject(projectId), api.getQuestions(projectId)]);
      setProject(p);
      setQuestions(q);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Proje yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    // fetch-on-mount: setLoading/setProject land inside the async call, standard pattern
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  async function handleSchedule() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.scheduleProject(projectId);
      setNotice("Tarihler yeniden hesaplandı.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tarihler hesaplanamadı");
    } finally {
      setBusy(false);
    }
  }

  async function handleFinalize() {
    setBusy(true);
    setError(null);
    setNotice(null);
    setMissingDateTaskIds(new Set());
    try {
      await api.finalizeProject(projectId);
      setNotice("Plan Final olarak yayınlandı.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Plan finalize edilemedi");
      if (err instanceof ApiError && err.missingDatesTaskIds) {
        setMissingDateTaskIds(new Set(err.missingDatesTaskIds));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleReimport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      try {
        const result = await api.reimportExcel(projectId, file, false);
        setNotice(result.warnings.length > 0 ? result.warnings.join(" | ") : "Görevler güncellendi.");
      } catch (err) {
        const isConflict = err instanceof Error && err.message.includes("daha önce görev verisi yüklenmiştir");
        if (isConflict && confirm("Bu plan için daha önce görev verisi yüklenmiş. Üzerine yazılsın mı?")) {
          const result = await api.reimportExcel(projectId, file, true);
          setNotice(result.warnings.length > 0 ? result.warnings.join(" | ") : "Görevler üzerine yazıldı.");
        } else if (!isConflict) {
          throw err;
        }
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Excel içe aktarılamadı");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (loading && !project) {
    return (
      <div className="card space-y-3 p-6">
        <div className="h-6 w-1/3 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-4 w-1/2 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }
  if (!project) {
    return (
      <div className="card flex items-center gap-2.5 p-6 text-sm text-red-700">
        <AlertTriangle size={16} />
        {error ?? "Proje bulunamadı."}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--accent)]">
        <ArrowLeft size={14} />
        Projeler
      </Link>

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">{project.name}</h1>
              {project.status === "Final" ? (
                <span className="badge bg-emerald-100 text-emerald-700">
                  <CheckCircle2 size={12} /> Final
                </span>
              ) : (
                <span className="badge bg-slate-100 text-slate-600">Taslak</span>
              )}
              {project.business_status && <BusinessStatusBadge status={project.business_status} />}
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              <span className="font-mono">{project.code}</span>
              {project.manager && <> · Yönetici: {project.manager}</>}
              {project.start_date && <> · Başlangıç: {project.start_date}</>}
            </p>
            {project.description && <p className="mt-2.5 max-w-2xl text-sm text-slate-600">{project.description}</p>}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border)] pt-5">
          <button onClick={handleSchedule} disabled={busy} className="btn btn-secondary">
            <Calendar size={16} />
            Tarihleri Hesapla
          </button>
          <button onClick={handleFinalize} disabled={busy || project.status === "Final"} className="btn btn-success">
            <CheckCircle2 size={16} />
            {project.status === "Final" ? "Final Yayınlandı" : "Final Olarak Yayınla"}
          </button>
          <label className="btn btn-secondary cursor-pointer">
            <FileSpreadsheet size={16} />
            Excel&apos;i Yeniden Yükle
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" disabled={busy} onChange={handleReimport} />
          </label>
        </div>
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
      {notice && (
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <Sparkles size={16} className="mt-0.5 shrink-0" />
          {notice}
        </div>
      )}

      <QuestionsSection projectId={projectId} questions={questions} onAnswered={refresh} onError={setError} />

      <TasksSection
        projectId={projectId}
        tasks={project.tasks}
        onChange={refresh}
        onError={setError}
        missingDateTaskIds={missingDateTaskIds}
      />

      <DependenciesSection
        projectId={projectId}
        tasks={project.tasks}
        dependencies={project.dependencies}
        onChange={refresh}
        onError={setError}
      />

      <CalendarView tasks={project.tasks} initialDate={project.start_date} />
    </div>
  );
}

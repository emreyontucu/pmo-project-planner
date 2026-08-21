"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  Sparkles,
  X,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { BusinessStatusBadge } from "@/components/StatusBadges";
import type { PendingQuestion, ProjectDetail, Task } from "@/lib/types";
import TasksSection from "./TasksSection";
import DependenciesSection from "./DependenciesSection";
import QuestionsSection from "./QuestionsSection";
import CalendarView from "./CalendarView";

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const getPhaseNum = (phase: string | null) => {
      if (!phase) return 99;
      const match = phase.match(/^[sS]([1-5])/);
      return match ? parseInt(match[1], 10) : 99;
    };
    const phaseA = getPhaseNum(a.phase);
    const phaseB = getPhaseNum(b.phase);
    if (phaseA !== phaseB) {
      return phaseA - phaseB;
    }
    return a.id - b.id;
  });
}

export default function ProjectDetailClient({ projectId }: { projectId: number }) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [questions, setQuestions] = useState<PendingQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [missingDateTaskIds, setMissingDateTaskIds] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [showTemplateGuide, setShowTemplateGuide] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [p, q] = await Promise.all([api.getProject(projectId), api.getQuestions(projectId)]);
      if (p && p.tasks) {
        p.tasks = sortTasks(p.tasks);
      }
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
    setWarnings([]);
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
    setWarnings([]);
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
    setWarnings([]);
    try {
      try {
        const result = await api.reimportExcel(projectId, file, false);
        if (result.warnings.length > 0) {
          setWarnings(result.warnings);
        } else {
          setNotice("Görevler güncellendi.");
        }
      } catch (err) {
        const isConflict = err instanceof Error && err.message.includes("daha önce görev verisi yüklenmiştir");
        if (isConflict && confirm("Bu plan için daha önce görev verisi yüklenmiş. Üzerine yazılsın mı?")) {
          const result = await api.reimportExcel(projectId, file, true);
          if (result.warnings.length > 0) {
            setWarnings(result.warnings);
          } else {
            setNotice("Görevler üzerine yazıldı.");
          }
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
          <a href="/Gorev_Takip_Sablonu.xlsx" download className="btn btn-secondary">
            <FileSpreadsheet size={16} />
            Boş Şablonu İndir
          </a>
        </div>
      </div>

      {/* Excel Şablon Kılavuzu Accordion */}
      <div className="card overflow-hidden">
        <button
          onClick={() => setShowTemplateGuide((v) => !v)}
          className="flex w-full items-center justify-between bg-slate-50/80 px-6 py-4 text-left transition-colors hover:bg-slate-50 cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <FileSpreadsheet size={15} />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Excel Şablon Kullanım Kılavuzu</h3>
              <p className="text-xs text-slate-500">Sistem uyumlu kolonlar, öncelikler ve tarih doğrulama kuralları</p>
            </div>
          </div>
          <span className={`text-slate-400 transition-transform duration-200 ${showTemplateGuide ? "rotate-180" : ""}`}>
            <ChevronDown size={18} />
          </span>
        </button>

        {showTemplateGuide && (
          <div className="border-t border-[var(--border)] bg-white p-6 text-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Kolon Kuralları */}
              <div className="space-y-2.5">
                <h4 className="font-semibold text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" /> Kolon Tanımları
                </h4>
                <ul className="space-y-2 text-xs text-slate-600 list-disc pl-4">
                  <li><strong>Proje Aşaması:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-mono">S1</code> ile <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-mono">S5</code> arası bir aşama yazılmalıdır (örn: <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-mono">S1</code> yazıldığında ismi otomatik eklenir).</li>
                  <li><strong>Görev Adı:</strong> Görevinizin kısa başlığı (boş bırakılamaz).</li>
                  <li><strong>Sorumlu:</strong> Görevi yürüten kişi veya departman ismi.</li>
                  <li><strong>Not:</strong> Göreve ait açıklama (boş bırakılırsa chatbot üzerinden sorulacaktır).</li>
                </ul>
              </div>

              {/* Seçenek Listeleri ve Kurallar */}
              <div className="space-y-2.5">
                <h4 className="font-semibold text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" /> Kabul Edilen Seçenekler
                </h4>
                <ul className="space-y-2 text-xs text-slate-600 list-disc pl-4">
                  <li><strong>Öncelik:</strong> Sadece <code className="bg-slate-50 border border-slate-200 px-1 py-0.5 rounded">Kritik</code>, <code className="bg-slate-50 border border-slate-200 px-1 py-0.5 rounded">Yüksek</code>, <code className="bg-slate-50 border border-slate-200 px-1 py-0.5 rounded">Orta</code>, <code className="bg-slate-50 border border-slate-200 px-1 py-0.5 rounded">Düşük</code> yazılabilir.</li>
                  <li><strong>Durum:</strong> Sadece <code className="bg-slate-50 border border-slate-200 px-1 py-0.5 rounded">Başlamadı</code>, <code className="bg-slate-50 border border-slate-200 px-1 py-0.5 rounded">Devam Ediyor</code>, <code className="bg-slate-50 border border-slate-200 px-1 py-0.5 rounded">Beklemede</code>, <code className="bg-slate-50 border border-slate-200 px-1 py-0.5 rounded">Tamamlandı</code>, <code className="bg-slate-50 border border-slate-200 px-1 py-0.5 rounded">İptal Edildi</code> yazılabilir.</li>
                </ul>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2.5">
              <h4 className="font-semibold text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-red-600" /> Kritik Doğrulama Kuralları
              </h4>
              <ul className="space-y-2 text-xs text-slate-600 list-disc pl-4">
                <li><strong className="text-red-700">Resmî Tatil & Hafta Sonu Engeli:</strong> Tarih kolonlarına yazılan tarihler Türkiye resmî tatillerine veya cumartesi/pazar günlerine denk geliyorsa Excel yüklemesi **engellenecek** ve hata gösterilecektir.</li>
                <li><strong className="text-red-700">Tamamlanan Görevlerde Bitiş Tarihi:</strong> Durumu <code className="bg-slate-50 border border-slate-200 px-1 py-0.5 rounded">Tamamlandı</code> olan görevlerin <strong>Gerçekleşen Bitiş</strong> tarihinin girilmesi **zorunludur**. Girilmediğinde hata verir.</li>
                <li><strong>Köprü Günü Uyarısı:</strong> Tarihlerinizden biri köprü gününe (resmî tatil ve hafta sonu arasındaki tek iş günü) denk gelirse sistem yükleme sonrası sarı bilgilendirme uyarısı verir.</li>
              </ul>
            </div>
          </div>
        )}
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
      {warnings.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle size={16} className="shrink-0 text-amber-600" />
            <span>Excel Yükleme Uyarıları:</span>
          </div>
          <ul className="list-disc pl-5 space-y-0.5 text-xs text-amber-800">
            {warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
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

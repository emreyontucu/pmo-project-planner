"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Download,
  Eye,
  FileSpreadsheet,
  HelpCircle,
  Info,
  Layers,
  Sparkles,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { PROJECT_BUSINESS_STATUSES } from "@/lib/constants";
import { useRole } from "@/context/RoleContext";
import { BusinessStatusBadge } from "@/components/StatusBadges";
import type { ExcelImportPreviewResult, ProjectDetail, Task } from "@/lib/types";
import TasksSection from "./TasksSection";
import DependenciesSection from "./DependenciesSection";
import CalendarView from "./CalendarView";
import WBSWizardModal from "./WBSWizardModal";
import ExcelImportConfirmModal from "@/components/ExcelImportConfirmModal";
import AuditLogTimeline from "@/components/AuditLogTimeline";

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
    if ((a.order_index ?? 0) !== (b.order_index ?? 0)) {
      return (a.order_index ?? 0) - (b.order_index ?? 0);
    }
    return a.id - b.id;
  });
}

export default function ProjectDetailClient({ projectId }: { projectId: number }) {
  const { isExecutive, setRole } = useRole();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [missingDateTaskIds, setMissingDateTaskIds] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [showInfoBanner, setShowInfoBanner] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  // Excel confirmation modal states
  const [pendingExcelFile, setPendingExcelFile] = useState<File | null>(null);
  const [excelPreview, setExcelPreview] = useState<ExcelImportPreviewResult | null>(null);
  const [showExcelConfirm, setShowExcelConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const p = await api.getProject(projectId);
      if (p && p.tasks) {
        p.tasks = sortTasks(p.tasks);
      }
      setProject(p);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Proje yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
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

  async function handleBusinessStatusChange(newStatus: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.updateProject(projectId, { business_status: newStatus });
      setNotice(`Proje durumu '${newStatus}' olarak güncellendi.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Proje durumu güncellenemedi");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancelProject() {
    if (!confirm("Bu projeyi 'İptal Edildi' durumuna almak istediğinize emin misiniz?")) return;
    setBusy(true);
    setError(null);
    try {
      await api.cancelProject(projectId);
      setNotice("Proje durumu 'İptal Edildi' olarak güncellendi.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Proje iptal edilemedi");
    } finally {
      setBusy(false);
    }
  }

  async function handleExcelFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const previewData = await api.previewExcelImport(projectId, file);
      setPendingExcelFile(file);
      setExcelPreview(previewData);
      setShowExcelConfirm(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Excel dosyası incelenemedi");
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

  const isCancelled = project.business_status === "İptal Edildi";

  return (
    <div className="space-y-6">
      <Link
        href={isExecutive ? "/manager" : "/"}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--accent)] font-medium"
      >
        <ArrowLeft size={14} />
        {isExecutive ? "Yönetici Portalı" : "Projeler"}
      </Link>

      {/* Executive Mode Banner with Switch Button */}
      {isExecutive && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 rounded-2xl bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 text-white shadow-md border border-purple-800/40">
          <div className="flex items-center gap-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-600/30 text-purple-300 border border-purple-500/30">
              <Eye size={18} />
            </span>
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-200">
                Yönetici Görünümü (Salt Okunur)
              </h3>
              <p className="text-xs text-slate-300 font-light leading-relaxed">
                Şu anda yönetici modundasınız. Excel yüklemek, yeni görev eklemek ve planı düzenlemek için Planlayıcı Moduna geçebilirsiniz.
              </p>
            </div>
          </div>
          <button
            onClick={() => setRole("planner")}
            className="btn btn-sm bg-indigo-600 hover:bg-indigo-500 text-white border-0 shadow-sm shrink-0 flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
          >
            <Sparkles size={14} />
            Planlayıcı Moduna Geç (Düzenle & Excel Yükle)
          </button>
        </div>
      )}

      {/* Project Header Card */}
      <div className="card p-6 bg-white border border-slate-200/90 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className={`text-xl font-bold tracking-tight text-slate-900 ${isCancelled ? "line-through text-slate-500" : ""}`}>
                {project.name}
              </h1>
              {project.status === "Final" ? (
                <span className="badge bg-emerald-100 text-emerald-700 font-bold border border-emerald-300 px-2.5 py-0.5 flex items-center gap-1">
                  <CheckCircle2 size={13} /> Final (Onaylı Plan)
                </span>
              ) : (
                <span className="badge bg-slate-100 text-slate-600 font-medium px-2 py-0.5">Taslak</span>
              )}

              {/* Editable Project Business Status */}
              {!isExecutive && !isCancelled ? (
                <div className="flex items-center gap-1">
                  <select
                    value={project.business_status || "Aktif"}
                    onChange={(e) => handleBusinessStatusChange(e.target.value)}
                    className="badge border text-xs font-semibold px-2.5 py-1 rounded-lg cursor-pointer bg-white text-slate-800 border-slate-300 hover:border-indigo-400"
                    title="Proje Durumunu Güncelle"
                  >
                    {PROJECT_BUSINESS_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                project.business_status && <BusinessStatusBadge status={project.business_status} />
              )}
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              <span className="font-mono bg-slate-50 border border-slate-200/60 px-1.5 py-0.5 rounded text-slate-700 font-semibold">{project.code}</span>
              {project.manager && <> · Yönetici: <strong className="text-slate-700">{project.manager}</strong></>}
              {project.start_date && <> · Başlangıç: <strong className="text-slate-700">{project.start_date}</strong></>}
            </p>
            {project.description && <p className="mt-2.5 max-w-2xl text-xs text-slate-600 font-light">{project.description}</p>}
          </div>

          <div className="flex items-center gap-2">
            {!isCancelled && !isExecutive && (
              <button
                onClick={handleCancelProject}
                disabled={busy}
                className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                title="Projeyi İptal Et"
              >
                <Ban size={15} />
                Projeyi İptal Et
              </button>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-5">
          {/* Executive & Planner common: Excel Export */}
          <a
            href={api.getExportExcelUrl(projectId)}
            download
            className="btn btn-primary bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white shadow-sm shadow-emerald-200"
          >
            <Download size={16} />
            Excel Dışa Aktar (.xlsx)
          </a>

          {/* Planner Only Actions */}
          {!isExecutive && (
            <>
              <label className="btn btn-secondary bg-indigo-50/50 hover:bg-indigo-50 border-indigo-200 text-indigo-800 cursor-pointer">
                <Upload size={16} className="text-indigo-600" />
                Excel Yükle (.xlsx)
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  disabled={busy || isCancelled}
                  onChange={handleExcelFilePicked}
                />
              </label>

              <a
                href="/Gorev_Takip_Sablonu.xlsx"
                download
                className="btn btn-secondary text-slate-700 hover:bg-slate-100"
              >
                <Download size={15} className="text-slate-500" />
                Boş Şablonu İndir (.xlsx)
              </a>

              <button
                onClick={() => setShowWizard(true)}
                disabled={busy || isCancelled}
                className="btn btn-secondary text-indigo-700 hover:bg-indigo-50 border-indigo-200"
              >
                <Wand2 size={16} />
                Akıllı WBS Sihirbazı
              </button>

              <button onClick={handleSchedule} disabled={busy || isCancelled} className="btn btn-secondary">
                <Calendar size={16} />
                Tarihleri Hesapla
              </button>

              <button onClick={handleFinalize} disabled={busy || project.status === "Final" || isCancelled} className="btn btn-success">
                <CheckCircle2 size={16} />
                {project.status === "Final" ? "Final Yayınlandı" : "Final Olarak Yayınla"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Info & Kılavuz Tıklanabilir Kartı (Info Banner Modal/Accordion) */}
      <div className="card overflow-hidden border border-indigo-100/90 shadow-2xs">
        <button
          onClick={() => setShowInfoBanner((v) => !v)}
          className="flex w-full items-center justify-between bg-gradient-to-r from-indigo-50/90 via-blue-50/60 to-slate-50 px-5 py-3.5 text-left transition-all hover:brightness-98 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-2xs">
              <Info size={15} />
            </span>
            <div>
              <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-2">
                Planlama, Otomatik/Manuel Tarihler & Excel Bilgilendirme Kılavuzu
                <span className="text-[11px] font-normal text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                  {showInfoBanner ? "Gizle" : "Görmek İçin Tıklayın"}
                </span>
              </h4>
              <p className="text-[11px] text-indigo-900/70 font-light">
                Bağımlılık mantığı, kilitli baseline tarihleri ve Excel şablon kuralları
              </p>
            </div>
          </div>
          <span className={`text-indigo-600 transition-transform duration-200 ${showInfoBanner ? "rotate-180" : ""}`}>
            <ChevronDown size={18} />
          </span>
        </button>

        {showInfoBanner && (
          <div className="border-t border-indigo-100 bg-white p-6 text-xs space-y-5 animate-in fade-in duration-200">
            {/* 1. Tarih & Bağımlılık Mantığı */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2 rounded-xl bg-slate-50 p-4 border border-slate-200/70">
                <h5 className="font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-indigo-600" />
                  Otomatik vs Manuel Tarihler
                </h5>
                <ul className="space-y-1.5 text-slate-600 list-disc pl-4 leading-relaxed font-light">
                  <li><strong>Bağımlılık Hesabı:</strong> Görevler arası öncül/ardıl bağımlılıkları tanımlandığında <strong>Planlanan Tarihler</strong> çalışma takvimine göre zincirleme otomatik hesaplanır.</li>
                  <li><strong>Kilitli Baseline:</strong> Plan &quot;Final&quot; olarak yayınlandığında planlanan tarihler kilitlenir; gecikme ve ilerlemeler <strong>Gerçekleşen Tarihler</strong> üzerinden girilir.</li>
                </ul>
              </div>

              <div className="space-y-2 rounded-xl bg-slate-50 p-4 border border-slate-200/70">
                <h5 className="font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                  Excel Şablon Kolonları
                </h5>
                <ul className="space-y-1.5 text-slate-600 list-disc pl-4 leading-relaxed font-light">
                  <li><strong>Proje Aşaması:</strong> <code className="bg-white border border-slate-200 px-1 py-0.5 rounded text-indigo-700 font-mono">S1</code> ile <code className="bg-white border border-slate-200 px-1 py-0.5 rounded text-indigo-700 font-mono">S5</code> arası hiyerarşi.</li>
                  <li><strong>Öncelik:</strong> Kritik, Yüksek, Orta, Düşük seçenekleri.</li>
                  <li><strong>Durum:</strong> Başlamadı, Devam Ediyor, Beklemede, Tamamlandı, İptal Edildi.</li>
                </ul>
              </div>
            </div>

            {/* 2. Kritik Kurallar */}
            <div className="rounded-xl bg-amber-50/60 border border-amber-200/70 p-4 space-y-2">
              <h5 className="font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <AlertTriangle size={14} className="text-amber-600" />
                Kritik Takvim & Doğrulama Kuralları
              </h5>
              <ul className="space-y-1 text-amber-900/90 list-disc pl-4 leading-relaxed font-light">
                <li><strong>Resmî Tatil & Hafta Sonu:</strong> Tarihler Türkiye resmî tatillerine veya hafta sonlarına denk gelirse sistem uyarır ve planlamayı otomatik bir sonraki iş gününe öteler.</li>
                <li><strong>Tamamlandı Kuralı:</strong> Durumu <em>Tamamlandı</em> olan görevlerde <strong>Gerçekleşen Bitiş</strong> tarihinin girilmesi zorunludur.</li>
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

      {/* 1. S1-S5 WBS Görevler Bölümü (En Üstte - İlk Görünen) */}
      <TasksSection
        projectId={projectId}
        tasks={project.tasks}
        dependencies={project.dependencies}
        onChange={refresh}
        onError={setError}
        missingDateTaskIds={missingDateTaskIds}
        readOnly={isExecutive}
      />

      {/* 2. Bağımlılıklar Grafiği */}
      {!isExecutive && (
        <DependenciesSection
          projectId={projectId}
          tasks={project.tasks}
          dependencies={project.dependencies}
          onChange={refresh}
          onError={setError}
        />
      )}

      {/* 3. Takvim ve Gantt Görünümü */}
      <CalendarView tasks={project.tasks} initialDate={project.start_date} />

      {/* 4. Akış Tarihçesi & Değişiklik Günlüğü (Audit Logs - En Altta) */}
      <AuditLogTimeline projectId={projectId} />

      {/* Modals */}
      <WBSWizardModal
        projectId={projectId}
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onCompleted={(count) => {
          setNotice(`${count} yeni WBS iş paketi ve görevi başarıyla oluşturuldu.`);
          refresh();
        }}
        onError={setError}
      />

      <ExcelImportConfirmModal
        projectId={projectId}
        file={pendingExcelFile}
        preview={excelPreview}
        isOpen={showExcelConfirm}
        onClose={() => {
          setShowExcelConfirm(false);
          setPendingExcelFile(null);
          setExcelPreview(null);
        }}
        onSuccess={() => {
          setNotice("Excel görevleri başarıyla sisteme yüklendi.");
          refresh();
        }}
        onError={setError}
      />
    </div>
  );
}

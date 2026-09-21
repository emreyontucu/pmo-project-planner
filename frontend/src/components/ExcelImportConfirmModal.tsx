"use client";

import { useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, FileSpreadsheet, Layers, ShieldAlert, X } from "lucide-react";
import { api } from "@/lib/api";
import type { ExcelImportPreviewResult } from "@/lib/types";

interface Props {
  projectId: number;
  file: File | null;
  preview: ExcelImportPreviewResult | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (warnings: string[]) => void;
  onError: (msg: string) => void;
}

export default function ExcelImportConfirmModal({
  projectId,
  file,
  preview,
  isOpen,
  onClose,
  onSuccess,
  onError,
}: Props) {
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !preview || !file) return null;

  async function handleConfirm() {
    if (!file) return;
    setSubmitting(true);
    try {
      const result = await api.reimportExcel(projectId, file, true);
      onSuccess(result.warnings);
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Excel yüklenirken bir hata oluştu");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className="flex flex-col w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 p-6 text-white flex items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 uppercase tracking-wider bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-400/20">
              <FileSpreadsheet size={13} />
              Excel Doğrulama & Onay
            </span>
            <h3 className="text-lg font-bold text-white leading-tight">
              Excel Planını Sisteme Yükle
            </h3>
            <p className="text-xs text-slate-300 font-light">
              Dosya: <strong className="text-white font-medium">{preview.filename}</strong>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto bg-slate-50/50">
          
          {/* Summary Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Okunan Toplam Görev
              </span>
              <p className="text-2xl font-extrabold text-slate-900">
                {preview.tasks_count} <span className="text-xs font-normal text-slate-500">adet</span>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Mevcut Proje Durumu
              </span>
              <p className="text-sm font-bold text-slate-700 pt-1">
                {preview.has_existing_tasks
                  ? `${preview.existing_tasks_count} Mevcut Görev Var`
                  : "Henüz Görev Eklenmemiş"}
              </p>
            </div>
          </div>

          {/* Phase Breakdown */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={14} className="text-indigo-600" />
              Faz Dağılımı (WBS)
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              {Object.entries(preview.phase_counts).map(([phase, count]) => (
                <span
                  key={phase}
                  className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800"
                >
                  <strong className="text-indigo-600 font-bold">{phase}:</strong> {count} görev
                </span>
              ))}
            </div>
          </div>

          {/* Warnings List (if any) */}
          {preview.warnings && preview.warnings.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle size={15} />
                Tespit Edilen Takvim ve Şablon Uyarıları:
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-amber-800/90 font-light">
                {preview.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Confirmation Warning Notice */}
          <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200/80 space-y-2 text-xs text-indigo-950">
            <div className="font-bold flex items-center gap-1.5 text-indigo-900">
              <ShieldAlert size={16} className="text-indigo-600" />
              Değişiklik Onayı Gerekiyor
            </div>
            <p className="leading-relaxed text-indigo-900/90 font-light">
              Bütün kontroller tamamlandı. Değişiklikleri uygulamak istediğinize emin misiniz? 
              <strong> &quot;Kaydet ve Yükle&quot;</strong> butonuna basmadığınız sürece mevcut plan taslakta kalacak ve değiştirilmeyecektir.
            </p>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-sm"
          >
            İptal / Taslakta Bırak
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleConfirm}
            className="btn btn-primary btn-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200"
          >
            <CheckCircle2 size={15} />
            {submitting ? "Yükleniyor..." : "Kontrolleri Onayla ve Yükle"}
          </button>
        </div>
      </div>
    </div>
  );
}

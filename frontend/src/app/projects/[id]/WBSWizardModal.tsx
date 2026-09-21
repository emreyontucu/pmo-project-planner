"use client";

import { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  Database,
  FileText,
  HelpCircle,
  Layers,
  Lock,
  Plus,
  Server,
  Shield,
  Sparkles,
  Users,
  Wand2,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { PROJECT_PHASES_DETAILED } from "@/lib/constants";
import type { WBSWizardQuestionDTO, WBSWizardTaskInput } from "@/lib/types";

interface Props {
  projectId: number;
  isOpen: boolean;
  onClose: () => void;
  onCompleted: (createdCount: number) => void;
  onError: (msg: string) => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  server: <Server size={18} className="text-indigo-600" />,
  plug: <Sparkles size={18} className="text-violet-600" />,
  shield: <Shield size={18} className="text-rose-600" />,
  database: <Database size={18} className="text-cyan-600" />,
  users: <Users size={18} className="text-emerald-600" />,
  "file-text": <FileText size={18} className="text-amber-600" />,
};

const PHASE_COLORS: Record<string, string> = {
  S1: "bg-indigo-50 text-indigo-700 border-indigo-200",
  S2: "bg-cyan-50 text-cyan-700 border-cyan-200",
  S3: "bg-violet-50 text-violet-700 border-violet-200",
  S4: "bg-amber-50 text-amber-700 border-amber-200",
  S5: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function WBSWizardModal({ projectId, isOpen, onClose, onCompleted, onError }: Props) {
  const [questions, setQuestions] = useState<WBSWizardQuestionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // State for user answers: key -> "Evet" | "Hayır"
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  // State for vendor names: key -> vendor name string
  const [vendors, setVendors] = useState<Record<string, string>>({});

  // State for selected tasks: key -> list of tasks (with editable assignee, start_date, end_date)
  const [selectedTasksMap, setSelectedTasksMap] = useState<Record<string, WBSWizardTaskInput[]>>({});

  useEffect(() => {
    if (!isOpen) return;
    async function load() {
      setLoading(true);
      try {
        const qList = await api.getWBSWizardQuestions(projectId);
        setQuestions(qList);
        
        const initialAnswers: Record<string, string> = {};
        const initialVendors: Record<string, string> = {};
        const initialTasksMap: Record<string, WBSWizardTaskInput[]> = {};
        
        qList.forEach((q) => {
          const ans = q.current_answer || "Hayır";
          initialAnswers[q.key] = ans;
          if (q.vendor_field_label) {
            initialVendors[q.key] = "";
          }
          if (ans === "Evet") {
            initialTasksMap[q.key] = q.suggested_tasks.map((t) => ({ ...t }));
          } else {
            initialTasksMap[q.key] = [];
          }
        });
        
        setAnswers(initialAnswers);
        setVendors(initialVendors);
        setSelectedTasksMap(initialTasksMap);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Soru listesi yüklenemedi");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isOpen, projectId, onError]);

  if (!isOpen) return null;

  function handleAnswerChange(q: WBSWizardQuestionDTO, value: "Evet" | "Hayır") {
    setAnswers((prev) => ({ ...prev, [q.key]: value }));
    setSelectedTasksMap((prev) => {
      const next = { ...prev };
      if (value === "Evet") {
        const vendorVal = vendors[q.key] || "";
        next[q.key] = q.suggested_tasks.map((t) => {
          let taskName = t.name;
          if (vendorVal.trim() && taskName.includes("{vendor}")) {
            taskName = taskName.replace("{vendor}", vendorVal.trim());
          }
          return { ...t, name: taskName };
        });
      } else {
        next[q.key] = [];
      }
      return next;
    });
  }

  function handleVendorChange(q: WBSWizardQuestionDTO, vendorVal: string) {
    setVendors((prev) => ({ ...prev, [q.key]: vendorVal }));
    setSelectedTasksMap((prev) => {
      const currentList = prev[q.key] || [];
      const updatedList = currentList.map((t, idx) => {
        const template = q.suggested_tasks[idx]?.name || t.name;
        const formattedName = template.includes("{vendor}")
          ? template.replace("{vendor}", vendorVal.trim() || "Firma Adı")
          : t.name;
        return { ...t, name: formattedName };
      });
      return { ...prev, [q.key]: updatedList };
    });
  }

  function handleTaskToggle(qKey: string, originalTask: WBSWizardTaskInput) {
    setSelectedTasksMap((prev) => {
      const currentList = prev[qKey] || [];
      const exists = currentList.some((t) => t.phase === originalTask.phase && (t.name === originalTask.name || t.name.includes(originalTask.phase)));
      if (exists) {
        return { ...prev, [qKey]: currentList.filter((t) => t.name !== originalTask.name && !t.name.includes(originalTask.phase)) };
      } else {
        return { ...prev, [qKey]: [...currentList, { ...originalTask }] };
      }
    });
  }

  function handleAssigneeChange(qKey: string, taskIndex: number, newSorumlu: string) {
    setSelectedTasksMap((prev) => {
      const currentList = prev[qKey] || [];
      const nextList = [...currentList];
      if (nextList[taskIndex]) {
        nextList[taskIndex] = { ...nextList[taskIndex], sorumlu: newSorumlu };
      }
      return { ...prev, [qKey]: nextList };
    });
  }

  function handleDateChange(qKey: string, taskIndex: number, field: "start_date" | "end_date", value: string) {
    setSelectedTasksMap((prev) => {
      const currentList = prev[qKey] || [];
      const nextList = [...currentList];
      if (nextList[taskIndex]) {
        nextList[taskIndex] = { ...nextList[taskIndex], [field]: value || undefined };
      }
      return { ...prev, [qKey]: nextList };
    });
  }

  async function handleApply() {
    // Gather all selected tasks across all questions
    const allTasksToCreate: WBSWizardTaskInput[] = [];
    Object.values(selectedTasksMap).forEach((tasks) => {
      allTasksToCreate.push(...tasks);
    });

    setSubmitting(true);
    try {
      const result = await api.applyWBSWizard(projectId, {
        answers,
        tasks_to_create: allTasksToCreate,
      });
      onCompleted(result.created_tasks_count);
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : "WBS görevleri uygulanamadı");
    } finally {
      setSubmitting(false);
    }
  }

  const totalTasksToCreate = Object.values(selectedTasksMap).reduce((sum, list) => sum + list.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className="flex flex-col w-full max-w-3xl rounded-2xl bg-white shadow-2xl max-h-[92vh] overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900 via-indigo-850 to-slate-900 p-6 text-white shrink-0">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-indigo-500/20 blur-2xl" />
          <div className="flex items-start justify-between gap-4 relative">
            <div className="space-y-1.5 max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/30 px-3 py-0.5 text-xs font-semibold text-indigo-200 border border-indigo-400/20">
                <Sparkles size={12} className="text-indigo-300" />
                Akıllı PMO Asistanı
              </span>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                İş Kırılım Yapısı (WBS) & Görev Sihirbazı
              </h2>
              <p className="text-xs text-slate-300 font-light leading-relaxed">
                Proje yöneticisi sorularını yanıtlayarak donanım, API, güvenlik ve veri göçü gibi iş paketlerini otomatik oluşturun.
              </p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {loading ? (
            <div className="space-y-4 py-8">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-28 rounded-xl bg-white animate-pulse border border-slate-200" />
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              {questions.map((q) => {
                const answer = answers[q.key] || "Hayır";
                const isYes = answer === "Evet";
                const activeTasks = selectedTasksMap[q.key] || [];

                return (
                  <div
                    key={q.key}
                    className={`rounded-xl border transition-all duration-200 bg-white ${
                      isYes ? "border-indigo-300 shadow-md shadow-indigo-100/50" : "border-slate-200/80 shadow-2xs"
                    }`}
                  >
                    {/* Question Row */}
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5 max-w-xl">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 border border-slate-200/60 shadow-2xs">
                          {CATEGORY_ICONS[q.icon_type] ?? <HelpCircle size={18} className="text-indigo-600" />}
                        </span>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/60">
                              {q.category}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 leading-snug">{q.question}</h3>
                          <p className="text-xs text-slate-500 font-light leading-relaxed">{q.description}</p>
                        </div>
                      </div>

                      {/* Choice Buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleAnswerChange(q, "Evet")}
                          className={`btn btn-sm px-3.5 transition-all ${
                            isYes
                              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-300 border-indigo-600"
                              : "btn-secondary text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <Check size={14} className={isYes ? "opacity-100" : "opacity-0"} />
                          Evet (Gerekli)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAnswerChange(q, "Hayır")}
                          className={`btn btn-sm px-3.5 transition-all ${
                            !isYes
                              ? "bg-slate-200 text-slate-800 border-slate-300 font-semibold"
                              : "btn-ghost text-slate-500 hover:bg-slate-100"
                          }`}
                        >
                          Gerek Yok
                        </button>
                      </div>
                    </div>

                    {/* Sub-tasks Generator Preview (if Evet) */}
                    {isYes && (
                      <div className="border-t border-indigo-100/80 bg-indigo-50/30 p-4 sm:p-5 space-y-4 rounded-b-xl">
                        {/* Vendor input if required */}
                        {q.vendor_field_label && (
                          <div className="p-3.5 rounded-xl bg-white border border-rose-200 shadow-2xs space-y-1.5">
                            <label className="block">
                              <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                                <Shield size={14} className="text-rose-600" />
                                {q.vendor_field_label} *
                              </span>
                              <input
                                type="text"
                                value={vendors[q.key] || ""}
                                onChange={(e) => handleVendorChange(q, e.target.value)}
                                placeholder="Örn: ABC Siber Güvenlik A.Ş."
                                className="input mt-1 text-xs w-full bg-slate-50 focus:bg-white"
                              />
                            </label>
                            <p className="text-[11px] text-slate-500 font-light">
                              Girilen firma adı aşağıdaki görev tanımlarına otomatik işlenecektir.
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers size={13} className="text-indigo-600" />
                            Oluşturulacak WBS Görevleri ({activeTasks.length})
                          </span>
                          <span className="text-[11px] text-slate-500">Görevleri seçin, sorumlu ve tarihleri belirleyin</span>
                        </div>

                        <div className="space-y-3">
                          {q.suggested_tasks.map((suggested, taskIdx) => {
                            const isChecked = activeTasks.some((t) => t.phase === suggested.phase);
                            const currentTask = activeTasks.find((t) => t.phase === suggested.phase) || suggested;

                            return (
                              <div
                                key={suggested.name + taskIdx}
                                className={`flex flex-col gap-3 p-3.5 rounded-xl border transition-colors ${
                                  isChecked ? "bg-white border-indigo-200 shadow-2xs" : "bg-slate-50/80 border-slate-200 opacity-60"
                                }`}
                              >
                                <div className="flex items-start gap-3 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleTaskToggle(q.key, suggested)}
                                    className="mt-1 h-4 w-4 rounded accent-indigo-600 cursor-pointer shrink-0"
                                  />
                                  <div className="space-y-1 min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${PHASE_COLORS[suggested.phase] || "bg-slate-100 text-slate-700"}`}>
                                        {suggested.phase}
                                      </span>
                                      <span className="font-semibold text-xs text-slate-900">{currentTask.name}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-tight font-light">{suggested.description}</p>
                                  </div>
                                </div>

                                {/* Sorumlu ve Tarih Giriş Alanları */}
                                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 pl-7">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] text-slate-500 font-medium">Sorumlu:</span>
                                    <input
                                      disabled={!isChecked}
                                      value={currentTask.sorumlu || ""}
                                      onChange={(e) => handleAssigneeChange(q.key, taskIdx, e.target.value)}
                                      className="input py-1 px-2 text-xs w-36 bg-slate-50 focus:bg-white disabled:opacity-50"
                                      placeholder="Kişi / Ekip"
                                    />
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] text-slate-500 font-medium">Başlangıç:</span>
                                    <input
                                      type="date"
                                      disabled={!isChecked}
                                      value={currentTask.start_date || ""}
                                      onChange={(e) => handleDateChange(q.key, taskIdx, "start_date", e.target.value)}
                                      className="input py-1 px-2 text-xs w-36 bg-slate-50 focus:bg-white disabled:opacity-50"
                                    />
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] text-slate-500 font-medium">Bitiş:</span>
                                    <input
                                      type="date"
                                      disabled={!isChecked}
                                      value={currentTask.end_date || ""}
                                      onChange={(e) => handleDateChange(q.key, taskIdx, "end_date", e.target.value)}
                                      className="input py-1 px-2 text-xs w-36 bg-slate-50 focus:bg-white disabled:opacity-50"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-700">Toplam Eklenecek Görev:</span>
            <span className="rounded-full bg-indigo-100 text-indigo-700 font-bold px-2.5 py-0.5">
              {totalTasksToCreate} Görev
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
              Vazgeç
            </button>
            <button
              type="button"
              disabled={submitting || loading}
              onClick={handleApply}
              className="btn btn-primary btn-sm bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-300"
            >
              <Wand2 size={14} />
              {submitting ? "Görevler Oluşturuluyor..." : "WBS Görevlerini Projeye Ekle"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

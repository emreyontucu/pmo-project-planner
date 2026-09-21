"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Ban,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Diamond,
  Edit2,
  GitFork,
  Layers,
  ListTodo,
  Lock,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { PROJECT_PHASES, PROJECT_PHASES_DETAILED, TASK_PRIORITIES, TASK_STATUSES, type PhaseInfo } from "@/lib/constants";
import type { Task, TaskDependency } from "@/lib/types";
import TaskDependencyModal from "@/components/TaskDependencyModal";


const PRIORITY_STYLES: Record<string, string> = {
  Kritik: "bg-red-100 text-red-700 border-red-200",
  Yüksek: "bg-orange-100 text-orange-700 border-orange-200",
  Orta: "bg-amber-100 text-amber-700 border-amber-200",
  Düşük: "bg-slate-100 text-slate-600 border-slate-200",
};

const STATUS_STYLES: Record<string, string> = {
  "Başlamadı": "bg-slate-100 text-slate-600 border-slate-200",
  "Devam Ediyor": "bg-sky-100 text-sky-700 border-sky-200",
  "Beklemede": "bg-amber-100 text-amber-700 border-amber-200",
  "Tamamlandı": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "İptal Edildi": "bg-red-100 text-red-700 border-red-200 line-through opacity-80",
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return dateStr;
}

export default function TasksSection({
  projectId,
  tasks,
  dependencies = [],
  onChange,
  onError,
  missingDateTaskIds,
  readOnly = false,
}: {
  projectId: number;
  tasks: Task[];
  dependencies?: TaskDependency[];
  onChange: () => void;
  onError: (msg: string) => void;
  missingDateTaskIds: Set<number>;
  readOnly?: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [defaultPhaseForNewTask, setDefaultPhaseForNewTask] = useState<string>("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [dependencyTask, setDependencyTask] = useState<Task | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<number | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Whichever button opened it (top-level or a phase's "Görev Ekle"), the form always
  // renders at the top of this section — scroll it into view so it's not missed below the fold.
  useEffect(() => {
    if (showForm) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showForm]);


  // Group tasks by phase code (S1..S5)
  const getPhaseCode = (phaseStr: string | null): string => {
    if (!phaseStr) return "OTHER";
    const match = phaseStr.match(/^[sS]([1-5])/);
    return match ? `S${match[1]}` : "OTHER";
  };

  const tasksByPhase: Record<string, Task[]> = {};
  PROJECT_PHASES_DETAILED.forEach((p) => {
    tasksByPhase[p.code] = [];
  });
  tasksByPhase["OTHER"] = [];

  tasks.forEach((t) => {
    const code = getPhaseCode(t.phase);
    if (tasksByPhase[code]) {
      tasksByPhase[code].push(t);
    } else {
      tasksByPhase["OTHER"].push(t);
    }
  });

  async function handleCancelTask(task: Task) {
    if (task.status === "İptal Edildi") return;
    if (!confirm(`'${task.name}' görevi iptal edilsin mi?`)) return;
    setBusyTaskId(task.id);
    setInlineError(null);
    try {
      await api.cancelTask(task.id);
      onChange();
    } catch (err) {
      setInlineError(err instanceof Error ? err.message : "Görev iptal edilemedi");
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleDelete(taskId: number) {
    if (!confirm("Bu görevi tamamen silmek istediğinize emin misiniz? (Öneri: Silmek yerine 'İptal Et' durumunu kullanabilirsiniz)")) {
      return;
    }
    try {
      await api.deleteTask(taskId);
      onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Görev silinemedi");
    }
  }

  async function handleUpdate(taskId: number, data: Partial<Task>) {
    setInlineError(null);
    try {
      await api.updateTask(taskId, data);
      onChange();
    } catch (err) {
      setInlineError(err instanceof Error ? err.message : "Görev güncellenemedi");
    }
  }

  async function handleMove(phaseCode: string, taskIndexInPhase: number, direction: "up" | "down") {
    const phaseTasks = [...tasksByPhase[phaseCode]];
    const targetIndex = direction === "up" ? taskIndexInPhase - 1 : taskIndexInPhase + 1;
    if (targetIndex < 0 || targetIndex >= phaseTasks.length) return;

    // Swap in phase tasks
    const [moved] = phaseTasks.splice(taskIndexInPhase, 1);
    phaseTasks.splice(targetIndex, 0, moved);

    // Build entire ordered list preserving all phases
    const allOrderedIds: number[] = [];
    PROJECT_PHASES_DETAILED.forEach((p) => {
      const list = p.code === phaseCode ? phaseTasks : tasksByPhase[p.code];
      list.forEach((t) => allOrderedIds.push(t.id));
    });
    const otherList = phaseCode === "OTHER" ? phaseTasks : tasksByPhase["OTHER"];
    otherList.forEach((t) => allOrderedIds.push(t.id));

    try {
      await api.reorderTasks(projectId, allOrderedIds);
      onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Sıralama kaydedilemedi");
    }
  }

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "Tamamlandı").length;
  const cancelledTasks = tasks.filter((t) => t.status === "İptal Edildi").length;

  return (
    <section className="space-y-6">
      {/* Section Header */}
      <div className="card p-6 bg-white border border-slate-200/80 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
              <Layers size={20} className="text-indigo-600" />
              İş Kırılım Yapısı ve Fazlar (WBS)
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Projenin S1-S5 faz hiyerarşisi, kilitli planlanan takvimi ve gerçekleşen ilerleme takibi
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-100/80 px-3 py-1.5 rounded-lg">
              <span>Toplam: {totalTasks}</span>
              <span>·</span>
              <span className="text-emerald-700">Tamamlanan: {completedTasks}</span>
              {cancelledTasks > 0 && (
                <>
                  <span>·</span>
                  <span className="text-red-700">İptal: {cancelledTasks}</span>
                </>
              )}
            </div>
            <button
              onClick={() => {
                setDefaultPhaseForNewTask("");
                setShowForm((v) => !v);
              }}
              className="btn btn-primary btn-sm shadow-sm shadow-indigo-200"
            >
              {showForm ? <X size={15} /> : <Plus size={15} />}
              {showForm ? "Kapat" : "Yeni Görev Ekle"}
            </button>
          </div>
        </div>

        {inlineError && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span className="flex-1">{inlineError}</span>
            <button onClick={() => setInlineError(null)} className="shrink-0 text-red-400 hover:text-red-700">
              <X size={15} />
            </button>
          </div>
        )}

        {showForm && (
          <div ref={formRef} className="mt-5 scroll-mt-20 border-t border-slate-100 pt-5">
            <AddTaskForm
              projectId={projectId}
              initialPhase={defaultPhaseForNewTask}
              onCreated={() => {
                setShowForm(false);
                onChange();
              }}
              onError={onError}
            />
          </div>
        )}
      </div>

      {/* S1 - S5 Phase Cards - Single Unified Big Container */}
      <div className="card overflow-hidden bg-white border border-slate-200/90 shadow-sm divide-y divide-slate-200/80">
        {PROJECT_PHASES_DETAILED.map((phase) => {
          const phaseTasks = tasksByPhase[phase.code] || [];
          return (
            <PhaseCard
              key={phase.code}
              phase={phase}
              tasks={phaseTasks}
              busyTaskId={busyTaskId}
              missingDateTaskIds={missingDateTaskIds}
              readOnly={readOnly}
              onAddSubtask={() => {
                setDefaultPhaseForNewTask(phase.code);
                setShowForm(true);
              }}
              onMove={(index, dir) => handleMove(phase.code, index, dir)}
              onUpdate={handleUpdate}
              onCancel={handleCancelTask}
              onEdit={(t) => setEditingTask(t)}
              onDelete={handleDelete}
              onManageDependencies={(t) => setDependencyTask(t)}
            />
          );
        })}

        {/* Other / Unassigned Phase Tasks (if any) */}
        {tasksByPhase["OTHER"].length > 0 && (
          <PhaseCard
            key="OTHER"
            phase={{
              code: "Genel",
              title: "Ek ve Genel Görevler",
              description: "Belirli bir aşamaya atanmamış bağımsız iş maddeleri.",
              badgeColor: "bg-slate-100 text-slate-700 border-slate-300",
            }}
            tasks={tasksByPhase["OTHER"]}
            busyTaskId={busyTaskId}
            missingDateTaskIds={missingDateTaskIds}
            readOnly={readOnly}
            onAddSubtask={() => {
              setDefaultPhaseForNewTask("");
              setShowForm(true);
            }}
            onMove={(index, dir) => handleMove("OTHER", index, dir)}
            onUpdate={handleUpdate}
            onCancel={handleCancelTask}
            onEdit={(t) => setEditingTask(t)}
            onDelete={handleDelete}
            onManageDependencies={(t) => setDependencyTask(t)}
          />
        )}
      </div>

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSaved={() => {
            setEditingTask(null);
            onChange();
          }}
          onDelete={() => {
            handleDelete(editingTask.id);
            setEditingTask(null);
          }}
        />
      )}

      {dependencyTask && (
        <TaskDependencyModal
          projectId={projectId}
          task={dependencyTask}
          allTasks={tasks}
          dependencies={dependencies}
          isOpen={!!dependencyTask}
          onClose={() => setDependencyTask(null)}
          onChange={() => {
            onChange();
          }}
          onError={onError}
          readOnly={readOnly}
        />
      )}
    </section>
  );
}

function PhaseCard({
  phase,
  tasks,
  busyTaskId,
  missingDateTaskIds,
  readOnly = false,
  onAddSubtask,
  onMove,
  onUpdate,
  onCancel,
  onEdit,
  onDelete,
  onManageDependencies,
}: {
  phase: PhaseInfo;
  tasks: Task[];
  busyTaskId: number | null;
  missingDateTaskIds: Set<number>;
  readOnly?: boolean;
  onAddSubtask: () => void;
  onMove: (index: number, direction: "up" | "down") => void;
  onUpdate: (taskId: number, data: Partial<Task>) => void;
  onCancel: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
  onManageDependencies: (task: Task) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);


  return (
    <div className="transition-all duration-200 bg-white">
      {/* Big Phase Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/70 p-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2.5">
            <span className={`font-mono text-xs font-bold px-2.5 py-1 rounded-md border ${phase.badgeColor}`}>
              {phase.code}
            </span>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">{phase.title}</h3>
            <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {tasks.length} Görev
            </span>
          </div>
          <p className="text-xs leading-relaxed text-slate-500 font-light">{phase.description}</p>
        </div>

        <div className="flex items-center gap-2">
          {!readOnly && (
            <button
              onClick={onAddSubtask}
              className="btn btn-secondary btn-sm text-xs text-indigo-700 hover:bg-indigo-50 border-indigo-200"
              title={`${phase.code} aşamasına yeni görev ekle`}
            >
              <Plus size={14} />
              Görev Ekle
            </button>
          )}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="btn btn-ghost btn-sm p-1.5 text-slate-400 hover:text-slate-700"
            title={collapsed ? "Genişlet" : "Daralt"}
          >
            {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </div>

      {/* Task Table / List */}
      {!collapsed && (
        <div className="p-0">
          {tasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Bu aşamada henüz kayıtlı bir görev bulunmamaktadır.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">Sıra</th>
                    <th className="py-3 px-4 min-w-[220px]">Görev & Detay</th>
                    <th className="py-3 px-3 w-24">Öncelik</th>
                    <th className="py-3 px-3 w-28">Durum</th>
                    <th className="py-3 px-3 w-28">Sorumlu</th>
                    <th className="py-3 px-3 w-16 text-center">Süre</th>
                    <th className="py-3 px-4 min-w-[170px]">Planlanan (Kilitli)</th>
                    <th className="py-3 px-4 min-w-[170px]">Gerçekleşen Tarih</th>
                    <th className="py-3 px-3 w-32 text-right">Aksiyonlar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tasks.map((task, idx) => {
                    const isCancelled = task.status === "İptal Edildi";
                    const isCompleted = task.status === "Tamamlandı";
                    return (
                      <tr
                        key={task.id}
                        className={`transition-colors hover:bg-slate-50/80 ${
                          isCancelled ? "bg-red-50/20" : isCompleted ? "bg-emerald-50/15" : ""
                        }`}
                      >
                        {/* Up / Down Reorder Buttons */}
                        <td className="py-3 px-2 text-center align-middle">
                          {readOnly ? (
                            <span className="font-mono text-[11px] text-slate-400 font-bold">{idx + 1}</span>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <button
                                disabled={idx === 0}
                                onClick={() => onMove(idx, "up")}
                                className="p-0.5 rounded text-slate-400 hover:text-indigo-600 disabled:opacity-20 hover:bg-slate-100 cursor-pointer"
                                title="Yukarı Taşı"
                              >
                                <ArrowUp size={12} />
                              </button>
                              <span className="font-mono text-[10px] text-slate-400 font-bold">{idx + 1}</span>
                              <button
                                disabled={idx === tasks.length - 1}
                                onClick={() => onMove(idx, "down")}
                                className="p-0.5 rounded text-slate-400 hover:text-indigo-600 disabled:opacity-20 hover:bg-slate-100 cursor-pointer"
                                title="Aşağı Taşı"
                              >
                                <ArrowDown size={12} />
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Task Name & Description (No "Açıklama Yok") */}
                        <td className="py-3 px-4 align-middle">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-900 text-sm">
                              {task.is_milestone && <Diamond size={13} className="shrink-0 text-violet-600 fill-violet-100" />}
                              <span className={isCancelled ? "line-through text-slate-500" : ""}>{task.name}</span>
                            </div>
                            {task.description && (
                              <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed font-light">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Priority */}
                        <td className="py-3 px-3 align-middle">
                          {task.priority ? (
                            <span className={`badge border text-[11px] font-medium px-2 py-0.5 rounded-md ${PRIORITY_STYLES[task.priority] ?? "bg-slate-100 text-slate-600"}`}>
                              {task.priority}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 align-middle">
                          {readOnly ? (
                            <span
                              className={`badge border text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                                STATUS_STYLES[task.status] ?? "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {task.status}
                            </span>
                          ) : (
                            <select
                              value={task.status}
                              onChange={(e) => onUpdate(task.id, { status: e.target.value })}
                              className={`badge border text-[11px] font-semibold px-2 py-1 rounded-md cursor-pointer ${
                                STATUS_STYLES[task.status] ?? "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {TASK_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>

                        {/* Sorumlu */}
                        <td className="py-3 px-3 align-middle text-slate-600 font-medium">
                          {task.sorumlu || <span className="text-slate-400">—</span>}
                        </td>

                        {/* Duration */}
                        <td className="py-3 px-3 text-center align-middle text-slate-600">
                          {task.is_milestone ? "—" : `${task.duration}g`}
                        </td>

                        {/* Planlanan Tarihler (Kilitli) */}
                        <td className="py-3 px-4 align-middle">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100/90 text-slate-700 font-mono text-[11px] border border-slate-200/60 shadow-2xs">
                            <Lock size={12} className="text-slate-400 shrink-0" />
                            <span>
                              {formatDate(task.start_date)}
                              {!task.is_milestone && ` - ${formatDate(task.end_date)}`}
                            </span>
                          </div>
                        </td>

                        {/* Gerçekleşen Tarihler (Düzenlenebilir) */}
                        <td className="py-3 px-4 align-middle">
                          {readOnly ? (
                            <div className="text-slate-600 text-[11px] font-mono">
                              {task.actual_start_date || task.actual_end_date ? (
                                <span>
                                  {formatDate(task.actual_start_date)}
                                  {!task.is_milestone && ` - ${formatDate(task.actual_end_date)}`}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1">
                                <span className="w-7 text-[10px] text-slate-400">Baş:</span>
                                <input
                                  type="date"
                                  value={task.actual_start_date || ""}
                                  onChange={(e) => onUpdate(task.id, { actual_start_date: e.target.value || null })}
                                  className="rounded border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                                />
                              </div>
                              {!task.is_milestone && (
                                <div className="flex items-center gap-1">
                                  <span className="w-7 text-[10px] text-slate-400">Bit:</span>
                                  <input
                                    type="date"
                                    value={task.actual_end_date || ""}
                                    onChange={(e) => onUpdate(task.id, { actual_end_date: e.target.value || null })}
                                    className={`rounded border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white ${
                                      isCompleted && !task.actual_end_date ? "border-amber-400 bg-amber-50" : ""
                                    }`}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-3 align-middle text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Bağımlılıklar Butonu */}
                            <button
                              type="button"
                              onClick={() => onManageDependencies(task)}
                              className="btn btn-ghost btn-sm p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md cursor-pointer"
                              title="Görev Bağımlılıklarını Yönet / İncele"
                            >
                              <GitFork size={14} />
                            </button>

                            {!readOnly && (
                              <>
                                <button
                                  onClick={() => onEdit(task)}
                                  className="btn btn-ghost btn-sm p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md cursor-pointer"
                                  title="Görevi Düzenle"
                                >
                                  <Edit2 size={14} />
                                </button>
                                {!isCancelled ? (
                                  <button
                                    disabled={busyTaskId === task.id}
                                    onClick={() => onCancel(task)}
                                    className="btn btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-md cursor-pointer"
                                    title="Görevi İptal Et"
                                  >
                                    <Ban size={14} />
                                  </button>
                                ) : (
                                  <span className="text-[10px] font-bold text-red-600 px-1.5 py-0.5 bg-red-100 rounded">
                                    İptal
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

function AddTaskForm({
  projectId,
  initialPhase,
  onCreated,
  onError,
}: {
  projectId: number;
  initialPhase?: string;
  onCreated: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isMilestone, setIsMilestone] = useState(false);
  const [sorumlu, setSorumlu] = useState("");
  const [phase, setPhase] = useState(initialPhase || "");
  const [priority, setPriority] = useState("Orta");
  const [status, setStatus] = useState<string>(TASK_STATUSES[0]);
  const [plannedStart, setPlannedStart] = useState("");
  const [plannedEnd, setPlannedEnd] = useState("");
  const [actualStart, setActualStart] = useState("");
  const [actualEnd, setActualEnd] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createTask(projectId, {
        name,
        description: description || undefined,
        is_milestone: isMilestone,
        sorumlu: sorumlu || undefined,
        phase: phase || undefined,
        priority: priority || undefined,
        status,
        start_date: plannedStart || undefined,
        end_date: isMilestone ? plannedStart || undefined : plannedEnd || undefined,
        actual_start_date: actualStart || undefined,
        actual_end_date: isMilestone ? actualStart || undefined : actualEnd || undefined,
      });
      onCreated();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Görev oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Yeni Görev Girişi</span>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={isMilestone}
            onChange={(e) => setIsMilestone(e.target.checked)}
            className="h-4 w-4 rounded accent-indigo-600"
          />
          Bu bir Kilometre Taşı (Milestone)
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="field-label">Görev Adı</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Örn: Veri Tabanı Mimarisi" />
        </label>
        <label className="block">
          <span className="field-label">Sorumlu</span>
          <input value={sorumlu} onChange={(e) => setSorumlu(e.target.value)} className="input" placeholder="Kişi / Ekip" />
        </label>
        <label className="block">
          <span className="field-label">Proje Aşaması (Faz)</span>
          <select value={phase} onChange={(e) => setPhase(e.target.value)} className="input">
            <option value="">Seçiniz...</option>
            {PROJECT_PHASES_DETAILED.map((p) => (
              <option key={p.code} value={p.code}>
                {p.code} · {p.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="field-label">Öncelik</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="input">
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="field-label">Durum</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="field-label">{isMilestone ? "Planlanan Tarih" : "Planlanan Başlangıç"}</span>
          <input type="date" value={plannedStart} onChange={(e) => setPlannedStart(e.target.value)} className="input" />
        </label>
        {!isMilestone && (
          <label className="block">
            <span className="field-label">Planlanan Bitiş</span>
            <input type="date" value={plannedEnd} onChange={(e) => setPlannedEnd(e.target.value)} className="input" />
          </label>
        )}
        <label className="block">
          <span className="field-label">{isMilestone ? "Gerçekleşen Tarih" : "Gerçekleşen Başlangıç"}</span>
          <input type="date" value={actualStart} onChange={(e) => setActualStart(e.target.value)} className="input" />
        </label>
        {!isMilestone && (
          <label className="block">
            <span className="field-label">Gerçekleşen Bitiş</span>
            <input type="date" value={actualEnd} onChange={(e) => setActualEnd(e.target.value)} className="input" />
          </label>
        )}
      </div>

      <label className="block">
        <span className="field-label">Açıklama / Not (Opsiyonel)</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input" rows={2} placeholder="Görev detayları..." />
      </label>

      <button type="submit" disabled={submitting} className="btn btn-primary">
        <Plus size={15} />
        {submitting ? "Ekleniyor..." : "Görevi Ekle"}
      </button>
    </form>
  );
}

function EditTaskModal({
  task,
  onClose,
  onSaved,
  onDelete,
}: {
  task: Task;
  onClose: () => void;
  onSaved: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(task.name);
  const [description, setDescription] = useState(task.description || "");
  const [isMilestone, setIsMilestone] = useState(task.is_milestone);
  const [sorumlu, setSorumlu] = useState(task.sorumlu || "");
  const [phase, setPhase] = useState(task.phase || "");
  const [priority, setPriority] = useState(task.priority || "");
  const [status, setStatus] = useState(task.status);
  const [actualStart, setActualStart] = useState(task.actual_start_date || "");
  const [actualEnd, setActualEnd] = useState(task.actual_end_date || "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.updateTask(task.id, {
        name,
        description: description || null,
        is_milestone: isMilestone,
        sorumlu: sorumlu || null,
        phase: phase || null,
        priority: priority || null,
        status,
        actual_start_date: actualStart || null,
        actual_end_date: isMilestone ? actualStart || null : actualEnd || null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Görev güncellenemedi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Edit2 size={16} className="text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Görevi Düzenle</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block col-span-1 sm:col-span-2">
              <span className="field-label">Görev Adı</span>
              <input required value={name} onChange={(e) => setName(e.target.value)} className="input" />
            </label>
            <label className="block">
              <span className="field-label">Sorumlu</span>
              <input value={sorumlu} onChange={(e) => setSorumlu(e.target.value)} className="input" />
            </label>
            <label className="block">
              <span className="field-label">Proje Aşaması</span>
              <select value={phase} onChange={(e) => setPhase(e.target.value)} className="input">
                <option value="">Seç...</option>
                {PROJECT_PHASES_DETAILED.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code} · {p.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="field-label">Öncelik</span>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="input">
                <option value="">Seç...</option>
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="field-label">Durum</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Locked Planned Dates Notice */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <Lock size={13} className="text-slate-500" />
              <span>Planlanan Takvim (Kilitli):</span>
            </div>
            <p className="text-slate-500 font-mono pl-5">
              {formatDate(task.start_date)} {task.end_date ? `· ${formatDate(task.end_date)}` : ""}
            </p>
          </div>

          {/* Editable Actual Dates */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">{isMilestone ? "Gerçekleşen Tarih" : "Gerçekleşen Başlangıç"}</span>
              <input type="date" value={actualStart} onChange={(e) => setActualStart(e.target.value)} className="input" />
            </label>
            {!isMilestone && (
              <label className="block">
                <span className="field-label">Gerçekleşen Bitiş</span>
                <input type="date" value={actualEnd} onChange={(e) => setActualEnd(e.target.value)} className="input" />
              </label>
            )}
          </div>

          <label className="block">
            <span className="field-label">Açıklama / Not</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input" rows={2} />
          </label>

          {/* Action buttons and delete button placed securely at the bottom */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onDelete}
              className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50 hover:text-red-700"
              title="Görevi kalıcı olarak sil"
            >
              <Trash2 size={14} />
              Görevi Sil
            </button>

            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Vazgeç
              </button>
              <button type="submit" disabled={submitting} className="btn btn-primary">
                {submitting ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

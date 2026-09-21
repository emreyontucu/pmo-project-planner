"use client";

import { useState } from "react";
import { ArrowRight, Check, GitFork, Link2, Plus, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import type { Task, TaskDependency } from "@/lib/types";

interface Props {
  projectId: number;
  task: Task | null;
  allTasks: Task[];
  dependencies: TaskDependency[];
  isOpen: boolean;
  onClose: () => void;
  onChange: () => void;
  onError: (msg: string) => void;
  readOnly?: boolean;
}

export default function TaskDependencyModal({
  projectId,
  task,
  allTasks,
  dependencies,
  isOpen,
  onClose,
  onChange,
  onError,
  readOnly = false,
}: Props) {
  const [selectedPredecessorId, setSelectedPredecessorId] = useState<number | "">("");
  const [busy, setBusy] = useState(false);

  if (!isOpen || !task) return null;

  // Predecessors: tasks where this task is task_id (this task depends on them)
  const predecessorLinks = dependencies.filter((d) => d.task_id === task.id);
  const predecessorIds = new Set(predecessorLinks.map((d) => d.predecessor_id));

  // Successors: tasks where this task is predecessor_id (they depend on this task)
  const successorLinks = dependencies.filter((d) => d.predecessor_id === task.id);
  const successorIds = new Set(successorLinks.map((d) => d.task_id));

  // Candidate tasks to add as predecessor (cannot be self, cannot already be predecessor)
  const candidatePredecessors = allTasks.filter(
    (t) => t.id !== task.id && !predecessorIds.has(t.id) && !successorIds.has(t.id)
  );

  async function handleAddDependency(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPredecessorId || !task) return;

    setBusy(true);
    try {
      await api.createDependency(projectId, {
        task_id: task.id,
        predecessor_id: Number(selectedPredecessorId),
      });
      setSelectedPredecessorId("");
      onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Bağımlılık eklenemedi");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteDependency(depId: number) {
    setBusy(true);
    try {
      await api.deleteDependency(depId);
      onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Bağımlılık silinemedi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className="flex flex-col w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 text-white flex items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
              <GitFork size={13} />
              Görev Bağımlılıkları
            </span>
            <h3 className="text-base font-bold text-white leading-snug">
              {task.name}
            </h3>
            <div className="flex items-center gap-2 pt-0.5">
              {task.phase && (
                <span className="font-mono text-[10px] font-semibold bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded border border-indigo-400/20">
                  {task.phase}
                </span>
              )}
              <span className="text-xs text-slate-300">
                Süre: {task.duration} iş günü {task.sorumlu && `· Sorumlu: ${task.sorumlu}`}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 max-h-[65vh] overflow-y-auto bg-slate-50/50">
          
          {/* Predecessors (Öncüller) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-600" />
                Öncül Görevler (Önce Bitmesi Gerekenler)
              </h4>
              <span className="text-[11px] font-semibold text-slate-500">{predecessorLinks.length} adet</span>
            </div>

            {predecessorLinks.length === 0 ? (
              <p className="text-xs text-slate-400 bg-white p-3 rounded-xl border border-slate-200/70 italic">
                Bu görev doğrudan başlayabilir (tanımlı öncül görev yok).
              </p>
            ) : (
              <div className="space-y-1.5">
                {predecessorLinks.map((dep) => {
                  const predTask = allTasks.find((t) => t.id === dep.predecessor_id);
                  return (
                    <div
                      key={dep.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {predTask?.phase && (
                          <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                            {predTask.phase}
                          </span>
                        )}
                        <span className="font-semibold text-slate-900 truncate">
                          {predTask?.name ?? `Görev #${dep.predecessor_id}`}
                        </span>
                      </div>
                      {!readOnly && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDeleteDependency(dep.id)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors"
                          title="Bağımlılığı Kaldır"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Successors (Ardıllar) */}
          <div className="space-y-2 pt-2 border-t border-slate-200/80">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                Ardıl Görevler (Bu Göreve Bağlı Başlayacaklar)
              </h4>
              <span className="text-[11px] font-semibold text-slate-500">{successorLinks.length} adet</span>
            </div>

            {successorLinks.length === 0 ? (
              <p className="text-xs text-slate-400 bg-white p-3 rounded-xl border border-slate-200/70 italic">
                Bu görevin tamamlanmasını bekleyen başka bir görev yok.
              </p>
            ) : (
              <div className="space-y-1.5">
                {successorLinks.map((dep) => {
                  const succTask = allTasks.find((t) => t.id === dep.task_id);
                  return (
                    <div
                      key={dep.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {succTask?.phase && (
                          <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                            {succTask.phase}
                          </span>
                        )}
                        <span className="font-semibold text-slate-900 truncate">
                          {succTask?.name ?? `Görev #${dep.task_id}`}
                        </span>
                      </div>
                      {!readOnly && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDeleteDependency(dep.id)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors"
                          title="Bağımlılığı Kaldır"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add Predecessor Form (Planner Only) */}
          {!readOnly && candidatePredecessors.length > 0 && (
            <form onSubmit={handleAddDependency} className="pt-3 border-t border-slate-200/80 space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Yeni Öncül Görev Bağla:
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedPredecessorId}
                  onChange={(e) => setSelectedPredecessorId(e.target.value === "" ? "" : Number(e.target.value))}
                  className="input flex-1 py-1.5 text-xs bg-white cursor-pointer"
                >
                  <option value="">-- Öncül Görev Seçin --</option>
                  {candidatePredecessors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.phase ? `[${c.phase}] ` : ""}{c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={busy || !selectedPredecessorId}
                  className="btn btn-primary btn-sm bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                >
                  <Plus size={14} />
                  Bağla
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-end">
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

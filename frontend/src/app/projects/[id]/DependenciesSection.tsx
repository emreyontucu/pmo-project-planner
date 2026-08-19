"use client";

import { useState } from "react";
import { ArrowRight, GitBranch, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Task, TaskDependency } from "@/lib/types";

export default function DependenciesSection({
  projectId,
  tasks,
  dependencies,
  onChange,
  onError,
}: {
  projectId: number;
  tasks: Task[];
  dependencies: TaskDependency[];
  onChange: () => void;
  onError: (msg: string) => void;
}) {
  const [taskId, setTaskId] = useState("");
  const [predecessorId, setPredecessorId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const nameOf = (id: number) => tasks.find((t) => t.id === id)?.name ?? `#${id}`;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!taskId || !predecessorId) return;
    setSubmitting(true);
    try {
      await api.createDependency(projectId, { task_id: Number(taskId), predecessor_id: Number(predecessorId) });
      setTaskId("");
      setPredecessorId("");
      onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Bağımlılık eklenemedi");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.deleteDependency(id);
      onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Bağımlılık silinemedi");
    }
  }

  return (
    <section className="card p-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <GitBranch size={16} className="text-[var(--accent)]" />
        Bağımlılıklar
      </h2>

      {dependencies.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--muted)]">Henüz bağımlılık tanımlanmadı.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {dependencies.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-slate-50/60 px-4 py-2.5 text-sm"
            >
              <span className="flex flex-wrap items-center gap-1.5 text-slate-700">
                <span className="font-medium text-slate-900">{nameOf(d.predecessor_id)}</span>
                <ArrowRight size={13} className="text-[var(--muted)]" />
                <span className="font-medium text-slate-900">{nameOf(d.task_id)}</span>
                <span className="text-xs text-[var(--muted)]">bitmeden başlayamaz</span>
              </span>
              <button onClick={() => handleDelete(d.id)} className="btn btn-ghost btn-sm">
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {tasks.length >= 2 && (
        <form onSubmit={handleAdd} className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border)] bg-slate-50/60 p-4">
          <label className="text-sm">
            <span className="field-label">Bu görev</span>
            <select value={taskId} onChange={(e) => setTaskId(e.target.value)} className="input" required>
              <option value="">Seç...</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="field-label">şuna bağımlı</span>
            <select value={predecessorId} onChange={(e) => setPredecessorId(e.target.value)} className="input" required>
              <option value="">Seç...</option>
              {tasks
                .filter((t) => String(t.id) !== taskId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </label>
          <button type="submit" disabled={submitting} className="btn btn-primary">
            <Plus size={15} />
            Ekle
          </button>
        </form>
      )}
    </section>
  );
}

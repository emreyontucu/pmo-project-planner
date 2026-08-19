"use client";

import { useState } from "react";
import { Diamond, ListTodo, Plus, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { PROJECT_PHASES, TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import type { Task } from "@/lib/types";

const PRIORITY_STYLES: Record<string, string> = {
  Kritik: "bg-red-100 text-red-700",
  Yüksek: "bg-orange-100 text-orange-700",
  Orta: "bg-amber-100 text-amber-700",
  Düşük: "bg-slate-100 text-slate-600",
};

const STATUS_STYLES: Record<string, string> = {
  "Başlamadı": "bg-slate-100 text-slate-600",
  "Devam Ediyor": "bg-sky-100 text-sky-700",
  "Beklemede": "bg-amber-100 text-amber-700",
  "Tamamlandı": "bg-emerald-100 text-emerald-700",
  "İptal Edildi": "bg-red-100 text-red-700",
};

function phaseLabel(code: string | null) {
  if (!code) return null;
  const found = PROJECT_PHASES.find((p) => p.code === code || p.label === code);
  return found ? `${found.code} · ${found.label}` : code;
}

export default function TasksSection({
  projectId,
  tasks,
  onChange,
  onError,
  missingDateTaskIds,
}: {
  projectId: number;
  tasks: Task[];
  onChange: () => void;
  onError: (msg: string) => void;
  missingDateTaskIds: Set<number>;
}) {
  const [showForm, setShowForm] = useState(false);

  async function handleDelete(taskId: number) {
    if (!confirm("Bu görev silinsin mi?")) return;
    try {
      await api.deleteTask(taskId);
      onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Görev silinemedi");
    }
  }

  return (
    <section className="card p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ListTodo size={16} className="text-[var(--accent)]" />
          Görevler
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-[var(--muted)]">{tasks.length}</span>
        </h2>
        <button onClick={() => setShowForm((v) => !v)} className="btn btn-secondary btn-sm">
          {showForm ? <X size={14} /> : <Plus size={14} />}
          Task / Milestone
        </button>
      </div>

      {showForm && (
        <div className="mt-4">
          <AddTaskForm
            projectId={projectId}
            onCreated={() => {
              setShowForm(false);
              onChange();
            }}
            onError={onError}
          />
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--muted)]">Henüz görev yok.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-4 py-2.5">Ad</th>
                <th className="px-4 py-2.5">Öncelik</th>
                <th className="px-4 py-2.5">Durum</th>
                <th className="px-4 py-2.5">Sorumlu</th>
                <th className="px-4 py-2.5">Süre</th>
                <th className="px-4 py-2.5">Planlanan</th>
                <th className="px-4 py-2.5">Gerçekleşen</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {tasks.map((t) => (
                <tr key={t.id} className="align-top transition-colors hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 font-medium text-slate-900">
                      {t.is_milestone && <Diamond size={11} className="shrink-0 text-violet-600" />}
                      {t.name}
                    </div>
                    {phaseLabel(t.phase) && <div className="mt-0.5 text-xs text-[var(--muted)]">{phaseLabel(t.phase)}</div>}
                    {t.description ? (
                      <div className="mt-0.5 text-xs text-[var(--muted)]">{t.description}</div>
                    ) : (
                      <div className="mt-0.5 text-xs font-medium text-amber-600">not yok</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {t.priority ? (
                      <span className={`badge ${PRIORITY_STYLES[t.priority] ?? "bg-slate-100 text-slate-600"}`}>{t.priority}</span>
                    ) : (
                      <span className="text-xs text-[var(--muted)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STATUS_STYLES[t.status] ?? "bg-slate-100 text-slate-600"}`}>{t.status}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{t.sorumlu ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{t.is_milestone ? "-" : `${t.duration} gün`}</td>
                  <td className={`px-4 py-3 text-xs ${missingDateTaskIds.has(t.id) ? "font-medium text-amber-600" : "text-slate-600"}`}>
                    {t.start_date ?? "—"} → {t.end_date ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {t.actual_start_date ?? "—"} → {t.actual_end_date ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(t.id)} className="btn btn-ghost btn-sm">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AddTaskForm({
  projectId,
  onCreated,
  onError,
}: {
  projectId: number;
  onCreated: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isMilestone, setIsMilestone] = useState(false);
  const [sorumlu, setSorumlu] = useState("");
  const [phase, setPhase] = useState("");
  const [priority, setPriority] = useState("");
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
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-[var(--border)] bg-slate-50/60 p-4">
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={isMilestone}
          onChange={(e) => setIsMilestone(e.target.checked)}
          className="h-4 w-4 rounded accent-[var(--accent)]"
        />
        Bu bir Milestone
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
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
            {PROJECT_PHASES.map((p) => (
              <option key={p.code} value={p.code}>
                {p.code} · {p.label}
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
        <span className="field-label">Not</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input" rows={2} />
      </label>
      <button type="submit" disabled={submitting} className="btn btn-primary">
        <Plus size={15} />
        {submitting ? "Ekleniyor..." : "Ekle"}
      </button>
    </form>
  );
}

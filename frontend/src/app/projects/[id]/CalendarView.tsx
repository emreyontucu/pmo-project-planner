"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import type { CalendarDay, Task } from "@/lib/types";

const DAY_TYPE_STYLES: Record<CalendarDay["day_type"], string> = {
  WORK: "bg-white",
  WEEKEND: "bg-slate-200",
  HOLIDAY: "bg-red-200",
  BRIDGE: "bg-amber-200",
};

const WEEKDAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfMonth(year: number, month: number) {
  return new Date(year, month, 1);
}
function endOfMonth(year: number, month: number) {
  return new Date(year, month + 1, 0);
}

export default function CalendarView({ tasks, initialDate }: { tasks: Task[]; initialDate: string | null }) {
  const initial = initialDate ? parseISODate(initialDate) : new Date();
  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth());
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const start = toISODate(startOfMonth(year, month));
        const end = toISODate(endOfMonth(year, month));
        const data = await api.getCalendarDetails(start, end);
        if (!cancelled) {
          setDays(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Takvim yüklenemedi");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.start_date || !t.end_date) continue;
      const cur = parseISODate(t.start_date);
      const end = parseISODate(t.end_date);
      while (cur <= end) {
        const key = toISODate(cur);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(t);
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [tasks]);

  const dayInfoByDate = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    for (const d of days) map.set(d.date, d);
    return map;
  }, [days]);

  const weeks = useMemo(() => {
    const first = startOfMonth(year, month);
    const last = endOfMonth(year, month);
    const firstWeekday = (first.getDay() + 6) % 7; // Mon=0 .. Sun=6
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [year, month]);

  function prevMonth() {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  }
  function nextMonth() {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  }

  const monthLabel = new Date(year, month, 1).toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
  const todayIso = toISODate(new Date());

  return (
    <section className="card p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <CalendarDays size={16} className="text-[var(--accent)]" />
          Takvim
        </h2>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="btn btn-ghost btn-sm !px-2">
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[130px] text-center text-sm font-medium capitalize text-slate-700">{monthLabel}</span>
          <button onClick={nextMonth} className="btn btn-ghost btn-sm !px-2">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[var(--muted)]">
        <Legend swatch="bg-white border border-slate-300" label="İş günü" />
        <Legend swatch="bg-slate-200" label="Hafta sonu" />
        <Legend swatch="bg-red-200" label="Resmi tatil" />
        <Legend swatch="bg-amber-200" label="Köprü günü" />
        <Legend swatch="bg-sky-600" label="Task" />
        <Legend swatch="bg-violet-600" label="Milestone" />
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full table-fixed text-xs">
          <thead>
            <tr>
              {WEEKDAY_LABELS.map((w) => (
                <th key={w} className="border-b border-[var(--border)] bg-slate-50 px-1 py-2 font-medium text-[var(--muted)]">
                  {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wi) => (
              <tr key={wi}>
                {week.map((date, di) => {
                  if (!date) return <td key={di} className="h-24 border border-[var(--border)] bg-slate-50/60 p-1.5 align-top" />;
                  const iso = toISODate(date);
                  const info = dayInfoByDate.get(iso);
                  const dayTasks = tasksByDate.get(iso) ?? [];
                  const style = info ? DAY_TYPE_STYLES[info.day_type] : "bg-white";
                  const isToday = iso === todayIso;
                  return (
                    <td
                      key={di}
                      title={info?.warning ?? info?.name ?? ""}
                      className={`h-24 border border-[var(--border)] p-1.5 align-top ${style} ${isToday ? "ring-2 ring-inset ring-[var(--accent)]" : ""}`}
                    >
                      <div
                        className={`ml-auto flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-medium ${
                          isToday ? "bg-[var(--accent)] text-white" : "text-slate-600"
                        }`}
                      >
                        {date.getDate()}
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {dayTasks.slice(0, 3).map((t) => (
                          <div
                            key={t.id}
                            className={`truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white ${
                              t.is_milestone ? "bg-violet-600" : "bg-sky-600"
                            }`}
                          >
                            {t.is_milestone ? "◆ " : ""}
                            {t.name}
                          </div>
                        ))}
                        {dayTasks.length > 3 && <div className="text-[10px] text-[var(--muted)]">+{dayTasks.length - 3} daha</div>}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded-sm ${swatch}`} />
      {label}
    </span>
  );
}

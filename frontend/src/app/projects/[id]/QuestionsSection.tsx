"use client";

import { useState } from "react";
import { MessageCircleQuestion } from "lucide-react";
import { api } from "@/lib/api";
import type { PendingQuestion } from "@/lib/types";

export default function QuestionsSection({
  projectId,
  questions,
  onAnswered,
  onError,
}: {
  projectId: number;
  questions: PendingQuestion[];
  onAnswered: () => void;
  onError: (msg: string) => void;
}) {
  if (questions.length === 0) return null;

  return (
    <section className="card border-sky-200/70 bg-gradient-to-br from-sky-50 to-white p-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-sky-900">
        <MessageCircleQuestion size={17} />
        Eksik Bilgiler
        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">{questions.length}</span>
      </h2>
      <p className="mt-1 text-sm text-sky-800/80">
        Excel&apos;de yer almayan veya boş bırakılan bilgiler — cevapladıkça liste kısalır.
      </p>
      <ul className="mt-4 space-y-2.5">
        {questions.map((q) => (
          <QuestionRow key={q.key} projectId={projectId} question={q} onAnswered={onAnswered} onError={onError} />
        ))}
      </ul>
    </section>
  );
}

function QuestionRow({
  projectId,
  question,
  onAnswered,
  onError,
}: {
  projectId: number;
  question: PendingQuestion;
  onAnswered: () => void;
  onError: (msg: string) => void;
}) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(answer: string) {
    setSubmitting(true);
    try {
      await api.answerQuestion(projectId, question.key, answer);
      onAnswered();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Cevap kaydedilemedi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <li className="rounded-xl border border-sky-200 bg-white/90 px-4 py-3 shadow-sm shadow-sky-100">
      <p className="mb-2.5 text-sm font-medium text-slate-800">{question.text}</p>
      {question.choices ? (
        <div className="flex flex-wrap gap-2">
          {question.choices.map((choice) => (
            <button
              key={choice}
              disabled={submitting}
              onClick={() => submit(choice)}
              className="btn btn-secondary btn-sm disabled:opacity-50"
            >
              {choice}
            </button>
          ))}
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (value.trim()) submit(value.trim());
          }}
          className="flex gap-2"
        >
          <input value={value} onChange={(e) => setValue(e.target.value)} className="input" placeholder="Cevabınız" />
          <button type="submit" disabled={submitting} className="btn btn-primary btn-sm">
            Kaydet
          </button>
        </form>
      )}
    </li>
  );
}

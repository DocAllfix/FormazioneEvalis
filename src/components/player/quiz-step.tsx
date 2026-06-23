"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ClipboardCheck, Clock, Loader2, RotateCcw, X } from "lucide-react";
import { startMyQuizAction, submitMyQuizAction } from "@/features/learner/server-actions";

type Question = { id: string; text: string; options: { id: string; text: string }[] };
type Result = { score: number; passed: boolean; over: boolean };

function fmt(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function QuizStep({
  enrollmentId,
  quiz,
  label,
  onPassed,
}: {
  enrollmentId: string;
  quiz: { id: string; title: string; type: string; passed: boolean };
  label: string;
  onPassed: () => void;
}) {
  const isExam = quiz.type === "final";
  const [phase, setPhase] = useState<"idle" | "running" | "result">(
    quiz.passed ? "result" : "idle",
  );
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState(0);
  const [result, setResult] = useState<Result | null>(
    quiz.passed ? { score: 100, passed: true, over: false } : null,
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fired = useRef(quiz.passed);

  useEffect(() => {
    if (quiz.passed && !fired.current) {
      fired.current = true;
      onPassed();
    }
  }, [quiz.passed, onPassed]);

  const submit = useCallback(
    async (currentAttempt: string, currentAnswers: Record<string, string>) => {
      setLoading(true);
      setError("");
      try {
        const ans = Object.entries(currentAnswers).map(([questionId, optionId]) => ({
          questionId,
          optionId,
        }));
        const r = await submitMyQuizAction(currentAttempt, ans);
        setResult(r);
        setPhase("result");
        if (r.passed && !fired.current) {
          fired.current = true;
          onPassed();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Errore nell'invio.");
      } finally {
        setLoading(false);
      }
    },
    [onPassed],
  );

  // refs per il countdown (evita di resettare il timer a ogni risposta)
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const attemptRef = useRef(attemptId);
  attemptRef.current = attemptId;
  const submitRef = useRef(submit);
  submitRef.current = submit;

  useEffect(() => {
    if (phase !== "running") return;
    if (remaining <= 0) {
      if (attemptRef.current) void submitRef.current(attemptRef.current, answersRef.current);
      return;
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, remaining]);

  async function start() {
    setLoading(true);
    setError("");
    try {
      const data = await startMyQuizAction(enrollmentId, quiz.id);
      setAttemptId(data.attemptId);
      setQuestions(data.questions as Question[]);
      setAnswers({});
      setRemaining(data.timeLimitSeconds);
      setResult(null);
      setPhase("running");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossibile avviare il quiz.");
    } finally {
      setLoading(false);
    }
  }

  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id]);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <p className="text-xs uppercase tracking-wider text-primary">{label}</p>
      <h1 className="mt-2 font-heading text-3xl text-near-black">{quiz.title}</h1>

      {error && (
        <div className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* IDLE */}
      {phase === "idle" && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ClipboardCheck className="h-6 w-6" />
          </span>
          <p className="mt-4 text-sm text-muted-foreground">
            {isExam
              ? "Esame finale: rispondi alle domande entro il tempo. Al superamento il certificato va in revisione."
              : "Checkpoint: supera il quiz per proseguire. Domande a estrazione casuale."}
          </p>
          <button
            onClick={start}
            disabled={loading}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isExam ? "Inizia l'esame" : "Inizia il quiz"}
          </button>
        </div>
      )}

      {/* RUNNING */}
      {phase === "running" && (
        <div className="mt-6">
          <div className="mb-4 flex items-center justify-end gap-1.5 text-sm tabular-nums text-muted-foreground">
            <Clock className="h-4 w-4 text-primary" /> Tempo: {fmt(remaining)}
          </div>
          <ol className="space-y-5">
            {questions.map((q, qi) => (
              <li key={q.id} className="rounded-xl border border-border bg-card p-5">
                <p className="font-medium text-near-black">
                  {qi + 1}. {q.text}
                </p>
                <div className="mt-3 space-y-2">
                  {q.options.map((opt) => {
                    const selected = answers[q.id] === opt.id;
                    return (
                      <label
                        key={opt.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 text-sm transition ${
                          selected
                            ? "border-primary bg-primary/5 text-near-black"
                            : "border-border hover:bg-secondary/60"
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          checked={selected}
                          onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt.id }))}
                          className="accent-primary"
                        />
                        {opt.text}
                      </label>
                    );
                  })}
                </div>
              </li>
            ))}
          </ol>
          <button
            onClick={() => attemptId && submit(attemptId, answers)}
            disabled={loading || !allAnswered}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Invia risposte
          </button>
        </div>
      )}

      {/* RESULT */}
      {phase === "result" && result && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-center">
          <span
            className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
              result.passed ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            }`}
          >
            {result.passed ? <Check className="h-6 w-6" /> : <X className="h-6 w-6" />}
          </span>
          <h2 className="mt-4 font-heading text-2xl text-near-black">
            {result.passed ? "Superato" : result.over ? "Tempo scaduto" : "Non superato"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Punteggio: <span className="tabular-nums">{result.score}%</span>
          </p>
          {!result.passed && (
            <button
              onClick={start}
              disabled={loading}
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-near-black transition hover:bg-secondary disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Riprova
            </button>
          )}
        </div>
      )}
    </div>
  );
}

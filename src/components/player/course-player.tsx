"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Award, Check, FileQuestion, Lock } from "lucide-react";
import { SlideStep } from "./slide-step";
import { QuizStep } from "./quiz-step";
import { requestMyCertificateAction } from "@/features/learner/server-actions";

type Slide = {
  id: string;
  lessonId: string;
  moduleId: string;
  title: string;
  blocks: unknown;
  audioSeconds: number;
  hasClip: boolean;
  effectiveSeconds: number;
  completed: boolean;
};

type Quiz = {
  id: string;
  type: string;
  title: string;
  position: number;
  passed: boolean;
};

type Data = {
  course: { id: string; title: string; requiredMinutes: number };
  timer: { effectiveSeconds: number; requiredSeconds: number };
  slides: Slide[];
  quizzes: Quiz[];
};

type Step =
  | { key: string; kind: "slide"; slide: Slide; label: string }
  | { key: string; kind: "quiz"; quiz: Quiz; label: string };

// Sequenza del corso: slide della lezione → eventuale checkpoint → ... → esame finale.
// (Mono-modulo: il checkpoint con position = indice lezione segue quella lezione.)
function buildSteps(data: Data): Step[] {
  const lessons: { lessonId: string; slides: Slide[] }[] = [];
  for (const s of data.slides) {
    const last = lessons[lessons.length - 1];
    if (last && last.lessonId === s.lessonId) last.slides.push(s);
    else lessons.push({ lessonId: s.lessonId, slides: [s] });
  }
  const checkpoints = data.quizzes.filter((q) => q.type === "checkpoint");
  const final = data.quizzes.find((q) => q.type === "final");

  const steps: Step[] = [];
  lessons.forEach((lesson, li) => {
    lesson.slides.forEach((s) =>
      steps.push({ key: `s:${s.id}`, kind: "slide", slide: s, label: "Unità" }),
    );
    const cp = checkpoints.find((q) => q.position === li);
    if (cp) steps.push({ key: `q:${cp.id}`, kind: "quiz", quiz: cp, label: "Checkpoint" });
  });
  if (final) steps.push({ key: `q:${final.id}`, kind: "quiz", quiz: final, label: "Esame finale" });
  return steps;
}

export function CoursePlayer({
  enrollmentId,
  data,
}: {
  enrollmentId: string;
  data: Data;
}) {
  const steps = useMemo(() => buildSteps(data), [data]);
  const initialDone = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const st of steps) m[st.key] = st.kind === "slide" ? st.slide.completed : st.quiz.passed;
    return m;
  }, [steps]);

  const [doneMap, setDoneMap] = useState(initialDone);
  const [index, setIndex] = useState(() => {
    const i = steps.findIndex((st) => !initialDone[st.key]);
    return i === -1 ? Math.max(0, steps.length - 1) : i;
  });
  const [courseDone, setCourseDone] = useState(false);

  const markDone = useCallback((key: string) => {
    setDoneMap((m) => (m[key] ? m : { ...m, [key]: true }));
  }, []);

  const onSlideDone = useCallback((key: string) => markDone(key), [markDone]);

  const onQuizPassed = useCallback(
    async (st: Step) => {
      markDone(st.key);
      if (st.kind === "quiz" && st.quiz.type === "final") {
        // esame superato → predisposizione certificato (server: solo se a norma)
        await requestMyCertificateAction(enrollmentId).catch(() => {});
        setCourseDone(true);
      }
    },
    [enrollmentId, markDone],
  );

  const step = steps[index];
  const reachableMax = useMemo(() => {
    const i = steps.findIndex((st) => !doneMap[st.key]);
    return i === -1 ? steps.length - 1 : i;
  }, [steps, doneMap]);

  const currentDone = !!doneMap[step.key];
  const isLast = index === steps.length - 1;
  const canAdvance = currentDone && !isLast;

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-near-black"
        >
          <ArrowLeft className="h-4 w-4" /> Esci
        </Link>
        <span className="truncate px-4 font-heading text-near-black">{data.course.title}</span>
        <span className="text-sm tabular-nums text-muted-foreground">
          Passo {index + 1} di {steps.length}
        </span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {courseDone ? (
              <div className="mx-auto flex w-full max-w-xl flex-col items-center px-6 py-16 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
                  <Award className="h-8 w-8" />
                </span>
                <h1 className="mt-5 font-heading text-3xl text-near-black">Corso completato</h1>
                <p className="mt-2 max-w-sm text-muted-foreground">
                  Hai superato l&apos;esame finale. Il certificato è ora in revisione: lo riceverai
                  dopo l&apos;approvazione dello staff.
                </p>
                <div className="mt-6 flex gap-3">
                  <Link
                    href="/certificati"
                    className="inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
                  >
                    Vai ai certificati
                  </Link>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-near-black transition hover:bg-secondary"
                  >
                    Torna ai percorsi
                  </Link>
                </div>
              </div>
            ) : step.kind === "slide" ? (
              <SlideStep
                key={step.key}
                enrollmentId={enrollmentId}
                slide={step.slide}
                label={`${step.label} ${index + 1} di ${steps.length}`}
                onDone={() => onSlideDone(step.key)}
              />
            ) : (
              <QuizStep
                key={step.key}
                enrollmentId={enrollmentId}
                quiz={step.quiz}
                label={step.label}
                onPassed={() => onQuizPassed(step)}
              />
            )}
          </div>

          {!courseDone && (
            <div className="border-t border-border bg-background/95 px-6 py-3 backdrop-blur">
              <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4">
                <button
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  disabled={index === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-near-black transition hover:bg-secondary disabled:opacity-40"
                >
                  <ArrowLeft className="h-4 w-4" /> Indietro
                </button>
                <button
                  onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))}
                  disabled={!canAdvance}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-40"
                >
                  Avanti <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </main>

        <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-border bg-sidebar p-4 lg:block">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Indice
          </p>
          <ol className="space-y-1">
            {steps.map((st, i) => {
              const done = !!doneMap[st.key];
              const current = i === index && !courseDone;
              const locked = i > reachableMax;
              return (
                <li key={st.key}>
                  <button
                    onClick={() => !locked && !courseDone && setIndex(i)}
                    disabled={locked || courseDone}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${
                      current
                        ? "bg-sidebar-accent font-medium text-near-black"
                        : "text-muted-foreground hover:bg-sidebar-accent/60"
                    } ${locked ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                        done
                          ? "bg-success text-white"
                          : current
                            ? "bg-primary text-white"
                            : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {done ? (
                        <Check className="h-3 w-3" />
                      ) : locked ? (
                        <Lock className="h-2.5 w-2.5" />
                      ) : st.kind === "quiz" ? (
                        <FileQuestion className="h-3 w-3" />
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span className="truncate">
                      {st.kind === "slide" ? st.slide.title : st.quiz.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>
      </div>
    </div>
  );
}

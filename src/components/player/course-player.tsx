"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Clock, Lock } from "lucide-react";
import { BlockRenderer } from "./block-renderer";
import { useSlidePlayer } from "./use-slide-player";
import { getMyClipUrlAction } from "@/features/learner/server-actions";

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

type Data = {
  course: { id: string; title: string; requiredMinutes: number };
  timer: { effectiveSeconds: number; requiredSeconds: number };
  slides: Slide[];
  quizzes: { id: string; type: string; title: string; position: number }[];
};

function fmt(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function CoursePlayer({
  enrollmentId,
  data,
}: {
  enrollmentId: string;
  data: Data;
}) {
  const slides = data.slides;
  const [index, setIndex] = useState(() => {
    const i = slides.findIndex((s) => !s.completed);
    return i === -1 ? 0 : i;
  });
  const slide = slides[index];
  const [manifestUrl, setManifestUrl] = useState<string | null>(null);

  useEffect(() => {
    setManifestUrl(null);
    if (slide.hasClip) {
      getMyClipUrlAction(enrollmentId, slide.id)
        .then(setManifestUrl)
        .catch(() => {});
    }
  }, [slide.id, slide.hasClip, enrollmentId]);

  const player = useSlidePlayer({
    enrollmentId,
    slide: {
      id: slide.id,
      hasClip: slide.hasClip,
      audioSeconds: slide.audioSeconds,
      completed: slide.completed,
    },
    manifestUrl,
    heartbeatUrl: `/api/lessons/${enrollmentId}/heartbeat`,
  });

  const completedSet = useMemo(() => {
    const set = new Set(slides.filter((s) => s.completed).map((s) => s.id));
    if (player.completed) set.add(slide.id);
    return set;
  }, [slides, player.completed, slide.id]);

  const reachableMax = useMemo(() => {
    const firstIncomplete = slides.findIndex((s) => !completedSet.has(s.id));
    return firstIncomplete === -1 ? slides.length - 1 : firstIncomplete;
  }, [slides, completedSet]);

  const courseEffective = Math.max(
    0,
    data.timer.effectiveSeconds - slide.effectiveSeconds + player.serverEffectiveSeconds,
  );
  const canAdvance = player.completed && index < slides.length - 1;
  const minProgress = Math.min(
    100,
    Math.round((player.serverEffectiveSeconds / Math.max(1, slide.audioSeconds)) * 100),
  );

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-near-black"
        >
          <ArrowLeft className="h-4 w-4" /> Esci
        </Link>
        <span className="truncate px-4 font-heading text-near-black">
          {data.course.title}
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm tabular-nums text-muted-foreground">
          <Clock className="h-4 w-4 text-primary" />
          {fmt(courseEffective)} / {fmt(data.timer.requiredSeconds)}
        </span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl px-6 py-8">
              <p className="text-xs uppercase tracking-wider text-primary">
                Unità {index + 1} di {slides.length}
              </p>
              <h1 className="mt-2 font-heading text-3xl text-near-black">{slide.title}</h1>

              {slide.hasClip && (
                <div className="mt-6 overflow-hidden rounded-xl border border-border bg-near-black">
                  <video ref={player.videoRef} controls className="aspect-video w-full" />
                </div>
              )}

              <div className="mt-6">
                <BlockRenderer blocks={slide.blocks} />
              </div>
            </div>
          </div>

          <div className="border-t border-border bg-background/95 px-6 py-3 backdrop-blur">
            <div className="mx-auto flex w-full max-w-3xl items-center gap-4">
              <button
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-near-black transition hover:bg-secondary disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" /> Indietro
              </button>

              <div className="flex-1">
                {player.completed ? (
                  <p className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
                    <Check className="h-4 w-4" /> Unità completata
                  </p>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {player.visible
                          ? "Tempo minimo di fruizione"
                          : "In pausa: torna su questa scheda"}
                      </span>
                      <span className="tabular-nums">
                        {fmt(player.serverEffectiveSeconds)} / {fmt(slide.audioSeconds)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${minProgress}%` }}
                      />
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
                disabled={!canAdvance}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-40"
              >
                Avanti <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </main>

        <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-border bg-sidebar p-4 lg:block">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Indice
          </p>
          <ol className="space-y-1">
            {slides.map((s, i) => {
              const done = completedSet.has(s.id);
              const current = i === index;
              const locked = i > reachableMax;
              return (
                <li key={s.id}>
                  <button
                    onClick={() => !locked && setIndex(i)}
                    disabled={locked}
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
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span className="truncate">{s.title}</span>
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

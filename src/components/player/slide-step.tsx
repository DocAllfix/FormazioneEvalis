"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { BlockRenderer } from "./block-renderer";
import { useSlidePlayer } from "./use-slide-player";
import { getMyClipUrlAction } from "@/features/learner/server-actions";

type Slide = {
  id: string;
  title: string;
  blocks: unknown;
  audioSeconds: number;
  hasClip: boolean;
  completed: boolean;
};

function fmt(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function SlideStep({
  enrollmentId,
  slide,
  label,
  onDone,
}: {
  enrollmentId: string;
  slide: Slide;
  label: string;
  onDone: () => void;
}) {
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

  const fired = useRef(false);
  useEffect(() => {
    fired.current = false;
  }, [slide.id]);
  useEffect(() => {
    if (player.completed && !fired.current) {
      fired.current = true;
      onDone();
    }
  }, [player.completed, onDone]);

  const minProgress = Math.min(
    100,
    Math.round((player.serverEffectiveSeconds / Math.max(1, slide.audioSeconds)) * 100),
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <p className="text-xs uppercase tracking-wider text-primary">{label}</p>
      <h1 className="mt-2 font-heading text-3xl text-near-black">{slide.title}</h1>

      {slide.hasClip && (
        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-near-black">
          <video ref={player.videoRef} controls className="aspect-video w-full" />
        </div>
      )}

      <div className="mt-6">
        <BlockRenderer blocks={slide.blocks} />
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-4">
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
    </div>
  );
}

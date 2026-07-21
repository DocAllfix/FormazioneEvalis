"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { BlockRenderer } from "./block-renderer";
import { SlideHtml, DEFAULT_RATIO } from "./slide-html";
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

type HtmlBlock = { type: "html"; html: string };
function htmlBlockOf(blocks: unknown): HtmlBlock | null {
  if (!Array.isArray(blocks)) return null;
  const b = blocks.find((x) => x && typeof x === "object" && (x as { type?: string }).type === "html");
  return (b as HtmlBlock) ?? null;
}

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
    Math.round((player.displaySeconds / Math.max(1, slide.audioSeconds)) * 100),
  );

  const htmlBlock = htmlBlockOf(slide.blocks);
  // colore di sfondo della slide → tinge il gutter così l'avatar è integrato nel
  // campo-colore della slide (estensione della slide, non una striscia diversa).
  // Prende il background della <section> (la slide vera): l'HTML importato ha un
  // <body> con un suo background che NON è quello della slide → mai usare il primo match.
  const slideBg =
    htmlBlock?.html.match(/<section[^>]*background:\s*(#[0-9a-fA-F]{3,8})/)?.[1] ??
    htmlBlock?.html.match(/background:\s*(#[0-9a-fA-F]{3,8})/)?.[1] ??
    "#F4F3EF";

  // FIT-TO-SCREEN: la slide è scalata per stare INTERA nell'area disponibile
  // (come una vera presentazione), così non viene mai tagliata né va in scroll.
  // `ratio` arriva da SlideHtml (altezza adattiva per-slide).
  const areaRef = useRef<HTMLDivElement | null>(null);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [ratio, setRatio] = useState(DEFAULT_RATIO);
  useEffect(() => setRatio(DEFAULT_RATIO), [slide.id]);
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setArea({ w: r.width, h: r.height });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [htmlBlock]);
  // La slide non deve MAI riempire tutta la larghezza dello schermo (effetto "troppo
  // ingrandita"): la limitiamo a una frazione della larghezza disponibile, centrata, con
  // margine attorno — come la reference (slide4-check). Le slide "alte" (ratio piccolo)
  // restano comunque limitate dall'altezza, quindi non cambiano. Alza/abbassa
  // SLIDE_MAX_W_FRAC per avere la slide piu' grande / piu' piccola.
  const SLIDE_MAX_W_FRAC = 0.62;
  const boxW = area.w && area.h ? Math.floor(Math.min(area.w * SLIDE_MAX_W_FRAC, area.h * ratio)) : 0;

  // Avatar nel GUTTER sinistro: piccolo, piatto, sullo stesso sfondo della slide →
  // sembra parte della slide. Autoplay, niente controlli (si vede solo il relatore).
  const avatarOverlay = slide.hasClip ? (
    <div className="absolute left-[2%] top-[5%] z-10 w-[15%]">
      <div className="overflow-hidden rounded-xl shadow-md">
        {/* la clip è quadrata (540×540): aspect-square = nessuna banda nera */}
        <video ref={player.videoRef} autoPlay playsInline className="pointer-events-none aspect-square w-full object-cover" />
      </div>
    </div>
  ) : null;

  const statusBar = (
    <div className="shrink-0 px-4 pb-2 pt-1">
      {player.completed ? (
        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
          <Check className="h-4 w-4" /> Unità completata
        </p>
      ) : (
        <div className="flex items-center gap-3">
          <span className="shrink-0 text-xs text-muted-foreground">
            {player.recovering
              ? "Recupero dei secondi di visione mancanti…"
              : player.visible
                ? "Tempo minimo di fruizione"
                : "In pausa: torna su questa scheda"}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${minProgress}%` }} />
          </div>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {fmt(player.displaySeconds)} / {fmt(slide.audioSeconds)}
          </span>
        </div>
      )}
    </div>
  );

  if (htmlBlock) {
    return (
      <div className="flex h-full flex-col">
        <p className="shrink-0 px-4 pt-3 text-xs uppercase tracking-wider text-primary">{label}</p>
        <div ref={areaRef} className="flex min-h-0 flex-1 items-center justify-center px-4 py-2">
          <div className="relative" style={{ width: boxW || "100%", aspectRatio: String(ratio) }}>
            <div
              className="absolute inset-0 overflow-hidden rounded-2xl border border-border shadow-sm"
              style={{ backgroundColor: slideBg }}
            >
              <SlideHtml html={htmlBlock.html} bg={slideBg} onRatio={setRatio} />
            </div>
            {avatarOverlay}
          </div>
        </div>
        {statusBar}
      </div>
    );
  }

  return (
    <div className="mx-auto h-full w-full max-w-3xl overflow-y-auto px-6 py-8">
      <p className="text-xs uppercase tracking-wider text-primary">{label}</p>
      <h1 className="mt-2 font-heading text-3xl text-near-black">{slide.title}</h1>
      {slide.hasClip && (
        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-near-black">
          <video ref={player.videoRef} autoPlay playsInline className="aspect-video w-full" />
        </div>
      )}
      <div className="mt-6">
        <BlockRenderer blocks={slide.blocks} />
      </div>
      <div className="mt-6">{statusBar}</div>
    </div>
  );
}

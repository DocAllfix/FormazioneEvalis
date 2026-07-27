"use client";

// Anteprima-staff (C.2): rende UNA slide come la vede il discente (slide HTML + avatar in bolla),
// MA senza tracking né gating. Serve al controllo umano e all'automazione Playwright (C.3).
// Attributi per Playwright: data-preview-ready (montato), il <video data-preview-clip> per
// verificare la riproduzione (currentTime>0), data-has-clip per distinguere le slide statiche.

import { useCallback, useEffect, useRef, useState } from "react";
import { SlideHtml, SAFE_RATIO, TOTAL_W } from "@/components/player/slide-html";

export function PreviewPlayer({
  html,
  clipUrl,
  slideId,
  ratio: storedRatio,
}: {
  html: string;
  clipUrl: string | null;
  slideId: string;
  /** Ratio per-slide salvato nel blocco (dal server); assente → ratio di sicurezza. */
  ratio?: number;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ratio, setRatio] = useState(storedRatio && storedRatio > 0 ? storedRatio : SAFE_RATIO);
  const onRatio = useCallback((r: number) => {
    if (r > 0) setRatio((prev) => (Math.abs(prev - r) > 0.005 ? r : prev));
  }, []);

  // sfondo della slide (dalla <section>) per tingere il gutter dell'avatar
  const slideBg =
    html.match(/<section[^>]*background:\s*(#[0-9a-fA-F]{3,8})/)?.[1] ??
    html.match(/background:\s*(#[0-9a-fA-F]{3,8})/)?.[1] ??
    "#F4F3EF";

  useEffect(() => {
    if (!clipUrl) return;
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    let hls: { destroy: () => void } | null = null;
    void (async () => {
      const Hls = (await import("hls.js")).default;
      if (cancelled || !videoRef.current) return;
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = clipUrl;
      } else if (Hls.isSupported()) {
        const inst = new Hls();
        inst.loadSource(clipUrl);
        inst.attachMedia(video);
        hls = inst;
      }
      void video.play().catch(() => {});
    })();
    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [clipUrl]);

  return (
    <div
      data-preview-ready="1"
      data-has-clip={clipUrl ? "1" : "0"}
      data-slide-id={slideId}
      style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0b0c", padding: 24 }}
    >
      <div style={{ position: "relative", width: 1280, aspectRatio: String(ratio) }}>
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 16, background: slideBg }}>
          <SlideHtml html={html} bg={slideBg} ratio={ratio} scale={1280 / TOTAL_W} onRatio={onRatio} />
        </div>
        {clipUrl && (
          <div style={{ position: "absolute", left: "2%", top: "5%", width: "7%", zIndex: 10 }}>
            <div style={{ overflow: "hidden", borderRadius: 12 }}>
              {/* muted: l'autoplay headless è consentito solo muto */}
              <video
                ref={videoRef}
                data-preview-clip="1"
                autoPlay
                muted
                playsInline
                style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", pointerEvents: "none" }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

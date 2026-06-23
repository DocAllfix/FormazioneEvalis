"use client";

// Hook player per UNA slide. Gestisce due modalità con lo STESSO gate puro
// (controller.ts): VIDEO (hls.js + eventi + snap-back anti-seek) e LETTURA
// ("video virtuale": +1s/sec solo a tab visibile). Manda heartbeat COMPLETI
// (enrollmentId + audioCompleted) e usa il `completed` di ritorno del server
// come verità per sbloccare "Avanti". Nessuna logica di compliance nel client.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  canCompleteSlide,
  illegalSeekTarget,
  initSlideGate,
  reduceSlideGate,
  type PlayerEvent,
  type SlideGateState,
} from "@/features/player/controller";

interface SlideArg {
  id: string;
  hasClip: boolean;
  audioSeconds: number;
  completed: boolean;
}

interface Opts {
  enrollmentId: string;
  slide: SlideArg;
  manifestUrl: string | null; // valorizzato dal parent solo per slide video
  heartbeatUrl: string;
}

export function useSlidePlayer({ enrollmentId, slide, manifestUrl, heartbeatUrl }: Opts) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stateRef = useRef<SlideGateState>(initSlideGate(slide.audioSeconds));
  const [snapshot, setSnapshot] = useState<SlideGateState>(stateRef.current);
  const [serverEffectiveSeconds, setServerEffectiveSeconds] = useState(slide.completed ? slide.audioSeconds : 0);
  const [completed, setCompleted] = useState(slide.completed);

  const dispatch = useCallback((e: PlayerEvent) => {
    stateRef.current = reduceSlideGate(stateRef.current, e);
    setSnapshot(stateRef.current);
  }, []);

  // reset al cambio slide
  useEffect(() => {
    stateRef.current = initSlideGate(slide.audioSeconds);
    setSnapshot(stateRef.current);
    setServerEffectiveSeconds(slide.completed ? slide.audioSeconds : 0);
    setCompleted(slide.completed);
  }, [slide.id, slide.audioSeconds, slide.completed]);

  // invio heartbeat: fetch (ritorna lo stato server) o sendBeacon (unload)
  const sendHeartbeat = useCallback(
    async (beacon = false) => {
      const s = stateRef.current;
      const body = JSON.stringify({
        enrollmentId,
        slideId: slide.id,
        position: Math.floor(s.lastPosition),
        focus: s.visible,
        playing: s.playing,
        audioCompleted: s.audioCompleted,
      });
      if (beacon) {
        navigator.sendBeacon?.(heartbeatUrl, new Blob([body], { type: "application/json" }));
        return;
      }
      try {
        const res = await fetch(heartbeatUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
          keepalive: true,
        });
        if (res.ok) {
          const data = (await res.json()) as { effectiveSeconds: number; completed: boolean };
          setServerEffectiveSeconds(data.effectiveSeconds);
          setCompleted(data.completed);
        }
      } catch {
        // rete instabile: il prossimo heartbeat riallinea
      }
    },
    [enrollmentId, slide.id, heartbeatUrl],
  );

  // --- MODALITÀ VIDEO: hls.js + eventi media + snap-back ---
  useEffect(() => {
    if (!slide.hasClip || !manifestUrl) return;
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    let hls: { destroy: () => void } | null = null;

    void (async () => {
      const Hls = (await import("hls.js")).default;
      if (cancelled || !videoRef.current) return;
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = manifestUrl;
      } else if (Hls.isSupported()) {
        const instance = new Hls();
        instance.loadSource(manifestUrl);
        instance.attachMedia(video);
        hls = instance;
      }
    })();

    const onPlay = () => dispatch({ type: "play" });
    const onPause = () => dispatch({ type: "pause" });
    const onEnded = () => dispatch({ type: "ended" });
    const onTime = () => dispatch({ type: "timeupdate", position: Math.floor(video.currentTime) });
    const onSeeking = () => {
      const target = illegalSeekTarget(stateRef.current, Math.floor(video.currentTime));
      if (target !== null) video.currentTime = target; // niente skip in avanti
    };
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("seeking", onSeeking);
    return () => {
      cancelled = true;
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("seeking", onSeeking);
      hls?.destroy();
    };
  }, [slide.hasClip, manifestUrl, dispatch]);

  // --- MODALITÀ LETTURA: +1s/sec solo a tab visibile ---
  useEffect(() => {
    if (slide.hasClip) return;
    dispatch({ type: "play" }); // la lettura "parte" subito
    const id = setInterval(() => {
      const s = stateRef.current;
      if (s.audioCompleted) return; // lettura completata: stop accredito (no ballooning)
      if (!s.visible) return; // niente accredito a tab nascosta
      const nextPos = s.lastPosition + 1;
      dispatch({ type: "timeupdate", position: nextPos });
      if (nextPos >= slide.audioSeconds) dispatch({ type: "ended" });
    }, 1000);
    return () => clearInterval(id);
  }, [slide.hasClip, slide.id, slide.audioSeconds, dispatch]);

  // presenza (anti-AFK / cambio tab)
  useEffect(() => {
    const onVis = () =>
      dispatch({ type: "visibility", visible: document.visibilityState === "visible" });
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [dispatch]);

  // heartbeat periodico (fetch) finché la slide non è completata + beacon su uscita.
  // A completamento server (`completed`) si ferma: niente heartbeat/DB write inutili.
  useEffect(() => {
    const id = completed ? null : setInterval(() => void sendHeartbeat(false), 10_000);
    const onHide = () => {
      if (document.visibilityState === "hidden") void sendHeartbeat(true);
    };
    const onPageHide = () => void sendHeartbeat(true);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      if (id) clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [completed, sendHeartbeat]);

  // appena il client pensa di poter completare, conferma subito col server
  useEffect(() => {
    if (canCompleteSlide(snapshot) && !completed) void sendHeartbeat(false);
  }, [snapshot, completed, sendHeartbeat]);

  return {
    videoRef,
    visible: snapshot.visible,
    serverEffectiveSeconds,
    minSeconds: slide.audioSeconds,
    completed, // server-authoritative
  };
}

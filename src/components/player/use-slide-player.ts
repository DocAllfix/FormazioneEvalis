"use client";

// Hook player per UNA slide. Gestisce due modalità con lo STESSO gate puro
// (controller.ts): VIDEO (hls.js + eventi + snap-back anti-seek) e LETTURA
// ("video virtuale": +1s/sec solo a tab visibile). Manda heartbeat COMPLETI
// (enrollmentId + audioCompleted) e usa il `completed` di ritorno del server
// come verità per sbloccare "Avanti". Nessuna logica di compliance nel client.

import { useCallback, useEffect, useRef, useState } from "react";
import {
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
  const baselineRef = useRef(false); // primo heartbeat (baseline) inviato all'avvio
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
    baselineRef.current = false;
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

    const tryPlay = () => void video.play().catch(() => {});

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
      tryPlay();
    })();

    // autoplay: appena pronto; fallback al primo gesto utente se il browser lo blocca
    const onCanPlay = () => tryPlay();
    const onGesture = () => tryPlay();
    video.addEventListener("canplay", onCanPlay);
    window.addEventListener("pointerdown", onGesture, { once: true });
    window.addEventListener("keydown", onGesture, { once: true });

    const onPlay = () => {
      dispatch({ type: "play" });
      // heartbeat baseline all'avvio: senza, il primo intervallo non si accredita
      if (!baselineRef.current) {
        baselineRef.current = true;
        void sendHeartbeat(false);
      }
    };
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
      video.removeEventListener("canplay", onCanPlay);
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("seeking", onSeeking);
      hls?.destroy();
    };
  }, [slide.hasClip, manifestUrl, dispatch, sendHeartbeat]);

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

  // presenza — cambio scheda / minimizzazione (Page Visibility API).
  // A scheda NASCOSTA: prima manda un heartbeat che CREDITA fin qui (focus e play ancora
  // attivi: così i secondi guardati appena prima del cambio non si perdono), POI marca nascosto
  // e METTE IN PAUSA il video. Al RITORNO: marca visibile, riprende da dov'era e manda un
  // heartbeat "baseline" fresco (così i secondi guardati subito dopo il ritorno vengono
  // accreditati anche se il browser aveva rallentato i timer in background).
  // Effetto: la posizione avanza SOLO mentre guardi e ogni secondo guardato viene contato →
  // un utente che guarda tutto COMPLETA sempre, niente stallo per cambio scheda.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        void sendHeartbeat(true);
        dispatch({ type: "visibility", visible: false });
        videoRef.current?.pause();
      } else {
        dispatch({ type: "visibility", visible: true });
        const v = videoRef.current;
        if (v && slide.hasClip && !v.ended) void v.play().catch(() => {});
        void sendHeartbeat(false);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [dispatch, slide.hasClip, sendHeartbeat]);

  // heartbeat periodico (fetch) finché la slide non è completata + beacon su chiusura pagina.
  // A completamento server (`completed`) si ferma: niente heartbeat/DB write inutili.
  useEffect(() => {
    const id = completed ? null : setInterval(() => void sendHeartbeat(false), 5_000);
    const onPageHide = () => void sendHeartbeat(true);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      if (id) clearInterval(id);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [completed, sendHeartbeat]);

  // a clip finita conferma col server (che valida il tempo effettivo e completa)
  useEffect(() => {
    if (snapshot.audioCompleted && !completed) void sendHeartbeat(false);
  }, [snapshot.audioCompleted, completed, sendHeartbeat]);

  // RETE DI SICUREZZA LEGGERA (manuale, niente loop automatico). Con la nuova contabilità chi
  // guarda tutto completa da solo; ma se in un caso raro (buffer pesante) alla fine manca ancora
  // qualche secondo, questo pulsante fa riavvolgere di 30s e riguardare: accredita solo visione
  // reale in più, non sblocca nulla. La verità resta il server.
  const replay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const dur = v.duration && isFinite(v.duration) ? v.duration : slide.audioSeconds;
    try {
      v.currentTime = Math.max(0, dur - 30);
    } catch {
      /* seek non disponibile */
    }
    void v.play().catch(() => {});
  }, [slide.audioSeconds]);

  return {
    videoRef,
    visible: snapshot.visible,
    // in recupero: audio finito ma il server non ha ancora completato (raro col nuovo conteggio)
    recovering: snapshot.audioCompleted && !completed,
    replay,
    serverEffectiveSeconds,
    // valore mostrato: client (fluido, ogni secondo) ma mai oltre il minimo
    displaySeconds: Math.min(slide.audioSeconds, Math.max(serverEffectiveSeconds, snapshot.effectiveSeconds)),
    minSeconds: slide.audioSeconds,
    completed, // server-authoritative
  };
}

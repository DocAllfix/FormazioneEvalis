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

// Soglia tempo minimo usata SOLO dalla rete di sicurezza client (quanti secondi far
// recuperare). Deve combaciare con MIN_WATCH_RATIO del server (features/tracking/progress.ts).
// La verità sul completamento resta comunque il server.
const MIN_WATCH_RATIO_CLIENT = 0.95;

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
  // Quando la scheda NON è in primo piano METTE IN PAUSA il video: così la posizione avanza
  // SOLO mentre guardi davvero, e il gate smette di accreditare (visible=false + video in
  // pausa => il timer si ferma INSIEME al video). Al ritorno riprende da dov'era.
  // Conseguenza chiave (anti-stallo): il video non può arrivare alla fine senza aver maturato
  // il tempo → il caso "video finito ma timer indietro" per cambio scheda non può più accadere.
  useEffect(() => {
    const onVis = () => {
      const visible = document.visibilityState === "visible";
      dispatch({ type: "visibility", visible });
      const v = videoRef.current;
      if (!v || !slide.hasClip) return;
      if (!visible) v.pause();
      else if (!v.ended) void v.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [dispatch, slide.hasClip]);

  // heartbeat periodico (fetch) finché la slide non è completata + beacon su uscita.
  // A completamento server (`completed`) si ferma: niente heartbeat/DB write inutili.
  useEffect(() => {
    const id = completed ? null : setInterval(() => void sendHeartbeat(false), 5_000);
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

  // a clip finita conferma col server (che valida il tempo effettivo e completa)
  useEffect(() => {
    if (snapshot.audioCompleted && !completed) void sendHeartbeat(false);
  }, [snapshot.audioCompleted, completed, sendHeartbeat]);

  // RETE DI SICUREZZA anti-stallo (solo modalità VIDEO). La pausa su cambio scheda elimina la
  // causa principale, ma nell'istante esatto del cambio (o per buffering su rete lenta) possono
  // sfuggire pochi secondi: il video finirebbe con il tempo effettivo appena sotto la soglia e
  // resterebbe bloccato PER SEMPRE. Qui, se la clip è ferma sulla fine ma il server non ha
  // ancora completato, si RIGUARDA solo la coda mancante (riavvolgendo di quanto manca) finché
  // la soglia non è raggiunta. Non sblocca nulla: accredita solo visione reale in più (il minimo
  // lato server resta identico). Deadlock matematicamente impossibile.
  useEffect(() => {
    if (!slide.hasClip || completed || !snapshot.audioCompleted) return;
    const v = videoRef.current;
    if (!v || !v.ended) return; // agisce solo a clip FERMA sulla fine, mai durante il replay
    const dur = v.duration && isFinite(v.duration) ? v.duration : slide.audioSeconds;
    const required = Math.max(3, Math.floor(dur * MIN_WATCH_RATIO_CLIENT));
    const missing = required - serverEffectiveSeconds;
    if (missing <= 0) return; // basta: il server completerà al prossimo heartbeat
    const target = Math.max(0, dur - (missing + 8)); // riguarda solo la coda mancante (+8s margine)
    try {
      v.currentTime = target;
    } catch {
      /* seek non disponibile: riparte comunque da dov'è */
    }
    void v.play().catch(() => {});
  }, [slide.hasClip, slide.audioSeconds, completed, snapshot.audioCompleted, serverEffectiveSeconds]);

  return {
    videoRef,
    visible: snapshot.visible,
    // in recupero: audio finito ma il server non ha ancora completato (si sta riguardando la coda)
    recovering: snapshot.audioCompleted && !completed,
    serverEffectiveSeconds,
    // valore mostrato: client (fluido, ogni secondo) ma mai oltre il minimo
    displaySeconds: Math.min(slide.audioSeconds, Math.max(serverEffectiveSeconds, snapshot.effectiveSeconds)),
    minSeconds: slide.audioSeconds,
    completed, // server-authoritative
  };
}

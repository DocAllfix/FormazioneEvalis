"use client";

// Hook React di RIFERIMENTO: collega il controller puro a <video>+hls.js, alla
// Page Visibility API e all'invio heartbeat (sendBeacon). Il frontend costruisce la UI
// e consuma questo hook (o lo adatta); nessuna logica di compliance vive nella UI.

import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  initSlideGate,
  reduceSlideGate,
  canCompleteSlide,
  illegalSeekTarget,
  type PlayerEvent,
  type SlideGateState,
} from "./controller";

interface Options {
  slideId: string;
  minSeconds: number;
  manifestUrl: string;
  heartbeatUrl: string;
  heartbeatIntervalMs?: number;
}

export function useCoursePlayer(opts: Options) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stateRef = useRef<SlideGateState>(initSlideGate(opts.minSeconds));
  const [snapshot, setSnapshot] = useState<SlideGateState>(stateRef.current);

  const dispatch = useCallback((e: PlayerEvent) => {
    stateRef.current = reduceSlideGate(stateRef.current, e);
    setSnapshot(stateRef.current);
  }, []);

  // reset al cambio slide
  useEffect(() => {
    stateRef.current = initSlideGate(opts.minSeconds);
    setSnapshot(stateRef.current);
  }, [opts.slideId, opts.minSeconds]);

  // hls + eventi media
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let hls: Hls | null = null;
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = opts.manifestUrl;
    } else if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(opts.manifestUrl);
      hls.attachMedia(video);
    }
    const onPlay = () => dispatch({ type: "play" });
    const onPause = () => dispatch({ type: "pause" });
    const onEnded = () => dispatch({ type: "ended" });
    const onTime = () => dispatch({ type: "timeupdate", position: Math.floor(video.currentTime) });
    const onSeeking = () => {
      const target = illegalSeekTarget(stateRef.current, Math.floor(video.currentTime));
      if (target !== null) video.currentTime = target; // snap-back: niente skip in avanti
    };
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("seeking", onSeeking);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("seeking", onSeeking);
      hls?.destroy();
    };
  }, [opts.manifestUrl, dispatch]);

  // presenza (anti-AFK)
  useEffect(() => {
    const onVis = () =>
      dispatch({ type: "visibility", visible: document.visibilityState === "visible" });
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [dispatch]);

  // heartbeat affidabili
  useEffect(() => {
    const interval = opts.heartbeatIntervalMs ?? 12000;
    const id = setInterval(() => {
      const s = stateRef.current;
      const body = JSON.stringify({
        slideId: opts.slideId,
        position: s.lastPosition,
        focus: s.visible,
        playing: s.playing,
      });
      navigator.sendBeacon?.(opts.heartbeatUrl, new Blob([body], { type: "application/json" }));
    }, interval);
    return () => clearInterval(id);
  }, [opts.slideId, opts.heartbeatUrl, opts.heartbeatIntervalMs]);

  return {
    videoRef,
    effectiveSeconds: snapshot.effectiveSeconds,
    audioCompleted: snapshot.audioCompleted,
    canComplete: canCompleteSlide(snapshot),
  };
}

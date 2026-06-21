// Controller antifrode della slide — LOGICA PURA, framework-agnostic e testabile.
// Accredita i secondi effettivi SOLO quando: in riproduzione + tab visibile +
// avanzamento legittimo (nessun salto). Segna il completamento audio (clip finita)
// e fornisce il punto di "snap-back" per bloccare il seek in avanti.
// La verità definitiva resta comunque il ricalcolo lato server (heartbeat).

export const MAX_STEP_SECONDS = 2; // tolleranza tra due timeupdate consecutivi

export interface SlideGateState {
  minSeconds: number;
  effectiveSeconds: number;
  lastPosition: number;
  maxValidated: number;
  playing: boolean;
  visible: boolean;
  audioCompleted: boolean;
}

export function initSlideGate(minSeconds: number): SlideGateState {
  return {
    minSeconds,
    effectiveSeconds: 0,
    lastPosition: 0,
    maxValidated: 0,
    playing: false,
    visible: true,
    audioCompleted: false,
  };
}

export type PlayerEvent =
  | { type: "play" }
  | { type: "pause" }
  | { type: "visibility"; visible: boolean }
  | { type: "timeupdate"; position: number }
  | { type: "ended" };

export function reduceSlideGate(s: SlideGateState, e: PlayerEvent): SlideGateState {
  switch (e.type) {
    case "play":
      return { ...s, playing: true };
    case "pause":
      return { ...s, playing: false };
    case "visibility":
      return { ...s, visible: e.visible };
    case "ended":
      return { ...s, audioCompleted: true };
    case "timeupdate": {
      const delta = e.position - s.lastPosition;
      // legittimo solo se in play, visibile, e avanzamento "naturale" (0 < delta ≤ soglia)
      const legit = s.playing && s.visible && delta > 0 && delta <= MAX_STEP_SECONDS;
      return {
        ...s,
        effectiveSeconds: legit ? s.effectiveSeconds + delta : s.effectiveSeconds,
        maxValidated: legit ? Math.max(s.maxValidated, e.position) : s.maxValidated,
        lastPosition: e.position,
      };
    }
  }
}

/** La slide è completabile solo se l'audio è finito E il tempo minimo è stato raggiunto. */
export function canCompleteSlide(s: SlideGateState): boolean {
  return s.audioCompleted && s.effectiveSeconds >= s.minSeconds;
}

/** Se l'utente prova a saltare oltre il validato, ritorna il punto a cui riportarlo (snap-back). */
export function illegalSeekTarget(s: SlideGateState, attemptedPosition: number): number | null {
  return attemptedPosition > s.maxValidated + MAX_STEP_SECONDS ? s.maxValidated : null;
}

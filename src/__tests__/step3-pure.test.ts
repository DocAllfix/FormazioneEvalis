// Test della logica PURA dello Step 3: controller antifrode, crediting heartbeat,
// correzione quiz, limite di tempo. Nessun DB.

import { describe, it, expect } from "vitest";
import {
  initSlideGate,
  reduceSlideGate,
  canCompleteSlide,
  illegalSeekTarget,
  type SlideGateState,
} from "../features/player/controller";
import { creditableSeconds } from "../features/tracking/progress";
import { gradeAnswers, isOverTimeLimit } from "../features/quiz/engine";

function play(state: SlideGateState, positions: number[]): SlideGateState {
  let s = reduceSlideGate(state, { type: "play" });
  for (const p of positions) s = reduceSlideGate(s, { type: "timeupdate", position: p });
  return s;
}

describe("controller slide", () => {
  it("accredita i secondi solo con avanzamento naturale", () => {
    let s = play(initSlideGate(3), [1, 2, 3]);
    expect(s.effectiveSeconds).toBe(3);
    s = reduceSlideGate(s, { type: "ended" });
    expect(canCompleteSlide(s)).toBe(true);
  });

  it("non accredita il salto in avanti e non sblocca", () => {
    let s = play(initSlideGate(40), [40]); // un solo timeupdate a 40 = salto
    expect(s.effectiveSeconds).toBe(0);
    s = reduceSlideGate(s, { type: "ended" });
    expect(canCompleteSlide(s)).toBe(false);
    expect(illegalSeekTarget(s, 40)).toBe(0); // snap-back a maxValidated=0
  });

  it("non accredita quando la tab non è visibile", () => {
    let s = reduceSlideGate(initSlideGate(5), { type: "play" });
    s = reduceSlideGate(s, { type: "visibility", visible: false });
    s = reduceSlideGate(s, { type: "timeupdate", position: 1 });
    expect(s.effectiveSeconds).toBe(0);
  });
});

describe("creditableSeconds (server)", () => {
  const base = { prevTsMs: 0, prevFocus: true, prevPosition: 0, focus: true, playing: true };
  it("accredita l'avanzamento coerente", () => {
    expect(creditableSeconds({ ...base, nowMs: 12000, position: 12 })).toBe(12);
  });
  it("rifiuta il salto in avanti", () => {
    expect(creditableSeconds({ ...base, nowMs: 12000, position: 120 })).toBe(0);
  });
  it("rifiuta il salto indietro", () => {
    expect(creditableSeconds({ ...base, prevPosition: 10, nowMs: 12000, position: 5 })).toBe(0);
  });
  it("rifiuta se non in play", () => {
    expect(creditableSeconds({ ...base, playing: false, nowMs: 12000, position: 12 })).toBe(0);
  });
  it("rifiuta il primo heartbeat e i gap lunghi", () => {
    expect(creditableSeconds({ ...base, prevTsMs: null, prevPosition: null, nowMs: 12000, position: 12 })).toBe(0);
    expect(creditableSeconds({ ...base, nowMs: 40000, position: 40 })).toBe(0);
  });
});

describe("quiz", () => {
  const drawn = [
    { id: "q1", correctOptionId: "a" },
    { id: "q2", correctOptionId: "b" },
  ];
  it("corregge sul server", () => {
    expect(gradeAnswers(drawn, [{ questionId: "q1", optionId: "a" }, { questionId: "q2", optionId: "b" }]).score).toBe(100);
    expect(gradeAnswers(drawn, [{ questionId: "q1", optionId: "a" }, { questionId: "q2", optionId: "a" }]).score).toBe(50);
  });
  it("applica il limite di tempo", () => {
    expect(isOverTimeLimit(0, 10_000, 5)).toBe(true);
    expect(isOverTimeLimit(0, 4_000, 5)).toBe(false);
    expect(isOverTimeLimit(0, 10_000, 0)).toBe(false); // 0 = nessun limite
  });
});

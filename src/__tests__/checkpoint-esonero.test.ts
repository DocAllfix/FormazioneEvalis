import { describe, expect, it } from "vitest";
import { checkpointNonRetroattivo } from "../features/courses/checkpoint-esonero";

const prima = new Date("2026-10-03T10:00:00Z");
const dopo = new Date("2026-10-07T10:00:00Z");
// corso a 6 lezioni (una per modulo): checkpoint dopo le lezioni 0..5
const tutteFatte = [0, 1, 2, 3, 4, 5].map((i) => ({ indiceLezione: i, completedAt: prima }));

describe("checkpointNonRetroattivo", () => {
  it("chi aveva finito il corso e iniziato l'esame prima della correzione non riceve checkpoint arretrati", () => {
    for (const p of [1, 2, 3, 4, 5]) {
      expect(checkpointNonRetroattivo(p, tutteFatte, new Date("2026-10-06T08:39:41Z"))).toBe(true);
    }
  });

  it("chi è a metà del modulo 2 trova il checkpoint 2 al suo posto, e quelli dopo", () => {
    const meta = [
      { indiceLezione: 0, completedAt: prima },
      { indiceLezione: 1, completedAt: prima },
      { indiceLezione: 1, completedAt: null },
    ];
    expect(checkpointNonRetroattivo(0, meta, null)).toBe(true); // già oltre: non chiesto a posteriori
    expect(checkpointNonRetroattivo(1, meta, null)).toBe(false);
    expect(checkpointNonRetroattivo(5, meta, null)).toBe(false);
  });

  it("chi inizia o avanza dopo la correzione fa tutti i checkpoint", () => {
    const nuovo = [0, 1, 2].map((i) => ({ indiceLezione: i, completedAt: dopo }));
    expect(checkpointNonRetroattivo(0, nuovo, dopo)).toBe(false);
    expect(checkpointNonRetroattivo(1, nuovo, null)).toBe(false);
  });
});

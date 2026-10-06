import { describe, expect, it } from "vitest";
import { problemiSequenzaPlayer, type CorsoStruttura, type QuizStruttura } from "../features/courses/integrita";

const q = (id: string, type: string, position: number, extra: Partial<QuizStruttura> = {}): QuizStruttura => ({
  id, type, title: id, position, questionsToDraw: 5, passThreshold: 80, timeLimitSeconds: 600,
  cooldownSeconds: 60, maxAttempts: null, bancaDomande: 10, ...extra,
});
// 3 lezioni da 2 slide
const slide = [0, 1, 2].flatMap((l) => [0, 1].map((k) => ({ id: `s${l}${k}`, lessonId: `L${l}` })));
const corso = (quiz: QuizStruttura[]): CorsoStruttura => ({ slide, quiz });

describe("problemiSequenzaPlayer", () => {
  it("corso sano: nessun problema", () => {
    expect(problemiSequenzaPlayer(corso([q("cp1", "checkpoint", 0), q("cp2", "checkpoint", 1), q("cp3", "checkpoint", 2), q("fin", "final", 0)]))).toEqual([]);
  });

  it("riconosce il difetto del 06/10: checkpoint tutti a 0, il player ne mostra uno solo", () => {
    const p = problemiSequenzaPlayer(corso([q("cp1", "checkpoint", 0), q("cp2", "checkpoint", 0), q("cp3", "checkpoint", 0), q("fin", "final", 0)]));
    expect(p).toContain('"cp2" non compare nel percorso del player (posizione 0)');
    expect(p).toContain('"cp3" non compare nel percorso del player (posizione 0)');
    expect(p.some((x) => x.startsWith("checkpoint con la stessa posizione"))).toBe(true);
  });

  it("checkpoint oltre l'ultima lezione: non compare", () => {
    expect(problemiSequenzaPlayer(corso([q("cp9", "checkpoint", 7), q("fin", "final", 0)]))).toContain('"cp9" non compare nel percorso del player (posizione 7)');
  });

  it("esame mancante, banca insufficiente, soglia e tempi fuori regola", () => {
    const p = problemiSequenzaPlayer(corso([q("cp1", "checkpoint", 0, { bancaDomande: 3, passThreshold: 0, cooldownSeconds: -1 })]));
    expect(p).toContain("esame finale nel percorso: 0 (atteso 1)");
    expect(p).toContain('"cp1": banca 3 < estrazione 5');
    expect(p).toContain('"cp1": soglia 0');
    expect(p.some((x) => x.includes("attesa -1s"))).toBe(true);
  });

  it("esame finale senza limite di tempo", () => {
    expect(problemiSequenzaPlayer(corso([q("fin", "final", 0, { timeLimitSeconds: 0 })]))).toContain('"fin": esame finale senza limite di tempo');
  });
});

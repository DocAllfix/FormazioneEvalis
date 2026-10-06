import { describe, expect, it } from "vitest";
import { buildSteps, type Data, type Quiz } from "../components/player/course-steps";

// corso a 3 moduli = 3 lezioni da 2 slide, un checkpoint per modulo e l'esame finale
function corso(posizioniCheckpoint: number[], extra: Partial<Record<string, Partial<Quiz>>> = {}): Data {
  const slides = [0, 1, 2].flatMap((l) =>
    [0, 1].map((k) => ({
      id: `s${l}${k}`, lessonId: `L${l}`, moduleId: `M${l}`, title: "", blocks: null,
      audioSeconds: 60, hasClip: false, effectiveSeconds: 0, completed: false,
    })),
  );
  const quizzes: Quiz[] = [
    ...posizioniCheckpoint.map((p, i) => ({ id: `cp${i + 1}`, type: "checkpoint", title: `Checkpoint Modulo ${i + 1}`, position: p, passed: false, ...extra[`cp${i + 1}`] })),
    { id: "fin", type: "final", title: "Esame finale", position: 0, passed: false },
  ];
  return { course: { id: "c", title: "t", requiredMinutes: 6 }, timer: { effectiveSeconds: 0, requiredSeconds: 360 }, slides, quizzes };
}
const sequenza = (d: Data) => buildSteps(d).map((s) => s.key.slice(2));

describe("buildSteps", () => {
  it("con le posizioni corrette ogni checkpoint segue il suo modulo e l'esame chiude", () => {
    expect(sequenza(corso([0, 1, 2]))).toEqual(["s00", "s01", "cp1", "s10", "s11", "cp2", "s20", "s21", "cp3", "fin"]);
  });

  it("con i dati vecchi (tutti a 0) si vede solo il primo checkpoint: il difetto corretto", () => {
    expect(sequenza(corso([0, 0, 0]))).toEqual(["s00", "s01", "cp1", "s10", "s11", "s20", "s21", "fin"]);
  });

  it("i checkpoint esonerati non entrano nella sequenza, gli altri restano al loro posto", () => {
    expect(sequenza(corso([0, 1, 2], { cp2: { esonerato: true }, cp3: { esonerato: true } }))).toEqual([
      "s00", "s01", "cp1", "s10", "s11", "s20", "s21", "fin",
    ]);
  });
});

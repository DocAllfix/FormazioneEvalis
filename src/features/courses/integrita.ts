// Controlli di INTEGRITÀ di un corso che guardano quello che lo studente vedrà davvero: la
// sequenza la costruisce la stessa funzione del player (buildSteps). Nato dal difetto del
// 06/10/2026: i checkpoint c'erano tutti nel DB (uno per modulo), ma con la posizione sbagliata
// il player ne mostrava uno solo, e il controllo per conteggio non se ne accorgeva.
// Funzione pura: la usano verifica-corso (a ogni ingest) e _integrita-catalogo (tutto il catalogo).

import { buildSteps, type Data } from "@/components/player/course-steps";

export type QuizStruttura = {
  id: string;
  type: string;
  title: string;
  position: number;
  questionsToDraw: number;
  passThreshold: number;
  timeLimitSeconds: number;
  cooldownSeconds: number;
  maxAttempts: number | null;
  bancaDomande: number;
};

export type CorsoStruttura = {
  /** slide nell'ordine del player (modulo, lezione, slide) con la loro lezione */
  slide: { id: string; lessonId: string }[];
  quiz: QuizStruttura[];
};

export function problemiSequenzaPlayer(c: CorsoStruttura): string[] {
  const problemi: string[] = [];
  const data: Data = {
    course: { id: "", title: "", requiredMinutes: 0 },
    timer: { effectiveSeconds: 0, requiredSeconds: 0 },
    slides: c.slide.map((s) => ({
      id: s.id, lessonId: s.lessonId, moduleId: "", title: "", blocks: null,
      audioSeconds: 0, hasClip: true, effectiveSeconds: 0, completed: false,
    })),
    quizzes: c.quiz.map((q) => ({ id: q.id, type: q.type, title: q.title, position: q.position, passed: false })),
  };
  const passi = buildSteps(data);
  const quizNelPercorso = new Set(passi.filter((p) => p.kind === "quiz").map((p) => (p.kind === "quiz" ? p.quiz.id : "")));

  for (const q of c.quiz) {
    if (!quizNelPercorso.has(q.id)) problemi.push(`"${q.title}" non compare nel percorso del player (posizione ${q.position})`);
  }
  const posizioni = c.quiz.filter((q) => q.type === "checkpoint").map((q) => q.position);
  if (new Set(posizioni).size !== posizioni.length) problemi.push(`checkpoint con la stessa posizione: ${posizioni.join(",")}`);

  const finali = passi.filter((p) => p.kind === "quiz" && p.quiz.type === "final");
  if (finali.length !== 1) problemi.push(`esame finale nel percorso: ${finali.length} (atteso 1)`);
  else if (passi[passi.length - 1] !== finali[0]) problemi.push("l'esame finale non è l'ultimo passo del percorso");
  if (passi.length && passi[0].kind !== "slide") problemi.push("il percorso non inizia con una slide");

  for (const q of c.quiz) {
    if (q.questionsToDraw < 1) problemi.push(`"${q.title}": estrae ${q.questionsToDraw} domande`);
    if (q.bancaDomande < q.questionsToDraw) problemi.push(`"${q.title}": banca ${q.bancaDomande} < estrazione ${q.questionsToDraw}`);
    if (q.passThreshold < 1 || q.passThreshold > 100) problemi.push(`"${q.title}": soglia ${q.passThreshold}`);
    if (q.timeLimitSeconds < 0 || q.cooldownSeconds < 0) problemi.push(`"${q.title}": tempo ${q.timeLimitSeconds}s / attesa ${q.cooldownSeconds}s`);
    if (q.type === "final" && q.timeLimitSeconds === 0) problemi.push(`"${q.title}": esame finale senza limite di tempo`);
    if (q.maxAttempts != null && q.maxAttempts < 1) problemi.push(`"${q.title}": tentativi massimi ${q.maxAttempts}`);
  }
  return problemi;
}

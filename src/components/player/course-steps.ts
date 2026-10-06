// Sequenza del player (slide → checkpoint → … → esame finale) come funzione pura, testabile.
// Spostata qui INVARIATA da course-player.tsx; unica aggiunta: i checkpoint `esonerato`
// (vedi features/courses/checkpoint-esonero.ts) non entrano nella sequenza.

export type Slide = {
  id: string;
  lessonId: string;
  moduleId: string;
  title: string;
  blocks: unknown;
  audioSeconds: number;
  hasClip: boolean;
  effectiveSeconds: number;
  completed: boolean;
};

export type Quiz = {
  id: string;
  type: string;
  title: string;
  position: number;
  passed: boolean;
  esonerato?: boolean;
};

export type Data = {
  course: { id: string; title: string; requiredMinutes: number };
  timer: { effectiveSeconds: number; requiredSeconds: number };
  slides: Slide[];
  quizzes: Quiz[];
};

export type Step =
  | { key: string; kind: "slide"; slide: Slide; label: string }
  | { key: string; kind: "quiz"; quiz: Quiz; label: string };

// Sequenza del corso: slide della lezione → eventuale checkpoint → ... → esame finale.
// (Mono-modulo: il checkpoint con position = indice lezione segue quella lezione.)
export function buildSteps(data: Data): Step[] {
  const lessons: { lessonId: string; slides: Slide[] }[] = [];
  for (const s of data.slides) {
    const last = lessons[lessons.length - 1];
    if (last && last.lessonId === s.lessonId) last.slides.push(s);
    else lessons.push({ lessonId: s.lessonId, slides: [s] });
  }
  const checkpoints = data.quizzes.filter((q) => q.type === "checkpoint" && !q.esonerato);
  const final = data.quizzes.find((q) => q.type === "final");

  const steps: Step[] = [];
  lessons.forEach((lesson, li) => {
    lesson.slides.forEach((s) =>
      steps.push({ key: `s:${s.id}`, kind: "slide", slide: s, label: "Unità" }),
    );
    const cp = checkpoints.find((q) => q.position === li);
    if (cp) steps.push({ key: `q:${cp.id}`, kind: "quiz", quiz: cp, label: "Checkpoint" });
  });
  if (final) steps.push({ key: `q:${final.id}`, kind: "quiz", quiz: final, label: "Esame finale" });
  return steps;
}

// Ingestione di un corso nel formato canonico: valida, applica la VALIDAZIONE
// MONTE-ORE (somma durate slide ≥ minuti richiesti) e inserisce tutto in transazione.
// Generatore-agnostico: Claude/EduVault/manuale producono il formato canonico.

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { course, module as courseModule, lesson, slide, quiz, quizQuestion } from "@/lib/db/schema";
import { courseInputSchema, type CourseInput, type QuizInput } from "./course-format";
import { slugify } from "./slug";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Slug unico da un titolo (append -2, -3… in caso di collisione). */
async function uniqueSlug(tx: Tx, title: string): Promise<string> {
  const base = slugify(title);
  let slug = base;
  for (let n = 2; ; n++) {
    const [hit] = await tx.select({ id: course.id }).from(course).where(eq(course.slug, slug)).limit(1);
    if (!hit) return slug;
    slug = `${base}-${n}`;
  }
}

export async function ingestCourse(input: unknown): Promise<{ courseId: string }> {
  const pkg = courseInputSchema.parse(input);

  // Validazione monte-ore: la durata dei contenuti (narrazione slide) deve
  // raggiungere il monte ore legale. Altrimenti il corso non è erogabile a norma.
  const slideSeconds = totalSlideSeconds(pkg);
  if (slideSeconds < pkg.requiredMinutes * 60) {
    throw new Error(
      `Durata contenuti insufficiente: ${slideSeconds}s < monte ore richiesto ${pkg.requiredMinutes * 60}s.`,
    );
  }

  return db.transaction(async (tx) => {
    const slug = await uniqueSlug(tx, pkg.title);
    const [c] = await tx
      .insert(course)
      .values({
        title: pkg.title,
        description: pkg.description ?? null,
        requiredMinutes: pkg.requiredMinutes,
        slug,
        status: "published",
      })
      .returning({ id: course.id });
    const courseId = c.id;

    for (const [mi, m] of pkg.modules.entries()) {
      const [mod] = await tx
        .insert(courseModule)
        .values({ courseId, title: m.title, position: mi })
        .returning({ id: courseModule.id });

      for (const [li, l] of m.lessons.entries()) {
        const [les] = await tx
          .insert(lesson)
          .values({ moduleId: mod.id, title: l.title, activityType: "html", position: li })
          .returning({ id: lesson.id });

        for (const [si, sl] of l.slides.entries()) {
          await tx.insert(slide).values({
            lessonId: les.id,
            position: si,
            title: sl.title,
            blocks: sl.blocks,
            avatarClipUid: sl.avatarClipUid ?? null,
            audioSeconds: sl.audioSeconds,
            speakerNotes: sl.speakerNotes ?? null,
          });
        }

        if (l.checkpointQuiz) {
          await insertQuiz(tx, courseId, "checkpoint", li, l.checkpointQuiz);
        }
      }
    }

    if (pkg.finalExam) {
      await insertQuiz(tx, courseId, "final", 0, pkg.finalExam);
    }

    return { courseId };
  });
}

function totalSlideSeconds(pkg: CourseInput): number {
  return pkg.modules
    .flatMap((m) => m.lessons)
    .flatMap((l) => l.slides)
    .reduce((sum, s) => sum + s.audioSeconds, 0);
}

async function insertQuiz(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  courseId: string,
  type: "checkpoint" | "final",
  position: number,
  q: QuizInput,
): Promise<void> {
  const [qz] = await tx
    .insert(quiz)
    .values({
      courseId,
      type,
      title: q.title,
      position,
      questionsToDraw: q.questionsToDraw,
      passThreshold: q.passThreshold,
      timeLimitSeconds: q.timeLimitSeconds,
      cooldownSeconds: q.cooldownSeconds,
      maxAttempts: q.maxAttempts ?? null,
    })
    .returning({ id: quiz.id });

  for (const question of q.questions) {
    await tx.insert(quizQuestion).values({
      courseId,
      quizId: qz.id,
      text: question.text,
      options: question.options,
      correctOptionId: question.correctOptionId,
    });
  }
}

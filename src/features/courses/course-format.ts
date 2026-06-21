// Formato canonico del corso: ciò che i nostri generatori (Claude/EduVault/manuale)
// producono e che l'ingestione valida e carica. Indipendente dal generatore.

import { z } from "zod";

// Blocco di contenuto slide (estendibile). MVP: heading, paragraph, list, image.
export const slideBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("heading"), text: z.string().min(1) }),
  z.object({ type: z.literal("paragraph"), text: z.string().min(1) }),
  z.object({ type: z.literal("list"), items: z.array(z.string().min(1)).min(1) }),
  z.object({ type: z.literal("image"), url: z.string().min(1), alt: z.string().optional() }),
]);

export const slideInputSchema = z.object({
  title: z.string().min(1),
  blocks: z.array(slideBlockSchema),
  speakerNotes: z.string().optional(),
  avatarClipUid: z.string().nullable().optional(),
  // durata narrazione/clip in secondi -> tempo minimo della slide (0 se senza avatar)
  audioSeconds: z.number().int().nonnegative(),
});

export const questionInputSchema = z
  .object({
    text: z.string().min(1),
    options: z.array(z.object({ id: z.string().min(1), text: z.string().min(1) })).min(2),
    correctOptionId: z.string().min(1),
  })
  .refine((q) => q.options.some((o) => o.id === q.correctOptionId), {
    message: "correctOptionId deve corrispondere a una delle opzioni",
  });

export const quizInputSchema = z
  .object({
    title: z.string().min(1),
    questionsToDraw: z.number().int().positive(),
    passThreshold: z.number().int().min(1).max(100),
    timeLimitSeconds: z.number().int().nonnegative(),
    cooldownSeconds: z.number().int().nonnegative().default(0),
    maxAttempts: z.number().int().positive().optional(),
    questions: z.array(questionInputSchema).min(1),
  })
  .refine((q) => q.questionsToDraw <= q.questions.length, {
    message: "questionsToDraw non può superare il numero di domande in banca",
  });

export const lessonInputSchema = z.object({
  title: z.string().min(1),
  type: z.literal("html"),
  slides: z.array(slideInputSchema).min(1),
  checkpointQuiz: quizInputSchema.optional(), // obbligatorio per proseguire (se presente)
});

export const moduleInputSchema = z.object({
  title: z.string().min(1),
  lessons: z.array(lessonInputSchema).min(1),
});

export const courseInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  // monte ore legale (minuti): la fruizione dovrà raggiungerlo
  requiredMinutes: z.number().int().nonnegative(),
  modules: z.array(moduleInputSchema).min(1),
  finalExam: quizInputSchema.optional(),
});

export type SlideBlock = z.infer<typeof slideBlockSchema>;
export type SlideInput = z.infer<typeof slideInputSchema>;
export type QuestionInput = z.infer<typeof questionInputSchema>;
export type QuizInput = z.infer<typeof quizInputSchema>;
export type LessonInput = z.infer<typeof lessonInputSchema>;
export type CourseInput = z.infer<typeof courseInputSchema>;

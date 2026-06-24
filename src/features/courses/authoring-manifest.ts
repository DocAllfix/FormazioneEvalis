// Manifest di authoring: ciò che l'admin di piattaforma fornisce per creare un corso.
// È il formato canonico (course-format) con una differenza: le slide portano `html`
// inline + `clipKey` (riferimento alla clip per chiave), non l'uid/durata già risolti.
// Il resolver lega le chiavi alle clip caricate (uid+durata) e produce il CourseInput
// che `ingestCourse` valida (monte-ore) e inserisce atomico.

import { z } from "zod";
import { quizInputSchema, type CourseInput } from "./course-format";

export const manifestSlideSchema = z.object({
  title: z.string().min(1),
  html: z.string().min(1),
  clipKey: z.string().min(1),
  speakerNotes: z.string().optional(),
});

export const manifestLessonSchema = z.object({
  title: z.string().min(1),
  slides: z.array(manifestSlideSchema).min(1),
  checkpointQuiz: quizInputSchema.optional(),
});

export const manifestModuleSchema = z.object({
  title: z.string().min(1),
  lessons: z.array(manifestLessonSchema).min(1),
});

export const courseManifestSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  // monte ore LEGALE del tipo-corso (minuti): la durata dei contenuti dovrà raggiungerlo
  requiredMinutes: z.number().int().nonnegative(),
  modules: z.array(manifestModuleSchema).min(1),
  finalExam: quizInputSchema.optional(),
});

export type CourseManifest = z.infer<typeof courseManifestSchema>;
export type ClipInfo = { uid: string; duration: number };

/** Tutte le clipKey citate dal manifest (per validare che ogni clip sia stata caricata). */
export function collectClipKeys(manifest: CourseManifest): string[] {
  const keys = new Set<string>();
  for (const m of manifest.modules)
    for (const l of m.lessons) for (const s of l.slides) keys.add(s.clipKey);
  return [...keys];
}

/** Lega le clipKey alle clip caricate (uid+durata) e produce il CourseInput canonico. */
export function resolveManifestToCourse(
  manifest: CourseManifest,
  clipMap: Record<string, ClipInfo>,
): CourseInput {
  return {
    title: manifest.title,
    description: manifest.description,
    requiredMinutes: manifest.requiredMinutes,
    modules: manifest.modules.map((m) => ({
      title: m.title,
      lessons: m.lessons.map((l) => ({
        title: l.title,
        type: "html" as const,
        slides: l.slides.map((s) => {
          const clip = clipMap[s.clipKey];
          if (!clip) throw new Error(`Clip mancante per la chiave "${s.clipKey}".`);
          return {
            title: s.title,
            blocks: [{ type: "html" as const, html: s.html }],
            avatarClipUid: clip.uid,
            audioSeconds: clip.duration,
            speakerNotes: s.speakerNotes,
          };
        }),
        checkpointQuiz: l.checkpointQuiz,
      })),
    })),
    finalExam: manifest.finalExam,
  };
}

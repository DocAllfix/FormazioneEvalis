// Contenuti descrittivi della scheda corso (catalogo post-login). Tutti opzionali.
// Validati qui (zod) e salvati nel jsonb course.details. Display-only.

import { z } from "zod";

export const courseDetailsSchema = z.object({
  audience: z.string().trim().min(1).optional(), // a chi è rivolto
  objectives: z.array(z.string().trim().min(1)).optional(), // obiettivi di apprendimento
  level: z.string().trim().min(1).optional(), // livello (base/intermedio/avanzato)
  language: z.string().trim().min(1).optional(), // lingua
  certInfo: z.string().trim().min(1).optional(), // cosa attesta il certificato / schema / validità
  // Programma reale del corso (titolo modulo + sintesi del contenuto). Quando presente,
  // sostituisce il programma generico derivato dai titoli-modulo del DB nella scheda.
  program: z
    .array(z.object({ title: z.string().trim().min(1), summary: z.string().trim().min(1) }))
    .optional(),
});

export type CourseDetails = z.infer<typeof courseDetailsSchema>;

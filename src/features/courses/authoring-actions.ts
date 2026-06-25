"use server";

// Azioni di authoring (admin di piattaforma). Creazione corso dal manifest (resolve →
// ingest atomico) e pubblicazione/bozza. Tutto gated requirePlatformAdmin.

import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { course } from "@/lib/db/schema";
import { requirePlatformAdmin } from "@/features/auth/guards";
import { courseManifestSchema, resolveManifestToCourse, type ClipInfo } from "./authoring-manifest";
import { courseDetailsSchema, type CourseDetails } from "./course-details";
import { ingestCourse } from "./ingest";

export async function createCourseFromManifest(
  manifestRaw: unknown,
  clipMap: Record<string, ClipInfo>,
): Promise<{ courseId: string }> {
  await requirePlatformAdmin();
  const manifest = courseManifestSchema.parse(manifestRaw);
  const courseInput = resolveManifestToCourse(manifest, clipMap);
  const { courseId } = await ingestCourse(courseInput); // valida monte-ore + crea atomico (published, globale)

  // Metadati catalogo post-ingest: ore reali (display) + categoria + scheda ricca.
  const patch: { durationHours?: number; category?: string; details?: CourseDetails } = {};
  if (manifest.requiredMinutes >= 60) patch.durationHours = Math.round(manifest.requiredMinutes / 60);
  if (manifest.category) patch.category = manifest.category;
  if (manifest.details) patch.details = manifest.details;
  if (Object.keys(patch).length) await db.update(course).set(patch).where(eq(course.id, courseId));

  return { courseId };
}

/** Imposta/azzera i contenuti ricchi della scheda (catalogo post-login). Gated admin. */
export async function setCourseDetails(courseId: string, detailsRaw: unknown): Promise<void> {
  await requirePlatformAdmin();
  const details = detailsRaw ? courseDetailsSchema.parse(detailsRaw) : null;
  await db.update(course).set({ details }).where(eq(course.id, courseId));
}

/** Rimuove l'immagine dalla scheda (il blob nel bucket resta, innocuo). Gated admin. */
export async function removeCourseImage(courseId: string): Promise<void> {
  await requirePlatformAdmin();
  await db.update(course).set({ imageUrl: null }).where(eq(course.id, courseId));
}

/** Pubblica / ritira dal catalogo (solo corsi globali). */
export async function setCoursePublishedAction(courseId: string, published: boolean): Promise<void> {
  await requirePlatformAdmin();
  await db
    .update(course)
    .set({ status: published ? "published" : "draft" })
    .where(and(eq(course.id, courseId), isNull(course.organizationId)));
}

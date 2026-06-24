"use server";

// Azioni di authoring (admin di piattaforma). Creazione corso dal manifest (resolve →
// ingest atomico) e pubblicazione/bozza. Tutto gated requirePlatformAdmin.

import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { course } from "@/lib/db/schema";
import { requirePlatformAdmin } from "@/features/auth/guards";
import { courseManifestSchema, resolveManifestToCourse, type ClipInfo } from "./authoring-manifest";
import { ingestCourse } from "./ingest";

export async function createCourseFromManifest(
  manifestRaw: unknown,
  clipMap: Record<string, ClipInfo>,
): Promise<{ courseId: string }> {
  await requirePlatformAdmin();
  const manifest = courseManifestSchema.parse(manifestRaw);
  const courseInput = resolveManifestToCourse(manifest, clipMap);
  const { courseId } = await ingestCourse(courseInput); // valida monte-ore + crea atomico (published, globale)

  // Ore reali per il catalogo (display): il monte-ore legale tradotto in ore.
  if (manifest.requiredMinutes >= 60) {
    await db
      .update(course)
      .set({ durationHours: Math.round(manifest.requiredMinutes / 60) })
      .where(eq(course.id, courseId));
  }
  return { courseId };
}

/** Pubblica / ritira dal catalogo (solo corsi globali). */
export async function setCoursePublishedAction(courseId: string, published: boolean): Promise<void> {
  await requirePlatformAdmin();
  await db
    .update(course)
    .set({ status: published ? "published" : "draft" })
    .where(and(eq(course.id, courseId), isNull(course.organizationId)));
}

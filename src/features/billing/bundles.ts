// Bundle (pacchetti): risoluzione PURA della composizione corsi + loader DB.
// Il resolver è l'UNICO punto di logica (riusato identico da checkout e provisioning):
// - "fixed": composizione chiusa → i corsi "included"; chosenCourseId vietato.
// - "pick_one": corsi base "included" + UN corso a scelta tra gli "eligible"
//   (es. Pacchetto Ingresso: 19011 + un Lead Auditor); chosenCourseId obbligatorio.

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bundle, bundleCourse } from "@/lib/db/schema";

export type BundleLink = { courseId: string; role: "included" | "eligible" };

/** Corsi da erogare per l'acquisto di un bundle (PURA, testabile senza DB). Lancia se invalido. */
export function resolveBundleCourseIds(
  b: { kind: "fixed" | "pick_one" },
  links: BundleLink[],
  chosenCourseId?: string,
): string[] {
  const included = links.filter((l) => l.role === "included").map((l) => l.courseId);
  if (b.kind === "fixed") {
    if (chosenCourseId) throw new Error("Questo pacchetto non prevede corsi a scelta.");
    if (included.length === 0) throw new Error("Pacchetto senza corsi.");
    return included;
  }
  // pick_one
  if (!chosenCourseId) throw new Error("Seleziona il corso a scelta del pacchetto.");
  const eligible = links.filter((l) => l.role === "eligible").map((l) => l.courseId);
  if (!eligible.includes(chosenCourseId)) throw new Error("Corso a scelta non valido per questo pacchetto.");
  return [...included, chosenCourseId];
}

/** Bundle + composizione dal DB (per checkout e provisioning). */
export async function loadBundleWithCourses(bundleId: string) {
  const [b] = await db.select().from(bundle).where(eq(bundle.id, bundleId)).limit(1);
  if (!b) throw new Error("Pacchetto inesistente.");
  const links: BundleLink[] = await db
    .select({ courseId: bundleCourse.courseId, role: bundleCourse.role })
    .from(bundleCourse)
    .where(eq(bundleCourse.bundleId, bundleId));
  return { bundle: b, links };
}

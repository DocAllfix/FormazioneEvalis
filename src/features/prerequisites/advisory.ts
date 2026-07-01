// Prerequisito ISO 19011 — logica INFORMATIVA (advisory). NON blocca nulla: dice solo se, per un dato
// utente e corso, va mostrato l'avviso "senza 19011 questa certificazione non è applicabile in ambito
// lavorativo". Read-only. `has19011` = autodichiarazione OR corso 19011 completato in piattaforma
// (esame + tempo min, via isReadyForCertificate). Guidato da course.prerequisite_course_id: se null il
// corso non è soggetto ad avviso (corsi professionali + il 19011 stesso).

import { and, eq, ne } from "drizzle-orm";
import { course, enrollment, userOnboarding } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import { isReadyForCertificate } from "@/features/certificates/readiness";

export type Iso19011Advisory = {
  /** Il corso è un corso ISO soggetto alla regola (ha un prerequisito 19011). */
  isIsoCourse: boolean;
  /** L'utente è idoneo: ha dichiarato la 19011 oppure l'ha completata in piattaforma. */
  has19011: boolean;
  /** Va mostrato l'avviso? (isIsoCourse && !has19011) */
  shouldAdvise: boolean;
  /** Corso prerequisito (il 19011) — per CTA/bundle. */
  prerequisiteCourseId?: string;
  prerequisiteTitle?: string;
};

const NONE: Iso19011Advisory = { isIsoCourse: false, has19011: false, shouldAdvise: false };

/** Stato avviso 19011 per (utente, corso). Read-only, tenant-scoped sull'utente. */
export async function iso19011Advisory(userId: string, courseId: string): Promise<Iso19011Advisory> {
  const base = await withTenant({ userId }, async (tx) => {
    const [c] = await tx
      .select({ prereq: course.prerequisiteCourseId })
      .from(course)
      .where(eq(course.id, courseId))
      .limit(1);
    if (!c?.prereq) return null; // corso non ISO (professionale) o il 19011 stesso → nessun avviso

    const [pre] = await tx.select({ title: course.title }).from(course).where(eq(course.id, c.prereq)).limit(1);
    const [ob] = await tx
      .select({ declared: userOnboarding.iso19011Certified })
      .from(userOnboarding)
      .where(eq(userOnboarding.userId, userId))
      .limit(1);
    const [enr] = await tx
      .select({ id: enrollment.id })
      .from(enrollment)
      .where(and(eq(enrollment.userId, userId), eq(enrollment.courseId, c.prereq), ne(enrollment.status, "revoked")))
      .limit(1);

    return {
      prereqId: c.prereq,
      prereqTitle: pre?.title ?? "ISO 19011",
      declared: ob?.declared === true,
      prereqEnrollmentId: enr?.id ?? null,
    };
  });

  if (!base) return NONE;

  // Completato in piattaforma? (solo se ha un enrollment nel corso 19011). isReadyForCertificate
  // apre il proprio tenant-tx col ctx dell'utente.
  const completed = base.prereqEnrollmentId
    ? (await isReadyForCertificate(base.prereqEnrollmentId, { userId })).ready
    : false;

  const has19011 = base.declared || completed;
  return {
    isIsoCourse: true,
    has19011,
    shouldAdvise: !has19011,
    prerequisiteCourseId: base.prereqId,
    prerequisiteTitle: base.prereqTitle,
  };
}

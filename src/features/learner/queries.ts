// Letture per la dashboard discente (Server Components). Sottili, gated da sessione,
// riusano gli helper esistenti (courseEffectiveSeconds). Nessuna logica di compliance qui.

import { and, count, desc, eq, isNotNull } from "drizzle-orm";
import {
  enrollment,
  course,
  slide,
  lesson,
  module as courseModule,
  slideProgress,
  certificate,
} from "@/lib/db/schema";
import { requireSession } from "@/features/auth/guards";
import { courseEffectiveSeconds } from "@/features/tracking/progress";
import { withTenant } from "@/lib/db/tenant";

export type MyEnrollment = {
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  requiredSeconds: number;
  effectiveSeconds: number;
  slidesTotal: number;
  slidesDone: number;
  progressPercent: number;
  certificateStatus: string | null; // ready_for_review | issued | revoked | null
  status: "not_started" | "in_progress" | "completed";
};

/** I percorsi dell'utente in sessione, con progresso reale e stato certificato. */
export async function getMyEnrollments(): Promise<MyEnrollment[]> {
  const { user } = await requireSession();

  return withTenant({ userId: user.id }, async (tx) => {
    const enrs = await tx
      .select({
        enrollmentId: enrollment.id,
        courseId: course.id,
        courseTitle: course.title,
        requiredMinutes: course.requiredMinutes,
      })
      .from(enrollment)
      .innerJoin(course, eq(course.id, enrollment.courseId))
      .where(and(eq(enrollment.userId, user.id), eq(enrollment.status, "active")))
      .orderBy(desc(enrollment.createdAt));

    const out: MyEnrollment[] = [];
    for (const e of enrs) {
      const [{ total }] = await tx
        .select({ total: count() })
        .from(slide)
        .innerJoin(lesson, eq(lesson.id, slide.lessonId))
        .innerJoin(courseModule, eq(courseModule.id, lesson.moduleId))
        .where(eq(courseModule.courseId, e.courseId));

      const [{ done }] = await tx
        .select({ done: count() })
        .from(slideProgress)
        .innerJoin(slide, eq(slide.id, slideProgress.slideId))
        .innerJoin(lesson, eq(lesson.id, slide.lessonId))
        .innerJoin(courseModule, eq(courseModule.id, lesson.moduleId))
        .where(
          and(
            eq(slideProgress.enrollmentId, e.enrollmentId),
            eq(courseModule.courseId, e.courseId),
            isNotNull(slideProgress.completedAt),
          ),
        );

      const effectiveSeconds = await courseEffectiveSeconds(e.enrollmentId, e.courseId, tx);

      const [cert] = await tx
        .select({ status: certificate.status })
        .from(certificate)
        .where(eq(certificate.enrollmentId, e.enrollmentId))
        .limit(1);

      const slidesTotal = Number(total);
      const slidesDone = Number(done);
      const progressPercent =
        slidesTotal === 0 ? 0 : Math.round((slidesDone / slidesTotal) * 100);
      const status: MyEnrollment["status"] =
        slidesDone === 0 ? "not_started" : slidesDone >= slidesTotal ? "completed" : "in_progress";

      out.push({
        enrollmentId: e.enrollmentId,
        courseId: e.courseId,
        courseTitle: e.courseTitle,
        requiredSeconds: e.requiredMinutes * 60,
        effectiveSeconds,
        slidesTotal,
        slidesDone,
        progressPercent,
        certificateStatus: cert?.status ?? null,
        status,
      });
    }
    return out;
  });
}

export type MyCertificate = {
  id: string;
  status: string;
  number: string | null;
  issuedAt: Date | null;
  courseTitle: string;
};

/** I certificati dell'utente in sessione (qualsiasi stato). */
export async function getMyCertificates(): Promise<MyCertificate[]> {
  const { user } = await requireSession();
  return withTenant({ userId: user.id }, async (tx) =>
    tx
      .select({
        id: certificate.id,
        status: certificate.status,
        number: certificate.number,
        issuedAt: certificate.issuedAt,
        courseTitle: course.title,
      })
      .from(certificate)
      .innerJoin(enrollment, eq(enrollment.id, certificate.enrollmentId))
      .innerJoin(course, eq(course.id, enrollment.courseId))
      .where(eq(enrollment.userId, user.id))
      .orderBy(desc(certificate.createdAt)),
  );
}

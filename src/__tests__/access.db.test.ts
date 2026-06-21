// Integrazione DB: prima barriera anti-IDOR. Due utenti distinti → l'accesso alle
// risorse altrui (enrollment, tentativo quiz) DEVE fallire; quello del proprietario passa.

import { describe, it, expect, afterAll } from "vitest";
import { sql, and, eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user, organization, enrollment, course, quiz, activityLog } from "@/lib/db/schema";
import { firstMembershipOrgId } from "@/features/auth/guards";
import { ingestCourse } from "@/features/courses/ingest";
import { sampleCourse } from "@/features/courses/seed";
import { startQuiz } from "@/features/quiz/engine";
import {
  assertEnrollmentOwnedBy,
  assertAttemptOwnedBy,
  loadOwnedEnrollment,
  AccessDeniedError,
} from "@/features/access/ownership";

const RUN = Date.now();
const PW = "Password123!";
const createdUserIds: string[] = [];
const createdCourseIds: string[] = [];
const auditOrgIds: string[] = [];

afterAll(async () => {
  if (auditOrgIds.length) {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL app.audit_maintenance = 'on'`);
      await tx.delete(activityLog).where(inArray(activityLog.organizationId, auditOrgIds));
    });
  }
  if (createdUserIds.length) await db.delete(enrollment).where(inArray(enrollment.userId, createdUserIds));
  if (createdCourseIds.length) await db.delete(course).where(inArray(course.id, createdCourseIds));
  if (createdUserIds.length) {
    await db.delete(organization).where(inArray(organization.slug, createdUserIds.map((id) => `u-${id}`)));
    await db.delete(user).where(inArray(user.id, createdUserIds));
  }
});

describe("Sicurezza — prima barriera (ownership cross-tenant)", () => {
  it("blocca enrollment e tentativo quiz di un altro utente", async () => {
    const { courseId } = await ingestCourse(sampleCourse());
    createdCourseIds.push(courseId);

    const a = await auth.api.signUpEmail({ body: { name: "A", email: `acc-a+${RUN}@example.test`, password: PW } });
    const b = await auth.api.signUpEmail({ body: { name: "B", email: `acc-b+${RUN}@example.test`, password: PW } });
    const ua = a.user.id;
    const ub = b.user.id;
    createdUserIds.push(ua, ub);
    const orgA = (await firstMembershipOrgId(ua))!;
    const orgB = (await firstMembershipOrgId(ub))!;
    auditOrgIds.push(orgA, orgB);

    const [ea] = await db
      .insert(enrollment)
      .values({ organizationId: orgA, userId: ua, courseId, source: "manual", status: "active" })
      .returning({ id: enrollment.id });
    const [eb] = await db
      .insert(enrollment)
      .values({ organizationId: orgB, userId: ub, courseId, source: "manual", status: "active" })
      .returning({ id: enrollment.id });

    // ownership enrollment: A non può toccare l'enrollment di B
    await expect(assertEnrollmentOwnedBy(eb.id, ua)).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(loadOwnedEnrollment(eb.id, ua)).rejects.toBeInstanceOf(AccessDeniedError);
    // il proprietario passa
    await expect(assertEnrollmentOwnedBy(eb.id, ub)).resolves.toBeUndefined();
    await expect(assertEnrollmentOwnedBy(ea.id, ua)).resolves.toBeUndefined();

    // tentativo quiz di B
    const [fin] = await db
      .select({ id: quiz.id })
      .from(quiz)
      .where(and(eq(quiz.courseId, courseId), eq(quiz.type, "final")))
      .limit(1);
    const started = await startQuiz(eb.id, fin.id);

    await expect(assertAttemptOwnedBy(started.attemptId, ua)).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(assertAttemptOwnedBy(started.attemptId, ub)).resolves.toBeUndefined();
  });
});

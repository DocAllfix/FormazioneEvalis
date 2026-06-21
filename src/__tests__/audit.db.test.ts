// Integrazione DB (Supabase) Modulo 6: immutabilità append-only (trigger), catena
// hash per-org, tamper-detection (verifyChain), ed eventi reali agganciati ai flussi.
// Pulizia GUC-gated dell'activity_log (l'app in produzione non imposta mai la GUC).

import { describe, it, expect, afterAll } from "vitest";
import { sql, and, asc, eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  activityLog, user, organization, enrollment, course, module, lesson, slide,
} from "@/lib/db/schema";
import { firstMembershipOrgId } from "@/features/auth/guards";
import { appendActivity, verifyChain } from "@/features/audit/log";
import { ingestCourse } from "@/features/courses/ingest";
import { sampleCourse } from "@/features/courses/seed";
import { recordHeartbeat } from "@/features/tracking/progress";

const RUN = Date.now();
const PW = "Password123!";
const createdUserIds: string[] = [];
const createdCourseIds: string[] = [];
const createdOrgIds: string[] = [];

afterAll(async () => {
  if (createdOrgIds.length) {
    // attiva la GUC di manutenzione per poter ripulire il log append-only
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL app.audit_maintenance = 'on'`);
      await tx.delete(activityLog).where(inArray(activityLog.organizationId, createdOrgIds));
    });
  }
  if (createdUserIds.length) {
    await db.delete(enrollment).where(inArray(enrollment.userId, createdUserIds));
  }
  if (createdCourseIds.length) {
    await db.delete(course).where(inArray(course.id, createdCourseIds));
  }
  if (createdUserIds.length) {
    await db.delete(organization).where(inArray(organization.slug, createdUserIds.map((id) => `u-${id}`)));
    await db.delete(user).where(inArray(user.id, createdUserIds));
  }
});

const append = (organizationId: string, verb: string, object: string, payload?: unknown) =>
  db.transaction((tx) => appendActivity(tx, { organizationId, userId: "u", verb, object, payload }));

async function driveSlide(enrollmentId: string, slideId: string, audioSeconds: number) {
  let t = Date.now();
  let pos = 0;
  await recordHeartbeat({ enrollmentId, slideId, position: 0, focus: true, playing: true, nowMs: t });
  while (pos < audioSeconds) {
    const step = Math.min(12, audioSeconds - pos);
    pos += step;
    t += step * 1000;
    await recordHeartbeat({ enrollmentId, slideId, position: pos, focus: true, playing: true, audioCompleted: pos >= audioSeconds, nowMs: t });
  }
}

describe("Modulo 6 — audit append-only", () => {
  it("activity_log è immutabile (trigger blocca UPDATE/DELETE)", async () => {
    const org = `t6-${RUN}-imm`;
    createdOrgIds.push(org);
    const { id } = await append(org, "x", "o:1");

    await expect(db.update(activityLog).set({ verb: "hacked" }).where(eq(activityLog.id, id))).rejects.toThrow();
    await expect(db.delete(activityLog).where(eq(activityLog.id, id))).rejects.toThrow();

    // con la GUC di manutenzione la modifica passa (solo manutenzione/test)
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL app.audit_maintenance = 'on'`);
      await tx.update(activityLog).set({ verb: "x2" }).where(eq(activityLog.id, id));
    });
    const [r] = await db.select({ verb: activityLog.verb }).from(activityLog).where(eq(activityLog.id, id));
    expect(r.verb).toBe("x2");
  });

  it("catene indipendenti per organizzazione + verifyChain valida", async () => {
    const a = `t6-${RUN}-A`;
    const b = `t6-${RUN}-B`;
    createdOrgIds.push(a, b);
    for (let i = 0; i < 3; i++) {
      await append(a, "completed", `slide:${i}`);
      await append(b, "completed", `slide:${i}`);
    }
    expect(await verifyChain(a)).toEqual({ valid: true, count: 3 });
    expect(await verifyChain(b)).toEqual({ valid: true, count: 3 });
  });

  it("verifyChain rileva la manomissione", async () => {
    const org = `t6-${RUN}-tamper`;
    createdOrgIds.push(org);
    let middleId = "";
    for (let i = 0; i < 3; i++) {
      const { id } = await append(org, "x", `o:${i}`);
      if (i === 1) middleId = id;
    }
    expect((await verifyChain(org)).valid).toBe(true);

    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL app.audit_maintenance = 'on'`);
      await tx.update(activityLog).set({ payload: { hacked: true } }).where(eq(activityLog.id, middleId));
    });
    const r = await verifyChain(org);
    expect(r.valid).toBe(false);
    expect(r.brokenAt).toBe(middleId);
  });

  it("i flussi reali scrivono eventi nella catena dell'org (login, completamento)", async () => {
    const { courseId } = await ingestCourse(sampleCourse());
    createdCourseIds.push(courseId);

    const email = `evalis-a6+${RUN}@example.test`;
    const res = await auth.api.signUpEmail({ body: { name: "Audit", email, password: PW } });
    const uid = res.user.id;
    createdUserIds.push(uid);
    const orgId = (await firstMembershipOrgId(uid))!;
    createdOrgIds.push(orgId);

    // login esplicito: ora l'org personale esiste → genera logged-in (+ revoca della sessione di signup)
    await auth.api.signInEmail({ body: { email, password: PW } });

    const [enr] = await db
      .insert(enrollment)
      .values({ organizationId: orgId, userId: uid, courseId, source: "manual", status: "active" })
      .returning({ id: enrollment.id });

    const slides = await db
      .select({ id: slide.id, audioSeconds: slide.audioSeconds })
      .from(slide)
      .innerJoin(lesson, eq(lesson.id, slide.lessonId))
      .innerJoin(module, eq(module.id, lesson.moduleId))
      .where(eq(module.courseId, courseId))
      .orderBy(asc(slide.position));
    await driveSlide(enr.id, slides[0].id, slides[0].audioSeconds);

    const completed = await db
      .select({ object: activityLog.object })
      .from(activityLog)
      .where(and(eq(activityLog.organizationId, orgId), eq(activityLog.verb, "completed")));
    expect(completed.some((e) => e.object === `slide:${slides[0].id}`)).toBe(true);

    const logins = await db
      .select({ id: activityLog.id })
      .from(activityLog)
      .where(and(eq(activityLog.organizationId, orgId), eq(activityLog.verb, "logged-in")));
    expect(logins.length).toBeGreaterThanOrEqual(1);

    expect((await verifyChain(orgId)).valid).toBe(true);
  });
});

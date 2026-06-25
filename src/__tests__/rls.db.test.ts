// RLS — prova di isolamento tenant a livello DB (seconda barriera).
// Esegue le query come ruolo `app_rls` (NOBYPASSRLS) con le GUC app.user_id/app.org_id
// impostate da withTenant: verifica che il cross-tenant sia NEGATO e il same-tenant
// consentito, e che SENZA GUC non si veda nulla (default sicuro).

import { describe, it, expect, afterAll } from "vitest";
import { sql, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user, organization, enrollment, certificate, course } from "@/lib/db/schema";
import { firstMembershipOrgId } from "@/features/auth/guards";
import { ingestCourse } from "@/features/courses/ingest";
import { sampleCourse } from "@/features/courses/seed";

const RUN = Date.now();
const PW = "Password123!";
const userIds: string[] = [];
const courseIds: string[] = [];

afterAll(async () => {
  if (userIds.length) await db.delete(enrollment).where(inArray(enrollment.userId, userIds)); // cascade certificate
  if (courseIds.length) await db.delete(course).where(inArray(course.id, courseIds));
  if (userIds.length) {
    await db.delete(organization).where(inArray(organization.slug, userIds.map((id) => `u-${id}`)));
    await db.delete(user).where(inArray(user.id, userIds));
  }
});

async function mkLearner(tag: string) {
  const res = await auth.api.signUpEmail({ body: { name: tag, email: `rls-${tag}+${RUN}@example.test`, password: PW } });
  const uid = res.user.id;
  userIds.push(uid);
  const orgId = (await firstMembershipOrgId(uid))!;
  return { uid, orgId };
}

describe("RLS — isolamento tenant (ruolo app_rls)", () => {
  it("nega il cross-tenant, consente il same-tenant, default-deny senza GUC", async () => {
    const { courseId } = await ingestCourse(sampleCourse());
    courseIds.push(courseId);

    const A = await mkLearner("A");
    const B = await mkLearner("B");
    const [eA] = await db.insert(enrollment).values({ organizationId: A.orgId, userId: A.uid, courseId, source: "manual", status: "active" }).returning({ id: enrollment.id });
    const [eB] = await db.insert(enrollment).values({ organizationId: B.orgId, userId: B.uid, courseId, source: "manual", status: "active" }).returning({ id: enrollment.id });
    const [cA] = await db.insert(certificate).values({ enrollmentId: eA.id }).returning({ id: certificate.id });
    const [cB] = await db.insert(certificate).values({ enrollmentId: eB.id }).returning({ id: certificate.id, verifyUuid: certificate.verifyUuid });

    // Come app_rls con identità = utente A.
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE app_rls`);
      await tx.execute(sql`SELECT set_config('app.user_id', ${A.uid}, true)`);
      await tx.execute(sql`SELECT set_config('app.org_id', ${A.orgId}, true)`);

      const enr = (await tx.execute(sql`SELECT id FROM enrollment`)) as unknown as { id: string }[];
      const enrIds = enr.map((r) => r.id);
      expect(enrIds).toContain(eA.id); // vede il proprio
      expect(enrIds).not.toContain(eB.id); // NON vede quello dell'altro tenant

      const cert = (await tx.execute(sql`SELECT id FROM certificate`)) as unknown as { id: string }[];
      const certIds = cert.map((r) => r.id);
      expect(certIds).toContain(cA.id);
      expect(certIds).not.toContain(cB.id);
    });

    // Come app_rls SENZA GUC → nessuna riga (default-deny).
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE app_rls`);
      const r = (await tx.execute(sql`SELECT count(*)::int AS n FROM enrollment`)) as unknown as { n: number }[];
      expect(r[0].n).toBe(0);
    });

    // Valvola STAFF (app.platform_admin='on') → vede tutti i tenant.
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE app_rls`);
      await tx.execute(sql`SELECT set_config('app.platform_admin', 'on', true)`);
      const enr = (await tx.execute(sql`SELECT id FROM enrollment`)) as unknown as { id: string }[];
      const ids = enr.map((r) => r.id);
      expect(ids).toContain(eA.id);
      expect(ids).toContain(eB.id); // staff vede entrambi
      const cert = (await tx.execute(sql`SELECT id FROM certificate`)) as unknown as { id: string }[];
      const cids = cert.map((r) => r.id);
      expect(cids).toContain(cA.id);
      expect(cids).toContain(cB.id);
    });

    // Valvola VERIFICA pubblica (app.verify_uuid) → SOLO quel certificato, niente enrollment.
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE app_rls`);
      await tx.execute(sql`SELECT set_config('app.verify_uuid', ${cB.verifyUuid}, true)`);
      const cert = (await tx.execute(sql`SELECT id FROM certificate`)) as unknown as { id: string }[];
      const cids = cert.map((r) => r.id);
      expect(cids).toContain(cB.id); // il certificato verificato (cross-tenant per uuid)
      expect(cids).not.toContain(cA.id); // non gli altri
      const enr = (await tx.execute(sql`SELECT count(*)::int AS n FROM enrollment`)) as unknown as { n: number }[];
      expect(enr[0].n).toBe(0); // la valvola verify NON apre gli enrollment
    });
  });
});

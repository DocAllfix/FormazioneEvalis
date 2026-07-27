// Modello B2B (27/07): i POSTI non si vendono — l'azienda invita liberamente e paga i
// CORSI acquistati per i dipendenti. Qui si blinda: (1) i posti di default bastano per
// invitare, (2) l'acquisto destinato a un dipendente iscrive LUI (non chi paga),
// (3) lo sconto azienda scatta dal 2° iscritto allo stesso corso.
import { describe, it, expect, afterAll } from "vitest";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { organization, member, course, enrollment, activityLog, user } from "@/lib/db/schema";
import { serializeOrgMetadata } from "@/features/auth/org-metadata";
import { DEFAULT_COMPANY_SEATS, getSeatLimit, assertSeatAvailable } from "@/features/billing/seats";
import { companyDiscountPercent } from "@/features/billing/discounts";
import { provisionCoursePurchase } from "@/features/billing/provisioning";

const RUN = Date.now();
const orgId = `b2b-${RUN}`;
const courseIds: string[] = [];
const owner = `u1-${RUN}`;
const dipendente = `u2-${RUN}`;

async function creaUtente(id: string, nome: string) {
  await db.insert(user).values({
    id, name: nome, email: `${id}@example.test`, emailVerified: true,
    createdAt: new Date(), updatedAt: new Date(),
  });
}

afterAll(async () => {
  await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL app.audit_maintenance = 'on'`);
    await tx.delete(activityLog).where(eq(activityLog.organizationId, orgId));
  });
  if (courseIds.length) await db.delete(course).where(inArray(course.id, courseIds));
  await db.delete(member).where(eq(member.organizationId, orgId));
  await db.delete(organization).where(eq(organization.id, orgId));
  await db.delete(user).where(inArray(user.id, [owner, dipendente]));
});

describe("B2B — posti gratuiti, si pagano i corsi", () => {
  it("una nuova azienda può invitare dipendenti senza abbonamento", async () => {
    await db.insert(organization).values({
      id: orgId, name: "Azienda B2B", slug: orgId, createdAt: new Date(),
      metadata: serializeOrgMetadata({ type: "company", seatLimit: DEFAULT_COMPANY_SEATS }),
    });
    await creaUtente(owner, "Titolare");
    await db.insert(member).values({ id: `m1-${RUN}`, organizationId: orgId, userId: owner, role: "owner", createdAt: new Date() });

    expect(await getSeatLimit(orgId)).toBe(DEFAULT_COMPANY_SEATS);
    await expect(assertSeatAvailable(orgId)).resolves.toBeUndefined(); // può invitare
  });

  it("l'acquisto destinato a un dipendente iscrive LUI, non chi paga", async () => {
    const [c] = await db
      .insert(course)
      .values({ title: `Corso B2B ${RUN}`, status: "published", requiredMinutes: 0 })
      .returning({ id: course.id });
    courseIds.push(c.id);

    await creaUtente(dipendente, "Dipendente");
    await db.insert(member).values({ id: `m2-${RUN}`, organizationId: orgId, userId: dipendente, role: "member", createdAt: new Date() });
    // il webhook riceve dai metadata l'utente DESTINATARIO (impostato dal checkout)
    await provisionCoursePurchase({ userId: dipendente, courseId: c.id, orgId });

    const rows = await db
      .select({ userId: enrollment.userId, source: enrollment.source })
      .from(enrollment)
      .where(and(eq(enrollment.courseId, c.id), eq(enrollment.organizationId, orgId)));
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(dipendente);
    expect(rows[0].source).toBe("b2c_purchase");
  });

  it("sconto azienda: pieno al 1° iscritto, −20% dal 2°, −30% dal 5°", () => {
    expect(companyDiscountPercent({ isCompanyOrg: true, priorCoursePurchases: 0 })).toBe(0);
    expect(companyDiscountPercent({ isCompanyOrg: true, priorCoursePurchases: 1 })).toBe(20);
    expect(companyDiscountPercent({ isCompanyOrg: true, priorCoursePurchases: 4 })).toBe(30);
    // il privato non ha sconti azienda
    expect(companyDiscountPercent({ isCompanyOrg: false, priorCoursePurchases: 4 })).toBe(0);
  });
});

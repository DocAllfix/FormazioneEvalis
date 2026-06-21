// Test di INTEGRAZIONE su DB reale (Supabase). Verifica i criteri §1/§4 dello Step 2.
// Crea dati con suffisso univoco e ripulisce tutto in afterAll.
//
// Richiede .env valido (caricato via setupFiles dotenv/config). Esegue scritture reali.

import { describe, it, expect, afterAll } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  user,
  organization,
  member,
  session,
  invitation,
  enrollment,
  course,
} from "@/lib/db/schema";
import { createCompanyOrg } from "@/features/auth/orgs";
import { firstMembershipOrgId } from "@/features/auth/guards";
import { assertSeatAvailable } from "@/features/billing/seats";
import { enrollMemberInCourse, createTestCourse } from "@/features/courses/assign";
import { parseOrgMetadata } from "@/features/auth/org-metadata";

const RUN = Date.now();
const PW = "Password123!";
const email = (n: string) => `evalis-test+${n}-${RUN}@example.test`;

const createdUserIds: string[] = [];
const createdOrgIds: string[] = [];
const createdCourseIds: string[] = [];

async function signUp(name: string, em: string) {
  const res = await auth.api.signUpEmail({ body: { name, email: em, password: PW } });
  createdUserIds.push(res.user.id);
  return res.user.id;
}

afterAll(async () => {
  if (createdUserIds.length) {
    await db.delete(enrollment).where(inArray(enrollment.userId, createdUserIds));
  }
  if (createdCourseIds.length) {
    await db.delete(course).where(inArray(course.id, createdCourseIds));
  }
  if (createdOrgIds.length) {
    await db.delete(organization).where(inArray(organization.id, createdOrgIds));
  }
  if (createdUserIds.length) {
    // org personali (slug u-<id>) + cascata membership/invito
    await db.delete(organization).where(
      inArray(organization.slug, createdUserIds.map((id) => `u-${id}`)),
    );
    // utenti → cascata session/account/member
    await db.delete(user).where(inArray(user.id, createdUserIds));
  }
});

describe("Step 2 — integrazione DB", () => {
  it("§1 B2C self-signup → org personale (owner) + org attiva in sessione", async () => {
    const uid = await signUp("B2C", email("b2c"));

    const mems = await db.select().from(member).where(eq(member.userId, uid));
    expect(mems.length).toBe(1);
    expect(mems[0].role).toBe("owner");

    const [org] = await db.select().from(organization).where(eq(organization.id, mems[0].organizationId));
    expect(org.slug).toBe(`u-${uid}`);
    expect(parseOrgMetadata(org.metadata)?.type).toBe("personal");

    // sessione singola (1 sola sessione attiva)
    const sess = await db.select().from(session).where(eq(session.userId, uid));
    expect(sess.length).toBe(1);
    // org attiva risolta lazy (la colonna può essere null al signup) → deve puntare all'org personale
    expect(await firstMembershipOrgId(uid)).toBe(org.id);
  });

  it("§1 utente invitato → NESSUNA org personale", async () => {
    const ownerId = await signUp("Owner", email("owner"));
    const coId = await createCompanyOrg({ name: "ACME", slug: `acme-${RUN}`, seatLimit: 5, ownerUserId: ownerId });
    createdOrgIds.push(coId);

    const inviteeEmail = email("invitee");
    await db.insert(invitation).values({
      id: crypto.randomUUID(),
      organizationId: coId,
      email: inviteeEmail,
      role: "member",
      status: "pending",
      expiresAt: new Date(Date.now() + 86_400_000),
      createdAt: new Date(),
      inviterId: ownerId,
    });

    const inviteeId = await signUp("Invitee", inviteeEmail);
    const imems = await db.select().from(member).where(eq(member.userId, inviteeId));
    expect(imems.length).toBe(0);
  });

  it("§1 vincolo posti: company seatLimit=1 con solo owner → posto esaurito", async () => {
    const sOwnerId = await signUp("SeatOwner", email("seat"));
    const seatOrg = await createCompanyOrg({ name: "Solo", slug: `solo-${RUN}`, seatLimit: 1, ownerUserId: sOwnerId });
    createdOrgIds.push(seatOrg);
    await expect(assertSeatAvailable(seatOrg)).rejects.toThrow();
  });

  it("§1 sessione singola: due login → resta 1 sessione", async () => {
    const dEmail = email("dbl");
    const dId = await signUp("Dbl", dEmail);
    await auth.api.signInEmail({ body: { email: dEmail, password: PW } });
    await auth.api.signInEmail({ body: { email: dEmail, password: PW } });
    const sess = await db.select().from(session).where(eq(session.userId, dId));
    expect(sess.length).toBe(1);
  });

  it("§4 assegnazione corso → enrollment (idempotente) + non-membro rifiutato", async () => {
    const ownerId = await signUp("CourseOwner", email("courseowner"));
    const coId = await createCompanyOrg({ name: "EDU", slug: `edu-${RUN}`, seatLimit: 10, ownerUserId: ownerId });
    createdOrgIds.push(coId);
    const courseId = await createTestCourse(`Test ${RUN}`);
    createdCourseIds.push(courseId);

    const r1 = await enrollMemberInCourse({ orgId: coId, memberUserId: ownerId, courseId });
    expect(r1.ok).toBe(true);

    let enr = await db
      .select()
      .from(enrollment)
      .where(and(eq(enrollment.userId, ownerId), eq(enrollment.courseId, courseId)));
    expect(enr.length).toBe(1);
    expect(enr[0].source).toBe("b2b_seat");

    // idempotente
    await enrollMemberInCourse({ orgId: coId, memberUserId: ownerId, courseId });
    enr = await db
      .select()
      .from(enrollment)
      .where(and(eq(enrollment.userId, ownerId), eq(enrollment.courseId, courseId)));
    expect(enr.length).toBe(1);

    // non-membro rifiutato
    await expect(
      enrollMemberInCourse({ orgId: coId, memberUserId: "utente-inesistente", courseId }),
    ).rejects.toThrow();
  });
});

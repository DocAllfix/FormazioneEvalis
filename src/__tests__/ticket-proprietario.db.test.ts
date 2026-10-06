// Un discente legge, risponde e chiude solo i propri ticket anche se il database non lo protegge
// (connessione con un ruolo che salta la RLS): il controllo del proprietario sta anche nel codice.
// Lo staff continua a vedere e gestire tutti i ticket.

import { describe, it, expect, afterAll, vi } from "vitest";
import { sql, inArray, eq } from "drizzle-orm";

vi.mock("@/lib/email/resend", () => ({
  sendPasswordResetEmail: vi.fn(async () => ({ sent: false })),
  sendVerificationEmail: vi.fn(async () => ({ sent: false })),
  sendOrgInvitationEmail: vi.fn(async () => ({ sent: false })),
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user, organization, activityLog, ticket, ticketMessage } from "@/lib/db/schema";
import { firstMembershipOrgId } from "@/features/auth/guards";
import { createTicket, getTicket, addMessage, setTicketStatus, datiPerNotifica } from "@/features/support/lifecycle";

const RUN = Date.now();
const userIds: string[] = [];
const orgIds: string[] = [];

afterAll(async () => {
  if (orgIds.length) {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL app.audit_maintenance = 'on'`);
      await tx.delete(activityLog).where(inArray(activityLog.organizationId, orgIds));
    });
  }
  if (userIds.length) {
    await db.delete(organization).where(inArray(organization.slug, userIds.map((id) => `u-${id}`)));
    await db.delete(user).where(inArray(user.id, userIds));
  }
});

async function utente(tag: string) {
  const r = await auth.api.signUpEmail({ body: { name: tag, email: `tkown-${tag}+${RUN}@example.test`, password: "Password-123!" } });
  userIds.push(r.user.id);
  const orgId = (await firstMembershipOrgId(r.user.id))!;
  orgIds.push(orgId);
  return { uid: r.user.id, orgId };
}

async function rifiutato(p: Promise<unknown>) {
  try {
    await p;
    return false;
  } catch {
    return true;
  }
}

describe("ticket — proprietario controllato nel codice", () => {
  it("B non tocca il ticket di A; A e lo staff sì", async () => {
    const A = await utente("a");
    const B = await utente("b");
    const { id: t } = await createTicket({ userId: A.uid, orgId: A.orgId, subject: "Oggetto di A", body: "Messaggio di A" });

    // B (contesto discente) — tutto negato, stessa risposta di un ticket inesistente
    expect(await getTicket(t, { userId: B.uid })).toBeNull();
    expect(await datiPerNotifica(t, { userId: B.uid })).toBeNull();
    expect(await rifiutato(addMessage({ ticketId: t, authorId: B.uid, body: "intrusione", ctx: { userId: B.uid } }))).toBe(true);
    expect(await rifiutato(setTicketStatus({ ticketId: t, status: "closed", ctx: { userId: B.uid } }))).toBe(true);
    // contesto vuoto: niente
    expect(await getTicket(t, {})).toBeNull();

    const [stato] = await db.select({ s: ticket.status }).from(ticket).where(eq(ticket.id, t));
    expect(stato.s).toBe("open");
    expect(await db.select({ id: ticketMessage.id }).from(ticketMessage).where(eq(ticketMessage.ticketId, t))).toHaveLength(1);

    // A sì
    expect((await getTicket(t, { userId: A.uid }))?.subject).toBe("Oggetto di A");
    await addMessage({ ticketId: t, authorId: A.uid, body: "Aggiungo", ctx: { userId: A.uid } });
    expect((await datiPerNotifica(t, { userId: A.uid }))?.oggetto).toBe("Oggetto di A");

    // staff sì
    expect((await getTicket(t, { platformAdmin: true }))?.subject).toBe("Oggetto di A");
    await addMessage({ ticketId: t, authorId: B.uid, body: "Risposta staff", ctx: { platformAdmin: true } });
    await setTicketStatus({ ticketId: t, status: "closed", ctx: { platformAdmin: true } });
    const [fine] = await db.select({ s: ticket.status }).from(ticket).where(eq(ticket.id, t));
    expect(fine.s).toBe("closed");
  });
});

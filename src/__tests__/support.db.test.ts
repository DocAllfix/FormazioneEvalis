// Assistenza — integrazione DB. Flusso ticket completo (discente+staff) e, sotto RLS reale
// (RLS_FORCE_ROLE=app_rls), isolamento cross-tenant: un discente non vede/scrive ticket altrui.
// Seeding col db grezzo (ruolo connessione = bypass); le funzioni passano per withTenant.

import { describe, it, expect, afterAll } from "vitest";
import { sql, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user, organization, activityLog } from "@/lib/db/schema";
import { firstMembershipOrgId } from "@/features/auth/guards";
import {
  createTicket,
  getTicket,
  addMessage,
  setTicketStatus,
  listMyTickets,
  listStaffQueue,
} from "@/features/support/lifecycle";

const FORCED = process.env.RLS_FORCE_ROLE === "app_rls";
const RUN = Date.now();
const PW = "Password123!";
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
    await db.delete(user).where(inArray(user.id, userIds)); // cascade ticket + ticket_message
  }
});

async function mkUser(tag: string) {
  const res = await auth.api.signUpEmail({ body: { name: tag, email: `tic-${tag}+${RUN}@example.test`, password: PW } });
  const uid = res.user.id;
  userIds.push(uid);
  const orgId = (await firstMembershipOrgId(uid))!;
  orgIds.push(orgId);
  return { uid, orgId };
}

describe("Assistenza — ticketing", () => {
  it("apri → leggi → rispondi → staff risponde/chiude; cross-tenant negato (app_rls)", async () => {
    const A = await mkUser("A");
    const B = await mkUser("B");
    const S = await mkUser("S"); // autore staff (la valvola platformAdmin dà la visibilità)

    const { id: tId } = await createTicket({
      userId: A.uid,
      orgId: A.orgId,
      subject: "Problema accesso",
      body: "Non riesco ad entrare",
    });

    // A vede il proprio ticket + il primo messaggio
    const asA = await getTicket(tId, { userId: A.uid });
    expect(asA?.subject).toBe("Problema accesso");
    expect(asA?.messages.length).toBe(1);

    // compare nella lista di A
    expect((await listMyTickets(A.uid)).some((t) => t.id === tId)).toBe(true);

    // A risponde → 2 messaggi
    await addMessage({ ticketId: tId, authorId: A.uid, body: "Aggiungo dettagli", ctx: { userId: A.uid } });
    expect((await getTicket(tId, { userId: A.uid }))?.messages.length).toBe(2);

    // staff: ticket in coda (non chiuso) → risponde → chiude
    expect((await listStaffQueue()).some((t) => t.id === tId)).toBe(true);
    await addMessage({ ticketId: tId, authorId: S.uid, body: "Ciao, ti aiutiamo subito", ctx: { platformAdmin: true } });
    await setTicketStatus({ ticketId: tId, status: "closed", ctx: { platformAdmin: true } });
    expect((await getTicket(tId, { platformAdmin: true }))?.status).toBe("closed");
    // chiuso → esce dalla coda
    expect((await listStaffQueue()).some((t) => t.id === tId)).toBe(false);

    // cross-tenant (solo sotto RLS reale): B non vede né scrive il ticket di A
    const asB = await getTicket(tId, { userId: B.uid });
    if (FORCED) {
      expect(asB).toBeNull();
      await expect(
        addMessage({ ticketId: tId, authorId: B.uid, body: "intruso", ctx: { userId: B.uid } }),
      ).rejects.toThrow();
    }
  }, 60000);
});

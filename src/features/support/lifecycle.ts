// Assistenza — logica ticketing (senza guard, testabile). Tutte le query alle tabelle RLS
// passano per withTenant col ctx del ruolo: discente { userId } (vede/scrive i propri),
// staff { platformAdmin:true } (vede tutti). Eventi nella catena audit dell'org dell'attore.
// La proprietà è imposta dalla RLS: un discente non può leggere/scrivere ticket altrui.

import { desc, eq, ne } from "drizzle-orm";
import { ticket, ticketMessage, user } from "@/lib/db/schema";
import { withTenant, type TenantCtx } from "@/lib/db/tenant";
import { appendActivity } from "@/features/audit/log";

export type TicketStatus = "open" | "pending" | "closed";

export type TicketSummary = {
  id: string;
  subject: string;
  status: TicketStatus;
  updatedAt: Date;
};

export type TicketMessageView = {
  id: string;
  authorId: string;
  body: string;
  createdAt: Date;
};

export type TicketDetail = TicketSummary & {
  userId: string;
  organizationId: string;
  messages: TicketMessageView[];
};

/** Discente apre un ticket: crea ticket + primo messaggio + audit (atomico). */
export async function createTicket(params: {
  userId: string;
  orgId: string;
  subject: string;
  body: string;
}): Promise<{ id: string }> {
  const { userId, orgId, subject, body } = params;
  if (!subject.trim() || !body.trim()) throw new Error("Oggetto e messaggio sono obbligatori.");
  return withTenant({ userId }, async (tx) => {
    const [t] = await tx
      .insert(ticket)
      .values({ organizationId: orgId, userId, subject: subject.trim() })
      .returning({ id: ticket.id });
    await tx.insert(ticketMessage).values({ ticketId: t.id, authorId: userId, body: body.trim() });
    await appendActivity(tx, {
      organizationId: orgId,
      userId,
      verb: "ticket-opened",
      object: `ticket:${t.id}`,
      payload: { subject: subject.trim() },
    });
    return { id: t.id };
  });
}

/** I ticket del discente in sessione. */
export async function listMyTickets(userId: string): Promise<TicketSummary[]> {
  return withTenant({ userId }, async (tx) =>
    tx
      .select({ id: ticket.id, subject: ticket.subject, status: ticket.status, updatedAt: ticket.updatedAt })
      .from(ticket)
      .where(eq(ticket.userId, userId))
      .orderBy(desc(ticket.updatedAt)),
  ) as Promise<TicketSummary[]>;
}

/** Dettaglio ticket + messaggi, sotto il ctx del ruolo (RLS impone la proprietà). Null se non visibile. */
export async function getTicket(ticketId: string, ctx: TenantCtx): Promise<TicketDetail | null> {
  return withTenant(ctx, async (tx) => {
    const [t] = await tx
      .select({
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        updatedAt: ticket.updatedAt,
        userId: ticket.userId,
        organizationId: ticket.organizationId,
      })
      .from(ticket)
      .where(eq(ticket.id, ticketId))
      .limit(1);
    if (!t) return null;
    const messages = await tx
      .select({ id: ticketMessage.id, authorId: ticketMessage.authorId, body: ticketMessage.body, createdAt: ticketMessage.createdAt })
      .from(ticketMessage)
      .where(eq(ticketMessage.ticketId, ticketId))
      .orderBy(ticketMessage.createdAt);
    return { ...t, status: t.status as TicketStatus, messages } as TicketDetail;
  });
}

/** Aggiunge un messaggio a un ticket. `ctx` scopa la visibilità (discente proprietario o staff);
 *  se non visibile sotto il ctx → ticket "inesistente" (RLS). Aggiorna updatedAt; audit. */
export async function addMessage(params: {
  ticketId: string;
  authorId: string;
  body: string;
  ctx: TenantCtx;
}): Promise<{ ok: true }> {
  const { ticketId, authorId, body, ctx } = params;
  if (!body.trim()) throw new Error("Il messaggio non può essere vuoto.");
  return withTenant(ctx, async (tx) => {
    const [t] = await tx
      .select({ id: ticket.id, organizationId: ticket.organizationId, userId: ticket.userId })
      .from(ticket)
      .where(eq(ticket.id, ticketId))
      .limit(1);
    if (!t) throw new Error("Ticket inesistente.");
    await tx.insert(ticketMessage).values({ ticketId, authorId, body: body.trim() });
    await tx.update(ticket).set({ updatedAt: new Date() }).where(eq(ticket.id, ticketId));
    await appendActivity(tx, {
      organizationId: t.organizationId,
      userId: t.userId,
      verb: "ticket-replied",
      object: `ticket:${ticketId}`,
      payload: { by: authorId },
    });
    return { ok: true as const };
  });
}

/** Cambia stato del ticket (open/pending/closed). `ctx` impone la proprietà. Audit. */
export async function setTicketStatus(params: {
  ticketId: string;
  status: TicketStatus;
  ctx: TenantCtx;
}): Promise<{ ok: true }> {
  const { ticketId, status, ctx } = params;
  return withTenant(ctx, async (tx) => {
    const [t] = await tx
      .select({ id: ticket.id, organizationId: ticket.organizationId, userId: ticket.userId })
      .from(ticket)
      .where(eq(ticket.id, ticketId))
      .limit(1);
    if (!t) throw new Error("Ticket inesistente.");
    await tx.update(ticket).set({ status, updatedAt: new Date() }).where(eq(ticket.id, ticketId));
    await appendActivity(tx, {
      organizationId: t.organizationId,
      userId: t.userId,
      verb: `ticket-${status}`,
      object: `ticket:${ticketId}`,
    });
    return { ok: true as const };
  });
}

export type StaffTicketRow = TicketSummary & {
  learnerName: string;
  learnerEmail: string;
};

/** Coda staff: tutti i ticket NON chiusi, con i dati del discente. Cross-tenant (platformAdmin). */
export async function listStaffQueue(): Promise<StaffTicketRow[]> {
  return withTenant({ platformAdmin: true }, async (tx) =>
    tx
      .select({
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        updatedAt: ticket.updatedAt,
        learnerName: user.name,
        learnerEmail: user.email,
      })
      .from(ticket)
      .innerJoin(user, eq(user.id, ticket.userId))
      .where(ne(ticket.status, "closed"))
      .orderBy(desc(ticket.updatedAt)),
  ) as Promise<StaffTicketRow[]>;
}

"use server";

// Server Actions assistenza. Applicano i guard e costruiscono il ctx del ruolo, poi delegano
// al lifecycle (che instrada in withTenant). La UI chiama queste, mai il lifecycle grezzo.

import { requireSession, requireActiveOrg, requirePlatformAdmin } from "@/features/auth/guards";
import {
  createTicket,
  addMessage,
  setTicketStatus,
} from "@/features/support/lifecycle";

// --- Discente ---

export async function createMyTicketAction(subject: string, body: string) {
  const { user, orgId } = await requireActiveOrg();
  return createTicket({ userId: user.id, orgId, subject, body });
}

export async function replyMyTicketAction(ticketId: string, body: string) {
  const { user } = await requireSession();
  return addMessage({ ticketId, authorId: user.id, body, ctx: { userId: user.id } });
}

export async function closeMyTicketAction(ticketId: string) {
  const { user } = await requireSession();
  return setTicketStatus({ ticketId, status: "closed", ctx: { userId: user.id } });
}

// --- Staff piattaforma ---

export async function staffReplyTicketAction(ticketId: string, body: string) {
  const ctx = await requirePlatformAdmin();
  return addMessage({ ticketId, authorId: ctx.user.id, body, ctx: { platformAdmin: true } });
}

export async function staffSetTicketStatusAction(
  ticketId: string,
  status: "open" | "pending" | "closed",
) {
  await requirePlatformAdmin();
  return setTicketStatus({ ticketId, status, ctx: { platformAdmin: true } });
}

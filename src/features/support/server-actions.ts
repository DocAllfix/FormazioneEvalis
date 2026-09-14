"use server";

// Server Actions assistenza. Applicano i guard e costruiscono il ctx del ruolo, poi delegano
// al lifecycle (che instrada in withTenant). La UI chiama queste, mai il lifecycle grezzo.
//
// Le NOTIFICHE stanno qui e non nel lifecycle, di proposito: il lifecycle è la logica del
// ticket e resta collaudabile senza rete. Qui si sa chi è l'attore e qual è il suo ruolo,
// che è esattamente l'informazione che decide chi va avvisato.
// ⚠️ Sempre DOPO che il ticket è scritto, e sempre best-effort: `avvisa*` non rilancia mai.

import { requireSession, requireActiveOrg, requirePlatformAdmin } from "@/features/auth/guards";
import {
  createTicket,
  addMessage,
  setTicketStatus,
  datiPerNotifica,
} from "@/features/support/lifecycle";
import {
  destinatariAssistenza,
  avvisaNuovoTicket,
  avvisaRispostaUtente,
  avvisaRispostaStaff,
  type Dipendenze,
} from "@/features/support/notifiche";
import { inviaEmailAssistenza } from "@/lib/email/resend";
import { renderEmail } from "@/lib/email/layout";

function dipendenze(): Dipendenze {
  return {
    invia: inviaEmailAssistenza,
    rendi: renderEmail,
    baseUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    staff: destinatariAssistenza(process.env.ASSISTENZA_NOTIFICHE_A),
  };
}

// --- Discente ---

export async function createMyTicketAction(subject: string, body: string) {
  const { user, orgId } = await requireActiveOrg();
  const t = await createTicket({ userId: user.id, orgId, subject, body });
  await avvisaNuovoTicket(dipendenze(), {
    ticketId: t.id,
    oggetto: subject,
    messaggio: body,
    autoreNome: user.name ?? user.email,
    autoreEmail: user.email,
  });
  return t;
}

export async function replyMyTicketAction(ticketId: string, body: string) {
  const { user } = await requireSession();
  const r = await addMessage({ ticketId, authorId: user.id, body, ctx: { userId: user.id } });
  const dati = await datiPerNotifica(ticketId, { userId: user.id });
  if (dati) {
    await avvisaRispostaUtente(dipendenze(), {
      ticketId,
      oggetto: dati.oggetto,
      messaggio: body,
      autoreNome: user.name ?? user.email,
      autoreEmail: user.email,
    });
  }
  return r;
}

export async function closeMyTicketAction(ticketId: string) {
  const { user } = await requireSession();
  return setTicketStatus({ ticketId, status: "closed", ctx: { userId: user.id } });
}

// --- Staff piattaforma ---

export async function staffReplyTicketAction(ticketId: string, body: string) {
  const ctx = await requirePlatformAdmin();
  const r = await addMessage({ ticketId, authorId: ctx.user.id, body, ctx: { platformAdmin: true } });
  const dati = await datiPerNotifica(ticketId, { platformAdmin: true });
  if (dati) {
    await avvisaRispostaStaff(dipendenze(), {
      ticketId,
      oggetto: dati.oggetto,
      messaggio: body,
      autoreId: ctx.user.id,
      proprietarioId: dati.proprietarioId,
      proprietarioNome: dati.proprietarioNome,
      proprietarioEmail: dati.proprietarioEmail,
    });
  }
  return r;
}

export async function staffSetTicketStatusAction(
  ticketId: string,
  status: "open" | "pending" | "closed",
) {
  await requirePlatformAdmin();
  return setTicketStatus({ ticketId, status, ctx: { platformAdmin: true } });
}

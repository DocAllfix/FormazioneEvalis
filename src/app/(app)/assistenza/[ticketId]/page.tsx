import { notFound } from "next/navigation";
import { getTicket } from "@/features/support/lifecycle";
import { TicketThread } from "@/components/support/ticket-thread";
import { sessionePagina } from "@/features/auth/pagina";

export const metadata = { title: "Richiesta — Assistenza Evalis" };

export default async function AssistenzaTicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const { user } = await sessionePagina();
  const ticket = await getTicket(ticketId, { userId: user.id });
  if (!ticket) notFound();

  return <TicketThread ticket={ticket} viewerId={user.id} role="user" />;
}

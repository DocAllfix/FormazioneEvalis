import { notFound } from "next/navigation";
import { requireSession } from "@/features/auth/guards";
import { getTicket } from "@/features/support/lifecycle";
import { TicketThread } from "@/components/support/ticket-thread";

export const metadata = { title: "Richiesta — Assistenza Evalis" };

export default async function AssistenzaTicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const { user } = await requireSession();
  const ticket = await getTicket(ticketId, { userId: user.id });
  if (!ticket) notFound();

  return <TicketThread ticket={ticket} viewerId={user.id} role="user" />;
}

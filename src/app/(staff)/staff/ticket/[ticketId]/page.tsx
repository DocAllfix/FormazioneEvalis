import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/features/auth/guards";
import { getTicket } from "@/features/support/lifecycle";
import { TicketThread } from "@/components/support/ticket-thread";

export const metadata = { title: "Ticket — Evalis Staff" };

export default async function StaffTicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const ctx = await requirePlatformAdmin();
  const ticket = await getTicket(ticketId, { platformAdmin: true });
  if (!ticket) notFound();

  return <TicketThread ticket={ticket} viewerId={ctx.user.id} role="staff" />;
}

import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/server";
import { AcceptInvitation } from "@/components/admin/accept-invitation";

export const metadata = { title: "Accetta invito — Evalis" };

// Pagina di accettazione invito (link dall'email). Richiede sessione: se assente,
// rimanda al login con ritorno qui.
export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getCurrentSession();
  if (!ctx) redirect(`/login?next=${encodeURIComponent(`/accept-invitation/${id}`)}`);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <AcceptInvitation invitationId={id} userEmail={ctx.user.email} />
    </div>
  );
}

import { getCurrentSession } from "@/lib/auth/server";
import { getInvitationInfo } from "@/features/auth/invitations";
import { AcceptInvitation } from "@/components/admin/accept-invitation";
import { InvitedJoin } from "@/components/invitations/invited-join";

export const metadata = { title: "Accetta invito — Evalis Academy" };

// Pagina di accettazione invito (link dall'email, sul sottodominio dell'azienda).
// - Utente loggato → conferma l'accettazione (AcceptInvitation).
// - Non loggato → una sola schermata (InvitedJoin: crea l'accesso, oppure "Accedi"), identica
//   che l'email invitata abbia già un account oppure no: la pagina non rivela chi è registrato.
//   L'account nuovo si conferma con il link mandato alla casella, poi si torna qui.
export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getCurrentSession();

  const content = ctx ? (
    <AcceptInvitation invitationId={id} userEmail={ctx.user.email} />
  ) : (
    await renderGuest(id)
  );

  return <div className="flex min-h-screen items-center justify-center bg-background p-4">{content}</div>;
}

async function renderGuest(id: string) {
  const info = await getInvitationInfo(id);
  if (!info || info.status !== "pending" || info.expired) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="font-heading text-2xl text-near-black">Invito non valido</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Questo invito non è più valido o è scaduto. Chiedi all&apos;azienda di inviartene uno nuovo.
        </p>
      </div>
    );
  }
  return <InvitedJoin invitationId={id} email={info.email} orgName={info.orgName} />;
}

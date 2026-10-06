// Invito dipendenti B2B (invite-by-email), con vincolo posti.
// La RBAC (chi può invitare) è enforced nativamente da better-auth (createInvitation
// richiede permesso invito nell'org). Noi aggiungiamo solo il controllo seat.
// Funzioni server semplici (testabili); i wrapper Server Action/route li espone il frontend.

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { invitation, organization } from "@/lib/db/schema";
import { requireActiveOrg } from "@/features/auth/guards";
import { assertSeatAvailable } from "@/features/billing/seats";
import { ErroreUtente } from "@/lib/esito";

/** Info pubbliche dell'invito (l'id UUID è il segreto: chi ce l'ha ha ricevuto l'email). */
export async function getInvitationInfo(
  id: string,
): Promise<{ email: string; orgName: string; status: string; expired: boolean } | null> {
  const [inv] = await db
    .select({ email: invitation.email, orgId: invitation.organizationId, status: invitation.status, expiresAt: invitation.expiresAt })
    .from(invitation)
    .where(eq(invitation.id, id))
    .limit(1);
  if (!inv) return null;
  const [org] = await db.select({ name: organization.name }).from(organization).where(eq(organization.id, inv.orgId)).limit(1);
  return { email: inv.email, orgName: org?.name ?? "l'azienda", status: inv.status, expired: inv.expiresAt < new Date() };
}

/**
 * Invita un'email nell'azienda. `orgId` esplicito (dall'area admin, già verificata
 * owner/admin) oppure fallback all'org attiva. Rifiuta se posti esauriti.
 */
export async function inviteMember(
  email: string,
  role: "admin" | "member" = "member",
  orgId?: string,
) {
  const targetOrg = orgId ?? (await requireActiveOrg()).orgId;
  await assertSeatAvailable(targetOrg); // gate posti (oltre alla RBAC nativa)
  return auth.api.createInvitation({
    body: { email, role, organizationId: targetOrg },
    headers: await headers(),
  });
}

/** Accetta un invito: l'utente loggato diventa membro della company org. Rifiuta se posti esauriti. */
export async function acceptInvitation(invitationId: string) {
  const [inv] = await db
    .select({ orgId: invitation.organizationId })
    .from(invitation)
    .where(eq(invitation.id, invitationId))
    .limit(1);
  if (!inv) throw new ErroreUtente("Invito non trovato.");
  await assertSeatAvailable(inv.orgId); // il posto si consuma all'accettazione
  return auth.api.acceptInvitation({
    body: { invitationId },
    headers: await headers(),
  });
}

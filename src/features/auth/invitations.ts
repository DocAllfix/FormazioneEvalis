// Invito dipendenti B2B (invite-by-email), con vincolo posti.
// La RBAC (chi può invitare) è enforced nativamente da better-auth (createInvitation
// richiede permesso invito nell'org). Noi aggiungiamo solo il controllo seat.
// Funzioni server semplici (testabili); i wrapper Server Action/route li espone il frontend.

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { invitation, organization, user } from "@/lib/db/schema";
import { requireActiveOrg } from "@/features/auth/guards";
import { assertSeatAvailable } from "@/features/billing/seats";

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

/** True se esiste già un account con quell'email (→ deve accedere, non ri-registrarsi). */
export async function emailHasAccount(email: string): Promise<boolean> {
  const [u] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  return !!u;
}

/** Marca verificato l'account creato via invito: l'id dell'invito prova il possesso dell'email
 *  (solo chi ha ricevuto il link lo conosce). Richiede invito pending e non scaduto. */
export async function verifyInvitedAccount(invitationId: string): Promise<void> {
  const [inv] = await db
    .select({ email: invitation.email, status: invitation.status, expiresAt: invitation.expiresAt })
    .from(invitation)
    .where(eq(invitation.id, invitationId))
    .limit(1);
  if (!inv || inv.status !== "pending" || inv.expiresAt < new Date()) {
    throw new Error("Invito non valido o scaduto.");
  }
  await db.update(user).set({ emailVerified: true }).where(eq(user.email, inv.email));
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
  if (!inv) throw new Error("Invito non trovato.");
  await assertSeatAvailable(inv.orgId); // il posto si consuma all'accettazione
  return auth.api.acceptInvitation({
    body: { invitationId },
    headers: await headers(),
  });
}

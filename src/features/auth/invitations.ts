// Invito dipendenti B2B (invite-by-email), con vincolo posti.
// La RBAC (chi può invitare) è enforced nativamente da better-auth (createInvitation
// richiede permesso invito nell'org). Noi aggiungiamo solo il controllo seat.
// Funzioni server semplici (testabili); i wrapper Server Action/route li espone il frontend.

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { invitation } from "@/lib/db/schema";
import { requireActiveOrg } from "@/features/auth/guards";
import { assertSeatAvailable } from "@/features/billing/seats";

/** Invita un'email nell'organizzazione attiva (azienda). Rifiuta se posti esauriti. */
export async function inviteMember(email: string, role: "admin" | "member" = "member") {
  const { orgId } = await requireActiveOrg();
  await assertSeatAvailable(orgId); // gate posti (oltre alla RBAC nativa)
  return auth.api.createInvitation({
    body: { email, role, organizationId: orgId },
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

"use server";

// Server Actions area AZIENDA. Wrapper sottili sulle funzioni di dominio esistenti
// (orgs/invitations/assign), gate-ati. Nessuna logica nuova qui.

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organization } from "@/lib/db/schema";
import { requireSession, requirePlatformAdmin } from "@/features/auth/guards";
import { createCompanyOrg } from "@/features/auth/orgs";
import { DEFAULT_COMPANY_SEATS } from "@/features/billing/seats";
import { isValidSlug } from "@/lib/reserved-subdomains";
import { appendActivity } from "@/features/audit/log";
import { inviteMember, acceptInvitation, verifyInvitedAccount } from "@/features/auth/invitations";
import { enrollMemberInCourse } from "@/features/courses/assign";
import { requireCompanyContext } from "@/features/admin/context";

/** Self-serve: l'utente crea il proprio spazio azienda e ne diventa owner. */
export async function createMyCompany(input: { name: string; slug: string }) {
  const { user } = await requireSession();
  const name = input.name?.trim();
  const slug = input.slug?.trim().toLowerCase();
  if (!name) throw new Error("Nome azienda obbligatorio.");
  if (!isValidSlug(slug)) throw new Error("Sottodominio non valido o riservato.");

  const [exists] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, slug))
    .limit(1);
  if (exists) throw new Error("Sottodominio già in uso, scegline un altro.");

  // I posti NON si vendono (modello: si pagano i corsi, non l'accesso): l'azienda può
  // invitare liberamente i propri dipendenti. Il limite resta solo come guardia tecnica
  // contro inviti massivi anomali; si alza a richiesta.
  const orgId = await createCompanyOrg({ name, slug, seatLimit: DEFAULT_COMPANY_SEATS, ownerUserId: user.id });
  await auth.api
    .setActiveOrganization({ body: { organizationId: orgId }, headers: await headers() })
    .catch(() => {});

  try {
    await db.transaction(async (tx) => {
      await appendActivity(tx, {
        organizationId: orgId,
        userId: user.id,
        verb: "company-created",
        object: `organization:${orgId}`,
        payload: { name, slug },
      });
    });
  } catch (e) {
    console.error("[audit] company-created failed", e);
  }

  return { ok: true as const, orgId, slug };
}

/** Invita un dipendente nell'azienda amministrata (gate posti). */
export async function inviteMemberAction(email: string, role: "admin" | "member" = "member") {
  const { org } = await requireCompanyContext();
  return inviteMember(email, role, org.id);
}

/** Accetta un invito (utente loggato → membro azienda; org dedotta dall'invito). */
export async function acceptInvitationAction(invitationId: string) {
  return acceptInvitation(invitationId);
}

/** Marca verificato l'account appena creato via invito (l'id invito prova il possesso email).
 *  Non richiede sessione: l'utente invitato non è ancora loggato. Gate = validità dell'invito. */
export async function verifyInvitedAccountAction(invitationId: string): Promise<void> {
  await verifyInvitedAccount(invitationId);
}

/** Assegna un corso a un dipendente dell'azienda amministrata (enrollment b2b_seat). */
/** Assegnazione DIRETTA di un corso a un dipendente, SENZA pagamento.
 * Riservata allo STAFF di piattaforma: serve per gli ordini incassati fuori dalla
 * piattaforma (bonifico, fattura, accordi quadro). L'admin dell'azienda NON può usarla —
 * per i suoi dipendenti acquista il corso dal catalogo (con lo sconto azienda), altrimenti
 * potrebbe distribuire gratuitamente l'intero catalogo. */
export async function assignCourseAction(memberUserId: string, courseId: string) {
  const { org } = await requireCompanyContext();
  await requirePlatformAdmin();
  return enrollMemberInCourse({ orgId: org.id, memberUserId, courseId });
}

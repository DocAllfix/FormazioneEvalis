// Guard server-side: sessione, organizzazione attiva, ruolo. Superficie che le
// Server Actions e (tramite esse) il frontend useranno per proteggere le azioni.
// Convenzione scoping: ogni query di dominio filtra per l'org attiva (prima barriera);
// RLS Supabase = seconda barriera (slice successivo).

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { member } from "@/lib/db/schema";
import { getCurrentSession } from "@/lib/auth/server";
import { ErroreUtente } from "@/lib/esito";
import { assicuraSpazio, spazioPredefinito } from "./spazio-predefinito";

export async function requireSession() {
  const ctx = await getCurrentSession();
  if (!ctx) throw new ErroreUtente("Non autenticato.");
  return ctx;
}

/** Lo spazio in cui lavora l'utente quando la sessione non ne indica uno (spazio-predefinito.ts). */
export async function firstMembershipOrgId(userId: string): Promise<string | null> {
  return spazioPredefinito(userId);
}

export async function requireActiveOrg() {
  const ctx = await requireSession();
  // Risoluzione lazy: better-auth può creare la sessione prima dell'org personale
  // (hook user.create.after), quindi activeOrganizationId può essere null al primo accesso.
  // Lo spazio della sessione vale solo finché l'utente ne è membro: chi è stato rimosso da
  // un'azienda ha la sessione ancora puntata lì (fino a 7 giorni) ma non agisce più a suo nome.
  // Chi non ha nessuno spazio (registrato quando un invito in sospeso lo faceva saltare) ne
  // riceve uno personale qui, invece di un errore.
  const attivo = ctx.session.activeOrganizationId;
  const orgId =
    attivo && (await getMemberRole(ctx.user.id, attivo)) ? attivo : await assicuraSpazio(ctx.user.id);
  return { ...ctx, orgId };
}

export async function getMemberRole(userId: string, orgId: string): Promise<string | null> {
  const [m] = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, orgId)))
    .limit(1);
  return m?.role ?? null;
}

/** Richiede che l'utente abbia uno dei ruoli indicati nell'org attiva, altrimenti lancia. */
export async function requireRole(...roles: string[]) {
  const { user, session, orgId } = await requireActiveOrg();
  const role = await getMemberRole(user.id, orgId);
  if (!role || !roles.includes(role)) {
    throw new Error(
      `Permesso negato: richiesto ${roles.join("|")}, attuale "${role ?? "nessuno"}".`,
    );
  }
  return { user, session, orgId, role };
}

/**
 * Staff della piattaforma (ente accreditato): revisore certificati, TRASVERSALE alle org.
 * Allowlist via env `PLATFORM_STAFF_EMAILS` (CSV), letta a runtime. Funzione pura testabile.
 */
export function isPlatformStaffEmail(email: string): boolean {
  const list = (process.env.PLATFORM_STAFF_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

/**
 * REVISORI del player (solo controllo interno): utenti a cui il server sblocca "Avanti"
 * senza attendere tempo minimo/audio, per scorrere i corsi e testarli. NON tocca la
 * persistenza né l'audit-log (nessun completamento finto): agisce SOLO sul flag di ritorno
 * dell'heartbeat. Allowlist per user.id: costante (garantisce il funzionamento anche senza
 * env in prod) + env `PLAYER_REVIEWER_USER_IDS` (CSV) estendibile. Nessun effetto sugli altri.
 */
const REVIEWER_USER_IDS = ["UDehVYvTyFwHEBmVH1rWQwvLU5yjEF40"]; // dilonardoa28 (controllo interno)
export function isPlayerReviewerId(userId?: string | null): boolean {
  if (!userId) return false;
  const env = (process.env.PLAYER_REVIEWER_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return REVIEWER_USER_IDS.includes(userId) || env.includes(userId);
}

/**
 * Admin di PIATTAFORMA (Evalis): canonico = campo `user.platformRole === 'admin'`;
 * la allowlist email resta come BOOTSTRAP (primi admin / fallback). Check puro, no throw.
 */
export function isPlatformAdmin(u: { email: string; platformRole?: string | null }): boolean {
  return u.platformRole === "admin" || isPlatformStaffEmail(u.email);
}

/** Richiede che l'utente in sessione sia admin di piattaforma, altrimenti lancia. */
export async function requirePlatformAdmin() {
  const ctx = await requireSession();
  if (!isPlatformAdmin(ctx.user as { email: string; platformRole?: string | null })) {
    throw new Error("Permesso negato: richiesto admin di piattaforma.");
  }
  return ctx;
}

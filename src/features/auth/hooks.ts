// databaseHooks di better-auth: glue applicativo su creazione utente/sessione.
// - user.create.after: crea l'org personale SOLO per i self-signup (gli invitati
//   entrano nella company org via accettazione invito → niente org personale).
// - session.create.before: imposta l'org attiva di default (prima membership).
//   La Fase 2.5 aggiungerà session.create.after per la sessione singola.
// - La Fase 2.4 (middleware) potrà sovrascrivere l'org attiva in base al sottodominio.

import type { BetterAuthOptions } from "better-auth";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitation, member, session as sessionTable } from "@/lib/db/schema";
import { appendActivity } from "@/features/audit/log";
import { createPersonalOrg } from "./orgs";

/** Esiste un invito pendente per questa email? (se sì → utente B2B, niente org personale) */
export async function hasPendingInvitation(email: string): Promise<boolean> {
  const rows = await db
    .select({ id: invitation.id })
    .from(invitation)
    .where(and(eq(invitation.email, email), eq(invitation.status, "pending")))
    .limit(1);
  return rows.length > 0;
}

export const authDatabaseHooks = {
  user: {
    create: {
      after: async (user) => {
        if (await hasPendingInvitation(user.email)) return; // invitato → no org personale
        await createPersonalOrg(user.id);
      },
    },
  },
  session: {
    create: {
      before: async (session) => {
        const rows = await db
          .select({ orgId: member.organizationId })
          .from(member)
          .where(eq(member.userId, session.userId))
          .limit(1);
        if (rows[0]) {
          return { data: { ...session, activeOrganizationId: rows[0].orgId } };
        }
        return undefined;
      },
      // Sessione singola attiva (Modulo 11): al nuovo login revoca le altre sessioni dell'utente.
      after: async (session) => {
        const revoked = await db
          .delete(sessionTable)
          .where(and(eq(sessionTable.userId, session.userId), ne(sessionTable.id, session.id)))
          .returning({ id: sessionTable.id });

        // Audit best-effort: un guasto qui NON deve impedire il login.
        try {
          const activeOrg = (session as { activeOrganizationId?: string | null }).activeOrganizationId;
          let organizationId = activeOrg ?? undefined;
          if (!organizationId) {
            const [m] = await db
              .select({ orgId: member.organizationId })
              .from(member)
              .where(eq(member.userId, session.userId))
              .limit(1);
            organizationId = m?.orgId;
          }
          if (organizationId) {
            const org = organizationId;
            await db.transaction(async (tx) => {
              await appendActivity(tx, { organizationId: org, userId: session.userId, verb: "logged-in", object: `session:${session.id}` });
              for (const r of revoked) {
                await appendActivity(tx, { organizationId: org, userId: session.userId, verb: "session-revoked", object: `session:${r.id}` });
              }
            });
          }
        } catch (e) {
          console.error("[audit] logged-in append failed", e);
        }
      },
    },
  },
} satisfies BetterAuthOptions["databaseHooks"];

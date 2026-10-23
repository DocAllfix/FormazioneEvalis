// databaseHooks di better-auth: glue applicativo su creazione utente/sessione.
// - user.create.after: crea SEMPRE l'org personale, anche per chi ha un invito in sospeso
//   (prima la saltava: chi poi non accettava, o aveva l'invito scaduto, restava senza spazio).
// - session.create.before: imposta l'org attiva di default (spazio-predefinito.ts: azienda
//   se ne è membro, altrimenti lo spazio personale).
//   La Fase 2.5 aggiungerà session.create.after per la sessione singola.
// - La Fase 2.4 (middleware) potrà sovrascrivere l'org attiva in base al sottodominio.

import type { BetterAuthOptions } from "better-auth";
import { APIError } from "better-auth/api";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { member, session as sessionTable } from "@/lib/db/schema";
import { appendActivity } from "@/features/audit/log";
import { createPersonalOrg } from "./orgs";
import { spazioPredefinito } from "./spazio-predefinito";
import { normalizzaCodicePartner } from "@/features/partner/codici";

export const authDatabaseHooks = {
  user: {
    create: {
      // Codice partner: si accetta solo un codice conosciuto (codici.ts). Uno sbagliato blocca la
      // registrazione con un messaggio: accettato in silenzio, il partner perderebbe la provvigione.
      before: async (user) => {
        const codice = normalizzaCodicePartner((user as { partnerCode?: unknown }).partnerCode);
        if (codice === "invalido") {
          throw new APIError("BAD_REQUEST", { message: "Codice partner non valido: controlla di averlo scritto bene, oppure lascia vuoto il campo." });
        }
        return { data: { ...user, partnerCode: codice } };
      },
      after: async (user) => {
        await createPersonalOrg(user.id);
      },
    },
    // Il partner si sceglie SOLO alla registrazione: qualunque modifica successiva del codice si
    // scarta, così l'attribuzione delle provvigioni non si può spostare.
    update: {
      before: async (data) => {
        if (!("partnerCode" in data)) return undefined;
        const { partnerCode: _scartato, ...resto } = data as Record<string, unknown>;
        return { data: resto };
      },
    },
  },
  session: {
    create: {
      before: async (session) => {
        const orgId = await spazioPredefinito(session.userId);
        if (orgId) {
          return { data: { ...session, activeOrganizationId: orgId } };
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

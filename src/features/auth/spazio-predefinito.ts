// Lo "spazio" in cui lavora un utente (a nome di chi vanno acquisti, ticket, forum). L'utente
// non lo sceglie: non esiste un selettore. Regola decisa col committente (06/10):
//   chi è membro di un'azienda lavora nell'azienda — prima quella dove è titolare o
//   amministratore, poi quella dove è dipendente — altrimenti nel suo spazio personale.
// Ogni utente ha sempre uno spazio personale di riserva: se manca (utenti registrati quando un
// invito in sospeso lo faceva saltare) viene creato al primo uso.
// File a parte, senza dipendenze dalla sessione: lo usano sia gli hook di better-auth sia le guardie.

import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { member, organization } from "@/lib/db/schema";
import { parseOrgMetadata } from "./org-metadata";
import { createPersonalOrg } from "./orgs";

type Exec = Parameters<typeof createPersonalOrg>[1];

export async function spazioPredefinito(userId: string, exec: NonNullable<Exec> = db): Promise<string | null> {
  const righe = await exec
    .select({ orgId: member.organizationId, role: member.role, metadata: organization.metadata })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(eq(member.userId, userId))
    .orderBy(member.createdAt);
  const aziende = righe.filter((r) => parseOrgMetadata(r.metadata)?.type === "company");
  const scelta =
    aziende.find((r) => r.role === "owner" || r.role === "admin") ??
    aziende[0] ??
    righe.find((r) => parseOrgMetadata(r.metadata)?.type === "personal") ??
    righe[0];
  return scelta?.orgId ?? null;
}

async function personaleEsistente(userId: string, exec: NonNullable<Exec>): Promise<string | null> {
  const righe = await exec
    .select({ orgId: member.organizationId, metadata: organization.metadata })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(eq(member.userId, userId));
  return righe.find((r) => parseOrgMetadata(r.metadata)?.type === "personal")?.orgId ?? null;
}

/** Lo spazio PERSONALE dell'utente (quello degli acquisti da privato); se manca lo crea. */
export async function spazioPersonale(userId: string): Promise<string> {
  const esistente = await personaleEsistente(userId, db);
  if (esistente) return esistente;
  return db.transaction(async (tx) => {
    // due richieste insieme dello stesso utente: la seconda aspetta e trova lo spazio già creato
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${"spazio:" + userId}))`);
    return (await personaleEsistente(userId, tx)) ?? (await createPersonalOrg(userId, tx));
  });
}

/** Lo spazio predefinito dell'utente; se non ne ha nessuno, crea quello personale. */
export async function assicuraSpazio(userId: string): Promise<string> {
  return (await spazioPredefinito(userId)) ?? (await spazioPersonale(userId));
}

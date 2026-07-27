// Allinea le organizzazioni AZIENDA al modello "posti gratuiti" (si pagano i corsi):
// porta seats/metadata.seatLimit a DEFAULT_COMPANY_SEATS dove è più basso. Idempotente.
// Le org personali (B2C, seatLimit 1) NON vengono toccate.
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organization } from "@/lib/db/schema";
import { parseOrgMetadata, serializeOrgMetadata } from "@/features/auth/org-metadata";
import { DEFAULT_COMPANY_SEATS } from "@/features/billing/seats";

const rows = await db.select().from(organization);
let toccate = 0;
for (const o of rows) {
  const meta = parseOrgMetadata(o.metadata);
  if (meta?.type !== "company") continue;
  const limiteAttuale = o.seats ?? meta.seatLimit ?? 0;
  if (limiteAttuale >= DEFAULT_COMPANY_SEATS) { console.log(`= ${o.name}: già ${limiteAttuale}`); continue; }
  await db
    .update(organization)
    .set({ seats: DEFAULT_COMPANY_SEATS, metadata: serializeOrgMetadata({ ...meta, seatLimit: DEFAULT_COMPANY_SEATS }) })
    .where(eq(organization.id, o.id));
  console.log(`✓ ${o.name}: ${limiteAttuale} → ${DEFAULT_COMPANY_SEATS}`);
  toccate++;
}
console.log(`FATTO. aziende aggiornate: ${toccate} (su ${rows.length} organizzazioni totali)`);
process.exit(0);

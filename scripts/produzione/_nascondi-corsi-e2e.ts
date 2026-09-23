// Toglie dal catalogo i corsi creati dai test end-to-end ("Corso E2E …"): li porta a draft.
// NON cancella nulla: enrollment, progressi e log di fruizione restano intatti (hanno valore
// normativo). Reversibile: basta riportarli a published. Sola UPDATE su course.status.
// Uso: DATABASE_URL=… npx tsx scripts/produzione/_nascondi-corsi-e2e.ts [--prova]
import "dotenv/config";
import postgres from "postgres";

const prova = process.argv.includes("--prova");
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1, connect_timeout: 10 });
const candidati = await sql`select id, title, status from course
  where title ilike 'Corso E2E%' and status = 'published' order by title`;
console.log(`corsi di test pubblicati: ${candidati.length}`);
for (const c of candidati) console.log(`  ${c.title}`);
if (!prova && candidati.length) {
  const r = await sql`update course set status = 'draft', updated_at = now()
    where title ilike 'Corso E2E%' and status = 'published' returning id`;
  console.log(`portati a draft: ${r.length}`);
}
await sql.end();
process.exit(0);

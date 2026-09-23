// Elenca i corsi di prova rimasti nel database (titolo "Corso E2E …" o simili): sola lettura.
// Uso: DATABASE_URL=… npx tsx scripts/produzione/_corsi-spuri.ts
import "dotenv/config";
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1, connect_timeout: 10 });
const r = await sql`select c.id, c.title, c.status, c.slug, count(e.id)::int as iscrizioni
  from course c left join enrollment e on e.course_id = c.id
  where c.title ilike 'Corso E2E%' or c.title ilike '%demo%' or c.title ilike 'Corso di prova%'
  group by c.id order by c.title`;
console.log(`corsi di prova nel database: ${r.length}`);
for (const c of r) console.log(`  ${c.status.padEnd(9)} · iscrizioni ${String(c.iscrizioni).padStart(2)} · ${c.title}`);
await sql.end();
process.exit(0);

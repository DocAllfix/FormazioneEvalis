// Che cosa vede davvero il catalogo pubblico: stessa condizione della query di prodotto
// (status published + nessuna organizzazione proprietaria). Sola lettura.
import "dotenv/config";
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1, connect_timeout: 10 });
const r = await sql`select title, slug, price_cents, stripe_price_id from course
  where status = 'published' and organization_id is null order by title`;
console.log(`corsi visibili in catalogo: ${r.length}`);
for (const c of r) console.log(`  ${c.stripe_price_id ? "acquistabile" : "NON acquistabile"} · ${c.title}`);
await sql.end();
process.exit(0);

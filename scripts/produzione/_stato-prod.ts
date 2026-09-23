// Fotografia dello stato commerciale in produzione (sola lettura): corsi visibili col prezzo,
// e composizione di ogni pacchetto. Serve a rispondere "in produzione è tutto a posto?"
// guardando il database invece che ricordando.
// Uso: npx tsx scripts/produzione/_stato-prod.ts
import "dotenv/config";
import postgres from "postgres";
const url = process.env.PROD_DATABASE_URL;
if (!url) { console.error("PROD_DATABASE_URL non impostata"); process.exit(1); }
const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 10 });

const corsi = await sql`select title, price_cents, list_price_cents, stripe_price_id, duration_hours
  from course where status='published' and organization_id is null and slug is not null order by title`;
console.log(`CORSI VISIBILI IN CATALOGO: ${corsi.length}`);
for (const c of corsi) {
  const p = c.price_cents ? `${(c.price_cents / 100).toFixed(0)}€` : "SENZA PREZZO";
  const l = c.list_price_cents && c.list_price_cents !== c.price_cents ? ` (barrato ${(c.list_price_cents / 100).toFixed(0)}€)` : "";
  console.log(`  ${c.stripe_price_id ? "OK " : "NO "} ${String(p).padStart(11)}${l.padEnd(18)} ${c.duration_hours}h  ${c.title}`);
}

const pacchetti = await sql`select b.slug, b.title, b.price_cents, b.active,
    string_agg(c.slug || ':' || bc.role, ', ' order by c.slug) as composizione
  from bundle b join bundle_course bc on bc.bundle_id = b.id join course c on c.id = bc.course_id
  group by b.id order by b.position`;
console.log(`\nPACCHETTI: ${pacchetti.length}`);
for (const b of pacchetti) {
  console.log(`  ${b.title} — ${(b.price_cents / 100).toFixed(0)}€ ${b.active ? "" : "(NON attivo)"}`);
  for (const v of String(b.composizione).split(", ")) console.log(`      ${v}`);
}
await sql.end();
process.exit(0);

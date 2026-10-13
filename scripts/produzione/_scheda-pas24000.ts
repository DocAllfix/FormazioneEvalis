// SCHEDA DI CATALOGO del corso PAS 24000:2022 Sistema di gestione sociale (fadpas24000) — descrizione,
// durata, categoria, copertina e programma modulo per modulo, nella stessa forma delle schede già
// in catalogo (vedi _schede-9001-2026.ts). NON tocca stato di pubblicazione né prezzi.
// Idempotente. Uso: npx tsx scripts/produzione/_scheda-pas24000.ts [--prod]
const prod = process.argv.includes("--prod");
const { config } = await import("dotenv");
config();
if (prod) process.env.DATABASE_URL = process.env.PROD_DATABASE_URL;
const { default: postgres } = await import("postgres");

const SLUG = "pas-24000-2022-sistema-di-gestione-sociale";
// programma = sezioni delle dieci unità del committente (produzione/fadpas24000/_programma-catalogo.json)
const { readFileSync } = await import("node:fs");
const SCHEDA = {
  description:
    "Il percorso completo sul sistema di gestione sociale secondo la specifica PAS 24000:2022: dal quadro internazionale ed europeo alla struttura della specifica, alla leadership e alla partecipazione dei lavoratori, alla valutazione dei rischi e alla due diligence sui diritti umani, fino ai requisiti minimi dell'Annex A su lavoro forzato e minorile, libertà di associazione, salute e sicurezza, orario, retribuzione, reclami ed etica, alla filiera, agli indicatori, all'audit interno e alla certificazione accreditata. Con un caso aziendale che accompagna tutte le dieci unità.",
  durationHours: 24,
  category: "manageriale",
  imageUrl: "/covers/fadpas24000.webp",
  program: JSON.parse(readFileSync("produzione/fadpas24000/_programma-catalogo.json", "utf8")) as { title: string; summary: string }[],
};

const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
const [c] = await sql`select id, details from course where slug = ${SLUG}`;
if (!c) { console.error(`corso ${SLUG} non trovato (${prod ? "PRODUZIONE" : "sviluppo"})`); process.exit(1); }
const details = { ...(c.details ?? {}), program: SCHEDA.program };
await sql`update course set description = ${SCHEDA.description}, duration_hours = ${SCHEDA.durationHours},
  category = ${SCHEDA.category}, image_url = ${SCHEDA.imageUrl}, details = ${sql.json(details)}, updated_at = now()
  where id = ${c.id}`;
console.log(`scheda aggiornata (${prod ? "PRODUZIONE" : "sviluppo"}): ${SLUG} · ${SCHEDA.program.length} moduli`);
await sql.end();
export {};

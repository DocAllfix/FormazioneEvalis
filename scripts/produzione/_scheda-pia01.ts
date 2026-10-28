// SCHEDA DI CATALOGO del corso Piastrellista (fadpia01) — descrizione, durata, categoria «mestieri»,
// copertina e programma modulo per modulo, nella stessa forma delle schede già in catalogo (vedi
// _scheda-cfp01.ts). NON tocca stato di pubblicazione né prezzi.
// Idempotente. Uso: npx tsx scripts/produzione/_scheda-pia01.ts [--prod]
const prod = process.argv.includes("--prod");
const { config } = await import("dotenv");
config();
if (prod) process.env.DATABASE_URL = process.env.PROD_DATABASE_URL;
const { default: postgres } = await import("postgres");

const SLUG = "piastrellista-posatore-di-pavimenti-e-rivestimenti-ceramici";
// programma = argomenti dei quattordici moduli (produzione/fadpia01/_programma-catalogo.json, da struttura.md)
const { readFileSync } = await import("node:fs");
const SCHEDA = {
  description:
    "Il percorso di 40 ore per il piastrellista che prepara la certificazione delle competenze CERTIS secondo la UNI 11493-1:2025: materiali ceramici e loro classificazione, verifica del supporto, adesivi e sigillanti, tecniche di posa, fughe e giunti, sicurezza, difetti e consegna. Otto esercitazioni su casi di cantiere, con prove interattive e calcolatori di consumi e giunti, e un esame finale.",
  durationHours: 40,
  category: "mestieri",
  imageUrl: "/covers/fadpia01.webp",
  program: JSON.parse(readFileSync("produzione/fadpia01/_programma-catalogo.json", "utf8")) as { title: string; summary: string }[],
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

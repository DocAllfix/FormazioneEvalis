// SCHEDA DI CATALOGO del corso Carbon Footprint di organizzazione e di prodotto (fadcfp01) — descrizione,
// durata, categoria, copertina e programma modulo per modulo, nella stessa forma delle schede già
// in catalogo (vedi _schede-9001-2026.ts). NON tocca stato di pubblicazione né prezzi.
// Idempotente. Uso: npx tsx scripts/produzione/_scheda-pas24000.ts [--prod]
const prod = process.argv.includes("--prod");
const { config } = await import("dotenv");
config();
if (prod) process.env.DATABASE_URL = process.env.PROD_DATABASE_URL;
const { default: postgres } = await import("postgres");

const SLUG = "carbon-footprint-misurare-calcolare-e-ridurre-le-emissioni";
// programma = sezioni delle dieci unità del committente (produzione/fadcfp01/_programma-catalogo.json)
const { readFileSync } = await import("node:fs");
const SCHEDA = {
  description:
    "Il percorso completo per misurare, calcolare e ridurre le emissioni di gas serra di un'organizzazione e di un prodotto: gas serra, CO2 equivalente e GWP, la formula dato di attività per fattore di emissione, l'inventario secondo GHG Protocol e ISO 14064-1 con Scope 1, 2 e 3, il rapporto GHG con incertezza e verifica, la carbon footprint di prodotto secondo la ISO 14067, gli obiettivi e il piano di decarbonizzazione, crediti, neutralità carbonica secondo la ISO 14068-1 e comunicazione corretta. Con calcoli svolti, calcolatori interattivi e un caso aziendale che accompagna tutte le dieci unità.",
  durationHours: 24,
  category: "manageriale",
  imageUrl: "/covers/fadcfp01.webp",
  program: JSON.parse(readFileSync("produzione/fadcfp01/_programma-catalogo.json", "utf8")) as { title: string; summary: string }[],
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

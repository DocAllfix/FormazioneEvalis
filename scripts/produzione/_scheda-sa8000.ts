// SCHEDA DI CATALOGO del corso SA8000:2026 FAD-SA8000-02 (copia di _scheda-231.ts) — descrizione, durata, categoria, copertina e
// programma modulo per modulo (dalla tabella di produzione/<corso>/struttura.md, la stessa del Word di
// approvazione, senza le voci di servizio «Presentazione del corso» e «Sintesi del Modulo»).
// Attestato SOLO EVALIS (course.attestato_solo_evalis), come i corsi 231.
// NON tocca stato di pubblicazione né prezzi.
// Idempotente. Uso: npx tsx scripts/produzione/_scheda-sa8000.ts fadsa800002 [--prod]
const corso = process.argv[2];
const prod = process.argv.includes("--prod");
const { config } = await import("dotenv");
config();
if (prod) process.env.DATABASE_URL = process.env.PROD_DATABASE_URL;
const { default: postgres } = await import("postgres");
const { readFileSync } = await import("node:fs");

const SCHEDE: Record<string, { slug: string; description: string; durationHours: number }> = {
  fadsa800002: {
    slug: "sa8000-2026-in-pratica-lo-standard-per-il-lavoro-dignitoso",
    description:
      "Il corso base sulla SA8000:2026, lo standard di Social Accountability International per il lavoro dignitoso, per lavoratori e loro rappresentanti, responsabili HR, acquisti e qualità, consulenti e aziende che si avvicinano alla certificazione o devono passare dalla versione 2014: come è costruito lo standard e che cosa cambia, i cinque criteri fondamentali, i dieci elementi del sistema di gestione con la due diligence sui diritti umani, i sette temi del lavoro dignitoso (bambini e giovani lavoratori, libertà di associazione, lavoro libero ed equo, orari e salari, non discriminazione, salute e sicurezza, privacy), la transizione, l'audit e la certificazione. Casi, classificazioni e calcolatori da provare sullo schermo, esame finale e attestato EVALIS Academy.",
    durationHours: 4,
  },
};
const S = SCHEDE[corso];
if (!S) { console.error(`Uso: _scheda-231.ts <${Object.keys(SCHEDE).join("|")}> [--prod]`); process.exit(2); }

// programma: titolo del modulo e argomenti dalla tabella dello skeleton, senza le voci di servizio
const md = readFileSync(`produzione/${corso}/struttura.md`, "utf8");
const program = [...md.matchAll(/\|\s*M\d+\s*\|([^|]+)\|([^|]+)\|\s*\d+\s*min\s*\|\s*\d+\s*\|/g)].map((m) => {
  const argomenti = m[2].split(";").map((x) => x.trim())
    .filter((x) => x && !/^Benvenuto$|^Riepilogo del corso$/i.test(x)).join("; ");
  return { title: m[1].trim(), summary: argomenti.charAt(0).toUpperCase() + argomenti.slice(1) + "." };
});

const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
const [c] = await sql`select id, details from course where slug = ${S.slug}`;
if (!c) { console.error(`corso ${S.slug} non trovato (${prod ? "PRODUZIONE" : "sviluppo"})`); process.exit(1); }
const details = { ...(c.details ?? {}), program };
await sql`update course set description = ${S.description}, duration_hours = ${S.durationHours},
  category = ${"manageriale"}, image_url = ${`/covers/${corso}.webp`}, details = ${sql.json(details)},
  attestato_solo_evalis = true, updated_at = now()
  where id = ${c.id}`;
console.log(`scheda aggiornata (${prod ? "PRODUZIONE" : "sviluppo"}): ${S.slug} · ${program.length} moduli · attestato solo EVALIS`);
await sql.end();
export {};

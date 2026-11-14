// SCHEDA DI CATALOGO del corso UNI/PdR 192:2026 FAD-PDR192-01 (copia di _scheda-sa8000.ts) — descrizione, durata, categoria, copertina e
// programma modulo per modulo (dalla tabella di produzione/<corso>/struttura.md, la stessa del Word di
// approvazione, senza le voci di servizio «Presentazione del corso» e «Sintesi del Modulo»).
// Attestato SOLO EVALIS (course.attestato_solo_evalis), come i corsi 231.
// NON tocca stato di pubblicazione né prezzi.
// Idempotente. Uso: npx tsx scripts/produzione/_scheda-pdr192.ts fadpdr192 [--prod]
const corso = process.argv[2];
const prod = process.argv.includes("--prod");
const { config } = await import("dotenv");
config();
if (prod) process.env.DATABASE_URL = process.env.PROD_DATABASE_URL;
const { default: postgres } = await import("postgres");
const { readFileSync } = await import("node:fs");

const SCHEDE: Record<string, { slug: string; description: string; durationHours: number }> = {
  fadpdr192: {
    slug: "conciliazione-vita-familiare-lavoro-uni-pdr-192-2026",
    description:
      "Il corso sulla UNI/PdR 192:2026, la prassi di riferimento UNI per i sistemi di gestione della conciliazione tra vita familiare e lavoro, per consulenti di sistemi di gestione, responsabili HR e welfare, componenti del gruppo di lavoro interno, auditor interni e direzioni aziendali che valutano la certificazione: perché la prassi esiste e a chi si applica, il legame con la UNI/PdR 125:2022, politica, gruppo di lavoro e piano strategico, le azioni per madri, padri e caregiver, i 28 indicatori con soglie, calcolo e punteggio di accesso, l'applicazione in micro, piccole, medie e grandi organizzazioni, la certificazione accreditata e gli incentivi collegati. Un caso studio lungo tutto il percorso, checkpoint e simulatore di punteggio da provare sullo schermo, esame finale e attestato EVALIS Academy.",
    durationHours: 8,
  },
};
const S = SCHEDE[corso];
if (!S) { console.error(`Uso: _scheda-231.ts <${Object.keys(SCHEDE).join("|")}> [--prod]`); process.exit(2); }

// programma: titolo del modulo e argomenti dalla tabella dello skeleton, senza le voci di servizio
const md = readFileSync(`produzione/${corso}/struttura.md`, "utf8");
const program = [...md.matchAll(/\|\s*M\d+\s*\|([^|]+)\|([^|]+)\|\s*\d+\s*min\s*\|\s*\d+\s*\|/g)].map((m) => {
  const argomenti = m[2].split(";").map((x) => x.trim())
    .filter((x) => x && !/^Benvenuto$|^Riepilogo del corso$|^Obiettivi del modulo$|^Checkpoint \d|^Sintesi del (modulo|corso)/i.test(x)).join("; ");
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

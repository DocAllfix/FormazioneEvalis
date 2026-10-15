// SCHEDA DI CATALOGO dei corsi privacy FAD-PRIV-01/02/03 — descrizione, durata, categoria, copertina e
// programma modulo per modulo (dalla tabella di produzione/<corso>/struttura.md), nella stessa forma
// delle schede già in catalogo, e ATTESTATO SOLO EVALIS (course.attestato_solo_evalis, migrazione 0035):
// decisione dell'utente del 15/10/2026 per questi corsi, niente accreditamento CERTIS.
// NON tocca stato di pubblicazione né prezzi. Idempotente.
// Uso: npx tsx scripts/produzione/_scheda-priv.ts <fadpriv01|fadpriv02|fadpriv03> [--prod]
const corso = process.argv[2];
const prod = process.argv.includes("--prod");
const { config } = await import("dotenv");
config();
if (prod) process.env.DATABASE_URL = process.env.PROD_DATABASE_URL;
const { default: postgres } = await import("postgres");
const { readFileSync } = await import("node:fs");

const SCHEDE: Record<string, { slug: string; description: string; durationHours: number }> = {
  fadpriv01: {
    slug: "privacy-e-protezione-dei-dati-per-il-personale",
    description:
      "La formazione obbligatoria del personale autorizzato al trattamento dei dati personali (articoli 29 e 32 del GDPR e articolo 2-quaterdecies del Codice privacy): che cos'è un dato personale e quando è particolare, i principi e le basi giuridiche, titolare, responsabile, autorizzato e DPO, i diritti degli interessati e il termine di un mese, password, phishing, dispositivi e lavoro da remoto, il data breach e le 72 ore, con esercizi guidati e casi pratici d'ufficio. Si chiude con l'esame finale e l'attestato di formazione EVALIS Academy.",
    durationHours: 3,
  },
  fadpriv02: {
    slug: "aggiornamento-annuale-privacy-per-il-personale",
    description:
      "L'aggiornamento annuale obbligatorio della formazione privacy per chi ha già completato il corso base o una formazione equivalente: ripasso essenziale di principi, ruoli e diritti, le minacce attuali (phishing mirato, codici QR, deepfake vocali, notifiche di autenticazione ripetute), l'uso sicuro dell'intelligenza artificiale generativa, le novità di Regolamento IA, NIS2 e provvedimenti del Garante, la conservazione dei dati e i casi dell'anno. Esame finale e attestato di formazione EVALIS Academy.",
    durationHours: 1,
  },
  fadpriv03: {
    slug: "privacy-per-manager-e-amministratori-di-sistema",
    description:
      "Il corso avanzato per chi decide, organizza o amministra trattamenti di dati personali: responsabili di funzione, dirigenti, referenti privacy e amministratori di sistema. Accountability, registro dei trattamenti e DPIA, designazioni e fornitori con il contratto dell'articolo 28, trasferimenti extra UE, controlli sui lavoratori e whistleblowing, il Provvedimento del Garante sugli amministratori di sistema con log e verifica annuale, le misure dell'articolo 32 in raccordo con NIS2 e ISO/IEC 27001, la gestione del data breach, IA e cloud, ispezioni, sanzioni e audit interno. Esame finale e attestato di formazione EVALIS Academy.",
    durationHours: 8,
  },
};
const S = SCHEDE[corso];
if (!S) { console.error(`Uso: _scheda-priv.ts <${Object.keys(SCHEDE).join("|")}> [--prod]`); process.exit(2); }

// programma: titolo del modulo e argomenti dalla tabella dello skeleton (la stessa del Word approvato)
const md = readFileSync(`produzione/${corso}/struttura.md`, "utf8");
const program = [...md.matchAll(/\|\s*M\d+\s*\|([^|]+)\|([^|]+)\|\s*\d+\s*min\s*\|\s*\d+\s*\|/g)].map((m) => {
  const argomenti = m[2].trim();
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

// SCHEDA DI CATALOGO dei corsi 231 FAD-231-01/02/03/04 — descrizione, durata, categoria, copertina e
// programma modulo per modulo (dalla tabella di produzione/<corso>/struttura.md, la stessa del Word di
// approvazione, senza le voci di servizio «Presentazione del corso» e «Sintesi del Modulo»).
// Attestato SOLO EVALIS per tutti e quattro (course.attestato_solo_evalis, decisione dell'utente del 10/11/2026).
// NON tocca stato di pubblicazione né prezzi.
// Idempotente. Uso: npx tsx scripts/produzione/_scheda-231.ts <fad23101|fad23102|fad23103|fad23104> [--prod]
const corso = process.argv[2];
const prod = process.argv.includes("--prod");
const { config } = await import("dotenv");
config();
if (prod) process.env.DATABASE_URL = process.env.PROD_DATABASE_URL;
const { default: postgres } = await import("postgres");
const { readFileSync } = await import("node:fs");

const SCHEDE: Record<string, { slug: string; description: string; durationHours: number }> = {
  fad23101: {
    slug: "modello-231-progettazione-implementazione-e-audit",
    description:
      "Il percorso di 40 ore per chi progetta, attua e verifica il Modello di organizzazione, gestione e controllo del decreto legislativo 231 del 2001: consulenti, organizzazioni che lo adottano, lead auditor e componenti di Organismi di Vigilanza. Fondamenti e criteri di imputazione, il catalogo dei reati-presupposto aggiornato al testo in vigore, risk assessment e gap analysis, Parte Generale, Parti Speciali, Codice Etico e sistema disciplinare, Organismo di Vigilanza, whistleblowing secondo il decreto legislativo 24 del 2023, progetto di implementazione, audit del Modello, giurisprudenza e difesa dell'ente, con il caso di un'azienda metalmeccanica ed esercitazioni guidate. Esame finale e attestato EVALIS Academy.",
    durationHours: 40,
  },
  fad23102: {
    slug: "formazione-231-per-il-personale-operativo",
    description:
      "La formazione 231 per operai, addetti di produzione e cantiere, impiegati, magazzinieri, autisti, preposti e collaboratori, con un linguaggio semplice: perché un reato commesso da una persona può colpire l'azienda, Codice Etico, Modello organizzativo, sistema disciplinare e Organismo di Vigilanza, i comportamenti corretti con enti pubblici, regali, fornitori, documenti, dati e persone, le regole di sicurezza e ambiente che evitano i reati più frequenti, come segnalare con il whistleblowing e quali tutele spettano a chi segnala. Esercitazioni su situazioni reali, esame finale e attestato EVALIS Academy.",
    durationHours: 8,
  },
  fad23103: {
    slug: "formazione-231-per-le-figure-apicali",
    description:
      "La formazione 231 per amministratori, direttori generali, dirigenti, responsabili di funzione, procuratori e soggetti con deleghe: responsabilità dell'ente e responsabilità personale di chi decide, deleghe e procure difendibili, controlli sulle decisioni di vertice, rapporto con l'Organismo di Vigilanza, flussi informativi, whistleblowing e sistema disciplinare applicato anche verso l'alto, tone at the top, e la gestione di ispezioni, infortuni gravi, procedimenti e crisi senza compromettere la difesa dell'ente. Esercitazioni decisionali da consiglio di amministrazione, esame finale e attestato EVALIS Academy.",
    durationHours: 8,
  },
  fad23104: {
    slug: "organismo-di-vigilanza-231-ruolo-metodo-e-responsabilita",
    description:
      "Il corso per componenti e Presidenti di Organismi di Vigilanza, sindaci con funzioni di OdV, professionisti candidati all'incarico, internal auditor e compliance officer: mandato, requisiti e posizione dell'OdV, regolamento e piano di vigilanza in base al rischio, flussi informativi e tecniche di verifica, segnalazioni, whistleblowing e istruttorie, violazioni degli apicali e pressioni del vertice, responsabilità del componente e relazione periodica, aggiornamento del Modello e ruolo dell'OdV in ispezioni, infortuni e procedimento. Esercitazioni sull'anno di un OdV, esame finale e attestato EVALIS Academy.",
    durationHours: 8,
  },
};
const S = SCHEDE[corso];
if (!S) { console.error(`Uso: _scheda-231.ts <${Object.keys(SCHEDE).join("|")}> [--prod]`); process.exit(2); }

// programma: titolo del modulo e argomenti dalla tabella dello skeleton, senza le voci di servizio
const md = readFileSync(`produzione/${corso}/struttura.md`, "utf8");
const program = [...md.matchAll(/\|\s*M\d+\s*\|([^|]+)\|([^|]+)\|\s*\d+\s*min\s*\|\s*\d+\s*\|/g)].map((m) => {
  const argomenti = m[2].split(";").map((x) => x.trim())
    .filter((x) => x && !/^Presentazione del corso|^Sintesi del Modulo/i.test(x)).join("; ");
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

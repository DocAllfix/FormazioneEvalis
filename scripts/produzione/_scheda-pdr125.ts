// SCHEDA DI CATALOGO del corso Parità di genere UNI/PdR 125:2022 (fadpdr125) — descrizione,
// durata, categoria, copertina e programma modulo per modulo, nella stessa forma delle schede già
// in catalogo (vedi _schede-9001-2026.ts). NON tocca stato di pubblicazione né prezzi.
// Idempotente. Uso: npx tsx scripts/produzione/_scheda-pdr125.ts [--prod]
const prod = process.argv.includes("--prod");
const { config } = await import("dotenv");
config();
if (prod) process.env.DATABASE_URL = process.env.PROD_DATABASE_URL;
const { default: postgres } = await import("postgres");

const SLUG = "parita-di-genere-uni-pdr-125-2022";
const SCHEDA = {
  description:
    "Il percorso completo sulla certificazione della parità di genere secondo la UNI/PdR 125:2022: dal quadro di legge alla politica, al comitato guida e al piano strategico sui sei temi, fino ai trentatré indicatori, al calcolo del punteggio ponderato, all'equità remunerativa, all'audit di certificazione e ai benefici. Con un caso aziendale che accompagna tutto il corso.",
  durationHours: 8,
  category: "manageriale",
  imageUrl: "/covers/fadpdr125.webp",
  program: [
    { title: "Modulo 1 · La prassi di riferimento e il quadro di legge",
      summary: "Che cos'è una prassi di riferimento UNI e perché non è una norma; Il limite dei cinque anni; Certificare sotto accreditamento e il ruolo delle FAQ; La legge 162/2021 e il rapporto biennale; Volontaria, non obbligatoria: articolo 46-bis e decreto 29 aprile 2022; Tre piani distinti e il D.Lgs. 96/2026 in breve." },
    { title: "Modulo 2 · Fasce, politica, comitato guida e piano strategico",
      summary: "Le quattro fasce dimensionali e le semplificazioni per micro e piccole organizzazioni; Il perimetro che non si ritaglia; La politica di parità e le sue condizioni; Il comitato guida e gli impegni dell'alta direzione; Ruoli da non confondere; Il piano strategico: fasi, obiettivi, indicatori e risorse." },
    { title: "Modulo 3 · I sei temi del piano e il caso Tifata",
      summary: "Selezione e assunzione; Gestione della carriera ed equità salariale; Genitorialità, cura e conciliazione; Prevenzione di abusi e molestie; Documenti, monitoraggio e non conformità; Caso pratico: il piano di Logistica Tifata e la sintesi della prima parte." },
    { title: "Modulo 4 · Sei aree, trentatré indicatori",
      summary: "Sei aree e sei pesi; Indicatori qualitativi e quantitativi; Quando il dato manca; Cultura e strategia, Governance, Processi HR; Opportunità di crescita, Equità remunerativa, Genitorialità e conciliazione; La raccolta dei dati HR." },
    { title: "Modulo 5 · Punteggio, equità remunerativa, audit e certificazione",
      summary: "La formula del punteggio ponderato e la soglia del 60%; Quanto vale ogni indicatore; Il divario retributivo a parità di livello e le regole delle FAQ; Audit interni, evidenze e situazioni non conformi; La revisione periodica; L'iter di certificazione, i tempi di audit e il ciclo triennale." },
    { title: "Modulo 6 · Benefici, tenuta nel tempo e caso finale",
      summary: "L'esonero contributivo: regola, conti e domanda; Il punteggio premiale nelle gare e la riduzione della garanzia; Il raccordo con il D.Lgs. 96/2026 e una sola base dati; Sorveglianza e perdita del certificato; Caso pratico: il punteggio di Tifata prima e dopo il piano; Sintesi e preparazione all'esame finale." },
  ],
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

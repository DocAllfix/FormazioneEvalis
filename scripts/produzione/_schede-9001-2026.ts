// SCHEDA DI CATALOGO dei due corsi ISO 9001:2026 — descrizione, durata, categoria, copertina
// e programma modulo per modulo, nella stessa forma delle schede già in catalogo.
// NON tocca lo stato di pubblicazione né i prezzi: quelli restano una decisione commerciale.
// Idempotente. Uso: DATABASE_URL=… npx tsx scripts/produzione/_schede-9001-2026.ts
import "dotenv/config";
import postgres from "postgres";

type Voce = { title: string; summary: string };
type Scheda = {
  slug: string;
  description: string;
  durationHours: number;
  category: string;
  imageUrl: string;
  program: Voce[];
};

const SCHEDE: Scheda[] = [
  {
    slug: "auditor-lead-auditor-iso-9001-2026-sistemi-di-gestione-per-la-qualita",
    description:
      "Percorso completo per Auditor e Lead Auditor dei Sistemi di Gestione per la Qualità sulla sesta edizione della norma: i venti termini ora definiti dentro la ISO 9001, la cultura della qualità e il comportamento etico, le azioni sulle opportunità come requisito proprio, i requisiti punto per punto e la conduzione dell'audit dalla pianificazione al follow-up.",
    durationHours: 24,
    category: "auditor",
    imageUrl: "/covers/9001v26.webp",
    program: [
      { title: "Modulo 1 · Il percorso auditor: la qualità come disciplina",
        summary: "Che cos'è la qualità e come si è trasformata; La famiglia ISO 9000 e la norma certificabile; Il mercato: diffusione, settori, valore; Lo schema di certificazione delle persone; Il legame con la ISO 19011; L'esame: come si dimostra la competenza." },
      { title: "Modulo 2 · La ISO 9001:2026: struttura, principi, termini",
        summary: "Lo scopo e il campo di applicazione; I sette principi di gestione per la qualità; La struttura armonizzata e la nuova Appendice A; I venti termini del punto 3, ora dentro la norma; L'approccio per processi e il ciclo di Deming; Il pensiero basato sul rischio." },
      { title: "Modulo 3 · Contesto dell'organizzazione e leadership",
        summary: "Comprendere il contesto, esterno e interno; Le parti interessate e i requisiti affrontati dal sistema; Il campo di applicazione e le esclusioni motivate; La leadership e l'impegno della direzione; Cultura della qualità e comportamento etico; La politica, i ruoli e come verificarli." },
      { title: "Modulo 4 · Pianificazione: rischi, opportunità, obiettivi, modifiche",
        summary: "Determinare, analizzare e ponderare i rischi; Le azioni sulle opportunità come requisito autonomo; Gli obiettivi per la qualità e le loro regole; Gli obiettivi come informazione documentata; La pianificazione delle modifiche, rafforzata; Evidenze, domande e non conformità tipiche." },
      { title: "Modulo 5 · Supporto: risorse, competenza, informazioni documentate",
        summary: "Persone, infrastruttura e ambiente per i processi; Le risorse per il monitoraggio e la misurazione; La conoscenza organizzativa; Competenza e consapevolezza; La comunicazione, interna ed esterna; Le informazioni documentate disponibili come evidenza." },
      { title: "Modulo 6 · Attività operative I: dal requisito del cliente alla progettazione",
        summary: "Pianificare e controllare le attività operative; I requisiti per prodotti e servizi e i canali digitali; Il riesame dei requisiti e la sua traccia; La progettazione e sviluppo, ingressi e uscite; I processi e i prodotti forniti dall'esterno; Quanto controllo serve: tipo ed estensione." },
      { title: "Modulo 7 · Attività operative II: produzione, rilascio, non conformità",
        summary: "Produzione ed erogazione in condizioni controllate; Identificazione, rintracciabilità e proprietà altrui; Preservazione e attività post-consegna; Il rilascio: chi autorizza e con quali evidenze; Il controllo degli output non conformi; Il flusso completo e dove guardare in verifica." },
      { title: "Modulo 8 · Valutazione delle prestazioni",
        summary: "Monitoraggio, misurazione e analisi dei dati; La soddisfazione del cliente; Le verifiche interne: programma e conduzione; Il riesame di direzione, ingressi e uscite; Che cosa rende buono un indicatore; Il triangolo e cosa cercare in verifica." },
      { title: "Modulo 9 · Miglioramento e non conformità tipiche",
        summary: "Il miglioramento come dovere permanente; Non conformità e azioni correttive, passo dopo passo; Sintomo e causa: due cose diverse; La rassegna delle non conformità ricorrenti, clausola per clausola; Attuare le azioni con la giusta misura; Come un buon rilievo genera valore." },
      { title: "Modulo 10 · Verificare il sistema I: programma e preparazione",
        summary: "Programma e singola verifica: due cose diverse; La priorità per rischio e i processi critici; La preparazione: documenti, mappa, piano, tempo; La checklist: costruirla, usarla, non subirla; Le evidenze attese, capitolo per capitolo; Le verifiche di prima, seconda e terza parte." },
      { title: "Modulo 11 · Verificare il sistema II: conduzione sul campo",
        summary: "La riunione di apertura e il governo del tempo; Verificare per processo: ingressi, uscite, interazioni; Tracciare in avanti e all'indietro; Il campionamento e il campionamento dichiarato; L'intervista: le domande giuste per ogni ruolo; Le risultanze, la riunione di chiusura, il rapporto." },
      { title: "Modulo 12 · Casi completi, simulazione d'esame e certificazione",
        summary: "Due casi pratici completi, dall'incarico al rapporto; Classificare le risultanze: maggiore, minore, osservazione; Dalle risultanze al giudizio complessivo; La simulazione d'esame, area per area; Il percorso di certificazione della persona; Il riepilogo del corso e l'esame finale." },
    ],
  },
  {
    slug: "aggiornamento-iso-9001-2026-dalla-2015-alla-2026",
    description:
      "Aggiornamento per Auditor e Lead Auditor ISO 9001 già qualificati: la sesta edizione confrontata clausola per clausola con la 2015, i nuovi fuochi — cultura della qualità, azioni sulle opportunità, gestione delle modifiche — e il loro impatto concreto sull'attività di audit.",
    durationHours: 8,
    category: "auditor",
    imageUrl: "/covers/agg9001.webp",
    program: [
      { title: "Modulo 1 · La revisione 2026: quadro, transizione e mappa delle modifiche",
        summary: "A chi serve e quale prerequisito conviene avere; Perché una sesta edizione: dal 2015 al 2026; Pubblicazione, adozione e transizione; Dalle «principali modifiche» alla mappa reale; I venti termini ora dentro la norma; Nuova Appendice A e struttura del testo." },
      { title: "Modulo 2 · Confronto puntuale I: introduzione, contesto e leadership",
        summary: "L'introduzione rinnovata: successo duraturo e famiglia ISO 9000; Punto 4.1: contesto esterno e interno; Punto 4.2: i requisiti affrontati dal sistema; Punto 4.4: il sistema nei processi e nelle loro interazioni; Punto 5.1: leadership e impegno riordinati; Punti 5.2 e 5.3: politica, ruoli e responsabilità." },
      { title: "Modulo 3 · I nuovi fuochi I: cultura della qualità, rischi e opportunità",
        summary: "Punto 5.1.1: cultura della qualità e comportamento etico; Punto 7.3: consapevolezza e contributo personale; Verificare una cultura senza fermarsi agli slogan; I segnali dell'adeguamento solo formale; Punto 6.1.2: determinare, analizzare, ponderare i rischi; Punto 6.1.3: le azioni sulle opportunità." },
      { title: "Modulo 4 · I nuovi fuochi II: obiettivi, modifiche e supporto",
        summary: "Punto 6.2: obiettivi utili, non ornamentali; Punto 6.3: la gestione delle modifiche rafforzata; Comunicare una modifica perché funzioni; Riesame dei risultati e apprendimento; Punti 7.1.3 e 7.1.4: infrastruttura e lavoro ibrido; Punto 7.5: informazioni documentate come evidenza." },
      { title: "Modulo 5 · Confronto puntuale II: attività operative, valutazione e miglioramento",
        summary: "Punto 8.1: pianificazione e controllo operativi; Punto 8.2: comunicazione con il cliente e canali digitali; Punto 8.3: gli output della progettazione; Punto 8.4: fornitori esterni e interazioni estese; Punto 9: monitoraggio, soddisfazione, riesame; Punto 10: miglioramento e azioni correttive." },
      { title: "Modulo 6 · Audit sulla 2026: transizione, casi studio e chiusura",
        summary: "Aggiornare il programma di audit col metodo della ISO 19011; L'analisi delle differenze senza formalismi; Non conformità di transizione, formulate in modo proporzionato; Caso studio manifatturiero, dall'evidenza alla chiusura; Caso studio servizi e i segnali critici; Simulazione e riepilogo." },
    ],
  },
];

const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1, connect_timeout: 10 });
for (const s of SCHEDE) {
  const r = await sql`update course set
      description = ${s.description},
      duration_hours = ${s.durationHours},
      category = ${s.category},
      image_url = ${s.imageUrl},
      details = ${sql.json({ program: s.program })},
      updated_at = now()
    where slug = ${s.slug}
    returning title, status`;
  if (!r.length) console.error(`  NON TROVATO: ${s.slug}`);
  else console.log(`${r[0].title} · ${s.program.length} moduli · ${s.durationHours}h · copertina ${s.imageUrl} · status=${r[0].status}`);
}
await sql.end();
process.exit(0);

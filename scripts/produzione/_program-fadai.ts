// Imposta il programma reale (titolo modulo + sintesi) nel campo details dei 2 corsi Claude.
// Preserva gli altri campi di details. Idempotente. Uso: npx tsx scripts/produzione/_program-fadai.ts
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { course } from "@/lib/db/schema";

const PROGRAMMI: Record<string, { title: string; summary: string }[]> = {
  "FAD-AI-01": [
    { title: "Modulo 1 · Fondamenti dell'intelligenza artificiale generativa", summary: "Come funziona un modello linguistico: token, finestra di contesto, knowledge cutoff, allucinazioni e bias. Criteri per scegliere il modello adatto e struttura di un prompt efficace." },
    { title: "Modulo 2 · L'interfaccia e i Project", summary: "Chat, Project e knowledge base, Artifacts, ricerca web e connettori. Come organizzare il contesto stabile del lavoro e quando valutare le API." },
    { title: "Modulo 3 · Scrivere prompt professionali", summary: "L'ossatura Ruolo–Contesto–Compito–Formato–Vincoli, esempi guida, ragionamento passo-passo, scomposizione dei compiti e librerie di template condivise." },
    { title: "Modulo 4 · Lavorare con i documenti", summary: "Analisi orientata allo scopo, estrazioni verificabili con riferimento alla fonte, gap analysis, confronto tra versioni e workflow per deliverable affidabili." },
    { title: "Modulo 5 · Casi d'uso per funzione", summary: "Applicazioni reali su sistemi di gestione, D.Lgs. 231, ESG, offerte e contratti, comunicazioni e piccoli strumenti; il confine tra ciò che si delega e ciò che resta al professionista." },
    { title: "Modulo 6 · Uso responsabile e protezione dei dati", summary: "Dati personali nei prompt, minimizzazione e anonimizzazione, AI Act e ruolo del deployer, supervisione umana e trasparenza verso i clienti." },
    { title: "Modulo 7 · Esercitazioni finali e ripasso", summary: "Allenamento pratico sui casi del corso, il metodo in sei mosse e la preparazione all'esame. Nessun progetto da consegnare: solo esercizi e ripasso guidato." },
  ],
  "FAD-AI-02": [
    { title: "Modulo 1 · Diagnosi degli output e scelta del modello", summary: "Le quattro leve di diagnosi (prompt, modello, ragionamento esteso, contesto), la degradazione da contesto saturo, la valutazione con rubrica e il test A/B tra template." },
    { title: "Modulo 2 · Istruzioni di progetto e knowledge base", summary: "Istruzioni permanenti e stratificate, gerarchia delle fonti, criteri di ammissione dei documenti e maturità di una libreria di template riutilizzabili." },
    { title: "Modulo 3 · API e automazione", summary: "Anatomia di una richiesta API, la chiave come segreto aziendale, quando passare dall'interfaccia all'automazione, batch documentale, idempotenza e umano nel flusso." },
    { title: "Modulo 4 · Sviluppo assistito", summary: "La scala dello sviluppo assistito, le applicazioni HTML a file singolo, Claude Code, il principio del gradino giusto e i segnali che promuovono il bisogno." },
    { title: "Modulo 5 · Workflow agentici e MCP", summary: "Cosa rende agentico un flusso, MCP come presa standard, minimo privilegio, prompt injection, punti di conferma e quando scegliere l'automazione invece dell'agente." },
    { title: "Modulo 6 · Portafoglio e adozione", summary: "Selezionare le iniziative con criteri omogenei, la matrice valore–fattibilità, la baseline e la misura reale dei benefici, la sponsorship e la formazione a cascata." },
    { title: "Modulo 7 · Governance dell'AI e ISO/IEC 42001", summary: "Cosa certifica la ISO/IEC 42001, valutazione dei rischi e valutazione d'impatto, dichiarazione di applicabilità, integrazione nell'SGI e rapporto con l'AI Act." },
    { title: "Modulo 8 · Sintesi e governance matura", summary: "Economia del contesto, governance reale contro governance cosmetica, business case e beneficio netto, lettura degli scenari e proporzionalità delle scelte." },
  ],
};

const rows = await db.select().from(course);
for (const [tag, program] of Object.entries(PROGRAMMI)) {
  const c = rows.find((r) => (r.title || "").includes(tag));
  if (!c) { console.log(`✗ ${tag} non trovato`); continue; }
  const details = { ...((c as any).details ?? {}), program };
  await db.update(course).set({ details }).where(eq(course.id, c.id));
  console.log(`✓ ${tag}: programma impostato (${program.length} moduli)`);
}
console.log("FATTO.");
process.exit(0);

// Riscrive i TITOLI dei moduli ISO in forma descrittiva (via le headline evocative delle slide),
// mantenendo le SINTESI già impostate in course.details.program. Idempotente.
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { course } from "@/lib/db/schema";

// per corso: nuovi titoli descrittivi, in ordine di modulo (senza il prefisso "Modulo N ·")
const TITLES: Record<string, { needle: string; excl?: string; titoli: string[] }> = {
  "19011": { needle: "19011", titoli: [
    "Introduzione all'audit e alla ISO 19011", "Il vocabolario e i principi dell'audit", "Il programma di audit",
    "Attuare il programma di audit", "Preparare l'incarico di audit", "La conduzione dell'audit sul campo",
    "Risultanze, conclusioni e rapporto di audit", "La competenza e la valutazione degli auditor",
    "Metodi di audit e strumenti pratici" ] },
  "9001": { needle: "ISO 9001", titoli: [
    "Introduzione: la qualità e il percorso auditor", "Scopo, principi e struttura della ISO 9001",
    "Contesto, parti interessate e leadership", "Pianificazione: rischi, obiettivi e modifiche",
    "Il supporto: risorse, competenza e informazioni documentate", "Attività operative: dai requisiti alla progettazione e fornitura",
    "Produzione, erogazione e controllo degli output", "Valutazione delle prestazioni: monitoraggio, audit interni, riesame",
    "Miglioramento e azioni correttive", "Preparare la verifica", "Condurre la verifica sul campo",
    "Casi pratici e preparazione all'esame" ] },
  "14001": { needle: "ISO 14001", excl: "2026", titoli: [
    "Introduzione: la gestione ambientale e il percorso auditor", "Scopo, termini e architettura della ISO 14001",
    "Contesto, leadership e politica ambientale", "Aspetti ambientali e obblighi di compliance",
    "Obiettivi, risorse e supporto del sistema", "Controllo operativo e prospettiva del ciclo di vita",
    "Preparazione alle emergenze e valutazione della compliance", "Valutazione delle prestazioni: monitoraggio, audit interni, riesame",
    "Non conformità, azioni correttive e miglioramento", "Preparare la verifica ambientale",
    "Condurre la verifica sul campo", "Casi pratici e preparazione all'esame" ] },
  "45001": { needle: "ISO 45001", titoli: [
    "Introduzione: la salute e sicurezza sul lavoro e il percorso auditor", "Scopo e termini della ISO 45001",
    "Contesto, leadership e partecipazione dei lavoratori", "Identificazione dei pericoli e valutazione dei rischi",
    "Obiettivi, risorse e supporto del sistema", "Controllo operativo e gerarchia dei controlli",
    "Emergenze, incidenti e indagine delle cause", "Valutazione delle prestazioni: monitoraggio, audit interni, riesame",
    "Non conformità, azioni correttive e miglioramento", "Preparare la verifica di sicurezza",
    "Condurre la verifica sul campo", "Casi pratici e preparazione all'esame" ] },
  "27001": { needle: "ISO 27001", titoli: [
    "Introduzione: la sicurezza delle informazioni e il percorso auditor", "Scopo, termini (riservatezza, integrità, disponibilità) e struttura",
    "Contesto, leadership e definizione dell'SGSI", "Valutazione e trattamento del rischio e Dichiarazione di Applicabilità",
    "Il supporto: risorse, competenza, comunicazione e documenti", "I controlli dell'Appendice A: logica e famiglie",
    "Attuazione dei controlli: persone, fisici e tecnologici", "Valutazione delle prestazioni: monitoraggio, audit interni, riesame",
    "Non conformità, azioni correttive e miglioramento", "Preparare la verifica dell'SGSI",
    "Condurre la verifica sul campo", "Casi pratici e preparazione all'esame" ] },
  "22000": { needle: "ISO 22000", titoli: [
    "Introduzione: la sicurezza alimentare lungo la filiera e il percorso auditor", "Scopo, termini (PRP, OPRP, CCP) e struttura della ISO 22000",
    "Contesto, leadership e pianificazione", "Il supporto: risorse, competenza e documenti",
    "Operativo I: PRP, rintracciabilità ed emergenze", "Operativo II: analisi dei pericoli e piano HACCP",
    "Operativo III: monitoraggio, verifica e non conformità", "Valutazione delle prestazioni dell'SGSA",
    "Miglioramento e non conformità tipiche", "Preparare la verifica: programma e documenti",
    "Condurre la verifica sul campo", "Casi pratici e preparazione all'esame" ] },
  "50001": { needle: "ISO 50001", titoli: [
    "Introduzione: la gestione dell'energia e il percorso auditor", "Scopo, termini energetici (EnPI, EnB, usi significativi) e struttura",
    "Contesto, leadership e pianificazione", "Analisi energetica, EnPI, consumo di riferimento e dati",
    "Il supporto: risorse, competenza, comunicazione e documenti", "Attività operative: controllo, progettazione, approvvigionamento",
    "Dimostrare il miglioramento della prestazione energetica", "Valutazione delle prestazioni dell'SGE",
    "Miglioramento e non conformità tipiche", "Preparare la verifica energetica",
    "Condurre la verifica sul campo", "Casi pratici e preparazione all'esame" ] },
  "37001": { needle: "ISO 37001", titoli: [
    "Introduzione: il sistema anticorruzione e il percorso auditor", "Scopo, termini e forme della corruzione (ISO 37001)",
    "Contesto e valutazione del rischio di corruzione", "Leadership, governance e funzione di conformità",
    "Il supporto del sistema", "Controlli operativi: due diligence, finanziari e non finanziari",
    "Operativo II: impegni, regali, segnalazioni e indagini", "Valutazione delle prestazioni: monitoraggio, audit interni, riesame",
    "Non conformità, azioni correttive e miglioramento", "Preparare la verifica del SGPC",
    "Condurre la verifica sul campo", "Casi pratici e preparazione all'esame" ] },
  "39001": { needle: "ISO 39001", titoli: [
    "Introduzione: la sicurezza stradale come sistema e il percorso auditor", "Scopo e termini RTS della ISO 39001",
    "Contesto, leadership e pianificazione", "I fattori di prestazione RTS: esposizione ed esiti",
    "Il supporto: coordinamento, risorse, competenza e documenti", "Governo del lavoro quotidiano su strada",
    "L'indagine sugli incidenti stradali", "Valutazione delle prestazioni RTS",
    "Miglioramento e non conformità tipiche del sistema RTS", "Preparare la verifica RTS",
    "Condurre la verifica sul campo", "Casi pratici e preparazione all'esame" ] },
  "42001": { needle: "ISO 42001", titoli: [
    "Introduzione: la governance dell'IA e il percorso auditor", "Fondamenti tecnici dell'IA per l'auditor",
    "Scopo, termini e ruoli della ISO/IEC 42001", "Contesto, leadership e pianificazione",
    "Valutazione del rischio e valutazione d'impatto dell'IA", "Supporto e attività operative del ciclo di vita",
    "I controlli dell'Appendice A e la guida B", "Valutazione delle prestazioni del SGIA",
    "Miglioramento e non conformità", "Preparare la verifica dell'SGIA",
    "Condurre la verifica sul campo", "Casi pratici e preparazione all'esame" ] },
  agg14001: { needle: "14001:2026", titoli: [
    "La quarta edizione ISO 14001:2026: cosa cambia", "Punti 4, 5 e 6: contesto, leadership e pianificazione aggiornati",
    "Punti 7, 8, 9 e 10: supporto, operatività, valutazione e miglioramento", "Le novità di merito: clima, biodiversità e prestazione",
    "Dalla norma aggiornata alla pratica di verifica", "Casi pratici e preparazione all'esame" ] },
};

const rows = await db.select().from(course);
for (const [code, { needle, excl, titoli }] of Object.entries(TITLES)) {
  const c = rows.find((r) => (r.title || "").includes(needle) && (!excl || !(r.title || "").includes(excl)));
  if (!c) { console.log(`✗ ${code}: non trovato`); continue; }
  const prog = ((c as any).details?.program ?? []) as { title: string; summary: string }[];
  if (prog.length !== titoli.length) { console.log(`✗ ${code}: moduli DB=${prog.length} ≠ titoli=${titoli.length} — SALTO`); continue; }
  const newProg = prog.map((p, i) => ({ title: `Modulo ${i + 1} · ${titoli[i]}`, summary: p.summary }));
  const details = { ...((c as any).details ?? {}), program: newProg };
  await db.update(course).set({ details }).where(eq(course.id, c.id));
  console.log(`✓ ${code}: ${titoli.length} titoli descrittivi aggiornati`);
}
console.log("FATTO.");
process.exit(0);

// Programma reale (titolo modulo + sintesi) dei due percorsi manageriali 40h.
// Stessa strada dei corsi auditor e Claude (_program-fadai.ts): l'ingest non trasporta
// details dal manifest, quindi la scheda ricca si scrive qui. Preserva gli altri campi
// di details ed e' idempotente.
// Il campo alimenta "Programma del corso" in course-detail-body.tsx, che e' condiviso tra
// la scheda PUBBLICA (/catalogo/<slug>) e quella IN PIATTAFORMA (/corsi/<id>): si sistemano
// entrambe con questo script.
// Uso: npx tsx scripts/produzione/_program-manageriali.ts
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { course } from "@/lib/db/schema";

const PROGRAMMI: Record<string, { title: string; summary: string }[]> = {
  "esg-manager-uni-pdr-109-1": [
    { title: "Modulo 1 · Fondamenti dell'ESG e figura professionale", summary: "Le tre lettere come insiemi di rischi e di impatti, non come temi separati. Origine finanziaria della sigla, passaggio da criterio volontario a obbligo, catena della richiesta di dati e quota di fatturato esposta. Il profilo dell'ESG Manager secondo la UNI/PdR 109.1: mandato, deleghe, budget e leve d'influenza senza autorità gerarchica." },
    { title: "Modulo 2 · Quadro normativo, governance e materialità", summary: "Tassonomia europea: sei obiettivi, quattro condizioni, attività ammissibili, allineate, abilitanti e di transizione. Rendicontazione societaria di sostenibilità e perimetro di applicazione, standard volontario per le PMI, dovere di diligenza, meccanismo di adeguamento del carbonio. Governance della sostenibilità e doppia materialità." },
    { title: "Modulo 3 · Dalla materialità al piano", summary: "I sei elementi di un obiettivo credibile: anno base, perimetro, obiettivi assoluti e di intensità. Il ponte degli obiettivi e la sua lettura, gerarchia delle leve di riduzione, obiettivi non climatici e la scheda obiettivo. Dal tema materiale al piano d'azione, con responsabilità e risorse assegnate." },
    { title: "Modulo 4 · Reporting, dati, documento e verifica", summary: "Le quattro famiglie di standard e la griglia di prontezza. Perimetro e catena del valore, principi di redazione (contesto di sostenibilità, comparabilità, verificabilità), trattamento di stime e incertezze. La catena del dato, la costruzione del documento, la verifica esterna e i livelli di assurance." },
    { title: "Modulo 5 · Ambiente, clima e decarbonizzazione", summary: "Diagnosi energetica e usi significativi, indicatori energetici, sistemi di gestione dell'energia. Bilancio idrico e stress idrico di contesto. Gerarchia dei rifiuti, recupero e riciclo, qualifica giuridica e materia seconda. Inventario delle emissioni, ambiti e leve di decarbonizzazione." },
    { title: "Modulo 6 · Dimensione sociale: diritti, persone, comunità", summary: "I tre pilastri del sociale, forme di coinvolgimento e gravità degli impatti, ancoraggi normativi italiani. Politica sui diritti umani e i sei passi della diligenza, la piramide della visibilità nella catena, le leve verso i fornitori. Salute e sicurezza, inclusione e rapporto con le comunità locali." },
    { title: "Modulo 7 · Catena di fornitura, sistemi e certificazioni", summary: "Una qualifica dei fornitori che seleziona davvero: ammissibilità, premialità e peso dei criteri. Acquisti sostenibili e criteri in capitolato, segmentazione della base fornitori, livelli di verifica e il caso del fornitore che non risponde. Sistemi di gestione e certificazioni di parte terza." },
    { title: "Modulo 8 · Comunicazione, cultura e reputazione", summary: "Il perimetro giuridico della comunicazione ambientale e il passaggio da dichiarazione di stato ad azione. Asserzioni ambientali e sociali, revisione dei materiali, le sette forme classiche di dichiarazione ingannevole, il silenzio prudente e le promesse non mantenibili." },
    { title: "Modulo 9 · Etica, finanza, digitale e certificazione", summary: "Tre presidi distinti e responsabilità dell'ente, esimente e sue condizioni, contributo della certificazione. Canale di segnalazione, condotta in rendicontazione, pratiche di pagamento. Mappatura delle aree esposte, soglie e frazionamento, registro degli omaggi. Finanza sostenibile e certificazione della figura professionale." },
    { title: "Modulo 10 · Scenari, analisi comparata ed esame finale", summary: "I tre gradi di certezza e ciò che è ancora in movimento, decisioni robuste sotto incertezza, come si legge un annuncio normativo. Il fascio degli scenari e i temi in crescita. Analisi comparata di casi sui moduli precedenti, ripasso guidato e preparazione all'esame finale." },
  ],
  "energy-manager-esperto-in-gestione-dell-energia": [
    { title: "Modulo 1 · Fondamenti e figura professionale", summary: "L'energia come voce di conto economico e la leva del risparmio, il rischio oltre il costo, l'errore dell'intervento episodico. Che cosa cambia quando esiste un presidio stabile: nomina e mandato del responsabile dell'energia e percorso verso la certificazione EGE." },
    { title: "Modulo 2 · Fondamenti tecnici dell'energia", summary: "Grandezze, unità e conversioni, potenza ed energia, vettori energetici e loro costo reale. Rendimenti e perdite, bilancio energetico di stabilimento, lettura di uno schema di impianto e il vocabolario tecnico indispensabile per dialogare con la produzione." },
    { title: "Modulo 3 · Misura, dati e indicatori", summary: "Il problema della dimostrabilità e i quattro livelli di conoscenza, il costo di non misurare. Il piano di misura, le utenze significative, strumenti e misure permanenti o temporanee. Costruzione degli indicatori di prestazione energetica e del consumo di riferimento." },
    { title: "Modulo 4 · La diagnosi energetica", summary: "Obblighi e soggetti, struttura di una diagnosi conforme, raccolta dati e sopralluogo. Ripartizione dei consumi per centro, individuazione degli usi significativi, costruzione delle opportunità, il rapporto di diagnosi e i suoi allegati." },
    { title: "Modulo 5 · Usi finali elettrici", summary: "Il sistema, non il singolo motore: i rendimenti si moltiplicano. Costo del ciclo di vita, classi di efficienza e quadro regolatorio, rendimento e carico, sovradimensionamento. Aria compressa, pompaggio, ventilazione, illuminazione e regolazione della velocità." },
    { title: "Modulo 6 · Usi finali termici e di processo", summary: "Generazione di calore e rendimenti reali, recupero termico, isolamento e dispersioni. Forni e trattamenti termici, vapore, condense e reti di distribuzione, cogenerazione e integrazione dei recuperi nel processo." },
    { title: "Modulo 7 · Rinnovabili, autoconsumo e mercato", summary: "Perché il profilo di carico viene prima: giorno feriale e giorno di fermata, curva di durata. Dall'irraggiamento alla producibilità, perdite di sistema, potenza nominale e reale. Autoconsumo e vincoli, configurazioni di condivisione, contratti e mercato dell'energia." },
    { title: "Modulo 8 · Valutazione economica e finanziaria", summary: "Costo evitato e tariffe, tempo di ritorno e suoi limiti, valore attuale netto e tasso interno di rendimento, analisi di sensibilità. Gerarchia degli interventi, incentivi e strumenti di sostegno, contratti a prestazione garantita e costruzione del business case per la direzione." },
    { title: "Modulo 9 · Sistema di gestione ISO 50001", summary: "Perché i risparmi decadono e che cosa fa un sistema di gestione: sistema o diagnosi, benefici oltre l'energia. Struttura di alto livello e ruota del sistema, certificazione e verifica, integrazione con gli altri sistemi di gestione, contesto, politica, obiettivi e riesame." },
    { title: "Modulo 10 · Emissioni, rendicontazione e chiusura", summary: "Il dato energetico è già il dato emissivo: chi lo chiede e che cosa non è un inventario. Norme di riferimento e principi, confine organizzativo e operativo, ambiti di emissione e fattori, rendicontazione e verifica. Ripasso guidato e preparazione all'esame finale." },
  ],
};

let scritti = 0;
for (const [slug, program] of Object.entries(PROGRAMMI)) {
  const [c] = await db.select().from(course).where(eq(course.slug, slug)).limit(1);
  if (!c) {
    console.log(`✗ non trovato: ${slug}`);
    continue;
  }
  const details = { ...((c.details ?? {}) as Record<string, unknown>), program };
  await db.update(course).set({ details }).where(eq(course.id, c.id));
  scritti += 1;
  console.log(`· ${c.title.padEnd(48)} programma: ${program.length} moduli`);
}
console.log(`FATTO: ${scritti}/${Object.keys(PROGRAMMI).length} corsi aggiornati.`);
process.exit(0);

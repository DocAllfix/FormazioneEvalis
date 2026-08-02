// Backfill campi marketing dei corsi reali (una tantum, idempotente): category='auditor',
// durationHours (da requiredMinutes), description. Il demo 14064 passa a category='demo'
// così NON compare nella vetrina auditor. Non tocca slide/quiz/audit.
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { course } from "@/lib/db/schema";

const DESCRIZIONI: Record<string, string> = {
  "iso-19011-2026-auditor-di-sistemi-di-gestione":
    "Il corso propedeutico per diventare auditor: principi dell'audit, gestione del programma e conduzione sul campo secondo la ISO 19011:2026 — interviste, evidenze, rilievi e rapporto finale. È la base richiesta per tutti i percorsi Auditor ISO.",
  "auditor-lead-auditor-iso-9001-sistemi-di-gestione-per-la-qualita":
    "Percorso completo per Auditor e Lead Auditor dei Sistemi di Gestione per la Qualità ISO 9001: approccio per processi, risk-based thinking, requisiti punto per punto e conduzione dell'audit dalla pianificazione al follow-up.",
  "auditor-iso-14001":
    "Forma auditor dei Sistemi di Gestione Ambientale ISO 14001: contesto e parti interessate, aspetti e impatti ambientali, prospettiva del ciclo di vita, obblighi di conformità e verifica sul campo del sistema.",
  "auditor-iso-45001-salute-e-sicurezza-sul-lavoro":
    "Forma auditor dei Sistemi di Gestione per la Salute e Sicurezza sul Lavoro ISO 45001: pericoli e valutazione dei rischi, consultazione e partecipazione dei lavoratori, controlli operativi e audit del sistema.",
  "auditor-iso-27001":
    "Forma auditor dei Sistemi di Gestione per la Sicurezza delle Informazioni ISO 27001: valutazione e trattamento del rischio, Dichiarazione di Applicabilità, controlli dell'Annex A e conduzione dell'audit.",
  "auditor-iso-22000":
    "Forma auditor dei Sistemi di Gestione per la Sicurezza Alimentare ISO 22000: programmi di prerequisiti, analisi dei pericoli e piano HACCP, comunicazione lungo la catena alimentare e verifica del sistema.",
  "auditor-iso-50001":
    "Forma auditor dei Sistemi di Gestione dell'Energia ISO 50001: riesame energetico, baseline e indicatori EnPI, miglioramento della prestazione energetica e audit del sistema.",
  "auditor-iso-37001":
    "Forma auditor dei Sistemi di Gestione per la Prevenzione della Corruzione ISO 37001: valutazione del rischio, due diligence, controlli finanziari e non finanziari, segnalazioni e audit del sistema.",
  "auditor-iso-39001":
    "Forma auditor dei Sistemi di Gestione per la Sicurezza del Traffico Stradale ISO 39001: fattori di rischio ed esposizione, obiettivi e target di sicurezza, analisi degli incidenti e audit del sistema.",
  "auditor-iso-42001":
    "Forma auditor dei Sistemi di Gestione per l'Intelligenza Artificiale ISO/IEC 42001: governance e gestione del rischio dei sistemi di IA, valutazione d'impatto, trasparenza e audit del sistema.",
  "aggiornamento-lead-auditor-iso-14001-2026":
    "Aggiornamento per Lead Auditor ISO 14001 già qualificati: le novità dell'edizione 2026 della norma, i requisiti rivisti e il loro impatto concreto sull'attività di audit.",
};

for (const [slug, description] of Object.entries(DESCRIZIONI)) {
  const [c] = await db.select().from(course).where(eq(course.slug, slug)).limit(1);
  if (!c) { console.log(`✗ slug non trovato: ${slug}`); continue; }
  const hours = c.requiredMinutes > 0 ? Math.round(c.requiredMinutes / 60) : null;
  await db.update(course)
    .set({ category: "auditor", description, ...(hours ? { durationHours: hours } : {}) })
    .where(eq(course.id, c.id));
  console.log(`· ${c.title.slice(0, 55).padEnd(56)} reqMin=${c.requiredMinutes} → ore=${hours ?? "∅ (reqMin=0!)"}`);
}

// il demo NON deve stare nella vetrina auditor
const [demo] = await db.select().from(course)
  .where(eq(course.slug, "iso-14064-1-quantificazione-dei-gas-serra-demo-moduli-1-2")).limit(1);
if (demo) {
  await db.update(course).set({ category: "demo" }).where(eq(course.id, demo.id));
  console.log(`· demo 14064 → category='demo' (fuori vetrina)`);
}
console.log("FATTO.");
process.exit(0);

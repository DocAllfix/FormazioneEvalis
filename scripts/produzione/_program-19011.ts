// 19011: m01-m03 autorati (mancano gli _slide-src) + m04-m09 derivati dalle aperture. Imposta details.program.
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { course } from "@/lib/db/schema";

const AUTORATI: { title: string; summary: string }[] = [
  { title: "Modulo 1 · Introduzione all'audit e alla ISO 19011", summary: "Che cos'è un audit e perché si fa; i sistemi di gestione e le norme ISO; audit di prima, seconda e terza parte; storia, scopo e mappa della ISO 19011; gli attori dell'audit e il percorso dell'auditor fino alla certificazione." },
  { title: "Modulo 2 · Il vocabolario e i principi", summary: "I termini chiave dell'audit (evidenza oggettiva, criteri, risultanze, conclusioni, i tre livelli programma-campo-piano, ruoli, rischio, competenza) e i sette principi dell'auditing: integrità, presentazione imparziale, dovuta professionalità, riservatezza, indipendenza, approccio basato sull'evidenza e sul rischio." },
  { title: "Modulo 3 · Il programma di audit", summary: "Stabilire e governare il programma di audit: proporzionalità e priorità al rischio, contesto e parti interessate, contenuti e obiettivi del programma e le loro fonti, la cascata verso la singola verifica, rischi e opportunità, e il ciclo PDCA applicato al programma." },
];

function aperturaOf(mod: string) {
  const f = path.join("produzione", "19011", "_slide-src", `19011-${mod}-contenuti.json`);
  if (!fs.existsSync(f)) return null;
  const arr = JSON.parse(fs.readFileSync(f, "utf8"));
  const ap = arr.find((s: any) => s.layout === "apertura");
  return ap && ap.titolo ? { titolo: String(ap.titolo).trim(), agenda: (ap.agenda ?? []).map((x: any) => String(x).trim()) } : null;
}

const program = [...AUTORATI];
for (let i = 4; i <= 9; i++) {
  const mod = `m0${i}`;
  const ap = aperturaOf(mod);
  if (!ap) { console.log(`✗ manca apertura ${mod}`); process.exit(1); }
  program.push({ title: `Modulo ${i} · ${ap.titolo}`, summary: ap.agenda.join("; ") + "." });
}

const rows = await db.select().from(course);
const c = rows.find((r) => (r.title || "").includes("19011"))!;
const details = { ...((c as any).details ?? {}), program };
await db.update(course).set({ details }).where(eq(course.id, c.id));
console.log(`✓ 19011: programma completo impostato (${program.length} moduli)`);
program.forEach((p) => console.log(`   ${p.title}`));
process.exit(0);

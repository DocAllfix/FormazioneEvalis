// Sostituisce l'HTML di slide GIÀ INGESTATE con la versione rigenerata in slide-in/<corso>/.
// Serve quando un difetto si scopre dopo l'ingest e ri-ingestare creerebbe un corso doppio.
// Tocca SOLO il campo html del blocco: il `ratio` misurato resta dov'è (va comunque
// ricalcolato dopo con _populate-slide-ratio.ts, perché l'altezza può essere cambiata).
//
// Uso: npx tsx scripts/produzione/_ripara-slide-html.ts <courseId> <corso> <slideKey...>
//      dove slideKey è il nome del file senza estensione (es. fadeen02_m01_s001)
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { module as moduleT, lesson, slide } from "@/lib/db/schema";

const [courseId, corso, ...chiavi] = process.argv.slice(2);
if (!courseId || !corso || chiavi.length === 0) {
  console.error("Uso: _ripara-slide-html.ts <courseId> <corso> <slideKey...>");
  process.exit(2);
}

type Block = { type?: string; html?: string; ratio?: number };

// mappa chiave-file -> slide del DB, usando l'ordine canonico modulo/lezione/posizione
const mods = await db.select().from(moduleT).where(eq(moduleT.courseId, courseId)).orderBy(asc(moduleT.position));
const perChiave = new Map<string, { id: string; blocks: unknown }>();
for (const m of mods) {
  const lezioni = await db.select().from(lesson).where(eq(lesson.moduleId, m.id)).orderBy(asc(lesson.position));
  for (const l of lezioni) {
    const ss = await db.select().from(slide).where(eq(slide.lessonId, l.id)).orderBy(asc(slide.position));
    for (const s of ss) {
      const blocchi = (s.blocks ?? []) as Block[];
      // la chiave è dentro l'HTML: le slide generate portano il proprio id nel markup
      const html = blocchi.find((b) => b.type === "html")?.html ?? "";
      const m2 = html.match(new RegExp(`${corso}_m\\d\\d_s\\d\\d\\d`));
      if (m2) perChiave.set(m2[0], { id: s.id, blocks: s.blocks });
    }
  }
}

let fatte = 0;
const mancanti: string[] = [];
for (const chiave of chiavi) {
  const file = path.join("slide-in", corso, `${chiave}.html`);
  if (!fs.existsSync(file)) { mancanti.push(`${chiave}: file assente`); continue; }
  const target = perChiave.get(chiave);
  if (!target) { mancanti.push(`${chiave}: slide non trovata in DB`); continue; }
  const nuovoHtml = fs.readFileSync(file, "utf8");
  const blocchi = (target.blocks ?? []) as Block[];
  const i = blocchi.findIndex((b) => b.type === "html");
  if (i === -1) { mancanti.push(`${chiave}: nessun blocco html`); continue; }
  const prima = blocchi[i].html ?? "";
  if (prima === nuovoHtml) { console.log(`= ${chiave}: già aggiornata`); continue; }
  blocchi[i] = { ...blocchi[i], html: nuovoHtml };
  await db.update(slide).set({ blocks: blocchi }).where(eq(slide.id, target.id));
  fatte += 1;
  console.log(`· ${chiave}: HTML sostituito (${prima.length} → ${nuovoHtml.length} caratteri)`);
}

if (mancanti.length) {
  console.error(`\nNON RIPARATE (${mancanti.length}):`);
  for (const m of mancanti) console.error("  " + m);
}
console.log(`\n${fatte}/${chiavi.length} slide aggiornate. Ora rilanciare _populate-slide-ratio.ts e _verify-all-slides.ts.`);
process.exit(mancanti.length ? 1 : 0);

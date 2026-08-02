// Campi catalogo dei due percorsi manageriali 40h (ESG Manager, Energy Manager).
// L'ingest non trasporta category/description dal manifest (resolveManifestToCourse non li
// mappa): come per i corsi auditor si scrivono qui, una tantum e idempotente.
// category='manageriale' è ciò che li fa comparire nella sezione "Energia e sostenibilità"
// della landing e nel filtro del catalogo pubblico.
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { course } from "@/lib/db/schema";

const CORSI: Record<string, string> = {
  "esg-manager-uni-pdr-109-1":
    "Il percorso completo per presidiare la sostenibilità in azienda: rischi e impatti ambientali, sociali e di governance, doppia rilevanza, rendicontazione, catena di fornitura e rapporto con banche e clienti. 40 ore sul profilo descritto dalla UNI/PdR 109.1.",
  "energy-manager-esperto-in-gestione-dell-energia":
    "Il percorso completo per governare l'energia in azienda: misura e indicatori, diagnosi energetica, usi finali elettrici e termici, rinnovabili e autoconsumo, valutazione economica degli interventi e sistema di gestione ISO 50001. 40 ore verso la certificazione EGE.",
};

let scritti = 0;
for (const [slug, description] of Object.entries(CORSI)) {
  const [c] = await db.select().from(course).where(eq(course.slug, slug)).limit(1);
  if (!c) {
    console.log(`✗ non ancora in DB: ${slug}`);
    continue;
  }
  const hours = c.requiredMinutes > 0 ? Math.round(c.requiredMinutes / 60) : null;
  await db
    .update(course)
    .set({ category: "manageriale", description, ...(hours ? { durationHours: hours } : {}) })
    .where(eq(course.id, c.id));
  scritti += 1;
  console.log(`· ${c.title.padEnd(50)} categoria=manageriale · ore=${hours ?? "∅"}`);
}
console.log(`FATTO: ${scritti}/${Object.keys(CORSI).length} corsi aggiornati.`);
process.exit(0);

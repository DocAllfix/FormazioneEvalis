// Collega ogni cover WebP al corso giusto: course.imageUrl = /covers/<iso>.webp (per slug).
// Idempotente. Verifica che ogni slug esista prima di aggiornare.
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { course } from "@/lib/db/schema";

const MAP: Record<string, string> = {
  "auditor-lead-auditor-iso-9001-sistemi-di-gestione-per-la-qualita": "9001",
  "auditor-iso-14001": "14001",
  "esg-manager-uni-pdr-109-1": "fadesg02",
  "energy-manager-esperto-in-gestione-dell-energia": "fadeen02",
  "aggiornamento-lead-auditor-iso-14001-2026": "agg14001",
  "iso-19011-2026-auditor-di-sistemi-di-gestione": "19011",
  "auditor-iso-22000": "22000",
  "auditor-iso-27001": "27001",
  "auditor-iso-37001": "37001",
  "auditor-iso-39001": "39001",
  "auditor-iso-42001": "42001",
  "auditor-iso-45001-salute-e-sicurezza-sul-lavoro": "45001",
  "auditor-iso-50001": "50001",
};

for (const [slug, iso] of Object.entries(MAP)) {
  const [c] = await db.select({ id: course.id, title: course.title }).from(course).where(eq(course.slug, slug)).limit(1);
  if (!c) { console.log(`✗ slug NON trovato: ${slug}`); continue; }
  const imageUrl = `/covers/${iso}.webp`;
  await db.update(course).set({ imageUrl }).where(eq(course.id, c.id));
  console.log(`· ${c.title.slice(0, 50).padEnd(52)} → ${imageUrl}`);
}
console.log("FATTO.");
process.exit(0);

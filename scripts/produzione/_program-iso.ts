// Deriva il programma reale (titolo modulo + sintesi) degli ISO dalle slide di apertura
// (_slide-src/<corso>-mNN-contenuti.json: campo titolo + agenda) e lo salva in course.details.
// Riporta la copertura: moduli DB vs moduli con apertura in _slide-src.
// Uso: npx tsx scripts/produzione/_program-iso.ts [--apply]
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { course, module as moduleT } from "@/lib/db/schema";

const apply = process.argv.includes("--apply");

// codice produzione -> pezzo di titolo per trovare il corso nel DB
const CORSI: Record<string, string> = {
  "19011": "19011", "9001": "ISO 9001", "14001": "ISO 14001", "45001": "ISO 45001",
  "27001": "ISO 27001", "22000": "ISO 22000", "50001": "ISO 50001", "37001": "ISO 37001",
  "39001": "ISO 39001", "42001": "ISO 42001", agg14001: "14001:2026",
};

const rows = await db.select().from(course);

function aperturaOf(corso: string, mod: string): { titolo: string; agenda: string[] } | null {
  const f = path.join("produzione", corso, "_slide-src", `${corso}-${mod}-contenuti.json`);
  if (!fs.existsSync(f)) return null;
  const arr = JSON.parse(fs.readFileSync(f, "utf8"));
  const ap = arr.find((s: any) => s.layout === "apertura");
  if (!ap || !ap.titolo) return null;
  return { titolo: String(ap.titolo).trim(), agenda: Array.isArray(ap.agenda) ? ap.agenda.map((x: any) => String(x).trim()) : [] };
}

for (const [corso, needle] of Object.entries(CORSI)) {
  const c = rows.find((r) => (r.title || "").includes(needle) && (corso !== "14001" || !(r.title || "").includes("2026")));
  if (!c) { console.log(`✗ ${corso}: corso non trovato (needle "${needle}")`); continue; }
  const mods = await db.select().from(moduleT).where(eq(moduleT.courseId, c.id)).orderBy(asc(moduleT.position));
  const program: { title: string; summary: string }[] = [];
  const missing: string[] = [];
  mods.forEach((m, i) => {
    const mod = `m${String(i + 1).padStart(2, "0")}`;
    const ap = aperturaOf(corso, mod);
    if (!ap) { missing.push(mod); return; }
    const summary = ap.agenda.length ? ap.agenda.join("; ") + "." : "";
    program.push({ title: `Modulo ${i + 1} · ${ap.titolo}`, summary });
  });
  const cov = `${program.length}/${mods.length}`;
  console.log(`${corso} (${c.title.slice(0, 30)}…): copertura ${cov}${missing.length ? " · MANCANTI " + missing.join(",") : ""}`);
  if (apply && program.length === mods.length && program.length > 0) {
    const details = { ...((c as any).details ?? {}), program };
    await db.update(course).set({ details }).where(eq(course.id, c.id));
    console.log(`   ✓ applicato (${program.length} moduli)`);
  } else if (apply) {
    console.log(`   ⏭ NON applicato (copertura incompleta) — serve completare i moduli mancanti`);
  }
}
process.exit(0);

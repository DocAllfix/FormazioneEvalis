// Ingesta un corso di produzione: manifest.json + clip-map.json -> resolveManifestToCourse
// -> ingestCourse (che valida il monte-ore lato server) -> enrollment utente di test.
// Generalizzazione di scripts/build-demo-course.ts sul seam di authoring esistente.
//
// BARRIERA ANTI-MESCOLAMENTO #3 (bloccante): per ogni clipKey confronta la durata
// Cloudflare (clip-map) con la durata dell'audio lockato (audio-map): se divergono
// oltre 1s, due file sono stati scambiati o corrotti -> ABORT prima di toccare il DB.
//
// Uso: npx tsx scripts/produzione/build-course.ts <corso> [--email utente@test] [--dry-run]
//      --dry-run: valida tutto (schema, cross-check, monte-ore) senza scrivere nel DB.

import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import {
  courseManifestSchema,
  collectClipKeys,
  resolveManifestToCourse,
  type ClipInfo,
} from "@/features/courses/authoring-manifest";

const corso = process.argv[2];
const dryRun = process.argv.includes("--dry-run");
const emailIx = process.argv.indexOf("--email");
const email = emailIx !== -1 ? process.argv[emailIx + 1] : undefined;
if (!corso) {
  console.error("Uso: npx tsx scripts/produzione/build-course.ts <corso> [--email utente@test] [--dry-run]");
  process.exit(2);
}

const ROOT = process.env.PRODUZIONE_ROOT || "produzione";
const base = path.join(ROOT, corso);
const readJson = (f: string) => JSON.parse(readFileSync(path.join(base, f), "utf8"));

const manifest = courseManifestSchema.parse(readJson("manifest.json"));
const clipMap = readJson("clip-map.json") as Record<string, ClipInfo>;
const audioMap = readJson("audio-map.json") as Record<string, { duration: number }>;

// --- cross-check (barriera 3) ---
const TOLERANCE_S = 1;
const errors: string[] = [];
for (const key of collectClipKeys(manifest)) {
  const clip = clipMap[key];
  const audio = audioMap[key];
  if (!clip?.uid) errors.push(`${key}: manca in clip-map.json (upload non fatto?)`);
  else if (!audio) errors.push(`${key}: manca in audio-map.json (audio mai lockato?)`);
  else if (Math.abs(clip.duration - audio.duration) > TOLERANCE_S)
    errors.push(`${key}: durata Cloudflare ${clip.duration}s ≠ audio lockato ${audio.duration}s — FILE SCAMBIATO O CORROTTO`);
}
if (errors.length) {
  console.error(`CROSS-CHECK FALLITO (${errors.length} problemi) — ingest ANNULLATO:`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`Cross-check durate: OK (${collectClipKeys(manifest).length} clip, tolleranza ±${TOLERANCE_S}s)`);

const course = resolveManifestToCourse(manifest, clipMap);
const totalSeconds = course.modules
  .flatMap((m) => m.lessons)
  .flatMap((l) => l.slides)
  .reduce((a, s) => a + s.audioSeconds, 0);
console.log(
  `Corso: "${course.title}" · ${course.modules.length} moduli · ${totalSeconds}s (~${Math.round(totalSeconds / 60)} min) vs requiredMinutes=${course.requiredMinutes}`,
);

if (dryRun) {
  const ok = totalSeconds >= course.requiredMinutes * 60;
  console.log(ok ? "DRY-RUN OK · l'ingest passerebbe (monte-ore coperto)." : "DRY-RUN: monte-ore NON coperto, l'ingest RIFIUTEREBBE.");
  process.exit(ok ? 0 : 1);
}

// --- ingest reale + enrollment ---
const { ingestCourse } = await import("@/features/courses/ingest");
const { courseId } = await ingestCourse(course);
console.log(`Corso ingestato: ${courseId}`);

if (email) {
  const { db } = await import("@/lib/db");
  const { user, member, enrollment } = await import("@/lib/db/schema");
  const [u] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  if (!u) {
    console.error(`Utente non trovato: ${email}`);
    process.exit(1);
  }
  const [m] = await db
    .select({ orgId: member.organizationId })
    .from(member)
    .where(eq(member.userId, u.id))
    .limit(1);
  if (!m) {
    console.error("L'utente non ha un'organizzazione (membership mancante).");
    process.exit(1);
  }
  const [e] = await db
    .insert(enrollment)
    .values({ organizationId: m.orgId, userId: u.id, courseId, source: "manual", status: "active" })
    .onConflictDoNothing({ target: [enrollment.userId, enrollment.courseId] })
    .returning({ id: enrollment.id });
  console.log(`Enrollment: ${e?.id ?? "(già iscritto)"} · apri /corso/${e?.id ?? "<enrollmentId>"}`);
}
process.exit(0);

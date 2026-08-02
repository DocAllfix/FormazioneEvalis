// Aggiunge le 2 slide STATICHE (copertina m00 in testa, chiusura zzz in coda) ai corsi già
// ingestati, SENZA re-ingestare (preserva iscrizioni/progressi). Idempotente (salta se già presenti).
// Le statiche: avatarClipUid=null (reading-mode), audioSeconds=STATIC_SECONDS. HTML = solo la <section>.
//
// Uso: npx tsx scripts/produzione/_patch-copertine.ts <corso|all>
import "dotenv/config";
import fs from "node:fs";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { module as moduleT, lesson, slide } from "@/lib/db/schema";

const STATIC_SECONDS = 5;
// mappa corso -> courseId (dall'ingest 23/07)
const COURSES: Record<string, string> = {
  agg14001: "c7cd558a-5e53-471b-8cf1-aa81520b6d00",
  "9001": "7f149a45-a5d2-4226-a07c-17434c493fa8",
  "45001": "b1578011-3b31-4133-a14f-9cee63e5f100",
  "27001": "9d167d30-6aa6-4a81-b7e8-ad23f6bcfeb6",
  "14001": "056b845a-629a-4dec-8a3b-86d41b63127f",
  "22000": "d2503a83-e2ac-4a3c-8888-c9576f09eb1f",
  "37001": "21a0cc1e-6b1a-4606-8ed7-62db5ceb2cb7",
  "42001": "e09dd111-b589-4bc1-9a6e-950efca42797",
  "50001": "0823b1c0-008c-43db-aea0-0c6c31fb194c",
  "39001": "8b7b5c4f-f9a8-4731-b71d-e7a8627ae5da",
  "19011": "79d362cc-487d-42c1-9ce7-ca868fe6e909",
};

function sectionOnly(full: string): string {
  const m = full.match(/<section\b[\s\S]*<\/section>/i);
  if (!m) throw new Error("nessuna <section>");
  return m[0];
}
const readSection = (corso: string, id: string) =>
  sectionOnly(fs.readFileSync(`slide-in/${corso}/${corso}_${id}.html`, "utf8"));

async function patch(corso: string) {
  const courseId = COURSES[corso];
  if (!courseId) { console.log(`  ${corso}: courseId sconosciuto, salto`); return; }

  const mods = await db.select().from(moduleT).where(eq(moduleT.courseId, courseId)).orderBy(asc(moduleT.position));
  const firstMod = mods[0], lastMod = mods[mods.length - 1];
  const [firstLesson] = await db.select().from(lesson).where(eq(lesson.moduleId, firstMod.id)).orderBy(asc(lesson.position)).limit(1);
  const lessonsLast = await db.select().from(lesson).where(eq(lesson.moduleId, lastMod.id)).orderBy(desc(lesson.position)).limit(1);
  const lastLesson = lessonsLast[0];

  // idempotenza: se esiste già una slide "Copertina" nel corso, salto
  const existing = await db
    .select({ id: slide.id })
    .from(slide).innerJoin(lesson, eq(lesson.id, slide.lessonId)).innerJoin(moduleT, eq(moduleT.id, lesson.moduleId))
    .where(and(eq(moduleT.courseId, courseId), eq(slide.title, "Copertina")))
    .limit(1);
  if (existing.length) { console.log(`  ${corso}: copertina già presente, salto`); return; }

  const [{ min }] = await db.select({ min: sql<number>`min(position)::int` }).from(slide).where(eq(slide.lessonId, firstLesson.id));
  const [{ max }] = await db.select({ max: sql<number>`max(position)::int` }).from(slide).where(eq(slide.lessonId, lastLesson.id));

  await db.insert(slide).values({
    lessonId: firstLesson.id, position: (min ?? 0) - 1, title: "Copertina",
    blocks: [{ type: "html", html: readSection(corso, "m00_s001") }], avatarClipUid: null, audioSeconds: STATIC_SECONDS,
  });
  await db.insert(slide).values({
    lessonId: lastLesson.id, position: (max ?? 0) + 1, title: "Chiusura",
    blocks: [{ type: "html", html: readSection(corso, "zzz_s001") }], avatarClipUid: null, audioSeconds: STATIC_SECONDS,
  });
  console.log(`  ${corso}: copertina (pos ${(min ?? 0) - 1}, lesson prima) + chiusura (pos ${(max ?? 0) + 1}, lesson ultima) INSERITE`);
}

const arg = process.argv[2];
if (!arg) { console.error("Uso: _patch-copertine.ts <corso|all>"); process.exit(2); }
const list = arg === "all" ? Object.keys(COURSES) : [arg];
for (const c of list) await patch(c);
console.log("FATTO.");
process.exit(0);

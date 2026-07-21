// GATE C.1 — INTEGRITÀ CORSO IN PIATTAFORMA (QA-PRE-LIVE Parte C, pre-pubblicazione).
// Per un corso ingestato verifica, slide per slide e quiz per quiz:
//   C1a ogni slide ha avatarClipUid e audioSeconds > 0
//   C1b ogni clip esiste su Cloudflare Stream ed è readyToStream
//   C1c audioSeconds in DB == durata Cloudflare (±1s) — file scambiati/corrotti
//   C1d somma audioSeconds >= requiredMinutes*60 (monte-ore legale)
//   C1e ogni modulo ha il checkpoint (quiz per lesson) e banca >= questionsToDraw
//   C1f esame finale presente, banca >= questionsToDraw, ogni domanda con >=2 opzioni
//       e correctOptionId valido (per checkpoint ed esame)
//
// Uso: npx tsx scripts/produzione/verifica-corso.ts <slug-o-courseId> [--skip-stream]
//      --skip-stream: salta C1b/C1c (niente API Cloudflare, per giri rapidi in dev)

import "dotenv/config";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { course, module as moduleT, lesson, slide, quiz, quizQuestion } from "@/lib/db/schema";
import { getClipStatus } from "@/lib/cloudflare/stream";

const arg = process.argv[2];
const skipStream = process.argv.includes("--skip-stream");
if (!arg) {
  console.error("Uso: npx tsx scripts/produzione/verifica-corso.ts <slug-o-courseId> [--skip-stream]");
  process.exit(2);
}

const [c] = await db.select().from(course)
  .where(arg.includes("-") && arg.length === 36 ? eq(course.id, arg) : eq(course.slug, arg)).limit(1);
if (!c) {
  console.error(`Corso non trovato: ${arg}`);
  process.exit(1);
}
console.log(`Corso: "${c.title}" (${c.id}) · status=${c.status} · requiredMinutes=${c.requiredMinutes}`);

const errors: string[] = [];
const mods = await db.select().from(moduleT).where(eq(moduleT.courseId, c.id)).orderBy(asc(moduleT.position));
let totSeconds = 0;
let nSlides = 0;

for (const m of mods) {
  const lessons = await db.select().from(lesson).where(eq(lesson.moduleId, m.id)).orderBy(asc(lesson.position));
  if (!lessons.length) errors.push(`${m.title}: nessuna lesson`);
  for (const l of lessons) {
    const slides = await db.select().from(slide).where(eq(slide.lessonId, l.id)).orderBy(asc(slide.position));
    if (!slides.length) errors.push(`${m.title}/${l.title}: nessuna slide`);
    for (const s of slides) {
      nSlides++;
      totSeconds += s.audioSeconds ?? 0;
      if (!s.avatarClipUid) errors.push(`${m.title} slide "${s.title}": avatarClipUid MANCANTE`);
      if (!s.audioSeconds || s.audioSeconds <= 0) errors.push(`${m.title} slide "${s.title}": audioSeconds=${s.audioSeconds}`);
      if (!skipStream && s.avatarClipUid) {
        try {
          const st = await getClipStatus(s.avatarClipUid);
          if (!st.ready) errors.push(`${m.title} slide "${s.title}": clip ${s.avatarClipUid} NON readyToStream`);
          else if (Math.abs((st.duration ?? 0) - s.audioSeconds) > 1)
            errors.push(`${m.title} slide "${s.title}": durata Stream ${st.duration}s ≠ DB ${s.audioSeconds}s`);
        } catch (e) {
          errors.push(`${m.title} slide "${s.title}": clip ${s.avatarClipUid} irraggiungibile (${String(e).slice(0, 80)})`);
        }
      }
    }
  }
}

// quiz: un checkpoint per modulo (lesson) + esame finale
const quizzes = await db.select().from(quiz).where(eq(quiz.courseId, c.id)).orderBy(asc(quiz.position));
const checkpoints = quizzes.filter((q) => q.type === "checkpoint");
const finals = quizzes.filter((q) => q.type === "final");
if (checkpoints.length !== mods.length)
  errors.push(`checkpoint: ${checkpoints.length} per ${mods.length} moduli (uno per modulo atteso)`);
if (finals.length !== 1) errors.push(`esame finale: trovati ${finals.length} (atteso 1)`);
for (const q of quizzes) {
  const bank = await db.select().from(quizQuestion).where(eq(quizQuestion.quizId, q.id));
  if (bank.length < q.questionsToDraw)
    errors.push(`quiz "${q.title}": banca ${bank.length} < estrazione ${q.questionsToDraw}`);
  for (const d of bank) {
    const opts = (d.options ?? []) as { id: string; text: string }[];
    if (opts.length < 2) errors.push(`quiz "${q.title}" domanda "${String(d.text).slice(0, 40)}": ${opts.length} opzioni`);
    if (!opts.some((o) => o.id === d.correctOptionId))
      errors.push(`quiz "${q.title}" domanda "${String(d.text).slice(0, 40)}": correctOptionId non tra le opzioni`);
  }
}

const okMonteOre = totSeconds >= (c.requiredMinutes ?? 0) * 60;
if (!okMonteOre) errors.push(`monte-ore: ${totSeconds}s < requiredMinutes ${c.requiredMinutes}×60`);

console.log(`${mods.length} moduli · ${nSlides} slide · ${Math.round(totSeconds / 60)} min reali vs ${c.requiredMinutes} legali ` +
  `· ${checkpoints.length} checkpoint · esame ${finals.length}${skipStream ? " · (Stream SALTATO)" : ""}`);
if (errors.length) {
  console.error(`\nC.1 ROSSO — ${errors.length} problemi:`);
  for (const e of errors.slice(0, 30)) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log("C.1 VERDE — corso integro (slide, clip, durate, quiz, monte-ore)");
process.exit(0);

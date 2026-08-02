// QA quiz (sola lettura): per OGNI quiz di OGNI corso verifica che sia effettivamente superabile
// e correggibile dal motore (src/features/quiz/engine.ts):
//   - banca (quizQuestion WHERE quizId=…) >= questionsToDraw   [altrimenti startQuiz lancia "Banca insufficiente"]
//   - ogni domanda: >=2 opzioni {id,text} con id univoci
//   - correctOptionId presente tra le opzioni                  [altrimenti domanda IMPOSSIBILE → può bloccare il pass]
//   - passThreshold in 1..100 ; questionsToDraw >= 1
//   - fattibilità peggior-caso: anche pescando le domande "rotte", il punteggio max resta >= soglia?
//   - ogni corso ha almeno un esame 'final'
// Non svolge quiz, non scrive nulla nel log append-only.
import "dotenv/config";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { course, quiz, quizQuestion } from "@/lib/db/schema";

type Opt = { id?: unknown; text?: unknown };

const courses = await db.select({ id: course.id, title: course.title }).from(course).orderBy(asc(course.title));
let totalQuizzes = 0;
const fails: string[] = [];
const warns: string[] = [];

for (const c of courses) {
  const quizzes = await db.select().from(quiz).where(eq(quiz.courseId, c.id)).orderBy(asc(quiz.position));
  const finals = quizzes.filter((q) => q.type === "final").length;
  const header = `\n### ${c.title}  (${quizzes.length} quiz: ${finals} final, ${quizzes.length - finals} checkpoint)`;
  console.log(header);
  if (quizzes.length === 0) { fails.push(`[${c.title}] NESSUN quiz nel corso`); console.log("   ✗ nessun quiz"); continue; }
  if (finals === 0) fails.push(`[${c.title}] nessun esame 'final'`);

  for (const qz of quizzes) {
    totalQuizzes++;
    const tag = `[${c.title}] "${qz.title}" (${qz.type})`;
    const bank = await db
      .select({ id: quizQuestion.id, text: quizQuestion.text, options: quizQuestion.options, correct: quizQuestion.correctOptionId })
      .from(quizQuestion)
      .where(eq(quizQuestion.quizId, qz.id));

    // soglia / draw
    if (qz.questionsToDraw < 1) fails.push(`${tag}: questionsToDraw=${qz.questionsToDraw} (<1)`);
    if (qz.passThreshold < 1 || qz.passThreshold > 100) fails.push(`${tag}: passThreshold=${qz.passThreshold} fuori 1..100`);
    // banca sufficiente
    if (bank.length < qz.questionsToDraw) fails.push(`${tag}: banca ${bank.length} < questionsToDraw ${qz.questionsToDraw} → startQuiz fallisce`);
    else if (bank.length === qz.questionsToDraw) warns.push(`${tag}: banca ${bank.length} == draw ${qz.questionsToDraw} (nessuna casualità reale)`);

    // domande
    let broken = 0;
    for (const q of bank) {
      const opts = Array.isArray(q.options) ? (q.options as Opt[]) : [];
      const ids = opts.map((o) => String(o?.id));
      const uniq = new Set(ids);
      if (opts.length < 2) { fails.push(`${tag}: domanda ${q.id} ha ${opts.length} opzioni (<2)`); broken++; continue; }
      if (uniq.size !== ids.length) fails.push(`${tag}: domanda ${q.id} ha id opzione duplicati`);
      if (opts.some((o) => o?.text == null || String(o.text).trim() === "")) warns.push(`${tag}: domanda ${q.id} ha un'opzione con testo vuoto`);
      if (!uniq.has(String(q.correct))) { fails.push(`${tag}: domanda ${q.id} correctOptionId "${q.correct}" NON tra le opzioni → impossibile`); broken++; }
    }

    // fattibilità peggior-caso: se pesco il max di domande rotte, arrivo comunque alla soglia?
    if (broken > 0 && qz.questionsToDraw > 0) {
      const drawnBroken = Math.min(broken, qz.questionsToDraw);
      const maxScore = Math.round(((qz.questionsToDraw - drawnBroken) / qz.questionsToDraw) * 100);
      if (maxScore < qz.passThreshold)
        fails.push(`${tag}: ${broken} domande rotte → punteggio max peggior-caso ${maxScore}% < soglia ${qz.passThreshold}% (pass talvolta IMPOSSIBILE)`);
    }

    const bad = broken > 0;
    console.log(`   ${bad ? "✗" : "·"} ${qz.title}: banca ${bank.length}, draw ${qz.questionsToDraw}, soglia ${qz.passThreshold}%${broken ? `, ${broken} rotte` : ""}`);
  }
}

console.log(`\n=== QUIZ: ${totalQuizzes} quiz su ${courses.length} corsi · FAIL ${fails.length} · WARN ${warns.length} ===`);
if (fails.length) { console.log("\n-- FAIL --"); for (const f of fails) console.log("  ✗ " + f); }
if (warns.length) { console.log("\n-- WARN --"); for (const w of warns) console.log("  ! " + w); }
process.exit(0);

// Helper di test DEMO: verifica struttura/associazione clip, o sblocca/azzera i
// progressi dell'utente di test. Uso:
//   npx tsx scripts/_demo-admin.ts verify   <email>
//   npx tsx scripts/_demo-admin.ts complete <email>   (segna tutte le slide completate)
//   npx tsx scripts/_demo-admin.ts reset    <email>   (azzera progressi/quiz/certificato)
import "dotenv/config";
import { readFileSync } from "node:fs";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  user, member, enrollment, course, module as courseModule, lesson, slide,
  quiz, quizQuestion, slideProgress, lessonProgress, quizAttempt, certificate,
} from "@/lib/db/schema";
import { ensureCertificateRecord } from "@/features/certificates/lifecycle";

const mode = process.argv[2];
const email = process.argv[3];
if (!mode || !email) { console.error("Uso: _demo-admin.ts <verify|complete|reset> <email>"); process.exit(1); }

const [u] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
if (!u) { console.error("utente non trovato"); process.exit(1); }
const [m] = await db.select({ org: member.organizationId }).from(member).where(eq(member.userId, u.id)).limit(1);
const [enr] = await db
  .select({ id: enrollment.id, courseId: enrollment.courseId, title: course.title })
  .from(enrollment)
  .innerJoin(course, eq(course.id, enrollment.courseId))
  .where(eq(enrollment.userId, u.id))
  .orderBy(asc(enrollment.createdAt))
  .limit(1);
if (!enr) { console.error("nessuna iscrizione"); process.exit(1); }
console.log(`Enrollment ${enr.id} · corso "${enr.title}"`);

const slides = await db
  .select({ id: slide.id, pos: slide.position, title: slide.title, uid: slide.avatarClipUid, audio: slide.audioSeconds, lessonPos: lesson.position, modPos: courseModule.position })
  .from(slide)
  .innerJoin(lesson, eq(lesson.id, slide.lessonId))
  .innerJoin(courseModule, eq(courseModule.id, lesson.moduleId))
  .where(eq(courseModule.courseId, enr.courseId))
  .orderBy(asc(courseModule.position), asc(lesson.position), asc(slide.position));

if (mode === "verify") {
  const clipMap = JSON.parse(readFileSync("democorso/clip-map.json", "utf8")) as Record<string, { uid: string; duration: number }>;
  console.log(`\n${slides.length} slide (ordine fruizione):`);
  let ok = true;
  slides.forEach((s, i) => {
    const expected = `s${String(i + 1).padStart(2, "0")}`;
    const match = clipMap[expected]?.uid === s.uid;
    if (!match) ok = false;
    console.log(`  #${i + 1} mod${s.modPos}/les${s.lessonPos} "${s.title}" | uid=${s.uid?.slice(0, 10)} | atteso ${expected}=${clipMap[expected]?.uid?.slice(0, 10)} ${match ? "OK" : "✗ MISMATCH"} | ${s.audio}s`);
  });
  const quizzes = await db.select({ id: quiz.id, type: quiz.type, title: quiz.title, draw: quiz.questionsToDraw, thr: quiz.passThreshold }).from(quiz).where(eq(quiz.courseId, enr.courseId)).orderBy(asc(quiz.position));
  console.log(`\n${quizzes.length} quiz:`);
  for (const q of quizzes) {
    const [cnt] = await db.select({ n: quizQuestion.id }).from(quizQuestion).where(eq(quizQuestion.quizId, q.id));
    const all = await db.select().from(quizQuestion).where(eq(quizQuestion.quizId, q.id));
    console.log(`  [${q.type}] "${q.title}" draw=${q.draw}/${all.length} soglia=${q.thr}%`);
  }
  console.log(`\nASSOCIAZIONE CLIP→SLIDE: ${ok ? "TUTTE CORRETTE ✅" : "ERRORI ✗"}`);
  process.exit(0);
}

if (mode === "complete") {
  for (const s of slides) {
    await db.insert(slideProgress).values({ enrollmentId: enr.id, slideId: s.id, effectiveSeconds: s.audio, audioCompleted: true, completedAt: new Date() })
      .onConflictDoUpdate({ target: [slideProgress.enrollmentId, slideProgress.slideId], set: { effectiveSeconds: s.audio, audioCompleted: true, completedAt: new Date() } });
  }
  console.log(`Completate ${slides.length} slide. (quiz NON toccati)`);
  process.exit(0);
}

if (mode === "reset") {
  await db.delete(slideProgress).where(eq(slideProgress.enrollmentId, enr.id));
  await db.delete(lessonProgress).where(eq(lessonProgress.enrollmentId, enr.id));
  await db.delete(quizAttempt).where(eq(quizAttempt.enrollmentId, enr.id));
  await db.delete(certificate).where(eq(certificate.enrollmentId, enr.id));
  console.log("Progressi/quiz/certificato AZZERATI. Demo pulita.");
  process.exit(0);
}

if (mode === "ready-cert") {
  // 1) slide complete
  for (const s of slides) {
    await db.insert(slideProgress).values({ enrollmentId: enr.id, slideId: s.id, effectiveSeconds: s.audio, audioCompleted: true, completedAt: new Date() })
      .onConflictDoUpdate({ target: [slideProgress.enrollmentId, slideProgress.slideId], set: { effectiveSeconds: s.audio, audioCompleted: true, completedAt: new Date() } });
  }
  // 2) quiz superati (attempt passed per ogni quiz del corso)
  const quizzes = await db.select({ id: quiz.id }).from(quiz).where(eq(quiz.courseId, enr.courseId));
  for (const q of quizzes) {
    await db.insert(quizAttempt).values({ enrollmentId: enr.id, quizId: q.id, score: 100, passed: true, startedAt: new Date(), submittedAt: new Date() });
  }
  // 3) predispone il certificato (ready_for_review) se idoneo
  const cert = await ensureCertificateRecord(enr.id);
  console.log("Certificato predisposto:", cert);
  process.exit(0);
}

console.error("modo sconosciuto"); process.exit(1);

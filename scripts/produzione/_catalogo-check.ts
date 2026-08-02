// Verifica finale catalogo (read-only): tutti i corsi, stato, conteggi slide/clip/quiz.
import "dotenv/config";
import { eq, asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { course, module as moduleT, lesson, slide, quiz } from "@/lib/db/schema";

const corsi = await db.select().from(course).orderBy(asc(course.title));
console.log(`CORSI IN DB: ${corsi.length}\n`);
console.log("titolo".padEnd(52), "stato".padStart(10), "mod".padStart(4), "slide".padStart(6), "conClip".padStart(8), "quiz".padStart(5));
let totSlide = 0, totClip = 0;
for (const c of corsi) {
  const [{ n: mods }] = await db.select({ n: sql<number>`count(*)::int` }).from(moduleT).where(eq(moduleT.courseId, c.id));
  const slides = await db
    .select({ clip: slide.avatarClipUid })
    .from(slide)
    .innerJoin(lesson, eq(lesson.id, slide.lessonId))
    .innerJoin(moduleT, eq(moduleT.id, lesson.moduleId))
    .where(eq(moduleT.courseId, c.id));
  const [{ n: quizN }] = await db.select({ n: sql<number>`count(*)::int` }).from(quiz).where(eq(quiz.courseId, c.id));
  const withClip = slides.filter((s) => s.clip).length;
  totSlide += slides.length; totClip += withClip;
  console.log(
    c.title.slice(0, 50).padEnd(52),
    String(c.status).padStart(10),
    String(mods).padStart(4),
    String(slides.length).padStart(6),
    String(withClip).padStart(8),
    String(quizN).padStart(5),
  );
}
console.log("-".repeat(90));
console.log(`TOTALE: ${corsi.length} corsi · ${totSlide} slide · ${totClip} con clip`);
process.exit(0);

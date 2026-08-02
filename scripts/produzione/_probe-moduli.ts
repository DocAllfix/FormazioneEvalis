// Discovery: titoli moduli DB + titolo 1a slide (apertura) di ogni modulo. Non modifica nulla.
import "dotenv/config";
import { eq, asc, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { course, module as moduleT, lesson, slide } from "@/lib/db/schema";

for (const needle of ["FAD-AI-01", "19011"]) {
  const rows = await db.select().from(course);
  const c = rows.find((r) => (r.title || "").includes(needle));
  if (!c) { console.log(`\n### ${needle}: non trovato`); continue; }
  console.log(`\n########## ${c.title} ##########`);
  const mods = await db.select().from(moduleT).where(eq(moduleT.courseId, c.id)).orderBy(asc(moduleT.position));
  for (const m of mods) {
    const lessons = await db.select().from(lesson).where(eq(lesson.moduleId, m.id)).orderBy(asc(lesson.position));
    const lessonIds = lessons.map((l) => l.id);
    let firstSlide = "";
    if (lessonIds.length) {
      const ss = await db.select().from(slide).where(inArray(slide.lessonId, lessonIds)).orderBy(asc(slide.position)).limit(1);
      firstSlide = ss[0]?.title ?? "";
    }
    console.log(`  ${m.title}  ·  lezioni=${lessons.length}  ·  1a slide: "${firstSlide}"`);
  }
}
process.exit(0);

import "dotenv/config";
import { eq, asc, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { course, module as moduleT, lesson, slide } from "@/lib/db/schema";

const rows = await db.select().from(course);
const c = rows.find((r) => (r.title || "").includes("19011"))!;
const mods = await db.select().from(moduleT).where(eq(moduleT.courseId, c.id)).orderBy(asc(moduleT.position));
for (const m of mods.slice(0, 3)) {
  const ls = await db.select().from(lesson).where(eq(lesson.moduleId, m.id));
  const ss = await db.select().from(slide).where(inArray(slide.lessonId, ls.map((l) => l.id))).orderBy(asc(slide.position));
  console.log(`\n### ${m.title} (${ss.length} slide) ###`);
  console.log(ss.map((s) => s.title).join(" | "));
}
process.exit(0);

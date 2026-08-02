// Dato un id di slide, dice a quale corso/modulo/lezione appartiene (sola lettura).
// Serve quando una verifica globale segnala un id e bisogna capire quale corso toccare.
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { course, module as moduleT, lesson, slide } from "@/lib/db/schema";

for (const id of process.argv.slice(2)) {
  const [s] = await db.select().from(slide).where(eq(slide.id, id)).limit(1);
  if (!s) { console.log(`${id}: non trovata`); continue; }
  const [l] = await db.select().from(lesson).where(eq(lesson.id, s.lessonId)).limit(1);
  const [m] = l ? await db.select().from(moduleT).where(eq(moduleT.id, l.moduleId)).limit(1) : [undefined];
  const [c] = m ? await db.select().from(course).where(eq(course.id, m.courseId)).limit(1) : [undefined];
  const blocchi = (s.blocks ?? []) as { type?: string; html?: string; ratio?: number }[];
  const b = blocchi.find((x) => x.type === "html");
  const chiave = b?.html?.match(/[a-z0-9]+_m\d\d_s\d\d\d/)?.[0] ?? "—";
  console.log(
    `${id}\n  corso   ${c?.title ?? "?"} (${c?.slug ?? "?"})\n  modulo  ${m?.title ?? "?"}\n` +
      `  slide   ${s.title}\n  chiave  ${chiave} · ratio ${b?.ratio ?? "assente"}`,
  );
}
process.exit(0);

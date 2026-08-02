import "dotenv/config";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { course, module as mod, enrollment } from "@/lib/db/schema";
const demos = await db.select({ id: course.id, t: course.title }).from(course)
  .where(inArray(course.slug, ["corso-di-prova-sicurezza-base","iso-14064-1-quantificazione-dei-gas-serra-demo-moduli-1-2"]));
for (const d of demos) {
  const [{ m }] = await db.select({ m: sql<number>`count(*)::int` }).from(mod).where(eq(mod.courseId, d.id));
  const enr = await db.select({ uid: enrollment.userId }).from(enrollment).where(eq(enrollment.courseId, d.id));
  console.log(`- ${d.t.slice(0,45)} | moduli ${m} | iscrizioni ${enr.length}${enr.length?` (utenti: ${[...new Set(enr.map(e=>e.uid))].join(", ")})`:""}`);
}
process.exit(0);

import "dotenv/config";
import { inArray, sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { course } from "@/lib/db/schema";
import { activityLog } from "@/lib/db/schema/compliance";
const before = (await db.select({ n: sql<number>`count(*)::int` }).from(activityLog))[0].n;
const del = await db.delete(course)
  .where(inArray(course.slug, ["corso-di-prova-sicurezza-base","iso-14064-1-quantificazione-dei-gas-serra-demo-moduli-1-2"]))
  .returning({ t: course.title });
const after = (await db.select({ n: sql<number>`count(*)::int` }).from(activityLog))[0].n;
const remaining = (await db.select({ n: sql<number>`count(*)::int` }).from(course).where(eq(course.status,"published")))[0].n;
console.log("Cancellati:", del.map(d=>d.t).join(" | "));
console.log(`activity_log: prima ${before} → dopo ${after}  (${before===after?"INTATTO ✓":"MODIFICATO ✗!!"})`);
console.log(`corsi pubblicati rimasti: ${remaining}`);
process.exit(0);

import "dotenv/config";
import { eq, asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { module as moduleT, lesson, slide } from "@/lib/db/schema";

const COURSES: Record<string, string> = {
  "19011": "79d362cc-487d-42c1-9ce7-ca868fe6e909", "9001": "7f149a45-a5d2-4226-a07c-17434c493fa8",
  "45001": "b1578011-3b31-4133-a14f-9cee63e5f100", "27001": "9d167d30-6aa6-4a81-b7e8-ad23f6bcfeb6",
  "14001": "056b845a-629a-4dec-8a3b-86d41b63127f", "22000": "d2503a83-e2ac-4a3c-8888-c9576f09eb1f",
  "37001": "21a0cc1e-6b1a-4606-8ed7-62db5ceb2cb7", "42001": "e09dd111-b589-4bc1-9a6e-950efca42797",
  "50001": "0823b1c0-008c-43db-aea0-0c6c31fb194c", "39001": "8b7b5c4f-f9a8-4731-b71d-e7a8627ae5da",
  agg14001: "c7cd558a-5e53-471b-8cf1-aa81520b6d00",
};

for (const [name, courseId] of Object.entries(COURSES)) {
  const mods = await db.select({ id: moduleT.id }).from(moduleT).where(eq(moduleT.courseId, courseId));
  let total = 0, clips = 0, statics = 0;
  for (const m of mods) {
    const lessons = await db.select({ id: lesson.id }).from(lesson).where(eq(lesson.moduleId, m.id));
    for (const l of lessons) {
      const ss = await db.select({ clip: slide.avatarClipUid }).from(slide).where(eq(slide.lessonId, l.id));
      total += ss.length;
      for (const s of ss) { if (s.clip) clips++; else statics++; }
    }
  }
  console.log(`${name.padEnd(9)} moduli ${String(mods.length).padStart(2)}  slide ${String(total).padStart(3)}  (clip ${clips}, statiche ${statics})`);
}
process.exit(0);

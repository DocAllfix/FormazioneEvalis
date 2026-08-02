// Iscrive l'account dell'utente (quello dell'enrollment 19011 esistente) a TUTTI i corsi.
import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { enrollment, course } from "@/lib/db/schema";

const KNOWN = "eb2f6290-86bd-4f67-afcc-4a9d6867df42"; // enrollment 19011 = account utente
const COURSES: Record<string, string> = {
  "19011": "79d362cc-487d-42c1-9ce7-ca868fe6e909",
  "9001": "7f149a45-a5d2-4226-a07c-17434c493fa8",
  "45001": "b1578011-3b31-4133-a14f-9cee63e5f100",
  "27001": "9d167d30-6aa6-4a81-b7e8-ad23f6bcfeb6",
  "14001": "056b845a-629a-4dec-8a3b-86d41b63127f",
  "22000": "d2503a83-e2ac-4a3c-8888-c9576f09eb1f",
  "37001": "21a0cc1e-6b1a-4606-8ed7-62db5ceb2cb7",
  "42001": "e09dd111-b589-4bc1-9a6e-950efca42797",
  "50001": "0823b1c0-008c-43db-aea0-0c6c31fb194c",
  "39001": "8b7b5c4f-f9a8-4731-b71d-e7a8627ae5da",
  agg14001: "c7cd558a-5e53-471b-8cf1-aa81520b6d00",
};

const [base] = await db
  .select({ userId: enrollment.userId, orgId: enrollment.organizationId })
  .from(enrollment).where(eq(enrollment.id, KNOWN)).limit(1);
if (!base) { console.error("enrollment base non trovato"); process.exit(1); }
console.log(`account utente: ${base.userId} · org: ${base.orgId}\n`);

for (const [corso, courseId] of Object.entries(COURSES)) {
  await db.insert(enrollment)
    .values({ organizationId: base.orgId, userId: base.userId, courseId, source: "manual", status: "active" })
    .onConflictDoNothing({ target: [enrollment.userId, enrollment.courseId] });
  const [e] = await db.select({ id: enrollment.id }).from(enrollment)
    .where(and(eq(enrollment.userId, base.userId), eq(enrollment.courseId, courseId))).limit(1);
  const [c] = await db.select({ t: course.title }).from(course).where(eq(course.id, courseId)).limit(1);
  console.log(`${corso.padEnd(9)} /corso/${e?.id}   — ${c?.t}`);
}
process.exit(0);

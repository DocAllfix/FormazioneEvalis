// Dev seed: assegna il corso di esempio a un utente già registrato, così la
// dashboard discente mostra dati reali. NON per produzione.
//
// Uso (dopo esserti registrato su /registrati):
//   npx tsx scripts/seed-learner.ts tua@email.it

import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user, member, enrollment } from "@/lib/db/schema";
import { ingestCourse } from "@/features/courses/ingest";
import { sampleCourse } from "@/features/courses/seed";

const email = process.argv[2];
if (!email) {
  console.error("Uso: npx tsx scripts/seed-learner.ts <email>");
  process.exit(1);
}

const [u] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
if (!u) {
  console.error(`Utente non trovato: ${email}. Registrati prima su /registrati.`);
  process.exit(1);
}

const [m] = await db
  .select({ orgId: member.organizationId })
  .from(member)
  .where(eq(member.userId, u.id))
  .limit(1);
if (!m) {
  console.error("L'utente non ha un'organizzazione personale (membership mancante).");
  process.exit(1);
}

const { courseId } = await ingestCourse(sampleCourse());
const [e] = await db
  .insert(enrollment)
  .values({
    organizationId: m.orgId,
    userId: u.id,
    courseId,
    source: "manual",
    status: "active",
  })
  .onConflictDoNothing({ target: [enrollment.userId, enrollment.courseId] })
  .returning({ id: enrollment.id });

console.log(`OK · courseId=${courseId} · enrollmentId=${e?.id ?? "(già iscritto a questo corso)"}`);
console.log("Apri /dashboard per vederlo.");
process.exit(0);

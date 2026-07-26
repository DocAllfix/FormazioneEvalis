// Iscrive un utente ai 2 corsi Claude (source=manual, status=active). Idempotente.
import "dotenv/config";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import * as S from "@/lib/db/schema";

const email = process.argv[2] ?? "dilonardoa28@gmail.com";
const [u] = await db.select().from(S.user).where(eq(S.user.email, email)).limit(1);
if (!u) { console.log(`✗ utente ${email} non trovato`); process.exit(1); }
const [mem] = await db.select().from(S.member).where(eq(S.member.userId, u.id)).limit(1);
if (!mem) { console.log(`✗ ${email} senza org membership`); process.exit(1); }
const orgId = (mem as any).organizationId;

const rows = await db.select().from(S.course);
for (const tag of ["FAD-AI-01", "FAD-AI-02"]) {
  const c = rows.find((r) => (r.title || "").includes(tag));
  if (!c) { console.log(`✗ ${tag} non trovato`); continue; }
  const [ex] = await db.select().from(S.enrollment)
    .where(and(eq(S.enrollment.userId, u.id), eq(S.enrollment.courseId, c.id))).limit(1);
  if (ex) { console.log(`· ${tag}: già iscritto (status=${(ex as any).status})`); continue; }
  await db.insert(S.enrollment).values({
    organizationId: orgId, userId: u.id, courseId: c.id, source: "manual", status: "active",
  } as any);
  console.log(`✓ ${tag}: iscritto a ${email} (org ${orgId})`);
}
console.log("FATTO.");
process.exit(0);

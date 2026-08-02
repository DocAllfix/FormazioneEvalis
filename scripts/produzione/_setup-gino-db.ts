import "dotenv/config";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import * as S from "@/lib/db/schema";
const EMAIL = "ginofrabbicini@evalisacademy.it";
const [u] = await db.select().from(S.user).where(eq(S.user.email, EMAIL)).limit(1);
if (!u) { console.log("✗ Gino non trovato"); process.exit(1); }
await db.update(S.user).set({ platformRole: null, emailVerified: true }).where(eq(S.user.id, u.id));
const [mem] = await db.select().from(S.member).where(eq(S.member.userId, u.id)).limit(1);
const orgId = (mem as any).organizationId;
const corsi = await db.select().from(S.course);
let n = 0;
for (const c of corsi) {
  const [ex] = await db.select().from(S.enrollment).where(and(eq(S.enrollment.userId, u.id), eq(S.enrollment.courseId, c.id))).limit(1);
  if (ex) continue;
  await db.insert(S.enrollment).values({ organizationId: orgId, userId: u.id, courseId: c.id, source: "manual", status: "active" });
  n++;
}
console.log(`✓ Gino normale(role=null)+verificato · iscritto a ${n}/${corsi.length} corsi · org ${orgId}`);
process.exit(0);

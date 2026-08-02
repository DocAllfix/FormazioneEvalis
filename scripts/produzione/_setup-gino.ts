import "dotenv/config";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import * as S from "@/lib/db/schema";
import { auth } from "@/lib/auth";

const EMAIL = "ginofrabbicini@evalisacademy.it";
const PW = "GinoEvalis2026!";

const [u] = await db.select().from(S.user).where(eq(S.user.email, EMAIL)).limit(1);
if (!u) { console.log("✗ Gino non trovato"); process.exit(1); }

// 1) utente NORMALE (no admin) + email verificata
await db.update(S.user).set({ platformRole: null, emailVerified: true }).where(eq(S.user.id, u.id));

// 2) password nota (hash better-auth) sull'account credenziali
const ctx = await (auth as unknown as { $context: Promise<{ password: { hash: (p: string) => Promise<string> } }> }).$context;
const hash = await ctx.password.hash(PW);
await db.update(S.account).set({ password: hash, updatedAt: new Date() })
  .where(and(eq(S.account.userId, u.id), eq(S.account.providerId, "credential")));

// 3) iscrizione a TUTTI i corsi (org di Gino, source=manual) — idempotente
const [mem] = await db.select().from(S.member).where(eq(S.member.userId, u.id)).limit(1);
if (!mem) { console.log("✗ Gino senza org"); process.exit(1); }
const orgId = (mem as any).organizationId;
const corsi = await db.select().from(S.course);
let n = 0;
for (const c of corsi) {
  const [ex] = await db.select().from(S.enrollment)
    .where(and(eq(S.enrollment.userId, u.id), eq(S.enrollment.courseId, c.id))).limit(1);
  if (ex) continue;
  await db.insert(S.enrollment).values({ organizationId: orgId, userId: u.id, courseId: c.id, source: "manual", status: "active" });
  n++;
}
const tot = corsi.length;
console.log(`✓ Gino NORMALE (platformRole=null) + emailVerified=true`);
console.log(`✓ password impostata: ${PW}`);
console.log(`✓ iscritto a ${n} nuovi corsi (totale ${tot}, org ${orgId})`);
console.log(`   login: ${EMAIL} / ${PW}`);
process.exit(0);

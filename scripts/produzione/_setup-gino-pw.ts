import "dotenv/config";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import * as S from "@/lib/db/schema";
import { hashPassword } from "better-auth/crypto";
const EMAIL = "ginofrabbicini@evalisacademy.it";
const PW = "GinoEvalis2026!";
const [u] = await db.select().from(S.user).where(eq(S.user.email, EMAIL)).limit(1);
if (!u) { console.log("✗ non trovato"); process.exit(1); }
const hash = await hashPassword(PW);
await db.update(S.account).set({ password: hash, updatedAt: new Date() })
  .where(and(eq(S.account.userId, u.id), eq(S.account.providerId, "credential")));
console.log(`✓ password impostata (hash ${hash.length} char) per ${EMAIL}`);
process.exit(0);

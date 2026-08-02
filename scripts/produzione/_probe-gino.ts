import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as S from "@/lib/db/schema";
const [u] = await db.select().from(S.user).where(eq(S.user.email,"ginofrabbicini@evalisacademy.it")).limit(1);
console.log("gino user:", u ? {id:u.id, role:(u as any).platformRole, verified:(u as any).emailVerified} : "NON trovato");
if (u) {
  const accs = await db.select().from(S.account).where(eq(S.account.userId, u.id));
  console.log("accounts:", accs.map(a=>({providerId:(a as any).providerId, accountId:(a as any).accountId, hasPw: !!(a as any).password})));
  console.log("colonne account:", Object.keys(accs[0] ?? {}).join(", "));
}
process.exit(0);

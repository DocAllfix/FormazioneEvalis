import "dotenv/config";
import { like, or, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as S from "@/lib/db/schema";
for (const q of ["dilonardoa28","fabbricini","gino"]) {
  const us = await db.select().from(S.user).where(or(like(S.user.email,`%${q}%`), like(S.user.name,`%${q}%`)));
  for (const u of us) {
    const mem = await db.select().from(S.member).where(eq(S.member.userId,u.id));
    const enr = await db.select().from(S.enrollment).where(eq(S.enrollment.userId,u.id));
    console.log(`[${q}] ${u.email} | name=${u.name} | platformRole=${(u as any).platformRole ?? "null"} | verified=${(u as any).emailVerified} | org=${mem.map(m=>(m as any).organizationId).join(",")||"-"} | iscrizioni=${enr.length}`);
  }
}
const totCorsi = (await db.select().from(S.course)).length;
console.log("TOT corsi nel DB:", totCorsi);
process.exit(0);

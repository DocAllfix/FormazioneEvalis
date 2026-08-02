import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as S from "@/lib/db/schema";
const [u] = await db.select().from(S.user).where(eq(S.user.email,"ginofrabbicini@evalisacademy.it")).limit(1);
const enr = await db.select().from(S.enrollment).where(eq(S.enrollment.userId,u!.id));
console.log("role:",(u as any).platformRole,"verified:",(u as any).emailVerified,"iscrizioni:",enr.length);
process.exit(0);

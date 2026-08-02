import "dotenv/config";
import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
// pre-lancio: gli account già esistenti vengono considerati verificati (grandfather),
// così l'attivazione di requireEmailVerification non blocca il login di chi c'è già.
await db.update(user).set({ emailVerified: true }).where(eq(user.emailVerified, false));
const nonver = (await db.select({ n: sql<number>`count(*)::int` }).from(user).where(eq(user.emailVerified, false)))[0].n;
console.log(`Non verificati rimasti: ${nonver} (atteso 0)`);
process.exit(0);

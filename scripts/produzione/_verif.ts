import "dotenv/config";
import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
const tot = (await db.select({ n: sql<number>`count(*)::int` }).from(user))[0].n;
const nonver = (await db.select({ n: sql<number>`count(*)::int` }).from(user).where(eq(user.emailVerified, false)))[0].n;
console.log(`utenti totali: ${tot} | NON verificati: ${nonver}`);
process.exit(0);

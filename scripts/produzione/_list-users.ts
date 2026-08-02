import "dotenv/config";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
const us = await db.select({ email: user.email, name: user.name, ver: user.emailVerified, role: user.platformRole, created: user.createdAt }).from(user).orderBy(asc(user.createdAt));
console.log(`ACCOUNT ESISTENTI: ${us.length}\n`);
for (const u of us) {
  console.log(`  ${u.email.padEnd(34)} | ${u.ver ? "verif." : "NON ver."} | ${u.role ? "ADMIN" : "utente"} | ${new Date(u.created).toLocaleString("it-IT")}`);
}
process.exit(0);

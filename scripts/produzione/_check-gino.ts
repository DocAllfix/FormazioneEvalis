import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user, account } from "@/lib/db/schema";
const [u] = await db.select().from(user).where(eq(user.email, "ginofrabbicini@evalisacademy.it")).limit(1);
if (!u) { console.log("gino NON esiste ancora"); process.exit(0); }
const accs = await db.select({ providerId: account.providerId, hasPw: account.password }).from(account).where(eq(account.userId, u.id));
console.log("gino esiste:", u.id, "| role:", (u as Record<string,unknown>).platformRole ?? "(nessuno)", "| account:", accs.map(a=>a.providerId+(a.hasPw?"(pw)":"")).join(","));
process.exit(0);

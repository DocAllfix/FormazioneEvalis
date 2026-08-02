// Crea un account STAFF (platform admin) via better-auth (hash password corretto), poi promuove.
// Uso: npx tsx _create-staff.ts <email> <password> "<nome>"
import "dotenv/config";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

const [email, password, name] = process.argv.slice(2);
if (!email || !password) { console.error("uso: _create-staff.ts <email> <password> <nome>"); process.exit(2); }

const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
if (existing.length === 0) {
  const res = await auth.api.signUpEmail({ body: { email, password, name: name ?? email } }).catch((e) => ({ err: String(e) }));
  console.log("signup:", JSON.stringify(res).slice(0, 200));
} else {
  console.log("utente già esistente, procedo solo alla promozione");
}
const [u] = await db.select({ id: user.id, email: user.email }).from(user).where(eq(user.email, email)).limit(1);
if (!u) { console.error("utente non creato"); process.exit(1); }
await db.update(user).set({ platformRole: "admin" }).where(eq(user.id, u.id));
const [chk] = await db.select({ email: user.email, role: user.platformRole }).from(user).where(eq(user.id, u.id)).limit(1);
console.log(`OK: ${chk?.email} | id ${u.id} | platformRole ${chk?.role}`);
process.exit(0);

import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { account } from "@/lib/db/schema";
// un account credenziali esistente (il mio)
const rows = await db.select().from(account).where(eq(account.userId, "UDehVYvTyFwHEBmVH1rWQwvLU5yjEF40"));
for (const r of rows) {
  const pw = (r as Record<string,unknown>).password as string | null;
  console.log("providerId:", r.providerId, "| accountId:", r.accountId, "| pwFormat:", pw ? pw.slice(0,16)+"…("+pw.length+")" : "null");
}
// prova ad accedere all'hasher di better-auth
try {
  const { auth } = await import("@/lib/auth");
  const ctx = await (auth as unknown as { $context: Promise<{ password: { hash: (p:string)=>Promise<string> } }> }).$context;
  const h = await ctx.password.hash("test1234");
  console.log("HASHER OK, esempio:", h.slice(0,16)+"…("+h.length+")");
} catch (e) { console.log("hasher err:", String(e).slice(0,120)); }
process.exit(0);

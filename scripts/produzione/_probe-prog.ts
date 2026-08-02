import "dotenv/config";
import { db } from "@/lib/db";
import { course } from "@/lib/db/schema";
const rows = await db.select().from(course);
const c = rows.find((r) => (r.title||"").includes("ISO 9001"))!;
const prog = (c as any).details?.program ?? [];
console.log("9001 programma DB ("+prog.length+" moduli):");
for (const p of prog) console.log("  - "+p.title);
process.exit(0);

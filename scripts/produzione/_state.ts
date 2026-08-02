import "dotenv/config";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { course } from "@/lib/db/schema";
const cs = await db.select({ t: course.title, slug: course.slug, price: course.priceCents, sp: course.stripePriceId, cat: course.category, st: course.status }).from(course).orderBy(asc(course.title));
let conPrezzo = 0;
for (const c of cs) if (c.sp) conPrezzo++;
console.log(`corsi totali: ${cs.length} | con prezzo Stripe: ${conPrezzo}`);
console.log("corsi NON reali (da rimuovere pre-lancio):");
for (const c of cs) {
  const real = c.slug?.startsWith("auditor") || c.slug?.includes("19011") || c.slug?.startsWith("aggiornamento");
  if (!real) console.log(`  - "${c.t}" (cat=${c.cat}, status=${c.st})`);
}
process.exit(0);

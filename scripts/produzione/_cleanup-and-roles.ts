// Pulizia pre-lancio + ruoli admin.
// 1) Archivia i 2 corsi NON reali (test/demo) -> spariscono da catalogo/landing (reversibile).
// 2) Imposta platformRole='admin' sull'account dell'utente (accesso /staff).
import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { course, user } from "@/lib/db/schema";

const DA_ARCHIVIARE = [
  "corso-di-prova-sicurezza-base",
  "iso-14064-1-quantificazione-dei-gas-serra-demo-moduli-1-2",
];
const arch = await db.update(course).set({ status: "archived" })
  .where(inArray(course.slug, DA_ARCHIVIARE)).returning({ t: course.title, st: course.status });
console.log("Archiviati:");
for (const a of arch) console.log(`  - ${a.t} → ${a.st}`);

const MY_ID = "UDehVYvTyFwHEBmVH1rWQwvLU5yjEF40";
await db.update(user).set({ platformRole: "admin" }).where(eq(user.id, MY_ID));
const [me] = await db.select({ email: user.email, role: user.platformRole }).from(user).where(eq(user.id, MY_ID)).limit(1);
console.log(`\nAccount ${me?.email}: platformRole = ${me?.role ?? "(nessuno)"}`);
process.exit(0);

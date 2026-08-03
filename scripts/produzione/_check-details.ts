// Chi ha la scheda ricca (details) e chi no. Sola lettura.
import "dotenv/config";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { course } from "@/lib/db/schema";

const righe = await db
  .select({ slug: course.slug, title: course.title, category: course.category, details: course.details })
  .from(course)
  .orderBy(asc(course.title));

for (const r of righe) {
  const d = (r.details ?? {}) as Record<string, unknown>;
  const prog = Array.isArray(d.program) ? d.program.length : 0;
  const campi = Object.keys(d).filter((k) => k !== "program");
  console.log(
    `${(r.slug ?? "?").slice(0, 46).padEnd(48)} cat=${(r.category ?? "—").padEnd(12)} ` +
      `programma=${prog === 0 ? "ASSENTE" : `${prog} moduli`} · altri campi: ${campi.join(",") || "nessuno"}`,
  );
}
process.exit(0);

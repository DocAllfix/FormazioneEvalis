// Campi marketing dei corsi (read-only): slug, categoria, ore, immagine, descrizione.
import "dotenv/config";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { course } from "@/lib/db/schema";

const rows = await db
  .select({
    title: course.title, slug: course.slug, category: course.category,
    status: course.status, durationHours: course.durationHours, imageUrl: course.imageUrl,
    description: course.description,
  })
  .from(course)
  .orderBy(asc(course.title));

for (const r of rows) {
  console.log(`- ${r.title}`);
  console.log(`   slug=${r.slug ?? "∅"} | cat=${r.category ?? "∅"} | status=${r.status} | ore=${r.durationHours ?? "∅"} | img=${r.imageUrl ? "SÌ" : "∅"} | desc=${r.description ? r.description.slice(0, 60) + "…" : "∅"}`);
}
process.exit(0);

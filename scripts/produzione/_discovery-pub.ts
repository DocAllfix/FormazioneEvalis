// Discovery per pubblicazione+iscrizione dei corsi Claude. Non modifica nulla.
import "dotenv/config";
import { like, or, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import * as S from "@/lib/db/schema";

// 1) trova l'utente "dlonardoa28"
const users = await db.select().from(S.user).where(
  or(like(S.user.email, "%dlonardoa28%"), like(S.user.name, "%dlonardoa28%"), like(S.user.name, "%onardo%"))
);
console.log("=== UTENTI candidati ===");
for (const u of users) console.log(`  id=${u.id} email=${u.email} name=${u.name}`);

// 2) campi catalogo dei due corsi Claude (per capire cosa serve alla vetrina)
const courses = await db.select().from(S.course);
const claude = courses.filter((c) => (c.title || "").includes("FAD-AI"));
console.log("\n=== CORSI CLAUDE (campi catalogo) ===");
for (const c of claude) {
  console.log(JSON.stringify({ id: c.id, slug: c.slug, status: (c as any).status,
    category: (c as any).category, imageUrl: (c as any).imageUrl,
    description: (c as any).description ? String((c as any).description).slice(0, 40) + "…" : null,
    priceCents: (c as any).priceCents ?? (c as any).price ?? null,
    hours: (c as any).hours ?? (c as any).durationHours ?? null }, null, 0));
}
console.log("\ncampi disponibili su course:", Object.keys(courses[0] ?? {}).join(", "));

// 3) come sono fatti gli ISO pubblicati (riferimento vetrina)
const iso = courses.find((c) => (c.title || "").includes("19011"));
if (iso) console.log("\n=== ISO 19011 (riferimento) ===\n", JSON.stringify({ status:(iso as any).status, category:(iso as any).category, imageUrl:(iso as any).imageUrl, priceCents:(iso as any).priceCents ?? (iso as any).price, hours:(iso as any).hours ?? (iso as any).durationHours }));

// 4) tabelle enrollment / org
console.log("\n=== schema keys enrollment ===", Object.keys(S).filter(k=>/enroll|seat|member|organization/i.test(k)).join(", "));
process.exit(0);

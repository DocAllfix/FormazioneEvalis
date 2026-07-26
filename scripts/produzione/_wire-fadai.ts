// Collega la cover e ispeziona stato/prezzo dei corsi Claude appena ingestati.
// Uso: npx tsx scripts/produzione/_wire-fadai.ts <fadai01|fadai02> [--draft]
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { course } from "@/lib/db/schema";

const corso = process.argv[2];
const toDraft = process.argv.includes("--draft");
if (!corso) { console.error("Uso: _wire-fadai.ts <fadai01|fadai02> [--draft]"); process.exit(2); }

// il titolo dei due corsi contiene FAD-AI-01 / FAD-AI-02
const tag = corso === "fadai01" ? "FAD-AI-01" : "FAD-AI-02";
const rows = await db.select().from(course);
const c = rows.find((r) => (r.title || "").includes(tag));
if (!c) { console.error(`corso con tag ${tag} non trovato nel DB`); process.exit(1); }

console.log("CAMPI:", Object.keys(c).join(", "));
console.log("PRIMA:", { slug: c.slug, status: (c as any).status, imageUrl: (c as any).imageUrl });

const patch: Record<string, unknown> = { imageUrl: `/covers/${corso}.webp` };
if (toDraft) patch.status = "draft";
await db.update(course).set(patch).where(eq(course.id, c.id));

const [c2] = await db.select().from(course).where(eq(course.id, c.id)).limit(1);
console.log("DOPO:", { slug: c2.slug, status: (c2 as any).status, imageUrl: (c2 as any).imageUrl });
process.exit(0);

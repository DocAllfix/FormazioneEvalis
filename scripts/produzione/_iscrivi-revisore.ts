// Iscrive un account staff a UN corso, per la revisione nel player (gli account revisori sono
// iscritti a tutti i corsi del catalogo). Organizzazione = quella di un'iscrizione già esistente
// dello stesso account. Idempotente (onConflictDoNothing). Non tocca tracciamento né audit.
// Uso: npx tsx scripts/produzione/_iscrivi-revisore.ts [--prod] <email> <slug-corso>
const args = process.argv.slice(2);
if (args.includes("--prod")) {
  const { config } = await import("dotenv");
  config();
  if (!process.env.PROD_DATABASE_URL) { console.error("PROD_DATABASE_URL non impostata"); process.exit(1); }
  process.env.DATABASE_URL = process.env.PROD_DATABASE_URL; // prima di importare il client
}
const [email, slug] = args.filter((a) => !a.startsWith("--"));
if (!email || !slug) { console.error("Uso: _iscrivi-revisore.ts [--prod] <email> <slug-corso>"); process.exit(2); }

await import("dotenv/config");
const { and, eq } = await import("drizzle-orm");
const { db } = await import("@/lib/db");
const { enrollment, course, user } = await import("@/lib/db/schema");

const [u] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
if (!u) { console.error(`account ${email} non trovato`); process.exit(1); }
const [c] = await db.select({ id: course.id, title: course.title }).from(course).where(eq(course.slug, slug)).limit(1);
if (!c) { console.error(`corso ${slug} non trovato`); process.exit(1); }
const [base] = await db.select({ orgId: enrollment.organizationId }).from(enrollment).where(eq(enrollment.userId, u.id)).limit(1);
if (!base) { console.error(`${email} non ha iscrizioni da cui prendere l'organizzazione`); process.exit(1); }

await db.insert(enrollment)
  .values({ organizationId: base.orgId, userId: u.id, courseId: c.id, source: "manual", status: "active" })
  .onConflictDoNothing({ target: [enrollment.userId, enrollment.courseId] });
const [e] = await db.select({ id: enrollment.id, status: enrollment.status }).from(enrollment)
  .where(and(eq(enrollment.userId, u.id), eq(enrollment.courseId, c.id))).limit(1);
console.log(`${email} iscritto a «${c.title}» · iscrizione ${e?.id} · ${e?.status} · ${args.includes("--prod") ? "PRODUZIONE" : "sviluppo"}`);
process.exit(0);
export {};

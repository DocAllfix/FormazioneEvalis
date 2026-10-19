// Ripristino di uno svolgimento perso (decisione dell'utente, 16/10/2026): per l'account indicato
// segna completato il corso e fa nascere l'attestato provvisorio, con le mail di sempre
// (ripristinaCompletamento in lifecycle.ts). Nel registro resta l'evento `completion-restored`.
// Senza --esegui mostra soltanto le iscrizioni dell'account e cosa farebbe (non scrive niente).
// Uso: npx tsx scripts/produzione/_ripristina-completamento.ts [--prod] <email> [slug-corso ...]
//        --operatore <email-staff> --motivo "<testo>" [--esegui]
const args = process.argv.slice(2);
if (args.includes("--prod")) {
  const { config } = await import("dotenv");
  config();
  if (!process.env.PROD_DATABASE_URL) { console.error("PROD_DATABASE_URL non impostata"); process.exit(1); }
  process.env.DATABASE_URL = process.env.PROD_DATABASE_URL; // prima di importare il client
  process.env.VERCEL_ENV = "production"; // come in produzione: la mail parte anche al committente
  process.env.NEXT_PUBLIC_APP_URL = "https://evalisacademy.it"; // QR dell'attestato e link delle mail
  // il .env locale non ha il mittente: senza, Resend consegnerebbe solo al titolare dell'account
  process.env.RESEND_FROM ??= "Evalis Academy <no-reply@evalisacademy.it>";
}
const valore = (nome: string) => { const i = args.indexOf(nome); return i >= 0 ? args[i + 1] : undefined; };
const operatore = valore("--operatore");
const motivo = valore("--motivo");
const esegui = args.includes("--esegui");
const posizionali = args.filter((a, i) => !a.startsWith("--") && !["--operatore", "--motivo"].includes(args[i - 1]));
const [email, ...slugs] = posizionali;
if (!email) { console.error("Uso: _ripristina-completamento.ts [--prod] <email> [slug ...] --operatore <email> --motivo \"...\" [--esegui]"); process.exit(2); }

await import("dotenv/config");
const { and, eq, inArray, isNotNull, count } = await import("drizzle-orm");
const { db } = await import("@/lib/db");
const { enrollment, course, user, certificate, slideProgress } = await import("@/lib/db/schema");
const { ripristinaCompletamento } = await import("@/features/certificates/lifecycle");

const [u] = await db.select({ id: user.id, name: user.name }).from(user).where(eq(user.email, email)).limit(1);
if (!u) { console.error(`account ${email} non trovato`); process.exit(1); }

const iscrizioni = await db
  .select({ id: enrollment.id, slug: course.slug, title: course.title, cert: certificate.number })
  .from(enrollment)
  .innerJoin(course, eq(course.id, enrollment.courseId))
  .leftJoin(certificate, eq(certificate.enrollmentId, enrollment.id))
  .where(and(eq(enrollment.userId, u.id), slugs.length ? inArray(course.slug, slugs) : undefined));
const mancanti = slugs.filter((s) => !iscrizioni.some((i) => i.slug === s));
if (mancanti.length) { console.error(`${email} non è iscritto a: ${mancanti.join(", ")}`); process.exit(1); }

console.log(`${u.name} <${email}> · ${args.includes("--prod") ? "PRODUZIONE" : "sviluppo"}`);
for (const i of iscrizioni) {
  const [{ fatte }] = await db.select({ fatte: count() }).from(slideProgress)
    .where(and(eq(slideProgress.enrollmentId, i.id), isNotNull(slideProgress.completedAt)));
  console.log(`  ${i.slug} · «${i.title}» · slide completate ${fatte} · attestato ${i.cert ?? "nessuno"}`);
}

if (!esegui) { console.log("\nProva: niente scritto. Indica i corsi e aggiungi --operatore, --motivo e --esegui."); process.exit(0); }
if (!slugs.length) { console.error("Con --esegui indica esplicitamente i corsi da ripristinare."); process.exit(2); }
if (!operatore || !motivo) { console.error("Con --esegui servono --operatore e --motivo."); process.exit(2); }

for (const i of iscrizioni) {
  const r = await ripristinaCompletamento(i.id, { operatore, motivo });
  console.log(`  ✔ ${i.slug} · slide ripristinate ${r.slideRipristinate} · attestato ${r.number} · ${r.nuovo ? "NUOVO, mail di fine corso inviate (eventuali errori di invio sono stampati sopra)" : "già esistente, nessuna mail"}`);
}
process.exit(0);
export {};

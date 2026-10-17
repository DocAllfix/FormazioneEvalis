// Riconsegna FIRMATA di un attestato EVALIS già emesso prima che la firma esistesse (richiesta
// dell'utente del 17/10/2026): stesso numero, stessa data, stesso QR, nuovo PDF con la firma.
// Il PDF consegnato prima resta nello storage; nel registro resta `certificate-resigned` con
// operatore e motivo; il titolare riceve il PDF firmato (rifirmaAttestatoEvalisById).
// Senza --esegui mostra soltanto l'attestato e cosa farebbe (non scrive niente).
// Uso: npx tsx scripts/produzione/_rifirma-attestato.ts [--prod] <numero-attestato>
//        --operatore <email-staff> --motivo "<testo>" [--esegui]
const args = process.argv.slice(2);
if (args.includes("--prod")) {
  const { config } = await import("dotenv");
  config();
  if (!process.env.PROD_DATABASE_URL) { console.error("PROD_DATABASE_URL non impostata"); process.exit(1); }
  process.env.DATABASE_URL = process.env.PROD_DATABASE_URL; // prima di importare il client
  process.env.VERCEL_ENV = "production";
  process.env.NEXT_PUBLIC_APP_URL = "https://evalisacademy.it"; // QR dell'attestato e link delle mail
  // il .env locale non ha il mittente: senza, Resend consegnerebbe solo al titolare dell'account
  process.env.RESEND_FROM ??= "Evalis Academy <no-reply@evalisacademy.it>";
}
const valore = (nome: string) => { const i = args.indexOf(nome); return i >= 0 ? args[i + 1] : undefined; };
const operatore = valore("--operatore");
const motivo = valore("--motivo");
const esegui = args.includes("--esegui");
const [numero] = args.filter((a, i) => !a.startsWith("--") && !["--operatore", "--motivo"].includes(args[i - 1]));
if (!numero || !operatore || !motivo) {
  console.error("Uso: _rifirma-attestato.ts [--prod] <numero-attestato> --operatore <email> --motivo \"...\" [--esegui]");
  process.exit(2);
}

await import("dotenv/config");
const { eq } = await import("drizzle-orm");
const { db } = await import("@/lib/db");
const { certificate, enrollment, course, user } = await import("@/lib/db/schema");
const { rifirmaAttestatoEvalisById } = await import("@/features/certificates/lifecycle");

const [c] = await db
  .select({
    id: certificate.id, status: certificate.status, issuedAt: certificate.issuedAt, pdfPath: certificate.pdfPath,
    titolo: course.title, soloEvalis: course.attestatoSoloEvalis, email: user.email,
  })
  .from(certificate)
  .innerJoin(enrollment, eq(enrollment.id, certificate.enrollmentId))
  .innerJoin(course, eq(course.id, enrollment.courseId))
  .innerJoin(user, eq(user.id, enrollment.userId))
  .where(eq(certificate.number, numero.toUpperCase()))
  .limit(1);
if (!c) { console.error(`attestato ${numero} non trovato`); process.exit(1); }

console.log(`${numero} · ${c.titolo} · ${c.email} · stato ${c.status} · emesso il ${c.issuedAt?.toISOString()} · file ${c.pdfPath}`);
console.log(`${args.includes("--prod") ? "PRODUZIONE" : "sviluppo"} · operatore ${operatore} · motivo «${motivo}»`);
if (!esegui) {
  console.log("Prova a secco: rilancia con --esegui per rigenerare il PDF firmato, aggiornare il certificato e mandare la mail.");
  process.exit(0);
}
const esito = await rifirmaAttestatoEvalisById(c.id, operatore, motivo);
console.log(`fatto: nuovo file ${esito.file} (il precedente ${esito.precedente} resta nello storage), mail al titolare`);
process.exit(0);

export {};

export {};
// Mail UNA TANTUM a chi ha completato un corso PRIMA che esistesse la richiesta d'opinione
// (29/10/2026): una mail per persona, con i corsi completati senza opinione e il pulsante alla
// pagina Certificati, dove c'è il riquadro «Lascia la tua opinione».
// ⚠️ DA LANCIARE SOLO DOPO IL PARERE DEL CONSULENTE PRIVACY (decisione dell'utente del 29/10):
// per il Garante le mail di soddisfazione del cliente sono vicine al marketing.
// Esclusi: staff di piattaforma, revisori del player, certificati revocati, chi l'opinione l'ha già
// lasciata, chi ha già ricevuto questa mail (registro locale produzione/_log/inviti-recensioni.json).
// Uso: npx tsx scripts/produzione/_invita-recensioni.ts                → stampa solo i destinatari
//      npx tsx scripts/produzione/_invita-recensioni.ts --prova <email> → una mail d'esempio a <email>
//      npx tsx scripts/produzione/_invita-recensioni.ts --invia         → manda a tutti, una sola volta
process.env.NEXT_PUBLIC_APP_URL = "https://evalisacademy.it"; // logo e link della mail: il sito vero
const args = process.argv.slice(2);
const prova = args.includes("--prova") ? args[args.indexOf("--prova") + 1] : null;
const invia = args.includes("--invia");
if (prova !== null && !prova?.includes("@")) {
  console.error("Uso: [--prova <email> | --invia]");
  process.exit(1);
}

const { config } = await import("dotenv");
config();
const { existsSync, readFileSync, writeFileSync, mkdirSync } = await import("node:fs");
const { default: postgres } = await import("postgres");
const { Resend } = await import("resend");
const { renderEmail, esc } = await import("@/lib/email/layout");
const { isPlayerReviewerId, isPlatformStaffEmail } = await import("@/features/auth/guards");

const REGISTRO = "produzione/_log/inviti-recensioni.json";
const giaInvitati = new Set<string>(existsSync(REGISTRO) ? (JSON.parse(readFileSync(REGISTRO, "utf8")) as string[]) : []);

const sql = postgres(process.env.PROD_DATABASE_URL!, { prepare: false, max: 1, connect_timeout: 10 });
const righe = await sql<{ user_id: string; email: string; name: string; platform_role: string | null; titolo: string }[]>`
  select u.id as user_id, u.email, u.name, u.platform_role, co.title as titolo
  from certificate c
  join enrollment e on e.id = c.enrollment_id
  join "user" u on u.id = e.user_id
  join course co on co.id = e.course_id
  left join course_review r on r.enrollment_id = e.id
  where c.status <> 'revoked' and r.id is null
  order by u.email, co.title`;
await sql.end();

const perPersona = new Map<string, { email: string; name: string; corsi: string[] }>();
for (const r of righe) {
  if (r.platform_role === "admin" || isPlatformStaffEmail(r.email) || isPlayerReviewerId(r.user_id) || giaInvitati.has(r.email)) continue;
  const p = perPersona.get(r.email) ?? { email: r.email, name: r.name, corsi: [] };
  p.corsi.push(r.titolo);
  perPersona.set(r.email, p);
}
console.log(`${perPersona.size} persone da invitare (${giaInvitati.size} già invitate in passato)`);
for (const p of perPersona.values()) console.log(`  ${p.email} · ${p.corsi.join(" · ")}`);

const mail = (p: { name: string; corsi: string[] }) => ({
  subject: "Com'è andato il tuo corso? La tua opinione in un minuto",
  html: renderEmail({
    previewText: "Qualche stella e, se vuoi, due righe: ci aiuti a migliorare i corsi.",
    heading: "Com'è andato il tuo corso?",
    body: [
      `Ciao <strong>${esc(p.name)}</strong>,`,
      `hai completato ${p.corsi.length === 1 ? "il corso" : "i corsi"} ${p.corsi.map((c) => `<strong>${esc(c)}</strong>`).join(", ")}. Ci farebbe piacere sapere com'è andata: bastano un minuto e qualche stella, dalla pagina dei tuoi certificati.`,
      "Lasciare un'opinione è facoltativo. Se vuoi, puoi anche acconsentire a pubblicarla sul sito con il nome che preferisci; senza il tuo consenso la legge solo lo staff Evalis.",
    ],
    button: { label: "Lascia la tua opinione", url: "https://evalisacademy.it/certificati" },
    afterButton: ["Ti scriviamo una volta sola: non riceverai altre mail su questo."],
  }),
});

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = "Evalis Academy <no-reply@evalisacademy.it>";
if (prova) {
  const esempio = [...perPersona.values()][0] ?? { name: "Mario Rossi", corsi: ["Corso di esempio"] };
  const { error } = await resend.emails.send({ from: FROM, to: prova, ...mail(esempio) });
  console.log(error ? `KO  ${error.message}` : `OK  esempio inviato a ${prova}`);
} else if (invia) {
  mkdirSync("produzione/_log", { recursive: true });
  for (const p of perPersona.values()) {
    const { error } = await resend.emails.send({ from: FROM, to: p.email, ...mail(p) });
    console.log(error ? `KO  ${p.email}: ${error.message}` : `OK  ${p.email}`);
    if (!error) {
      giaInvitati.add(p.email);
      writeFileSync(REGISTRO, JSON.stringify([...giaInvitati], null, 2)); // salvato a ogni invio: un'interruzione non fa ripartire da capo
    }
    await new Promise((r) => setTimeout(r, 600)); // sotto il limite di Resend (2 al secondo)
  }
} else {
  console.log("Solo prova: nessuna mail inviata (usa --prova <email> o --invia).");
}
process.exit(0);

export {};
// Manda la notifica di vendita (la stessa mail automatica, layout Academy) per acquisti LIVE
// avvenuti PRIMA dell'attivazione, letti dal registro di PRODUZIONE. Uso su richiesta esplicita
// dell'utente, un destinatario alla volta: prima a lui per controllo, poi al committente.
// Uso: npx tsx scripts/produzione/_invia-vendite-passate.ts --a <email> <id-payment-event>...
//      senza --invia stampa solo cosa manderebbe.
process.env.NEXT_PUBLIC_APP_URL = "https://evalisacademy.it"; // logo e link della mail: il sito vero
const args = process.argv.slice(2);
const a = args[args.indexOf("--a") + 1];
const ids = args.filter((x) => /^[0-9a-f-]{36}$/.test(x));
if (!args.includes("--a") || !a?.includes("@") || ids.length === 0) {
  console.error("Uso: --a <email> <id-payment-event>... [--invia]");
  process.exit(1);
}

const { config } = await import("dotenv");
config();
const { default: postgres } = await import("postgres");
const { Resend } = await import("resend");
const { datiVendita, mailVendita } = await import("@/features/billing/notifica-vendita");

const sql = postgres(process.env.PROD_DATABASE_URL!, { prepare: false, max: 1, connect_timeout: 10 });
for (const id of ids) {
  const [r] = await sql`
    select p.payload->'data'->'object' as s, extract(epoch from p.occurred_at)::bigint as created,
           coalesce(c.title, b.title) as titolo
    from payment_event p
    left join course c on c.id::text = p.payload->'data'->'object'->'metadata'->>'courseId'
    left join bundle b on b.id::text = p.payload->'data'->'object'->'metadata'->>'bundleId'
    where p.id = ${id} and p.type = 'checkout.session.completed' and p.livemode`;
  if (!r) { console.log(`KO  ${id}: non è un acquisto live`); continue; }
  const { subject, html } = mailVendita(datiVendita(r.s, Number(r.created)), r.titolo ?? "Corso");
  console.log(`${args.includes("--invia") ? "INVIO" : "PROVA"} a ${a}: ${subject}`);
  if (!args.includes("--invia")) continue;
  const { error } = await new Resend(process.env.RESEND_API_KEY!).emails.send({
    from: "Evalis Academy <no-reply@evalisacademy.it>",
    to: a,
    subject,
    html,
  });
  console.log(error ? `KO  ${error.message}` : "OK  inviata");
}
await sql.end();

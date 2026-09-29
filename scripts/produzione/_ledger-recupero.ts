// RECUPERO DEL REGISTRO FINANZIARIO (payment_event) per gli eventi Stripe che il webhook ha
// ricevuto ma non è riuscito ad annotare (RLS senza policy fino alla migrazione 0029).
//
// L'elenco completo degli eventi ricevuti è stripe_processed_event: il webhook ci "reclama"
// ogni evento PRIMA di scrivere nel registro. Per ciascuno assente dal registro si riprende
// l'evento originale da Stripe e lo si annota con la STESSA funzione del webhook
// (datiPagamentoDaEvento), quindi la riga è identica a quella che sarebbe nata allora. L'unica
// differenza visibile è recorded_at (= ora del recupero), che resta come traccia onesta.
//
// Scrive SOLO nel registro, append-only. Non tocca iscrizioni, corsi, utenti o pagamenti: nessun
// provisioning, nessuna email, nessuna chiamata che modifichi qualcosa su Stripe (solo lettura).
// Stripe conserva gli eventi 30 giorni: quelli più vecchi vengono segnalati come non recuperabili.
//
// Uso: npx tsx scripts/produzione/_ledger-recupero.ts [--prod] [--live-ok] [--prova]
import "dotenv/config";

const args = process.argv.slice(2);
const suProd = args.includes("--prod");
const prova = args.includes("--prova");
if (suProd) {
  const prod = process.env.PROD_DATABASE_URL;
  if (!prod) { console.error("--prod richiesto ma PROD_DATABASE_URL non è impostata."); process.exit(1); }
  process.env.DATABASE_URL = prod; // prima di importare il client db, che lo legge all'import
}

const key = process.env.STRIPE_SECRET_KEY ?? "";
const modo = key.startsWith("sk_live_") ? "LIVE" : key.startsWith("sk_test_") ? "TEST" : "SCONOSCIUTA";
console.log(`Stripe: ${modo} · DB: ${suProd ? "PRODUZIONE" : "sviluppo"}${prova ? " · PROVA (non scrive)" : ""}`);
if (modo === "SCONOSCIUTA") { console.error("STRIPE_SECRET_KEY assente o non riconosciuta."); process.exit(1); }
if (suProd && modo !== "LIVE") {
  console.error("Il database di produzione registra eventi LIVE: serve la chiave live (in .env per il tempo dell'uso).");
  process.exit(1);
}
if (modo === "LIVE" && !prova && !args.includes("--live-ok")) {
  console.error("Chiave LIVE: per scrivere serve --live-ok (guardia anti-errore).");
  process.exit(1);
}

const { notInArray } = await import("drizzle-orm");
const { db } = await import("@/lib/db");
const { stripeProcessedEvent, paymentEvent } = await import("@/lib/db/schema");
const { getStripe } = await import("@/lib/stripe/client");
const { datiPagamentoDaEvento } = await import("@/features/billing/events");

const giaAnnotati = (await db.select({ id: paymentEvent.stripeEventId }).from(paymentEvent)).map((r) => r.id);
const mancanti = await db
  .select({ id: stripeProcessedEvent.eventId, quando: stripeProcessedEvent.processedAt })
  .from(stripeProcessedEvent)
  .where(giaAnnotati.length ? notInArray(stripeProcessedEvent.eventId, giaAnnotati) : undefined)
  .orderBy(stripeProcessedEvent.processedAt);
console.log(`eventi ricevuti dal webhook ma assenti dal registro: ${mancanti.length}`);

const stripe = getStripe();
let annotati = 0, persi = 0;
for (const m of mancanti) {
  let evento;
  try {
    evento = await stripe.events.retrieve(m.id);
  } catch (e) {
    persi++;
    console.log(`  ✗ ${m.id} (${m.quando?.toISOString().slice(0, 16)}): non recuperabile da Stripe — ${(e as Error).message.slice(0, 80)}`);
    continue;
  }
  const d = datiPagamentoDaEvento(evento);
  const importo = d.amountTotal != null ? `${(d.amountTotal / 100).toFixed(2)} ${String(d.currency ?? "").toUpperCase()}` : "—";
  const riga = `${d.occurredAt.toISOString().slice(0, 16)}  ${d.type}  ${importo}  ${d.livemode ? "LIVE" : "test"}  utente:${d.userId ? "sì" : "no"}`;
  if (prova) { console.log(`  · da annotare: ${riga}`); continue; }
  const r = await db.insert(paymentEvent).values({ ...d, payload: evento }).onConflictDoNothing().returning({ id: paymentEvent.id });
  if (r.length) { annotati++; console.log(`  ✓ annotato: ${riga}`); }
  else console.log(`  = già presente: ${riga}`);
}

console.log(prova
  ? `\nPROVA: ${mancanti.length - persi} da annotare, ${persi} non recuperabili. Nulla è stato scritto.`
  : `\nFATTO: ${annotati} annotati, ${persi} non recuperabili.`);
process.exit(0);

// Prova della correzione RLS del registro payment_event, agendo come l'applicazione (app_rls)
// dentro transazioni ANNULLATE: nessuna riga resta scritta. Verifica che app_rls possa inserire
// e leggere, e che modifica e cancellazione restino vietate (registro append-only).
// Uso: npx tsx scripts/produzione/_prova-registro-rls.ts [--prod]
import "dotenv/config";
import postgres from "postgres";
const suProd = process.argv.includes("--prod");
const url = suProd ? process.env.PROD_DATABASE_URL : process.env.DATABASE_URL;
const sql = postgres(url!, { prepare: false, max: 1, connect_timeout: 10 });
console.log(`DB: ${suProd ? "PRODUZIONE" : "sviluppo"} — ogni prova è in una transazione annullata`);
const id = `evt_prova_rls_${Date.now()}`;
const ANNULLA = new Error("annulla");

async function prova(nome: string, corpo: (tx: postgres.TransactionSql) => Promise<unknown>, attesoOk: boolean) {
  try {
    await sql.begin(async (tx) => {
      await tx.unsafe("SET LOCAL ROLE app_rls");
      await corpo(tx);
      throw ANNULLA; // sempre: niente deve restare scritto
    });
  } catch (e) {
    const ok = e === ANNULLA;
    const esito = ok === attesoOk ? "OK " : "KO ";
    if (esito === "KO ") process.exitCode = 1;
    console.log(`${esito} ${nome}: ${ok ? "riuscito" : `rifiutato (${String((e as Error).message).slice(0, 70)})`}${attesoOk ? "" : " — atteso rifiuto"}`);
  }
}

const riga = (tx: postgres.TransactionSql) => tx`
  insert into payment_event (stripe_event_id, type, livemode, occurred_at, payload)
  values (${id}, 'prova.rls', false, now(), ${tx.json({ prova: true })})`;

await prova("inserire una riga", (tx) => riga(tx), true);
await prova("inserire e rileggerla", async (tx) => {
  await riga(tx);
  const r = await tx`select count(*)::int as n from payment_event where stripe_event_id = ${id}`;
  if (r[0].n !== 1) throw new Error(`riletta ${r[0].n} volte`);
}, true);
await prova("modificare una riga", async (tx) => {
  await riga(tx);
  await tx`update payment_event set amount_total = 1 where stripe_event_id = ${id}`;
}, false);
await prova("cancellare una riga", async (tx) => {
  await riga(tx);
  await tx`delete from payment_event where stripe_event_id = ${id}`;
}, false);

const [dopo] = await sql`select count(*)::int as n from payment_event where stripe_event_id = ${id}`;
console.log(dopo.n === 0 ? "OK  nessuna riga di prova rimasta" : `KO  rimaste ${dopo.n} righe di prova`);
await sql.end();
process.exit(process.exitCode ?? 0);

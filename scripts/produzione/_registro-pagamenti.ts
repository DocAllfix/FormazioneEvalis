// Registro finanziario payment_event in PRODUZIONE (sola lettura): quante righe, di che tipo,
// e cosa è stato registrato attorno a una data. Serve a capire se il webhook alimenta il registro.
// Uso: npx tsx scripts/produzione/_registro-pagamenti.ts [AAAA-MM-GG]
import "dotenv/config";
import postgres from "postgres";
const giorno = process.argv[2] ?? "2026-09-24";
const sql = postgres(process.env.PROD_DATABASE_URL!, { prepare: false, max: 1, connect_timeout: 10 });
const [tot] = await sql`select count(*)::int as n, min(recorded_at) as primo, max(recorded_at) as ultimo from payment_event`;
console.log(`payment_event: ${tot.n} righe · prima ${tot.primo ?? "—"} · ultima ${tot.ultimo ?? "—"}`);
const tipi = await sql`select type, livemode, count(*)::int as n from payment_event group by type, livemode order by n desc`;
for (const t of tipi) console.log(`  ${t.type} · ${t.livemode ? "LIVE" : "test"} · ${t.n}`);
const vicino = await sql`
  select type, amount_total, currency, user_id is not null as ha_utente, organization_id is not null as ha_org, occurred_at
  from payment_event where occurred_at::date between ${giorno}::date - 1 and ${giorno}::date + 1 order by occurred_at`;
console.log(`\nattorno al ${giorno}: ${vicino.length} righe`);
for (const v of vicino) console.log(`  ${v.occurred_at} ${v.type} ${v.amount_total ?? ""} ${v.currency ?? ""} utente:${v.ha_utente} org:${v.ha_org}`);
const [proc] = await sql`select count(*)::int as n, max(processed_at) as ultimo from stripe_processed_event`.catch(() => [{ n: "?", ultimo: "?" }]);
console.log(`\nstripe_processed_event (idempotenza webhook): ${proc.n} · ultimo ${proc.ultimo}`);
const acq = await sql`select count(*)::int as n, max(created_at) as ultimo from enrollment where source = 'b2c_purchase'`;
console.log(`iscrizioni da acquisto: ${acq[0].n} · ultima ${acq[0].ultimo}`);
await sql.end();
process.exit(0);

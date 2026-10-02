// Dati per la fattura negli acquisti LIVE in PRODUZIONE (sola lettura): per ogni pagamento
// completato dice quali dati di fatturazione Stripe ha raccolto al checkout, senza stamparli.
// Uso: npx tsx scripts/produzione/_dati-fattura.ts
import "dotenv/config";
import postgres from "postgres";
const sql = postgres(process.env.PROD_DATABASE_URL!, { prepare: false, max: 1, connect_timeout: 10 });
const righe = await sql`
  select occurred_at, amount_total, payload->'data'->'object' as s
  from payment_event where type = 'checkout.session.completed' and livemode order by occurred_at`;
console.log(`acquisti live: ${righe.length}\n`);
const si = (v: unknown) => (v ? "sì" : "NO");
for (const { occurred_at, amount_total, s } of righe) {
  const cd = s?.customer_details ?? {};
  const a = cd.address ?? {};
  const tax = (cd.tax_ids ?? []) as { type: string }[];
  console.log(
    `${new Date(occurred_at).toISOString().slice(0, 10)} ${(amount_total / 100).toFixed(2)}€ · ` +
    `nome:${si(cd.name)} email:${si(cd.email)} indirizzo:${si(a.line1)} cap:${si(a.postal_code)} ` +
    `città:${si(a.city)} paese:${a.country ?? "NO"} partitaIVA:${tax.length ? tax.map((t) => t.type).join(",") : "NO"} ` +
    `campiExtra:${(s?.custom_fields ?? []).length} chiavi:${Object.keys(cd).join("|") || "payload ridotto"}`,
  );
}
await sql.end();
process.exit(0);

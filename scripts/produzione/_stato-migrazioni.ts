// Ultima migrazione applicata e stato RLS/policy di payment_event, su sviluppo e produzione
// (sola lettura). Serve a verificare l'allineamento prima e dopo una migrazione.
import "dotenv/config";
import postgres from "postgres";
for (const [nome, url] of [["SVILUPPO", process.env.DIRECT_URL ?? process.env.DATABASE_URL], ["PRODUZIONE", process.env.PROD_DIRECT_URL ?? process.env.PROD_DATABASE_URL]] as const) {
  const sql = postgres(url!, { prepare: false, max: 1, connect_timeout: 10 });
  const [m] = await sql`select count(*)::int as n, max(created_at) as ultima from drizzle.__drizzle_migrations`;
  const [r] = await sql`select relrowsecurity as rls from pg_class where relname = 'payment_event'`;
  const pol = await sql`select policyname, cmd from pg_policies where tablename = 'payment_event' order by policyname`;
  const [righe] = await sql`select count(*)::int as n from payment_event`;
  console.log(`${nome}: migrazioni applicate ${m.n} (ultima when=${m.ultima}) · payment_event RLS ${r?.rls ? "attiva" : "no"} · policy: ${pol.map((p) => `${p.policyname}/${p.cmd}`).join(", ") || "nessuna"} · righe ${righe.n}`);
  await sql.end();
}
process.exit(0);

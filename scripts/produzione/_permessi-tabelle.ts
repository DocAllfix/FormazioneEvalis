// Permessi e protezioni di alcune tabelle in PRODUZIONE (sola lettura): chi può scrivere,
// se c'è RLS, e quali trigger ci sono. Per capire perché una scrittura fallisce in silenzio.
// Uso: npx tsx scripts/produzione/_permessi-tabelle.ts tabella [tabella …]
import "dotenv/config";
import postgres from "postgres";
const tabelle = process.argv.slice(2);
const sql = postgres(process.env.PROD_DATABASE_URL!, { prepare: false, max: 1, connect_timeout: 10 });
const [chi] = await sql`select current_user as io`;
console.log(`(connesso come: ${chi.io})`);
for (const t of tabelle) {
  const g = await sql`
    select grantee, string_agg(privilege_type, ',' order by privilege_type) as permessi
    from information_schema.role_table_grants
    where table_schema = 'public' and table_name = ${t}
      and grantee not in ('postgres','supabase_admin','PUBLIC')
    group by grantee order by grantee`;
  const [rls] = await sql`select relrowsecurity as rls, relforcerowsecurity as forzata from pg_class where relname = ${t}`;
  const pol = await sql`select policyname, cmd, roles::text as ruoli from pg_policies where tablename = ${t}`;
  const trg = await sql`
    select tgname from pg_trigger where tgrelid = ${t}::regclass and not tgisinternal`;
  console.log(`\n== ${t}  RLS: ${rls?.rls ? "attiva" : "no"}${rls?.forzata ? " (forzata)" : ""}`);
  for (const r of g) console.log(`  ${String(r.grantee).padEnd(22)} ${r.permessi}`);
  for (const p of pol) console.log(`  policy ${p.policyname}: ${p.cmd} per ${p.ruoli}`);
  for (const x of trg) console.log(`  trigger ${x.tgname}`);
}
await sql.end();
process.exit(0);

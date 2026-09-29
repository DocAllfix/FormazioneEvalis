// Tabelle con RLS attiva ma NESSUNA policy che valga per app_rls (sola lettura, PRODUZIONE).
// Con RLS attiva e nessuna policy, Postgres rifiuta ogni riga: per l'app che gira come app_rls
// quelle tabelle sono illeggibili e non scrivibili, senza errori visibili se il codice li ingoia.
import "dotenv/config";
import postgres from "postgres";
const sql = postgres(process.env.PROD_DATABASE_URL!, { prepare: false, max: 1, connect_timeout: 10 });
const r = await sql`
  select c.relname as tabella,
    (select string_agg(privilege_type, ',' order by privilege_type) from information_schema.role_table_grants g
      where g.table_schema = 'public' and g.table_name = c.relname and g.grantee = 'app_rls') as permessi_app,
    (select count(*)::int from pg_policies p where p.tablename = c.relname
      and ('app_rls' = any(p.roles) or 'public' = any(p.roles))) as regole_per_app
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  order by 3, 1`;
console.log("tabelle con RLS attiva:", r.length);
for (const x of r) console.log(`  ${x.regole_per_app === 0 ? "✗ NESSUNA REGOLA" : "  ok          "}  ${String(x.tabella).padEnd(26)} permessi app_rls: ${x.permessi_app ?? "nessuno"}`);
await sql.end();
process.exit(0);

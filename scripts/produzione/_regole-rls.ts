// Testo delle policy RLS di alcune tabelle in PRODUZIONE (sola lettura).
// Uso: npx tsx scripts/produzione/_regole-rls.ts tabella [tabella …]
import "dotenv/config";
import postgres from "postgres";
const sql = postgres(process.env.PROD_DATABASE_URL!, { prepare: false, max: 1, connect_timeout: 10 });
for (const t of process.argv.slice(2)) {
  const p = await sql`select policyname, cmd, roles::text as ruoli, qual, with_check from pg_policies where tablename = ${t}`;
  console.log(`== ${t}`);
  for (const x of p) console.log(`  ${x.policyname} [${x.cmd} per ${x.ruoli}]\n    USING: ${x.qual}\n    CHECK: ${x.with_check}`);
}
await sql.end();
process.exit(0);

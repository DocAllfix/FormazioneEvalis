// Cambia lo stato di pubblicazione di un corso (published|draft) sul database indicato da
// DATABASE_URL. Serve dopo l'ingest: ingestCourse crea SEMPRE published, ma un corso nuovo
// non deve comparire in catalogo finché prezzi e pacchetti non sono decisi.
// Uso: DATABASE_URL=… npx tsx scripts/produzione/_stato-corso.ts <slug> <published|draft>
import "dotenv/config";
import postgres from "postgres";

const [slug, stato] = process.argv.slice(2);
if (!slug || (stato !== "published" && stato !== "draft")) {
  console.error("Uso: _stato-corso.ts <slug> <published|draft>");
  process.exit(2);
}
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1, connect_timeout: 10 });
const r = await sql`update course set status = ${stato}, updated_at = now() where slug = ${slug} returning id, title, status`;
if (!r.length) console.error(`nessun corso con slug ${slug}`);
else console.log(`${r[0].title} -> status=${r[0].status} (${r[0].id})`);
await sql.end();
process.exit(r.length ? 0 : 1);

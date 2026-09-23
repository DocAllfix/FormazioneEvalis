// Cambia lo stato di pubblicazione di uno o più corsi (published|draft). Serve dopo l'ingest:
// ingestCourse crea SEMPRE published, ma un corso nuovo non deve comparire in catalogo finché
// prezzi e pacchetti non sono decisi.
//
// Uso: npx tsx scripts/produzione/_stato-corso.ts [--prod] <published|draft> <slug> [<slug> …]
//   --prod  agisce sul database di PRODUZIONE (PROD_DATABASE_URL) invece che su quello di sviluppo
import "dotenv/config";
import postgres from "postgres";

const args = process.argv.slice(2);
const liberi = args.filter((a) => !a.startsWith("--"));
const [stato, ...slugs] = liberi;
if ((stato !== "published" && stato !== "draft") || !slugs.length) {
  console.error("Uso: _stato-corso.ts [--prod] <published|draft> <slug> [<slug> …]");
  process.exit(2);
}
const url = args.includes("--prod") ? process.env.PROD_DATABASE_URL : process.env.DATABASE_URL;
if (!url) { console.error("database non configurato (PROD_DATABASE_URL o DATABASE_URL)"); process.exit(1); }

const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 10 });
console.log(`DB: ${args.includes("--prod") ? "PRODUZIONE" : "sviluppo"} · nuovo stato: ${stato}`);
let mancanti = 0;
for (const slug of slugs) {
  const r = await sql`update course set status = ${stato}, updated_at = now() where slug = ${slug} returning title, status`;
  if (!r.length) { console.error(`  nessun corso con slug ${slug}`); mancanti++; }
  else console.log(`  ${r[0].title} -> status=${r[0].status}`);
}
await sql.end();
process.exit(mancanti ? 1 : 0);

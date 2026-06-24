// Applica la RLS (scripts/rls/apply-rls.sql) come ruolo privilegiato.
// Uso: node --env-file=.env scripts/rls/apply-rls.mjs
// Usa DIRECT_URL se presente (connessione diretta, ideale per la DDL), altrimenti DATABASE_URL.
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const ddl = readFileSync(join(here, "apply-rls.sql"), "utf8");
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) throw new Error("DIRECT_URL/DATABASE_URL mancante");

const sql = postgres(url, { prepare: false, max: 1 });
try {
  await sql.unsafe(ddl);
  console.log("RLS applicata: ruolo app_rls + policy su enrollment/certificate/slide_progress/quiz_attempt.");
} finally {
  await sql.end();
}

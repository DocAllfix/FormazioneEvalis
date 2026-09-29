// Che cosa vede un utente in "I miei acquisti" (sola lettura, PRODUZIONE): usa la STESSA funzione
// della pagina Profilo, senza accedere col suo account. Uso: npx tsx … _acquisti-di.ts <email>
import "dotenv/config";
process.env.DATABASE_URL = process.env.PROD_DATABASE_URL; // prima di importare il client db
const email = process.argv[2];
const { default: postgres } = await import("postgres");
const sql = postgres(process.env.PROD_DATABASE_URL!, { prepare: false, max: 1 });
const [u] = await sql`select id from "user" where email = ${email}`;
await sql.end();
if (!u) { console.log("utente non trovato"); process.exit(0); }
const { listMyPurchases } = await import("@/features/billing/acquisti");
const lista = await listMyPurchases(u.id);
console.log(`${email}: ${lista.length} acquisti in elenco`);
for (const a of lista) console.log(`  ${a.quando.toISOString().slice(0, 10)}  ${a.cosa}  ${((a.importoCents ?? 0) / 100).toFixed(2)} ${a.valuta}  ${a.tipo}${a.rimborsato ? " · rimborsato" : ""}`);
process.exit(0);

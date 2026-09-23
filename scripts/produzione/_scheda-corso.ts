// Stampa la scheda catalogo completa di un corso (sola lettura), per replicarla su un corso nuovo.
// Uso: DATABASE_URL=… npx tsx scripts/produzione/_scheda-corso.ts <slug>
import "dotenv/config";
import postgres from "postgres";
const slug = process.argv[2];
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1, connect_timeout: 10 });
const [c] = await sql`select title, slug, description, duration_hours, required_minutes, category,
  image_url, price_cents, list_price_cents, stripe_price_id, stripe_product_id, prerequisite_course_id,
  status, details from course where slug = ${slug}`;
console.log(JSON.stringify(c, null, 1));
await sql.end();
process.exit(0);

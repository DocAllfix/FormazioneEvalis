// Client Drizzle su Postgres (Supabase EU).
// Usa il Transaction pooler (DATABASE_URL, porta 6543): prepare:false è richiesto
// con pgbouncer in transaction mode. Le migrazioni usano DIRECT_URL (drizzle.config.ts).

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL non impostata (vedi .env.example)");
}

const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
export { schema };

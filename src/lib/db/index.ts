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

// M-7 (audit go-live): pool tunato per il serverless. Su Vercel ogni lambda apre il proprio
// pool: col default (max=10) bastano poche lambda concorrenti per saturare il pooler Supabase.
// Teniamo `max` basso (il pooling vero lo fa pgbouncer) e chiudiamo presto le connessioni inattive.
// Non 1: un valore minimo lascia margine se una query parte fuori da una transazione in corso.
const client = postgres(connectionString, {
  prepare: false,
  max: 3,
  idle_timeout: 20, // secondi: rilascia le connessioni ferme invece di tenerle occupate
  connect_timeout: 10, // secondi: fallisci in fretta invece di appendere la richiesta
});

export const db = drizzle(client, { schema });
export { schema };

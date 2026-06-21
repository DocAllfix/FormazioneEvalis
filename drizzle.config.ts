import "dotenv/config";
import type { Config } from "drizzle-kit";

// Schema diviso per cluster (vedi ARCHITETTURA.md §3):
// auth (better-auth) / catalog (dominio) / compliance (append-only).
// Le migrazioni usano DIRECT_URL (session pooler / connessione diretta).
export default {
  schema: "./src/lib/db/schema/index.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
} satisfies Config;

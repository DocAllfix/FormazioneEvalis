import type { Config } from "drizzle-kit";

// Schema diviso per cluster (vedi ARCHITETTURA.md §3):
// auth (better-auth) / catalog (dominio) / compliance (append-only).
export default {
  schema: "./src/lib/db/schema/index.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
} satisfies Config;

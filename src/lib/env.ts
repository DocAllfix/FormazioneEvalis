// Validazione delle variabili d'ambiente (zod) — vedi .env.example.
//
// SERVER-ONLY: questo file legge segreti (DB, auth, Stripe, ...) e NON deve finire
// in un bundle client. I valori pubblici (NEXT_PUBLIC_*) si leggono direttamente
// da `process.env.NEXT_PUBLIC_*` nel codice client (Next.js li inlinea).
//
// La validazione gira all'avvio: se manca/è errata una variabile required,
// il processo fallisce con un messaggio chiaro (criterio Fase 2.0).

import { z } from "zod";

if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/env.ts è server-only: non importarlo da codice client. " +
      "Per i valori pubblici usa process.env.NEXT_PUBLIC_*.",
  );
}

const schema = z.object({
  // --- Database (Supabase EU) ---
  DATABASE_URL: z.string().min(1, "DATABASE_URL mancante"),
  DIRECT_URL: z.string().min(1).optional(),
  AUDIT_DB_ROLE: z.string().min(1).optional(),

  // --- Auth (better-auth) ---
  BETTER_AUTH_SECRET: z.string().min(16, "BETTER_AUTH_SECRET deve essere ≥ 16 caratteri"),
  BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL deve essere un URL valido"),

  // --- Pubbliche (anche client, ma le validiamo qui per l'avvio server) ---
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL deve essere un URL valido"),
  NEXT_PUBLIC_ROOT_DOMAIN: z
    .string()
    .min(1, "NEXT_PUBLIC_ROOT_DOMAIN mancante (es. localhost:3000 in dev)"),

  // --- Opzionali: cablati nelle rispettive fasi (billing, storage, email, ...) ---
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_SEAT_PRICE_ID: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_STREAM_API_TOKEN: z.string().optional(),
  CLOUDFLARE_STREAM_SIGNING_KEY: z.string().optional(), // PEM privata (base64)
  CLOUDFLARE_STREAM_SIGNING_KEY_ID: z.string().optional(), // kid della signing key
  CLOUDFLARE_STREAM_CUSTOMER_CODE: z.string().optional(), // customer-<code>.cloudflarestream.com
  BREVO_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  // staff piattaforma autorizzato ad approvare/revocare certificati (CSV di email)
  PLATFORM_STAFF_EMAILS: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Variabili d'ambiente non valide o mancanti:\n${issues}`);
}

export const env = parsed.data;
export type Env = typeof env;

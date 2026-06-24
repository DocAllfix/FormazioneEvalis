import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Configurazione minima. Le opzioni (immagini Cloudflare, headers CSP)
  // vengono aggiunte nei rispettivi step di implementazione (vedi ARCHITETTURA.md).
  reactStrictMode: true,
};

// Sentry: wrap additivo. Senza DSN/authToken si comporta da no-op (build identica);
// l'upload delle source map avviene solo se SENTRY_AUTH_TOKEN/ORG/PROJECT sono presenti.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  disableLogger: true,
});

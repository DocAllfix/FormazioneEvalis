import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import bundleAnalyzer from "@next/bundle-analyzer";

const nextConfig: NextConfig = {
  // Configurazione minima. Le opzioni (immagini Cloudflare, headers CSP)
  // vengono aggiunte nei rispettivi step di implementazione (vedi ARCHITETTURA.md).
  reactStrictMode: true,
  // Router cache client: tiene le sezioni già visitate per 30s → rivisitare una sezione
  // (back/forward, click rapido) è ISTANTANEO dalla cache, niente skeleton, niente hit
  // server. Lo skeleton resta solo per la PRIMA visita. Valore conservativo (30s) per la
  // freschezza di progressi/iscrizioni; le mutazioni chiamano già router.refresh() per
  // invalidare subito (logout incluso). Tecnica presa da NEXUS-SEO (che usa 120s su Next 16).
  experimental: {
    staleTimes: { dynamic: 30, static: 180 },
  },
  // Header di sicurezza (sicuri, no-CSP: la CSP richiede uno step dedicato per non rompere
  // script inline Next / Cloudflare Stream / Sentry). Coprono clickjacking, MIME-sniffing,
  // leak del referrer e API del browser non usate.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

// Bundle analyzer: attivo solo con ANALYZE=true (no-op nelle build normali).
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

// Sentry: wrap additivo. Senza DSN/authToken si comporta da no-op (build identica);
// l'upload delle source map avviene solo se SENTRY_AUTH_TOKEN/ORG/PROJECT sono presenti.
export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // `disableLogger` rimosso: deprecato in Sentry 10 e non supportato da Turbopack (no-op).
});

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
  // Le immagini degli articoli stanno sul CMS, ma il visitatore NON deve mai chiederle a lui.
  //
  // `seo.ts` riscrive ogni URL del CMS sul dominio pubblico, immagini comprese: senza questa
  // regola quegli indirizzi non esisterebbero e le foto degli articoli sarebbero riquadri
  // vuoti. Con la regola, /wp-content/uploads/… e' un indirizzo VERO del nostro dominio, che
  // Vercel serve prendendo il file dal CMS e mettendolo in cache sulla sua rete.
  //
  // Due conseguenze, entrambe volute: il nome del CMS non compare da nessuna parte nel codice
  // sorgente della pagina, e un CMS spento per qualche minuto non rompe le immagini agli
  // utenti, perche' la copia in cache resta.
  async rewrites() {
    const cms = process.env.BLOG_CMS_URL?.replace(/\/+$/, "");
    if (!cms) return [];
    return [{ source: "/wp-content/uploads/:percorso*", destination: `${cms}/wp-content/uploads/:percorso*` }];
  },
  // Serve comunque a next/image, se un giorno le immagini passeranno dall'ottimizzatore.
  // L'host arriva da BLOG_CMS_URL: nessun dominio scritto qui dentro, cosi' un secondo sito
  // con un altro CMS non richiede di toccare questo file.
  images: {
    remotePatterns: (() => {
      const cms = process.env.BLOG_CMS_URL;
      if (!cms) return [];
      try {
        const u = new URL(cms);
        const protocollo = u.protocol === "http:" ? ("http" as const) : ("https" as const);
        return [{ protocol: protocollo, hostname: u.hostname }];
      } catch {
        return [];
      }
    })(),
  },
  // Header di sicurezza. Coprono clickjacking, MIME-sniffing, leak del referrer e API del
  // browser non usate.
  async headers() {
    // Content-Security-Policy — in SOLA SEGNALAZIONE per ora.
    //
    // Perche' non subito bloccante: una CSP scritta a occhio rompe cose che si scoprono in
    // produzione, e la prima a saltare sarebbe il player video — cioe' il prodotto. In
    // report-only il browser SEGNALA le violazioni senza bloccarle: si guardano quelle vere,
    // si stringe la direttiva sui dati, e solo dopo si passa a bloccante.
    //
    // `unsafe-inline` sugli script e' la ragione per cui non e' ancora bloccante: Next inietta
    // script inline per l'idratazione, e toglierli richiede i nonce su tutta l'applicazione.
    // Dichiararlo qui e' piu' onesto che far finta che la CSP sia gia' completa.
    const csp = [
      "default-src 'self'",
      // googletagmanager: GA4, caricato SOLO dopo il consenso (vedi src/features/consenso)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      // le immagini degli articoli passano dal nostro dominio (riscrittura in questo file)
      "img-src 'self' data: blob: https:",
      // videodelivery/cloudflarestream: le clip firmate del player
      "media-src 'self' blob: https://*.cloudflarestream.com https://videodelivery.net",
      "frame-src 'self' https://*.cloudflarestream.com https://checkout.stripe.com",
      [
        "connect-src 'self'",
        "https://*.cloudflarestream.com https://videodelivery.net",
        "https://*.supabase.co",
        "https://*.ingest.sentry.io https://*.ingest.de.sentry.io",
        "https://www.googletagmanager.com https://*.google-analytics.com",
      ].join(" "),
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://checkout.stripe.com",
      // nessuno deve poterci incorniciare: e' il clickjacking, con la direttiva moderna
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Content-Security-Policy-Report-Only", value: csp },
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

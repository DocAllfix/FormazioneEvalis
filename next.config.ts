import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configurazione minima. Le opzioni (immagini Cloudflare, headers CSP, Sentry)
  // vengono aggiunte nei rispettivi step di implementazione (vedi ARCHITETTURA.md).
  reactStrictMode: true,
};

export default nextConfig;

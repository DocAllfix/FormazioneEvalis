import type { MetadataRoute } from "next";

const APP = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

// Aree private (gated) escluse dai crawler. Le pagine pubbliche teaser /corso/[slug] e il
// marketing restano indicizzabili. AI-crawler esplicitamente ammessi (GEO).
const PRIVATE = ["/dashboard", "/certificati", "/profilo", "/corsi", "/corso", "/admin", "/staff", "/api", "/recupera-password", "/reimposta-password"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "OAI-SearchBot"], allow: "/", disallow: PRIVATE },
    ],
    // niente direttiva `host`: è un residuo storico (Yandex), ignorata da Google e dagli
    // AI-crawler; il dominio canonico è già dichiarato dai canonical delle pagine.
    sitemap: `${APP}/sitemap.xml`,
  };
}

// Hook di strumentazione Next.js: carica la config Sentry giusta per runtime.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Cattura gli errori delle richieste (RSC, route handler) — no-op senza DSN.
export const onRequestError = Sentry.captureRequestError;

"use client";

// Handler globale degli errori di rendering React (App Router): li riporta a Sentry
// (no-op senza DSN) e mostra un fallback minimale. Vedi Sentry Next.js manual-setup.
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="it">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
        <h1>Si è verificato un errore imprevisto</h1>
        <p>Ricarica la pagina o riprova tra poco. Se il problema persiste, contattaci.</p>
      </body>
    </html>
  );
}

// Endpoint USA-E-GETTA per verificare che Sentry riceva gli errori. RIMUOVERE dopo il test.
// Apri /api/sentry-test una volta, poi controlla Sentry → Issues.
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const err = new Error("Sentry test error — verifica integrazione Evalis Academy (endpoint temporaneo)");
  Sentry.captureException(err);
  await Sentry.flush(2000); // in serverless: assicura l'invio prima della risposta
  return NextResponse.json({
    ok: true,
    message: "Errore di test inviato a Sentry. Controlla Sentry → Issues (arriva in pochi secondi).",
  });
}

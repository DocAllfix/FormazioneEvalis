// Sentry lato server (Node runtime). No-op se SENTRY_DSN non è impostata:
// così build e dev funzionano identici finché non si provisiona il DSN reale.
import * as Sentry from "@sentry/nextjs";
import { ripulisciPerSentry } from "@/lib/sentry-ripulisci";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  tracesSampleRate: 0.1,
  // I dati di compliance/PII non vanno mandati a terzi: niente body/headers di default.
  sendDefaultPii: false,
  // Niente credenziali negli indirizzi (token di reset/verifica, id invito) verso Sentry.
  beforeSend: (event) => ripulisciPerSentry(event),
  beforeSendTransaction: (event) => ripulisciPerSentry(event),
  beforeBreadcrumb: (breadcrumb) => ripulisciPerSentry(breadcrumb),
});

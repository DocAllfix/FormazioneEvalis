// Sentry lato edge (middleware / edge runtime). No-op senza SENTRY_DSN.
import * as Sentry from "@sentry/nextjs";
import { ripulisciPerSentry } from "@/lib/sentry-ripulisci";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  // Niente credenziali negli indirizzi (token di reset/verifica, id invito) verso Sentry.
  beforeSend: (event) => ripulisciPerSentry(event),
  beforeSendTransaction: (event) => ripulisciPerSentry(event),
  beforeBreadcrumb: (breadcrumb) => ripulisciPerSentry(breadcrumb),
});

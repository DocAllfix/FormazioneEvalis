// Sentry lato server (Node runtime). No-op se SENTRY_DSN non è impostata:
// così build e dev funzionano identici finché non si provisiona il DSN reale.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  tracesSampleRate: 0.1,
  // I dati di compliance/PII non vanno mandati a terzi: niente body/headers di default.
  sendDefaultPii: false,
});

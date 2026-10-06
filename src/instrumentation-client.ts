// Sentry lato client. Usa NEXT_PUBLIC_SENTRY_DSN (il DSN client è pensato per essere
// pubblico). No-op finché non è impostato → nessun impatto sul bundle/comportamento.
import * as Sentry from "@sentry/nextjs";
import { ripulisciPerSentry } from "@/lib/sentry-ripulisci";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  // Niente credenziali negli indirizzi (token di reset/verifica, id invito) verso Sentry.
  beforeSend: (event) => ripulisciPerSentry(event),
  beforeSendTransaction: (event) => ripulisciPerSentry(event),
  beforeBreadcrumb: (breadcrumb) => ripulisciPerSentry(breadcrumb),
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

// Sentry lato client. Usa NEXT_PUBLIC_SENTRY_DSN (il DSN client è pensato per essere
// pubblico). No-op finché non è impostato → nessun impatto sul bundle/comportamento.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

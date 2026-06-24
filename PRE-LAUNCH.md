# PRE-LAUNCH — checklist ops & sicurezza

Azioni da eseguire al lancio (alcune sono operazioni manuali su Stripe/Supabase/Cloudflare,
non automatizzabili dal codice). Spuntare prima di aprire al pubblico.

## 1. Variabili d'ambiente (produzione)
Obbligatorie (validate da `src/lib/env.ts` all'avvio):
- `DATABASE_URL` → dopo la Fase RLS punta al ruolo ristretto `app_rls` (vedi §6).
- `DIRECT_URL` → ruolo privilegiato, solo per le migrazioni (`drizzle.config.ts`).
- `BETTER_AUTH_SECRET` (≥16) · `BETTER_AUTH_URL` · `NEXT_PUBLIC_APP_URL` · `NEXT_PUBLIC_ROOT_DOMAIN`.

Servizi:
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (§2), `STRIPE_SEAT_PRICE_ID`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
- Cloudflare Stream: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_STREAM_API_TOKEN`, `CLOUDFLARE_STREAM_SIGNING_KEY` (+`_ID`), `CLOUDFLARE_STREAM_CUSTOMER_CODE`.
- Email: `RESEND_API_KEY`, `RESEND_FROM` (mittente del dominio verificato — §4).
- Staff: `PLATFORM_STAFF_EMAILS` (CSV reale, NON le email di test — §7).
- Sentry: `SENTRY_DSN` (server) + `NEXT_PUBLIC_SENTRY_DSN` (client) + build: `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT` per l'upload delle source map.

## 2. Webhook Stripe
- Dashboard Stripe → Developers → Webhooks → endpoint `https://<dominio>/api/webhooks/stripe`.
- Eventi: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`.
- Copiare il `whsec_...` in `STRIPE_WEBHOOK_SECRET`.
- Verifica locale: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`, poi un acquisto test → l'enrollment/posti devono comparire (handler in `src/app/api/webhooks/stripe/route.ts`, firma verificata).

## 3. Rotazione segreti (i valori usati in dev sono "bruciati")
- Cloudflare Stream: rigenerare signing key + ruotare l'API token; aggiornare le env.
- Resend: rigenerare `RESEND_API_KEY`.
- `BETTER_AUTH_SECRET`: nuovo valore robusto in produzione (≠ dev).

## 4. Email (verifica + reset)
- Verificare il dominio mittente su Resend (DNS SPF/DKIM) e impostare `RESEND_FROM`.
- Solo dopo: portare `requireEmailVerification` a `true` in `src/lib/auth/index.ts`
  (callback già cablate; reset password già attivo).

## 5. Osservabilità
- Impostare i DSN Sentry e forzare un errore di prova → l'evento deve arrivare al progetto Sentry.

## 6. Isolamento dati (RLS)
- Creato il ruolo `app_rls` (NOSUPERUSER/NOBYPASSRLS) + policy sulle 4 tabelle sensibili.
- Far puntare `DATABASE_URL` ad `app_rls`; tenere `DIRECT_URL` sul ruolo privilegiato per le migrazioni.
- Prova: un utente non vede dati di un altro tenant nemmeno forzando gli ID (test DB cross-tenant).

## 7. Data residency & backup
- DB/Storage/Auth in UE: Supabase `aws-1-eu-central-1` ✓, Cloudflare Stream.
- Verificare il piano backup Supabase (frequenza/retention) e una prova di restore.

## 8. Pulizia ambiente di test
- Rimuovere i dati di prova (org/utenti/corsi di test: Acme, mario, demo.cliente, corsi `_`).
- Togliere le email di test da `PLATFORM_STAFF_EMAILS`.
- Gli helper locali `scripts/_*.ts` (untracked) NON vanno in produzione.

## 9. Revisione esterna
- Prima del go-live: revisione indipendente security/stress/scalabilità.
  Consegnare `ARCHITETTURA.md`. Codebase pronta: test verdi, RLS attiva, Sentry on.

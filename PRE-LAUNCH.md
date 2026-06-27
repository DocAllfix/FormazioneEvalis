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

## 6. Isolamento dati (RLS) — cutover
FATTO e VERIFICATO (committato): ruolo `app_rls` (NOBYPASSRLS) + FORCE RLS + policy sulle 4
tabelle sensibili (`0007`), valvole staff/verifica (`0012`), funzione `verify_certificate`
SECURITY DEFINER per la verifica pubblica per-uuid (`0014`, evita la ricorsione tra le policy),
e policy **passthrough scoped a `app_rls`** sulle tabelle non-tenant (`0015`: erano RLS-enabled
senza policy = deny-all → avrebbero rotto l'app come `app_rls`; i ruoli PostgREST restano negati).
Tutte le query alle 4 tabelle sono instradate in `withTenant(ctx, fn)` con il ctx corretto per
ruolo (discente=`userId`, azienda=`orgId`, staff=`platformAdmin`, verifica=`verify_certificate`).

Prove: `rls.db.test.ts` (le policy isolano come `app_rls`) + `rls-routing.db.test.ts`
(le funzioni instradate funzionano e il **cross-tenant è negato** end-to-end come `app_rls`).
Il guardrail si esegue forzando il ruolo: `RLS_FORCE_ROLE=app_rls npx vitest run
src/__tests__/rls-routing.db.test.ts` (col flag, ogni `withTenant` fa `SET LOCAL ROLE app_rls`;
il seeding dei test resta sul ruolo di connessione = bypass). Senza il flag il test è skippato.
**In CI aggiungere questo step** (con `RLS_FORCE_ROLE=app_rls`) per evitare regressioni.

CUTOVER PRODUZIONE — ✅ **FATTO il 2026-06-27** (fail-closed, attivo):
1. ✅ `ALTER ROLE app_rls LOGIN PASSWORD '<segreto>'` eseguito (il segreto è SOLO nelle env
   Vercel/password manager, NON in git).
2. ✅ Vercel **Production** `DATABASE_URL` → `app_rls.<ref>` sul pooler (6543); `DIRECT_URL`
   resta su `postgres` (migrazioni). `RLS_FORCE_ROLE` NON impostato in prod (la connessione È
   `app_rls`, fail-closed). Local dev + test restano su `postgres` (i test di seeding usano il
   bypass; il guardrail app_rls è `RLS_FORCE_ROLE=app_rls npx vitest run rls-routing.db.test`).
3. ✅ Verifica live sotto app_rls: connessione `app_rls` NOBYPASS confermata; tabella tenant
   senza GUC ritorna 0 (RLS filtra); login better-auth + dashboard RLS-scoped verdi in locale e
   in produzione (0 errori). Cross-tenant negato (`rls-routing.db.test` verde sotto app_rls).
4. ROLLBACK (se servisse): su Vercel rimettere `DATABASE_URL` (Production) al valore `postgres`
   (è in `.env` locale) + redeploy. Le policy restano inerti sotto bypass; nessun `DISABLE RLS`.

RESIDUI di hardening (non bloccanti, post-cutover):
- Defense-in-depth: `heartbeat` + `lesson_progress` sono ancora **passthrough** (no GUC) — dare
  loro la policy EXISTS-su-enrollment di `slide_progress` (migration additiva).
- I 4 test "bypass-seeding" (step3/audit/access/certificate) non passano sotto `app_rls` perché
  seedano via funzioni app senza `ctx`; renderli app_rls-aware per un guardrail full-suite verde.
- Env **Preview** Vercel: `DATABASE_URL` ancora su `postgres` (cutover fatto solo su Production).

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

## 10. Innesti già predisposti (authoring → catalogo → Stripe)
L'authoring (admin piattaforma `/staff/corsi`) crea corsi globali pubblicati con le **ore
reali** (`durationHours` da `requiredMinutes`). Due innesti puliti restano da collegare:
- **Catalogo pubblico DB-backed:** la lista `/catalogo` è ancora la pagina marketing statica
  (Base44, 15 card curate). La query `listPublishedCourses` ([catalog/queries.ts](src/features/catalog/queries.ts))
  è già pronta a back-arla con i corsi reali del DB. La scheda `/catalogo/[id]` è già DB-backed.
- **Prezzo Stripe (B2C):** `course.stripePriceId` + `purchasable` + `createCoursePurchaseCheckout`
  esistono. Lo slice = aggiungere all'authoring l'input prezzo → creare uno Stripe Price →
  salvare `stripePriceId`. (Nessun campo nuovo necessario salvo eventuale `priceCents/currency`.)
- I corsi creati sono **già assegnabili dalle aziende** (B2B) senza prezzo.

// Istanza better-auth (auth + multi-tenancy). Modulo 1 di ARCHITETTURA.md.
//
// - emailAndPassword: signup self-service aperto (B2C) + login.
// - organization plugin: org / member / invitation / RBAC / sessione con org attiva.
// - nextCookies: gestione cookie nelle Server Actions Next.js (DEVE essere l'ultimo plugin).
//
// Glue applicativo (org personale B2C, sessione singola) verrà aggiunto via
// `databaseHooks` nelle Fasi 2.2 e 2.5. Le tabelle auth sono in src/lib/db/schema/auth.ts.

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { APIError } from "better-auth/api";
import { isValidSlug } from "@/lib/reserved-subdomains";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { authDatabaseHooks } from "@/features/auth/hooks";
import { sendPasswordResetEmail, sendVerificationEmail, sendOrgInvitationEmail } from "@/lib/email/resend";

// Dominio radice per i sottodomini multi-tenant.
// In dev (`localhost`) NON attiviamo i cookie cross-subdomain: la condivisione del
// cookie su `*.localhost` è inaffidabile tra browser. In produzione li attiviamo sul
// dominio radice (es. `.dominio.com`) per condividere la sessione coi sottodomini.
const rootDomain = env.NEXT_PUBLIC_ROOT_DOMAIN;
const isLocalhost = rootDomain.includes("localhost");
const rootHost = rootDomain.split(":")[0];

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  // In prod fidiamo anche i sottodomini-azienda (multi-tenant wildcard): il login da
  // `azienda.<root>` è un'origine diversa dall'apex e verrebbe altrimenti rifiutato.
  trustedOrigins: isLocalhost
    ? [env.NEXT_PUBLIC_APP_URL]
    : [env.NEXT_PUBLIC_APP_URL, `https://*.${rootHost}`],
  // better-auth ha un rate limiter PROPRIO (oltre al nostro in /api/auth/[...all]), attivo da
  // solo in modalità produzione e piuttosto stretto sulle registrazioni. In CI l'intera suite
  // e2e arriva da un IP unico e lo supera. L'opzione viene passata SOLO se l'env esiste: in
  // produzione non è impostata, quindi valgono i default della libreria e nulla cambia.
  // Le regole di default sono PER PERCORSO (`getDefaultSpecialRules`: /sign-in e /sign-up →
  // max 3 ogni 10s) e hanno la precedenza sul `max` globale: per la CI vanno sovrascritte con
  // `customRules`, altrimenti la suite si blocca alla quarta registrazione.
  ...(process.env.AUTH_RATE_LIMIT_MAX
    ? {
        rateLimit: {
          window: 60,
          max: Number(process.env.AUTH_RATE_LIMIT_MAX),
          customRules: {
            "/sign-up/email": { window: 60, max: Number(process.env.AUTH_RATE_LIMIT_MAX) },
            "/sign-in/email": { window: 60, max: Number(process.env.AUTH_RATE_LIMIT_MAX) },
          },
        },
      }
    : {}),
  user: {
    additionalFields: {
      // Ruolo di piattaforma: leggibile in sessione, NON impostabile dall'utente (sicurezza).
      platformRole: { type: "string", required: false, input: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    // ATTIVA (24/07): dominio Resend verificato → i link di conferma arrivano a indirizzi
    // arbitrari. Chiude il buco della allowlist PLATFORM_STAFF_EMAILS: per usare un'email
    // staff bisogna provarne il possesso. Account pre-esistenti già "grandfathered" verificati.
    requireEmailVerification: true,
    // Dopo un reset della password tutte le sessioni dell'utente vengono chiuse: chi era entrato
    // nell'account (cookie rubato, account condiviso) ne resta fuori.
    revokeSessionsOnPasswordReset: true,
    async sendResetPassword({ user, url }) {
      await sendPasswordResetEmail({ to: user.email, url });
    },
  },
  emailVerification: {
    // Dopo il click sul link di conferma l'utente viene loggato in automatico (niente
    // secondo login) e reindirizzato al callbackURL del signUp (/dashboard → guard → onboarding).
    autoSignInAfterVerification: true,
    async sendVerificationEmail({ user, url }) {
      await sendVerificationEmail({ to: user.email, url });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 giorni
    updateAge: 60 * 60 * 24, // refresh ogni 24h
  },
  advanced: {
    crossSubDomainCookies: isLocalhost
      ? { enabled: false }
      : { enabled: true, domain: `.${rootHost}` },
  },
  databaseHooks: authDatabaseHooks,
  plugins: [
    organization({
      // Lo slug diventa il sottodominio nel link delle mail di invito: le stesse regole del modulo
      // dell'app (isValidSlug) valgono anche per chi crea o rinomina un'azienda chiamando
      // direttamente le API di better-auth. Lo slug si controlla solo quando cambia: gli spazi
      // personali (`u-<id>`, creati dall'app senza passare di qui) restano rinominabili.
      organizationHooks: {
        async beforeCreateOrganization({ organization }) {
          if (typeof organization.slug !== "string" || !isValidSlug(organization.slug)) {
            throw new APIError("BAD_REQUEST", { message: "Slug non valido o riservato." });
          }
        },
        async beforeUpdateOrganization({ organization }) {
          if (typeof organization.slug === "string" && !isValidSlug(organization.slug)) {
            throw new APIError("BAD_REQUEST", { message: "Slug non valido o riservato." });
          }
        },
      },
      // L-2 (audit go-live): invio reale via Resend (in dev senza dominio verificato il link
      // viene comunque loggato dall'helper, così il flusso resta testabile end-to-end).
      async sendInvitationEmail(data) {
        // Il dipendente invitato atterra sul SOTTODOMINIO brandizzato dell'azienda (prod);
        // in dev/localhost resta l'apex (i sottodomini su localhost sono inaffidabili).
        // Seconda barriera: uno slug non valido (es. azienda creata prima del controllo qui sopra)
        // non entra mai nell'indirizzo del link.
        const slug = data.organization.slug;
        const base =
          slug && !isLocalhost && isValidSlug(slug)
            ? `https://${slug}.${rootHost}`
            : env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
        const link = `${base}/accept-invitation/${data.id}`;
        await sendOrgInvitationEmail({ to: data.email, orgName: data.organization.name, url: link });
      },
    }),
    nextCookies(), // sempre per ultimo
  ],
});

export type Auth = typeof auth;

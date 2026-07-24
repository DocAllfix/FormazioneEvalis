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
      // L-2 (audit go-live): invio reale via Resend (in dev senza dominio verificato il link
      // viene comunque loggato dall'helper, così il flusso resta testabile end-to-end).
      async sendInvitationEmail(data) {
        // Il dipendente invitato atterra sul SOTTODOMINIO brandizzato dell'azienda (prod);
        // in dev/localhost resta l'apex (i sottodomini su localhost sono inaffidabili).
        const slug = data.organization.slug;
        const base =
          slug && !isLocalhost
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

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
  trustedOrigins: [env.NEXT_PUBLIC_APP_URL],
  user: {
    additionalFields: {
      // Ruolo di piattaforma: leggibile in sessione, NON impostabile dall'utente (sicurezza).
      platformRole: { type: "string", required: false, input: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    // Verifica email cablata ma NON imposta: si attiverà (true) al lancio, quando
    // ci sarà un dominio Resend verificato per consegnare i link a indirizzi arbitrari.
    requireEmailVerification: false,
    async sendResetPassword({ user, url }) {
      await sendPasswordResetEmail({ to: user.email, url });
    },
  },
  emailVerification: {
    // Callback pronta: usata quando requireEmailVerification passerà a true.
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
        const link = `${env.NEXT_PUBLIC_APP_URL}/accept-invitation/${data.id}`;
        await sendOrgInvitationEmail({ to: data.email, orgName: data.organization.name, url: link });
      },
    }),
    nextCookies(), // sempre per ultimo
  ],
});

export type Auth = typeof auth;

// Istanza better-auth (auth + multi-tenancy). Modulo 1 di ARCHITETTURA.md.
//
// - emailAndPassword: signup self-service aperto (B2C) + login.
// - organization plugin: org / member / invitation / RBAC / sessione con org attiva.
//   L'utente singolo B2C avrà un'organizzazione personale (metadata.type = "personal")
//   creata via hook all'onboarding (TODO: databaseHooks.user.create.after).
//
// Le tabelle auth (user/session/account/organization/member/invitation) vengono
// generate nello schema con `npx @better-auth/cli generate` -> src/lib/db/schema/auth.ts.

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { db } from "@/lib/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    organization(),
    // TODO Modulo 11: enforcement sessione singola attiva (invalida le precedenti al login).
  ],
});

export type Auth = typeof auth;

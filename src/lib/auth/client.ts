// Client better-auth per il frontend (componenti client / Base44).
// baseURL omesso di proposito: usa l'origine corrente, così le chiamate auth
// restano same-origin su ogni sottodominio (azienda.dominio.com).

import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [organizationClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;

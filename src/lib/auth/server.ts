// Helper server-side per leggere la sessione corrente nei Server Components e
// nelle Server Actions. Superficie che consumeranno le pagine (anche il frontend Base44).

import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/** Ritorna { session, user } se autenticato, altrimenti null. */
export async function getCurrentSession() {
  return auth.api.getSession({ headers: await headers() });
}

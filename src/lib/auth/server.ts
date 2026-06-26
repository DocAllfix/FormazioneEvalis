// Helper server-side per leggere la sessione corrente nei Server Components e
// nelle Server Actions. Superficie che consumeranno le pagine (anche il frontend).

import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Ritorna { session, user } se autenticato, altrimenti null.
 * `cache()` (React) de-duplica la lettura nella STESSA richiesta: layout + guardie
 * la chiamano più volte → un solo round-trip DB invece di N. La sessione è costante
 * dentro una richiesta, quindi il memo è corretto (nessun rischio di staleness/leak).
 */
export const getCurrentSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

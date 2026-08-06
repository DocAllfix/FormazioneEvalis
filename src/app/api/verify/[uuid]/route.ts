// Verifica pubblica del certificato (per token). API dati: la pagina /verify/:uuid
// la costruisce il frontend consumando questo endpoint. Nessuna autenticazione.

import { getCertificateByVerifyUuid } from "@/features/certificates/lifecycle";

// Il parametro finiva grezzo nella query: Postgres rifiuta una sintassi UUID non valida e
// l'eccezione usciva come 500. Non era iniezione — le query sono parametrizzate — ma un
// errore non gestito su input sporco e' rumore che dice all'attaccante di aver toccato un
// nervo scoperto. Si valida prima, e si risponde 404 come per un certificato inesistente:
// stessa risposta, nessuna informazione su quale formato ci si aspetti.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, { params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  if (!UUID.test(uuid)) return new Response("not found", { status: 404 });

  const result = await getCertificateByVerifyUuid(uuid);
  if (!result) return new Response("not found", { status: 404 });
  return Response.json(result);
}

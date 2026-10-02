// Verifica pubblica del certificato per CHIAVE: il codice del QR o il numero stampato. Nessuna
// autenticazione. Qualunque input che non corrisponde a un certificato risponde 404, senza dire
// quale formato ci si aspetti; le ricerche per numero hanno un limite per IP (il numero è più
// corto del codice del QR, quindi più facile da tentare).

import { getCertificatoPerChiave } from "@/features/certificates/lifecycle";
import { checkLimit, getClientIp } from "@/lib/security/rate-limit";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request, { params }: { params: Promise<{ uuid: string }> }) {
  const { uuid: chiave } = await params;
  if (!UUID.test(chiave) && !(await checkLimit(`verifica:${getClientIp(req)}`, 30, 60_000))) {
    return new Response("troppe richieste", { status: 429 });
  }
  const result = await getCertificatoPerChiave(chiave);
  if (!result) return new Response("not found", { status: 404 });
  return Response.json(result);
}

// Verifica pubblica del certificato (per token). API dati: la pagina /verify/:uuid
// la costruisce il frontend consumando questo endpoint. Nessuna autenticazione.

import { getCertificateByVerifyUuid } from "@/features/certificates/lifecycle";

export async function GET(_req: Request, { params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  const result = await getCertificateByVerifyUuid(uuid);
  if (!result) return new Response("not found", { status: 404 });
  return Response.json(result);
}

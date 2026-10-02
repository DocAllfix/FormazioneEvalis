// Scarica il certificato: il PROVVISORIO (generato al volo, mai salvato) finché l'accreditato non
// è stato caricato, poi l'ACCREDITATO (link firmato a vita breve). Solo il proprietario o lo staff:
// la regola è in certificatoPerDownload (features/certificates/lifecycle.ts). Certificato
// inesistente, altrui o revocato danno la STESSA risposta (404).

import { getCurrentSession } from "@/lib/auth/server";
import { isPlatformAdmin } from "@/features/auth/guards";
import { certificatoPerDownload } from "@/features/certificates/lifecycle";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCurrentSession();
  if (!ctx) {
    const login = new URL(`/login?next=${encodeURIComponent("/certificati")}`, req.url);
    return new Response(null, { status: 303, headers: { Location: login.toString(), "Cache-Control": "no-store" } });
  }

  const staff = isPlatformAdmin(ctx.user as { email: string; platformRole?: string | null });
  const c = await certificatoPerDownload(id, { userId: ctx.user.id, staff });
  if (!c) return new Response("Certificato non trovato.", { status: 404, headers: { "Cache-Control": "no-store" } });
  if (c.tipo === "accreditato") {
    return new Response(null, { status: 303, headers: { Location: c.url, "Cache-Control": "no-store" } });
  }
  return new Response(Buffer.from(c.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${c.nome}"`,
      "Cache-Control": "no-store",
    },
  });
}

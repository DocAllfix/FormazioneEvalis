// "Scarica ricevuta" (Profilo → I miei acquisti): verifica che il pagamento sia dell'utente e
// lo manda alla ricevuta UFFICIALE di Stripe. La ricevuta non la conserviamo: la chiediamo a
// Stripe al momento del clic, così è sempre aggiornata (per esempio con un rimborso).
//
// Chi vede cosa lo decide paymentIntentDiMioAcquisto (features/billing/acquisti.ts), la stessa
// regola dell'elenco. Pagamento inesistente e pagamento di altri danno la STESSA risposta (404):
// chi prova id a caso non deve poter capire nemmeno quali pagamenti esistono.

import { getCurrentSession } from "@/lib/auth/server";
import { getStripe } from "@/lib/stripe/client";
import { paymentIntentDiMioAcquisto } from "@/features/billing/acquisti";

export const dynamic = "force-dynamic";

function vaiA(location: string) {
  return new Response(null, { status: 303, headers: { Location: location, "Cache-Control": "no-store" } });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const qui = new URL(req.url);

  const ctx = await getCurrentSession();
  if (!ctx) return vaiA(new URL(`/login?next=${encodeURIComponent("/profilo")}`, qui).toString());

  const intent = await paymentIntentDiMioAcquisto(ctx.user.id, id);
  if (!intent) return new Response("Ricevuta non trovata.", { status: 404, headers: { "Cache-Control": "no-store" } });

  try {
    const pi = await getStripe().paymentIntents.retrieve(intent, { expand: ["latest_charge"] });
    const pagamento = pi.latest_charge;
    const ricevuta = typeof pagamento === "object" && pagamento ? pagamento.receipt_url : null;
    if (ricevuta) return vaiA(ricevuta);
    console.error(`[ricevuta] nessuna receipt_url per il pagamento ${id}`);
  } catch (e) {
    console.error(`[ricevuta] Stripe non ha risposto per il pagamento ${id}`, e);
  }
  // Stripe non raggiungibile o ricevuta non ancora pronta: si torna al profilo con un avviso
  return vaiA(new URL("/profilo?ricevuta=non-disponibile", qui).toString());
}

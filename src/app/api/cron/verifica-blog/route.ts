// Giro quotidiano di controllo del blog (cron di Vercel, vedi vercel.json).
//
// Non e' una ripetizione dei controlli fatti alla pubblicazione: le condizioni che tengono in
// piedi il posizionamento sono uno STATO, non un evento. Un aggiornamento di Yoast puo'
// rimettere la sua sitemap, un plugin puo' togliere l'header noindex dal CMS, e nessuno
// pubblichera' niente quel giorno. Se qualcosa e' rosso parte una mail: un controllo che
// fallisce in silenzio non protegge da nulla.
//
// Accesso: Vercel manda `Authorization: Bearer $CRON_SECRET`. Senza, 404.

import { verificaBlog, riepilogo } from "@/features/blog/verifica";
import { inviaAllarmeBlog } from "@/lib/email/resend";
import { bearerValido } from "@/lib/segreti";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!bearerValido(process.env.CRON_SECRET, req.headers.get("authorization"))) {
    return new Response(null, { status: 404 });
  }

  const sito = (process.env.NEXT_PUBLIC_APP_URL ?? "https://evalisacademy.it").replace(/\/+$/, "");
  const cms = process.env.BLOG_CMS_URL?.replace(/\/+$/, "");

  // il giro quotidiano apre un campione: aprire tutti gli articoli ogni giorno non aggiunge
  // nulla e allunga la corsa. Il controllo completo gira alla pubblicazione e a mano.
  const esiti = await verificaBlog({ sito, cms, massimoArticoli: 10 });
  const { ok, righe } = riepilogo(esiti);

  if (!ok) await inviaAllarmeBlog(righe);

  return Response.json({ ok, esiti, quando: new Date().toISOString() }, { status: ok ? 200 : 500 });
}

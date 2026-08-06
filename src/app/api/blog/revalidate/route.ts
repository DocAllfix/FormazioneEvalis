// Pubblicazione istantanea: WordPress chiama questa rotta quando un articolo viene pubblicato,
// modificato o cestinato, e la pagina corrispondente si rigenera in pochi secondi — senza
// ridistribuire il sito.
//
// Accesso: header `x-blog-token` === BLOG_WEBHOOK_TOKEN. Questo segreto NON finisce mai in un
// URL (per quello c'e' BLOG_PREVIEW_TOKEN): resta tra WordPress e il server.
//
// Corpo (JSON): { "slug": "titolo-articolo" }  — lo slug e' facoltativo: senza, si aggiornano
// comunque elenco e sitemap.
//
// In WordPress: hook su `save_post`, `transition_post_status` e `trashed_post` (mu-plugin
// installato nella Fase 2).

import { revalidatePath, revalidateTag } from "next/cache";
import { after } from "next/server";
import { verificaBlog, riepilogo } from "@/features/blog/verifica";
import { inviaAllarmeBlog } from "@/lib/email/resend";
import { segretoValido } from "@/lib/segreti";

export const dynamic = "force-dynamic";

const SLUG_VALIDO = /^[a-z0-9][a-z0-9-]{0,199}$/;

export async function POST(req: Request) {
  if (!segretoValido(process.env.BLOG_WEBHOOK_TOKEN, req.headers.get("x-blog-token"))) {
    return new Response(null, { status: 404 });
  }

  let slug = "";
  try {
    const body = (await req.json()) as { slug?: unknown };
    if (typeof body?.slug === "string") slug = body.slug.toLowerCase();
  } catch {
    // corpo assente o illeggibile: si aggiorna comunque quello che non dipende dallo slug
  }

  // i dati letti dal CMS portano tutti l'etichetta "blog": una riga li invalida tutti.
  // `expire: 0` = subito, non alla prossima scadenza: e' il senso stesso del webhook.
  revalidateTag("blog", { expire: 0 });
  // elenco e sitemap cambiano a ogni pubblicazione, qualunque sia l'articolo
  revalidatePath("/blog");
  revalidatePath("/sitemap.xml");

  const aggiornati = ["/blog", "/sitemap.xml"];
  if (SLUG_VALIDO.test(slug)) {
    revalidatePath(`/blog/${slug}`);
    aggiornati.push(`/blog/${slug}`);
  }

  // I controlli girano DOPO aver risposto: WordPress non deve restare in attesa che qualcuno
  // apra le pagine. Se una pubblicazione ha rotto qualcosa, parte la mail entro pochi secondi
  // dalla pubblicazione stessa — quando c'e' ancora qualcuno davanti allo schermo.
  after(async () => {
    try {
      const sito = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
      if (!sito) return;
      const esiti = await verificaBlog({
        sito,
        cms: process.env.BLOG_CMS_URL?.replace(/\/+$/, ""),
        massimoArticoli: 5,
      });
      const { ok, righe } = riepilogo(esiti);
      if (!ok) await inviaAllarmeBlog(righe);
    } catch {
      // il controllo che non riesce a girare non deve far fallire la pubblicazione: il giro
      // quotidiano ripassa comunque
    }
  });

  return Response.json({ ok: true, aggiornati, quando: new Date().toISOString() });
}

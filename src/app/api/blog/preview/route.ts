// Anteprima delle bozze: il redattore preme "Anteprima" in WordPress e vede l'articolo col
// design del sito, prima che sia pubblico.
//
// Accesso: ?token=<BLOG_PREVIEW_TOKEN>. Senza token valido risponde 404 e non 401: a chi bussa
// non diciamo nemmeno che questa rotta esiste.
//
// In WordPress: Impostazioni → l'URL di anteprima diventa
//   https://evalisacademy.it/api/blog/preview?token=<segreto>&slug=<slug-della-bozza>

import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { segretoValido } from "@/lib/segreti";

export const dynamic = "force-dynamic";

/** Solo slug veri. Senza questo controllo il parametro diventerebbe un rimando aperto. */
const SLUG_VALIDO = /^[a-z0-9][a-z0-9-]{0,199}$/;

export async function GET(req: Request) {
  const url = new URL(req.url);

  if (!segretoValido(process.env.BLOG_PREVIEW_TOKEN, url.searchParams.get("token"))) {
    return new Response(null, { status: 404 });
  }

  const slug = (url.searchParams.get("slug") ?? "").toLowerCase();
  if (!SLUG_VALIDO.test(slug)) {
    return new Response("slug non valido", { status: 400 });
  }

  // da qui la pagina articolo legge dal CMS anche le bozze, e non finisce in cache
  (await draftMode()).enable();
  redirect(`/blog/${slug}`);
}

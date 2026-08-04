// Traduzione del post WordPress nella forma che i componenti del sito gia' usano.
// Funzioni PURE: nessuna rete, nessun accesso al filesystem — cosi' sono verificabili con un
// post finto, che e' il modo per accorgersi degli errori prima che finiscano online.

import { sanificaHtml, soloTesto } from "./sanitize";
import { riscriviLinkInterni } from "./seo";
import type { Articolo, Autore, PostWP } from "./tipi";

// Entita' nominali che compaiono davvero in un blog italiano. Le accentate NON sono un
// dettaglio: WordPress salva "perch&eacute;" e senza questa mappa il titolo arriverebbe in
// pagina con l'entita' grezza sotto gli occhi del lettore.
const ENTITA: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  agrave: "à", egrave: "è", eacute: "é", igrave: "ì", ograve: "ò", ugrave: "ù",
  Agrave: "À", Egrave: "È", Eacute: "É", Igrave: "Ì", Ograve: "Ò", Ugrave: "Ù",
  ccedil: "ç", ntilde: "ñ", uuml: "ü", ouml: "ö", auml: "ä",
  laquo: "«", raquo: "»", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’",
  ndash: "–", mdash: "—", hellip: "…", deg: "°", euro: "€", copy: "©", reg: "®", trade: "™",
  middot: "·", bull: "•", times: "×", divide: "÷", frac12: "½", sup2: "²", sup3: "³",
};

/** WordPress restituisce entita' HTML nei titoli ("Cos&#8217;&egrave;"): qui tornano caratteri veri. */
export function decodificaEntita(s: string | undefined): string {
  if (!s) return "";
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (intero, nome: string) => ENTITA[nome] ?? intero)
    .trim();
}

/**
 * Tempo di lettura in minuti. In WordPress NON esiste come campo: si calcola dalle parole.
 * 200 parole al minuto e' la convenzione per la lettura silenziosa in italiano.
 */
export function tempoDiLettura(html: string | undefined): string {
  const parole = soloTesto(html).split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(parole / 200))} min`;
}

/** Autore dal blocco _embedded. Senza autore l'articolo resta valido, ma senza pagina dedicata. */
export function autoreDaPost(post: PostWP): Autore | undefined {
  const a = post._embedded?.author?.[0];
  if (!a?.name) return undefined;
  const ruolo = a.evalis_ruolo;
  // L'immagine dell'autore si accetta SOLO se la ospitiamo noi. WordPress propone Gravatar,
  // che farebbe contattare un server di terze parti dal browser di ogni visitatore: un dato
  // (l'indirizzo IP di chi legge) ceduto a qualcuno che la nostra informativa non nomina, e
  // per giunta per mostrare quasi sempre una sagoma grigia predefinita.
  const avatar = a.avatar_urls?.["96"];
  return {
    slug: a.slug ?? "",
    nome: decodificaEntita(a.name),
    ruolo: ruolo ? decodificaEntita(ruolo) : undefined,
    bio: a.description ? decodificaEntita(a.description) : undefined,
    avatar: avatar && !/gravatar\.com|\.wp\.com/i.test(avatar) ? avatar : undefined,
  };
}

/** Prima categoria vera (WordPress mette anche i tag dentro wp:term). */
export function categoriaDaPost(post: PostWP): string {
  const gruppi = post._embedded?.["wp:term"] ?? [];
  for (const gruppo of gruppi) {
    const cat = gruppo?.find((t) => t?.taxonomy === "category" && t?.name);
    if (cat?.name) return decodificaEntita(cat.name);
  }
  return "";
}

/** Post WordPress → Articolo pronto per la presentazione. */
export function mappaPost(post: PostWP, opts: { cms: string; pubblico: string }): Articolo {
  const contenutoRiscritto = riscriviLinkInterni(post.content?.rendered ?? "", opts.cms, opts.pubblico);
  const autore = autoreDaPost(post);

  return {
    slug: post.slug,
    title: decodificaEntita(post.title?.rendered),
    excerpt: soloTesto(post.excerpt?.rendered),
    category: categoriaDaPost(post),
    author: autore?.nome ?? "",
    autore,
    date: post.date_gmt ? `${post.date_gmt}Z`.replace(/Z+$/, "Z") : "",
    dateModified: post.modified_gmt ? `${post.modified_gmt}Z`.replace(/Z+$/, "Z") : undefined,
    readTime: tempoDiLettura(post.content?.rendered),
    image:
      riscriviLinkInterni(
        post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? "",
        opts.cms,
        opts.pubblico,
      ) || "",
    // la sanificazione va per ULTIMA: agisce sull'HTML gia' riscritto, cosi' nulla le sfugge
    content: sanificaHtml(contenutoRiscritto),
  };
}

// Riscrittura degli URL che arrivano da WordPress sul dominio pubblico.
//
// E' LA FUNZIONE PIU' IMPORTANTE DELL'INTERO BLOG. Yoast genera canonical, og:url e schema
// puntati al dominio del CMS. Se li pubblicassimo cosi', ogni articolo direbbe a Google
// "l'originale sta su cms.evalisacademy.it" — un dominio chiuso al pubblico e marcato noindex.
// Risultato: Google deindicizza le NOSTRE pagine in favore di pagine che non puo' nemmeno
// vedere, e il blog sparisce dalla ricerca.
//
// Regola, senza eccezioni: WordPress fornisce i VALORI, il frontend decide gli URL.

import type { SeoArticolo } from "./tipi";

/** Un URL del CMS diventa lo stesso percorso sul dominio pubblico. Gli altri restano intatti. */
export function riportaSuPubblico(url: string | undefined, cms: string, pubblico: string): string | undefined {
  if (!url) return undefined;
  if (!cms) return url;
  const cmsNorm = cms.replace(/\/+$/, "");
  const pubNorm = pubblico.replace(/\/+$/, "");
  // sia http che https del CMS, con o senza "www"
  const host = cmsNorm.replace(/^https?:\/\//, "");
  const rx = new RegExp(`https?://(www\\.)?${host.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "gi");
  return url.replace(rx, pubNorm);
}

/**
 * Riscrive OGNI riferimento al CMS dentro un frammento di HTML: link, immagini, srcset.
 * Serve al corpo degli articoli: un link scritto dal redattore verso un altro articolo viene
 * salvato da WordPress come URL assoluto del CMS, e pubblicato cosi' porterebbe il visitatore
 * su un dominio chiuso, regalandogli anche autorita'.
 */
export function riscriviLinkInterni(html: string, cms: string, pubblico: string): string {
  if (!html || !cms) return html ?? "";
  return riportaSuPubblico(html, cms, pubblico) ?? html;
}

/** Resta anche un solo riferimento al CMS? Usato dai controlli automatici come rete di sicurezza. */
export function contieneRiferimentiAlCms(testo: string, cms: string): boolean {
  if (!testo || !cms) return false;
  const host = cms.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return new RegExp(host.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(testo);
}

/**
 * Traduce `yoast_head_json` nei metadati della pagina, con TUTTI gli URL riportati sul dominio
 * pubblico. Il canonical viene comunque FORZATO su `/blog/<slug>`: anche se Yoast fornisse un
 * valore strano, l'indirizzo canonico dei nostri articoli lo decidiamo noi.
 */
export function seoDaYoast(
  yoast: Record<string, unknown> | undefined,
  opts: { slug: string; cms: string; pubblico: string },
): SeoArticolo {
  const y = (yoast ?? {}) as Record<string, unknown>;
  const og = (y["og_image"] as Array<{ url?: string }> | undefined)?.[0]?.url;

  const stringa = (k: string): string | undefined => {
    const v = y[k];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };

  return {
    title: stringa("title"),
    description: stringa("description") ?? stringa("og_description"),
    // canonical SEMPRE nostro, mai quello di Yoast
    canonical: `${opts.pubblico.replace(/\/+$/, "")}/blog/${opts.slug}`,
    ogTitle: stringa("og_title") ?? stringa("title"),
    ogDescription: stringa("og_description") ?? stringa("description"),
    ogImage: riportaSuPubblico(og, opts.cms, opts.pubblico),
  };
}

// Punto di raccordo tra le pagine e il CMS.
//
// Fino al cutover (04/08/2026) questo file aveva un secondo ramo che serviva i sette articoli
// scritti a mano in `src/lib/blogArticles.js`, cosi' il blog restava online mentre WordPress
// veniva costruito. Adesso la fonte e' una sola, e quel ramo e' sparito insieme al file: due
// fonti per lo stesso contenuto sono due verita' che prima o poi divergono.
//
// Le funzioni restano qui, e non nelle pagine, perche' e' l'unico punto da cambiare se un
// giorno la fonte cambiera' di nuovo.

import type { Articolo, Autore, SeoArticolo } from "./tipi";
import * as wp from "./wp";

/** Tutti gli articoli, dal piu' recente. Il primo e' quello messo in evidenza. */
export async function elencoBlog(): Promise<Articolo[]> {
  return wp.elencoArticoli();
}

/** Gli slug pubblicati, per `generateStaticParams` e per il controllo di conteggio. */
export async function slugBlog(): Promise<string[]> {
  return wp.slugArticoli();
}

/** Un articolo con i suoi metadati e i correlati. `null` se lo slug non esiste. */
export async function articoloBlog(
  slug: string,
  opts: { bozza?: boolean } = {},
): Promise<{ articolo: Articolo; seo: SeoArticolo; correlati: Articolo[] } | null> {
  const trovato = await wp.articoloPerSlug(slug, opts);
  if (!trovato) return null;
  const correlati = await wp.articoliCorrelati(slug, trovato.articolo.category);
  return { ...trovato, correlati };
}

/**
 * Un URL vecchio a cui corrisponde un articolo rinominato: restituisce lo slug attuale, cosi'
 * la pagina puo' rispondere 301 invece di 404. Null quando non c'e' nulla da recuperare.
 */
export async function slugSostitutivo(slug: string): Promise<string | null> {
  return wp.slugCorrente(slug);
}

/** Un autore con i suoi articoli. `null` se non esiste. */
export async function autoreBlog(slug: string): Promise<{ autore: Autore; articoli: Articolo[] } | null> {
  const autore = await wp.autorePerSlug(slug);
  if (!autore) return null;
  return { autore, articoli: await wp.articoliDiAutore(slug) };
}

/** Gli slug degli autori che hanno pubblicato. */
export async function slugAutoriBlog(): Promise<string[]> {
  return wp.slugAutori();
}

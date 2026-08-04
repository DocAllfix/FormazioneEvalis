// Unico punto del blog che tocca la rete: lettura della REST API di WordPress.
//
// Tre scelte che vale la pena spiegare:
//
// 1. `?_embed` — WordPress restituisce autore, categoria e immagine in UNA chiamata invece di
//    quattro. Senza, ogni articolo dell'elenco costerebbe tre richieste in piu'.
//
// 2. Un errore VIENE PROPAGATO, non ingoiato. E' la decisione presa: se il CMS non risponde
//    durante la compilazione, la compilazione fallisce e resta online il sito precedente.
//    Ingoiare l'errore pubblicherebbe un blog vuoto, che e' molto peggio di non pubblicare.
//
// 3. I ritentativi coprono l'inciampo di rete (una VPS piccola che sta rispondendo a un
//    aggiornamento), non il guasto: tre tentativi e poi si alza le mani.

import { cmsUrl, credenzialiCms, sitoPubblico } from "./config";
import { mappaPost, autoreDaPost } from "./mappa";
import { seoDaYoast } from "./seo";
import type { Articolo, Autore, PostWP, SeoArticolo } from "./tipi";

const TIMEOUT_MS = 10_000;
const TENTATIVI = 3;
/** Ricontrollo periodico. La pubblicazione immediata passa dal webhook (Fase 6), non da qui. */
const RIVALIDA_SECONDI = 3600;

type Opzioni = {
  /** Legge anche le bozze: richiede le credenziali e disattiva la cache. */
  bozza?: boolean;
};

function base(): string {
  const cms = cmsUrl();
  if (!cms) throw new Error("BLOG_CMS_URL non configurato: il blog headless non e' agganciato.");
  return `${cms}/wp-json/wp/v2`;
}

async function chiamata<T>(percorso: string, opts: Opzioni = {}): Promise<T> {
  const url = `${base()}${percorso}`;
  const intestazioni: Record<string, string> = { Accept: "application/json" };

  if (opts.bozza) {
    const cred = credenzialiCms();
    if (!cred) throw new Error("Anteprima bozze richiesta ma BLOG_CMS_USER/APP_PASSWORD mancano.");
    intestazioni.Authorization = cred;
  }

  let ultimoErrore: unknown;
  for (let tentativo = 1; tentativo <= TENTATIVI; tentativo++) {
    try {
      const risposta = await fetch(url, {
        headers: intestazioni,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        // le bozze non si mettono mai in cache: cambiano a ogni salvataggio dell'autore
        ...(opts.bozza
          ? { cache: "no-store" as const }
          : { next: { revalidate: RIVALIDA_SECONDI, tags: ["blog"] } }),
      });

      // 404 su una risorsa singola non e' un guasto: e' "non esiste"
      if (risposta.status === 404) return null as T;
      if (!risposta.ok) {
        throw new Error(`CMS ha risposto ${risposta.status} su ${percorso}`);
      }
      return (await risposta.json()) as T;
    } catch (e) {
      ultimoErrore = e;
      if (tentativo < TENTATIVI) {
        await new Promise((r) => setTimeout(r, 300 * tentativo));
      }
    }
  }
  throw new Error(
    `CMS irraggiungibile su ${percorso} dopo ${TENTATIVI} tentativi: ${String(ultimoErrore)}`,
  );
}

function contesto() {
  return { cms: cmsUrl(), pubblico: sitoPubblico() };
}

/** Tutti gli articoli pubblicati, dal piu' recente. */
export async function elencoArticoli(limite = 100): Promise<Articolo[]> {
  const post = await chiamata<PostWP[]>(
    `/posts?_embed&status=publish&per_page=${limite}&orderby=date&order=desc`,
  );
  return (post ?? []).map((p) => mappaPost(p, contesto()));
}

/** Solo gli slug: serve a `generateStaticParams` senza scaricare il corpo di ogni articolo. */
export async function slugArticoli(): Promise<string[]> {
  const post = await chiamata<Array<{ slug: string }>>(
    "/posts?status=publish&per_page=100&_fields=slug",
  );
  return (post ?? []).map((p) => p.slug).filter(Boolean);
}

/** Un articolo col suo blocco SEO. `null` se lo slug non esiste. */
export async function articoloPerSlug(
  slug: string,
  opts: Opzioni = {},
): Promise<{ articolo: Articolo; seo: SeoArticolo } | null> {
  const stato = opts.bozza ? "publish,draft,pending,future,private" : "publish";
  const post = await chiamata<PostWP[]>(
    `/posts?_embed&status=${stato}&slug=${encodeURIComponent(slug)}`,
    opts,
  );
  const p = post?.[0];
  if (!p) return null;
  const ctx = contesto();
  return {
    articolo: mappaPost(p, ctx),
    seo: seoDaYoast(p.yoast_head_json, { slug: p.slug, ...ctx }),
  };
}

/** Gli altri articoli, per il blocco "correlati". Prima quelli della stessa categoria. */
export async function articoliCorrelati(slug: string, categoria: string, quanti = 3): Promise<Articolo[]> {
  const tutti = await elencoArticoli();
  const altri = tutti.filter((a) => a.slug !== slug);
  const stessaCategoria = altri.filter((a) => a.category === categoria);
  return [...stessaCategoria, ...altri.filter((a) => a.category !== categoria)].slice(0, quanti);
}

/** Un autore per slug, con la biografia. `null` se non esiste. */
export async function autorePerSlug(slug: string): Promise<Autore | null> {
  const utenti = await chiamata<
    Array<{ slug?: string; name?: string; description?: string; avatar_urls?: Record<string, string> }>
  >(`/users?slug=${encodeURIComponent(slug)}`);
  const u = utenti?.[0];
  if (!u?.name) return null;
  // riuso della stessa mappatura degli articoli: un solo posto dove decodificare le entita'
  return autoreDaPost({ id: 0, slug: "", _embedded: { author: [u] } } as PostWP) ?? null;
}

/** Gli slug di tutti gli autori che hanno almeno un articolo pubblicato. */
export async function slugAutori(): Promise<string[]> {
  const utenti = await chiamata<Array<{ slug?: string }>>(
    "/users?per_page=100&who=authors&has_published_posts=true&_fields=slug",
  );
  return (utenti ?? []).map((u) => u.slug).filter((s): s is string => Boolean(s));
}

/** Gli articoli di un autore. */
export async function articoliDiAutore(slugAutore: string): Promise<Articolo[]> {
  const tutti = await elencoArticoli();
  return tutti.filter((a) => a.autore?.slug === slugAutore);
}

// Punto di raccordo tra le pagine e la fonte degli articoli.
//
// PERCHE' ESISTE: il passaggio a WordPress e' graduale. Finche' `BLOG_CMS_URL` non e'
// configurato — cioe' finche' la VPS non esiste — il blog attuale resta online ESATTAMENTE
// com'e', con i suoi sette articoli. Appena la variabile c'e', le stesse pagine leggono dal CMS
// senza che nulla cambi nella presentazione.
//
// Cosi' non esiste un momento in cui il sito e' scoperto, che era la condizione posta al piano.
//
// ⚠️ Tutto cio' che riguarda la fonte precedente (l'adattatore qui sotto, `src/lib/blogArticles.js`
// e il ramo Markdown di BlogPost) va eliminato nella Fase 8, insieme ai vecchi URL.

import { blogConfigurato, sitoPubblico } from "./config";
import type { Articolo, SeoArticolo } from "./tipi";
import * as wp from "./wp";
import { allArticles, getArticleBySlug } from "@/lib/blogArticles";

type ArticoloVecchio = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  image: string;
  content: string;
};

const MESI: Record<string, number> = {
  gen: 0, feb: 1, mar: 2, apr: 3, mag: 4, giu: 5,
  lug: 6, ago: 7, set: 8, ott: 9, nov: 10, dic: 11,
};

/** "12 Giu 2026" → ISO. Serve solo alla fonte precedente: WordPress da' gia' date ISO. */
function isoDaDataItaliana(data?: string): string {
  const m = data?.match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/);
  if (!m) return "";
  const mese = MESI[m[2].toLowerCase()];
  if (mese === undefined) return "";
  return new Date(Date.UTC(Number(m[3]), mese, Number(m[1]))).toISOString();
}

function daVecchio(a: ArticoloVecchio): Articolo {
  return {
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    category: a.category,
    author: a.author,
    date: isoDaDataItaliana(a.date),
    readTime: a.readTime,
    image: a.image,
    content: a.content,
    formato: "markdown",
  };
}

const vecchi = allArticles as ArticoloVecchio[];

/** Metadati per la fonte precedente, che non ha Yoast. Il canonical resta comunque nostro. */
function seoDiRipiego(a: Articolo): SeoArticolo {
  const pubblico = sitoPubblico();
  return {
    title: a.title,
    description: a.excerpt,
    canonical: `${pubblico}/blog/${a.slug}`,
    ogTitle: a.title,
    ogDescription: a.excerpt,
    ogImage: a.image?.startsWith("http") ? a.image : `${pubblico}${a.image ?? ""}`,
  };
}

/** Tutti gli articoli, dal piu' recente. Il primo e' quello messo in evidenza. */
export async function elencoBlog(): Promise<Articolo[]> {
  if (!blogConfigurato()) return vecchi.map(daVecchio);
  return wp.elencoArticoli();
}

/** Gli slug pubblicati, per `generateStaticParams` e per il controllo di conteggio della Fase 7. */
export async function slugBlog(): Promise<string[]> {
  if (!blogConfigurato()) return vecchi.map((a) => a.slug);
  return wp.slugArticoli();
}

/** Un articolo con i suoi metadati e i correlati. `null` se lo slug non esiste. */
export async function articoloBlog(
  slug: string,
  opts: { bozza?: boolean } = {},
): Promise<{ articolo: Articolo; seo: SeoArticolo; correlati: Articolo[] } | null> {
  if (!blogConfigurato()) {
    const a = getArticleBySlug(slug) as ArticoloVecchio | undefined;
    if (!a) return null;
    const articolo = daVecchio(a);
    const correlati = vecchi.filter((x) => x.slug !== slug).slice(0, 3).map(daVecchio);
    return { articolo, seo: seoDiRipiego(articolo), correlati };
  }

  const trovato = await wp.articoloPerSlug(slug, opts);
  if (!trovato) return null;
  const correlati = await wp.articoliCorrelati(slug, trovato.articolo.category);
  return { ...trovato, correlati };
}

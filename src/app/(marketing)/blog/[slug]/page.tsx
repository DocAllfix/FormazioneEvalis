import type { Metadata } from "next";
import Link from "next/link";
import { draftMode } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import BlogPost from "@/components/pages/BlogPost";
import { JsonLd } from "@/components/seo/json-ld";
import { articoloBlog, slugBlog, slugSostitutivo } from "@/features/blog/fonte";
import { soloGiorno } from "@/features/blog/data";
import { soloTesto } from "@/features/blog/sanitize";

const APP = (process.env.NEXT_PUBLIC_APP_URL ?? "https://evalisacademy.it").replace(/\/$/, "");

/**
 * Un articolo pubblicato dopo l'ultima compilazione deve funzionare subito, non dare 404:
 * la pagina si genera alla prima richiesta e poi resta in cache (Fase 6).
 */
export const dynamicParams = true;

/** Ogni articolo ha i PROPRI metadata. Il canonical arriva da `seo.ts`, che lo forza sul
 * dominio pubblico: Yoast lo genererebbe puntato al CMS e ci deindicizzerebbe. */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { isEnabled: bozza } = await draftMode();
  const trovato = await articoloBlog(slug, { bozza });
  if (!trovato) return { title: "Articolo — Evalis" };
  const { articolo: a, seo } = trovato;

  // una bozza non deve MAI finire in un indice, nemmeno se qualcuno condivide l'URL
  if (bozza) {
    return { title: `[BOZZA] ${a.title}`, robots: { index: false, follow: false } };
  }

  const titolo = seo.title ?? `${a.title} — Evalis`;
  const descrizione = seo.description ?? a.excerpt;
  const immagine = seo.ogImage ?? (a.image?.startsWith("http") ? a.image : `${APP}${a.image ?? ""}`);

  return {
    title: titolo,
    description: descrizione,
    alternates: { canonical: seo.canonical },
    openGraph: {
      type: "article",
      title: seo.ogTitle ?? a.title,
      description: seo.ogDescription ?? descrizione,
      url: seo.canonical,
      images: immagine ? [{ url: immagine }] : undefined,
      publishedTime: a.date || undefined,
      modifiedTime: a.dateModified,
      authors: a.author ? [a.author] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: seo.ogTitle ?? a.title,
      description: seo.ogDescription ?? descrizione,
      images: immagine ? [immagine] : undefined,
    },
  };
}

export async function generateStaticParams() {
  const slug = await slugBlog();
  return slug.map((s) => ({ slug: s }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { isEnabled: bozza } = await draftMode();
  const trovato = await articoloBlog(slug, { bozza });
  if (!trovato) {
    // prima di dire 404: il redattore potrebbe aver rinominato l'articolo. Se lo slug e' solo
    // vecchio, si risponde 301 verso quello nuovo e non si perde nulla di quanto indicizzato.
    const nuovo = await slugSostitutivo(slug);
    if (nuovo) permanentRedirect(`/blog/${nuovo}`);
    notFound();
  }
  const { articolo: a, correlati } = trovato;

  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.excerpt || soloTesto(a.content).slice(0, 200),
    image: a.image ? (a.image.startsWith("http") ? a.image : `${APP}${a.image}`) : undefined,
    datePublished: soloGiorno(a.date),
    dateModified: soloGiorno(a.dateModified) ?? soloGiorno(a.date),
    articleSection: a.category,
    // l'autore punta alla sua pagina quando esiste: e' il collegamento che regge l'E-E-A-T
    author: a.autore?.slug
      ? { "@type": "Person", name: a.autore.nome, url: `${APP}/blog/autore/${a.autore.slug}` }
      : { "@type": "Person", name: a.author },
    publisher: { "@type": "Organization", name: "Evalis Academy", url: APP },
    mainEntityOfPage: `${APP}/blog/${a.slug}`,
  };

  return (
    <>
      {/* Lo schema Article NON va emesso per una bozza: descriverebbe a Google una pagina
          che non esiste ancora. */}
      {bozza ? (
        <div className="fixed bottom-0 inset-x-0 z-50 bg-near-black text-white text-sm px-4 py-3 flex flex-wrap items-center justify-center gap-3">
          <span>Stai vedendo una <strong>bozza</strong>, non l&apos;articolo pubblicato.</span>
          <Link href="/api/blog/preview/esci" className="underline hover:no-underline">
            Esci dall&apos;anteprima
          </Link>
        </div>
      ) : (
        <JsonLd data={ld} />
      )}
      <BlogPost article={a} related={correlati} />
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogPost from "@/components/pages/BlogPost";
import { JsonLd } from "@/components/seo/json-ld";
import { articoloBlog, slugBlog } from "@/features/blog/fonte";
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
  const trovato = await articoloBlog(slug);
  if (!trovato) return { title: "Articolo — Evalis" };
  const { articolo: a, seo } = trovato;

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
  const trovato = await articoloBlog(slug);
  if (!trovato) notFound();
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
      <JsonLd data={ld} />
      <BlogPost article={a} related={correlati} />
    </>
  );
}

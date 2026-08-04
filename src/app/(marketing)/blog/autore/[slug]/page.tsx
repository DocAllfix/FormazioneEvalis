import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AutoreBlog from "@/components/pages/AutoreBlog";
import { JsonLd } from "@/components/seo/json-ld";
import { autoreBlog, slugAutoriBlog } from "@/features/blog/fonte";

const APP = (process.env.NEXT_PUBLIC_APP_URL ?? "https://evalisacademy.it").replace(/\/$/, "");

/** Un autore aggiunto in WordPress deve avere la sua pagina senza ridistribuire il sito. */
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const trovato = await autoreBlog(slug);
  if (!trovato) return { title: "Autore — Evalis" };
  const { autore, articoli } = trovato;
  const descrizione =
    autore.bio ?? `Articoli di ${autore.nome} sul blog di Evalis Academy (${articoli.length}).`;
  return {
    title: `${autore.nome} — Evalis`,
    description: descrizione,
    alternates: { canonical: `${APP}/blog/autore/${autore.slug}` },
    openGraph: {
      type: "profile",
      title: autore.nome,
      description: descrizione,
      url: `${APP}/blog/autore/${autore.slug}`,
    },
  };
}

export async function generateStaticParams() {
  const slug = await slugAutoriBlog();
  return slug.map((s) => ({ slug: s }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trovato = await autoreBlog(slug);
  if (!trovato) notFound();
  const { autore, articoli } = trovato;

  // `Person` collegato agli articoli: e' cosi' che si dichiara CHI ha scritto, ed e' il segnale
  // che regge la competenza percepita di tutta la sezione (E-E-A-T).
  const ld = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: autore.nome,
      description: autore.bio,
      jobTitle: autore.ruolo,
      image: autore.avatar,
      url: `${APP}/blog/autore/${autore.slug}`,
      worksFor: { "@type": "Organization", name: "Evalis Academy", url: APP },
    },
  };

  return (
    <>
      <JsonLd data={ld} />
      <AutoreBlog autore={autore} articoli={articoli} />
    </>
  );
}

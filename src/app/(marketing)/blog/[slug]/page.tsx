import type { Metadata } from "next";
import BlogPost from "@/components/pages/BlogPost";
import { JsonLd } from "@/components/seo/json-ld";
import { allArticles, getArticleBySlug } from "@/lib/blogArticles";

const APP = (process.env.NEXT_PUBLIC_APP_URL ?? "https://evalisacademy.it").replace(/\/$/, "");

type Articolo = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  image: string;
};

/** "12 Giu 2026" → ISO 8601, per datePublished dello schema Article. */
function dataIso(data: string): string | undefined {
  const mesi: Record<string, string> = {
    gen: "01", feb: "02", mar: "03", apr: "04", mag: "05", giu: "06",
    lug: "07", ago: "08", set: "09", ott: "10", nov: "11", dic: "12",
  };
  const m = data?.match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/);
  if (!m) return undefined;
  const mese = mesi[m[2].toLowerCase()];
  return mese ? `${m[3]}-${mese}-${m[1].padStart(2, "0")}` : undefined;
}

/** Ogni articolo ha i PROPRI metadata (title, description, canonical, OG con la sua
 * immagine): senza, ricerca e condivisioni mostrerebbero sempre la scheda del blog. */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = getArticleBySlug(slug) as Articolo | undefined;
  if (!a) return { title: "Articolo — Evalis" };
  const url = `${APP}/blog/${a.slug}`;
  const immagine = a.image?.startsWith("http") ? a.image : `${APP}${a.image ?? ""}`;
  return {
    title: `${a.title} — Evalis`,
    description: a.excerpt,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: a.title,
      description: a.excerpt,
      url,
      images: a.image ? [{ url: immagine }] : undefined,
      publishedTime: dataIso(a.date),
      authors: a.author ? [a.author] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: a.title,
      description: a.excerpt,
      images: a.image ? [immagine] : undefined,
    },
  };
}

export function generateStaticParams() {
  return (allArticles as Articolo[]).map((a) => ({ slug: a.slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = getArticleBySlug(slug) as Articolo | undefined;
  const ld = a
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: a.title,
        description: a.excerpt,
        image: a.image ? `${APP}${a.image}` : undefined,
        datePublished: dataIso(a.date),
        articleSection: a.category,
        author: { "@type": "Person", name: a.author },
        publisher: { "@type": "Organization", name: "Evalis Academy", url: APP },
        mainEntityOfPage: `${APP}/blog/${a.slug}`,
      }
    : null;
  return (
    <>
      {ld ? <JsonLd data={ld} /> : null}
      <BlogPost />
    </>
  );
}

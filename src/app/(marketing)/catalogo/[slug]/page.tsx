import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, ChevronRight, Clock, Layers, LogIn, Signal } from "lucide-react";
import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import { getPublicCourseBySlug } from "@/features/catalog/queries";
import { CourseDetailBody, hoursLabel } from "@/components/catalog/course-detail-body";
import { JsonLd } from "@/components/seo/json-ld";

const APP = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await getPublicCourseBySlug(slug);
  if (!c) return { title: "Corso — Evalis" };
  const description = c.description ?? `Corso di certificazione ${c.title}. Preparazione online, esame e certificato verificabile.`;
  const url = `${APP}/catalogo/${slug}`;
  return {
    title: `${c.title} — Evalis`,
    description,
    alternates: { canonical: url },
    openGraph: { title: c.title, description, url, type: "website", ...(c.imageUrl ? { images: [c.imageUrl] } : {}) },
  };
}

// Pagina PUBBLICA teaser (SEO): scheda corso SENZA prezzo né acquisto; CTA al login.
export default async function CourseTeaserPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await getPublicCourseBySlug(slug);
  if (!c) notFound();
  const d = c.details ?? {};

  const aside = (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <p className="font-heading text-lg text-near-black">Certificazione professionale</p>
      <p className="mt-1 text-sm text-muted-foreground">Accedi per iscriverti al corso e sostenere l&apos;esame.</p>
      <Link
        href={`/login?next=${encodeURIComponent(`/corsi/${c.id}`)}`}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition hover:brightness-110"
      >
        <LogIn className="h-4 w-4" /> Accedi per iscriverti
      </Link>
      <ul className="mt-6 flex flex-col gap-3 border-t border-border pt-5 text-sm">
        <li className="flex items-center gap-2.5 text-foreground/80"><Clock className="h-4 w-4 text-primary" /> {hoursLabel(c)} di formazione</li>
        <li className="flex items-center gap-2.5 text-foreground/80"><Layers className="h-4 w-4 text-primary" /> {c.modules} moduli · {c.lessons} lezioni</li>
        {d.level ? <li className="flex items-center gap-2.5 text-foreground/80"><Signal className="h-4 w-4 text-primary" /> Livello {d.level}</li> : null}
        <li className="flex items-center gap-2.5 text-foreground/80"><BadgeCheck className="h-4 w-4 text-primary" /> Certificato verificabile</li>
      </ul>
    </div>
  );

  const url = `${APP}/catalogo/${slug}`;
  const courseLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: c.title,
    description: c.description ?? `Corso di certificazione ${c.title}.`,
    url,
    ...(c.imageUrl ? { image: c.imageUrl } : {}),
    provider: { "@type": "Organization", name: "Evalis", url: APP },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: APP },
      { "@type": "ListItem", position: 2, name: "Catalogo", item: `${APP}/catalogo` },
      { "@type": "ListItem", position: 3, name: c.title, item: url },
    ],
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <JsonLd data={courseLd} />
      <JsonLd data={breadcrumbLd} />
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
          <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link href="/" className="transition hover:text-near-black">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/catalogo" className="transition hover:text-near-black">Catalogo</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-near-black">{c.title}</span>
          </nav>
          <div className="flex flex-col gap-6">
            <CourseDetailBody c={c} aside={aside} />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import { CatalogBrowser } from "@/components/catalog/catalog-browser";
import { listPublishedCourses } from "@/features/catalog/queries";

export const metadata = {
  title: "Catalogo corsi — Evalis",
  description:
    "Esplora i corsi professionali disponibili: Auditor ISO, mestieri e professioni, settore bancario. Preparazione online, esame e certificato verificabile.",
};

// Catalogo pubblico DB-backed: mostra i corsi reali pubblicati (ore + prezzo).
export default async function Page() {
  const courses = await listPublishedCourses();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative w-full overflow-hidden bg-background pb-12 pt-28 md:pb-16 md:pt-32">
          <div className="dot-grid pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="relative mx-auto max-w-[1400px] px-6 md:px-10">
            <nav className="mb-6 flex items-center gap-1.5 text-xs text-[#766E66]">
              <Link href="/" className="transition-colors hover:text-near-black">
                Home
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-near-black">Catalogo</span>
            </nav>
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-primary">I corsi</span>
            <h1 className="mt-3.5 font-heading text-4xl leading-[1.1] text-near-black md:text-5xl lg:text-[56px]">
              Catalogo corsi
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#5C5347]">
              Esplora i corsi professionali disponibili. Preparazione online, esame e certificato
              verificabile con QR e codice univoco.
            </p>
          </div>
        </section>

        <CatalogBrowser courses={courses} />
      </main>
      <SiteFooter />
    </div>
  );
}

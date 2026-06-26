import { listPublishedCourses } from "@/features/catalog/queries";
import { CatalogBrowser } from "@/components/catalog/catalog-browser";

export const metadata = { title: "Catalogo corsi — Evalis" };

// Catalogo POST-LOGIN: corsi reali con ore, prezzo e scheda ricca. L'area (app) gate la sessione.
export default async function CorsiPage() {
  const courses = await listPublishedCourses();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl text-near-black md:text-3xl">Catalogo corsi</h1>
        <p className="mt-1 text-muted-foreground">
          Scegli una certificazione, preparati online e ottieni un certificato verificabile.
        </p>
      </div>
      <div data-tour="catalog">
        <CatalogBrowser courses={courses} />
      </div>
    </div>
  );
}

import { listPublishedCourses, listActiveBundles, getMyEnrolledCourseIds } from "@/features/catalog/queries";
import { getCurrentSession } from "@/lib/auth/server";
import { CatalogBrowser } from "@/components/catalog/catalog-browser";
import { BundleStrip } from "@/components/catalog/bundle-strip";

export const metadata = { title: "Catalogo corsi — Evalis" };

// Catalogo POST-LOGIN: corsi reali con ore, prezzo e scheda ricca. L'area (app) gate la sessione.
// Dati globali (corsi, bundle) dalle cache; gli enrolledIds sono per-utente e restano FUORI.
export default async function CorsiPage() {
  const ctx = await getCurrentSession();
  const [courses, bundles, enrolledIds] = await Promise.all([
    listPublishedCourses(),
    listActiveBundles(),
    ctx ? getMyEnrolledCourseIds(ctx.user.id) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl text-near-black md:text-3xl">Catalogo corsi</h1>
        <p className="mt-1 text-muted-foreground">
          Scegli una certificazione, preparati online e ottieni un certificato verificabile.
        </p>
      </div>
      <BundleStrip bundles={bundles} enrolledIds={enrolledIds} />
      <div data-tour="catalog">
        <CatalogBrowser courses={courses} enrolledIds={enrolledIds} />
      </div>
    </div>
  );
}

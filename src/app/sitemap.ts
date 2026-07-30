import type { MetadataRoute } from "next";
import { listPublishedCourses } from "@/features/catalog/queries";
import { allArticles } from "@/lib/blogArticles";

const APP = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** "12 Giu 2026" → Date, per il lastmod degli articoli. */
function dataArticolo(data?: string): Date | undefined {
  const mesi: Record<string, number> = {
    gen: 0, feb: 1, mar: 2, apr: 3, mag: 4, giu: 5, lug: 6, ago: 7, set: 8, ott: 9, nov: 10, dic: 11,
  };
  const m = data?.match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/);
  if (!m) return undefined;
  const mese = mesi[m[2].toLowerCase()];
  return mese === undefined ? undefined : new Date(Number(m[3]), mese, Number(m[1]));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const courses = await listPublishedCourses().catch(() => []);
  const articoli = allArticles as { slug: string; date?: string }[];
  const oggi = new Date();

  // NB: /pricing NON è ancora una pagina reale (prezzi in arrivo) → fuori dalla sitemap
  // finché non esiste, per non elencare URL che rispondono 404.
  // `lastModified` su ogni URL: è il segnale di freschezza che crawler classici e AI usano
  // per capire cosa ricontrollare, tanto più utile quando la produzione contenuti sarà a regime.
  const staticPages: MetadataRoute.Sitemap = ["", "/aziende", "/catalogo", "/blog"].map((p) => ({
    url: `${APP}${p}`,
    lastModified: oggi,
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.7,
  }));

  const coursePages: MetadataRoute.Sitemap = courses
    .filter((c) => c.slug)
    .map((c) => ({
      url: `${APP}/catalogo/${c.slug}`,
      lastModified: oggi,
      changeFrequency: "monthly",
      priority: 0.8,
    }));

  const blogPages: MetadataRoute.Sitemap = articoli.map((a) => ({
    url: `${APP}/blog/${a.slug}`,
    lastModified: dataArticolo(a.date) ?? oggi,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticPages, ...coursePages, ...blogPages];
}

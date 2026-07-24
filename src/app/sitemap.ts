import type { MetadataRoute } from "next";
import { listPublishedCourses } from "@/features/catalog/queries";

const APP = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const courses = await listPublishedCourses().catch(() => []);

  // NB: /pricing NON è ancora una pagina reale (prezzi in arrivo) → fuori dalla sitemap
  // finché non esiste, per non elencare URL che rispondono 404.
  const staticPages: MetadataRoute.Sitemap = ["", "/aziende", "/catalogo", "/blog"].map((p) => ({
    url: `${APP}${p}`,
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.7,
  }));

  const coursePages: MetadataRoute.Sitemap = courses
    .filter((c) => c.slug)
    .map((c) => ({
      url: `${APP}/catalogo/${c.slug}`,
      changeFrequency: "monthly",
      priority: 0.8,
    }));

  return [...staticPages, ...coursePages];
}

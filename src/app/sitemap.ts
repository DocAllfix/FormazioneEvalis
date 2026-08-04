import type { MetadataRoute } from "next";
import { listPublishedCourses } from "@/features/catalog/queries";
import { elencoBlog, slugAutoriBlog } from "@/features/blog/fonte";

const APP = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Data ISO → Date per il lastmod. Vuota o illeggibile → si usa oggi. */
function quando(iso?: string): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const courses = await listPublishedCourses().catch(() => []);
  const articoli = await elencoBlog();
  const autori = await slugAutoriBlog();
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

  // lastmod = data di ULTIMA MODIFICA quando c'e': e' il segnale che dice al crawler
  // "questo articolo e' stato aggiornato, ricontrollalo"
  const blogPages: MetadataRoute.Sitemap = articoli.map((a) => ({
    url: `${APP}/blog/${a.slug}`,
    lastModified: quando(a.dateModified) ?? quando(a.date) ?? oggi,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // Le pagine autore reggono l'E-E-A-T della sezione: vanno indicizzate come gli articoli.
  const autorePages: MetadataRoute.Sitemap = autori.map((s) => ({
    url: `${APP}/blog/autore/${s}`,
    lastModified: oggi,
    changeFrequency: "monthly",
    priority: 0.4,
  }));

  return [...staticPages, ...coursePages, ...blogPages, ...autorePages];
}

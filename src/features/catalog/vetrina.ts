// Vetrina marketing (landing + /catalogo): corsi auditor pubblicati dal DB, ordinati
// come il percorso reale — propedeutico 19011 → percorsi ISO → aggiornamenti in coda.
// Riusa la cache di listPublishedCourses (revalidate 60s).

import { listPublishedCourses } from "./queries";

export type VetrinaCourse = {
  slug: string;
  title: string;
  description: string;
  durationHours: number | null;
  imageUrl: string | null;
};

const ORDINE_ISO = ["9001", "14001", "45001", "27001", "22000", "50001", "37001", "39001", "42001"];

function rank(slug: string): number {
  if (slug.includes("19011")) return 0; // propedeutico, sempre primo
  if (slug.startsWith("aggiornamento")) return 99; // aggiornamenti in coda
  const m = slug.match(/\d{4,5}/);
  const i = m ? ORDINE_ISO.indexOf(m[0]) : -1;
  return i === -1 ? 50 : i + 1;
}

export async function listAuditorVetrina(): Promise<VetrinaCourse[]> {
  const all = await listPublishedCourses();
  return all
    .filter((c) => c.category === "auditor" && !!c.slug)
    .sort((a, b) => rank(a.slug as string) - rank(b.slug as string))
    .map((c) => ({
      slug: c.slug as string,
      title: c.title,
      description: c.description ?? "",
      durationHours: c.durationHours,
      imageUrl: c.imageUrl,
    }));
}

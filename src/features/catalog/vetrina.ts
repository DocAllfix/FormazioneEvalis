// Vetrina marketing (landing + /catalogo): corsi auditor pubblicati dal DB, ordinati
// come il percorso reale — propedeutico 19011 → percorsi ISO → aggiornamenti in coda.
// Riusa la cache di listPublishedCourses (revalidate 60s).
// Porta anche il prezzo: chi arriva dalla landing deve vederlo prima di registrarsi, come
// nell'area riservata. `id` serve a riportarlo alla scheda del corso dopo la registrazione.

import { listPublishedCourses, type CatalogCourse } from "./queries";

export type VetrinaCourse = {
  id: string;
  slug: string;
  title: string;
  description: string;
  durationHours: number | null;
  imageUrl: string | null;
  priceCents: number | null;
  listPriceCents: number | null;
  currency: string | null;
};

function vetrina(c: CatalogCourse): VetrinaCourse {
  return {
    id: c.id,
    slug: c.slug as string,
    title: c.title,
    description: c.description ?? "",
    durationHours: c.durationHours,
    imageUrl: c.imageUrl,
    priceCents: c.priceCents,
    listPriceCents: c.listPriceCents,
    currency: c.currency,
  };
}

const ORDINE_ISO = ["9001", "14001", "45001", "27001", "22000", "50001", "37001", "39001", "42001"];

function rank(slug: string): number {
  if (slug.includes("19011")) return 0; // propedeutico, sempre primo
  if (slug.startsWith("aggiornamento")) return 99; // aggiornamenti in coda
  const m = slug.match(/\d{4,5}/);
  const i = m ? ORDINE_ISO.indexOf(m[0]) : -1;
  return i === -1 ? 50 : i + 1;
}

// Quando la stessa norma è in catalogo in due edizioni, la più recente va mostrata per prima
// (l'edizione precedente resta acquistabile, ma non è quella che si consiglia a chi arriva).
function edizione(slug: string): number {
  const m = slug.match(/20\d\d/);
  return m ? Number(m[0]) : 0;
}

export async function listAuditorVetrina(): Promise<VetrinaCourse[]> {
  const all = await listPublishedCourses();
  return all
    .filter((c) => c.category === "auditor" && !!c.slug)
    .sort((a, b) =>
      rank(a.slug as string) - rank(b.slug as string) ||
      edizione(b.slug as string) - edizione(a.slug as string))
    .map(vetrina);
}

// Vetrina corsi Intelligenza Artificiale (Claude AI): operativo (base) prima, avanzato dopo.
export async function listAiVetrina(): Promise<VetrinaCourse[]> {
  const all = await listPublishedCourses();
  return all
    .filter((c) => c.category === "ai" && !!c.slug)
    .sort((a, b) => (a.slug!.includes("operativo") ? 0 : 1) - (b.slug!.includes("operativo") ? 0 : 1))
    .map(vetrina);
}

// Vetrina percorsi manageriali (ESG Manager, Energy Manager, Parità di genere): non sono corsi
// auditor, hanno una loro area nel catalogo. Ordine: ESG, Energy, poi gli altri (come da listino).
const ordineManageriale = (slug: string) => (slug.startsWith("esg") ? 0 : slug.startsWith("energy") ? 1 : 2);
export async function listManagerialiVetrina(): Promise<VetrinaCourse[]> {
  const all = await listPublishedCourses();
  return all
    .filter((c) => c.category === "manageriale" && !!c.slug)
    .sort((a, b) => ordineManageriale(a.slug!) - ordineManageriale(b.slug!))
    .map(vetrina);
}

// Vetrina mestieri e professioni (piastrellista e le prossime qualifiche): solo corsi pubblicati dal DB.
export async function listMestieriVetrina(): Promise<VetrinaCourse[]> {
  const all = await listPublishedCourses();
  return all.filter((c) => c.category === "mestieri" && !!c.slug).map(vetrina);
}

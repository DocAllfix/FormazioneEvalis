import Catalogo from "@/components/pages/Catalogo";
import { listAuditorVetrina, listAiVetrina, listManagerialiVetrina, listMestieriVetrina } from "@/features/catalog/vetrina";
import { listActiveBundles } from "@/features/catalog/queries";

export const metadata = {
  title: "Catalogo corsi — Evalis",
  description:
    "Esplora i corsi professionali: Auditor ISO, energia e sostenibilità, intelligenza artificiale. Preparazione online, esame e certificato verificabile.",
};

// Catalogo PUBBLICO (pre-login): vetrina marketing CON i prezzi, come l'area riservata.
// I corsi arrivano dal DB (pubblicati).
// L'acquisto vero resta nell'area riservata: il prezzo porta alla registrazione e poi lì.
export default async function Page() {
  const [auditorCourses, aiCourses, managerialiCourses, mestieriCourses, bundles] = await Promise.all([
    listAuditorVetrina(),
    listAiVetrina(),
    listManagerialiVetrina(),
    listMestieriVetrina(),
    listActiveBundles(),
  ]);
  return (
    <Catalogo
      auditorCourses={auditorCourses}
      aiCourses={aiCourses}
      managerialiCourses={managerialiCourses}
      mestieriCourses={mestieriCourses}
      bundles={bundles}
    />
  );
}

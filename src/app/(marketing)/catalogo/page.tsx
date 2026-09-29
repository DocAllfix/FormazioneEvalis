import Catalogo from "@/components/pages/Catalogo";
import { listAuditorVetrina, listAiVetrina, listManagerialiVetrina } from "@/features/catalog/vetrina";
import { listActiveBundles } from "@/features/catalog/queries";

export const metadata = {
  title: "Catalogo corsi — Evalis",
  description:
    "Esplora i corsi professionali: Auditor ISO, mestieri e professioni, settore bancario. Preparazione online, esame e certificato verificabile.",
};

// Catalogo PUBBLICO (pre-login): vetrina marketing CON i prezzi, come l'area riservata.
// I corsi arrivano dal DB (pubblicati); mestieri e bancario restano statici, senza prezzo.
// L'acquisto vero resta nell'area riservata: il prezzo porta alla registrazione e poi lì.
export default async function Page() {
  const [auditorCourses, aiCourses, managerialiCourses, bundles] = await Promise.all([
    listAuditorVetrina(),
    listAiVetrina(),
    listManagerialiVetrina(),
    listActiveBundles(),
  ]);
  return (
    <Catalogo
      auditorCourses={auditorCourses}
      aiCourses={aiCourses}
      managerialiCourses={managerialiCourses}
      bundles={bundles}
    />
  );
}

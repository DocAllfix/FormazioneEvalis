import Catalogo from "@/components/pages/Catalogo";
import { listAuditorVetrina } from "@/features/catalog/vetrina";

export const metadata = {
  title: "Catalogo corsi — Evalis",
  description:
    "Esplora i corsi professionali: Auditor ISO, mestieri e professioni, settore bancario. Preparazione online, esame e certificato verificabile.",
};

// Catalogo PUBBLICO (pre-login): vetrina marketing, SENZA prezzi né acquisto.
// I corsi Auditor ISO arrivano dal DB (pubblicati); le altre aree restano statiche.
// Il catalogo con prezzi/dettagli/acquisto vive esclusivamente nell'area post-login.
export default async function Page() {
  const auditorCourses = await listAuditorVetrina();
  return <Catalogo auditorCourses={auditorCourses} />;
}

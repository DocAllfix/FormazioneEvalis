import Home from "@/components/pages/Home";
import { listAuditorVetrina, listAiVetrina, listManagerialiVetrina, listMestieriVetrina } from "@/features/catalog/vetrina";
import { listActiveBundles } from "@/features/catalog/queries";

export const metadata = {
  title: "Evalis — Certifica le tue competenze professionali",
  description:
    "Preparazione online, esame di verifica e certificato verificabile con QR. Auditor ISO, energia e sostenibilità, intelligenza artificiale.",
};

export default async function Page() {
  const [auditorCourses, aiCourses, managerialiCourses, mestieriCourses, bundles] = await Promise.all([
    listAuditorVetrina(),
    listAiVetrina(),
    listManagerialiVetrina(),
    listMestieriVetrina(),
    listActiveBundles(),
  ]);
  return (
    <Home
      auditorCourses={auditorCourses}
      aiCourses={aiCourses}
      managerialiCourses={managerialiCourses}
      mestieriCourses={mestieriCourses}
      bundles={bundles}
    />
  );
}

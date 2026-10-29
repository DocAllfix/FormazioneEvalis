import Home from "@/components/pages/Home";
import { listAuditorVetrina, listAiVetrina, listManagerialiVetrina, listMestieriVetrina } from "@/features/catalog/vetrina";
import { listActiveBundles } from "@/features/catalog/queries";
import { opinioniPubbliche, mediaRecensioni } from "@/features/recensioni/pubbliche";
import { MIN_OPINIONI_LANDING } from "@/features/recensioni/regole";

export const metadata = {
  title: "Evalis — Certifica le tue competenze professionali",
  description:
    "Preparazione online, esame di verifica e certificato verificabile con QR. Auditor ISO, energia e sostenibilità, intelligenza artificiale.",
};

export default async function Page() {
  const [auditorCourses, aiCourses, managerialiCourses, mestieriCourses, bundles, opinioni, mediaPiattaforma] = await Promise.all([
    listAuditorVetrina(),
    listAiVetrina(),
    listManagerialiVetrina(),
    listMestieriVetrina(),
    listActiveBundles(),
    // un guasto delle recensioni non deve mai far cadere la landing
    opinioniPubbliche({ soloEvidenza: true, limite: 20 }).catch(() => []),
    mediaRecensioni(null).catch(() => null),
  ]);
  return (
    <Home
      auditorCourses={auditorCourses}
      aiCourses={aiCourses}
      managerialiCourses={managerialiCourses}
      mestieriCourses={mestieriCourses}
      bundles={bundles}
      opinioni={opinioni.length >= MIN_OPINIONI_LANDING ? opinioni : []}
      mediaPiattaforma={mediaPiattaforma}
    />
  );
}

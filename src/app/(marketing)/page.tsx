import Home from "@/components/pages/Home";
import { listAuditorVetrina } from "@/features/catalog/vetrina";

export const metadata = {
  title: "Evalis — Certifica le tue competenze professionali",
  description:
    "Preparazione online, esame di verifica e certificato verificabile con QR. Auditor ISO, mestieri e professioni, settore bancario.",
};

export default async function Page() {
  const auditorCourses = await listAuditorVetrina();
  return <Home auditorCourses={auditorCourses} />;
}

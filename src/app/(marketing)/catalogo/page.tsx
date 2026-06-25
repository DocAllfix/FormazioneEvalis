import Catalogo from "@/components/pages/Catalogo";

export const metadata = {
  title: "Catalogo corsi — Evalis",
  description:
    "Esplora i corsi professionali: Auditor ISO, mestieri e professioni, settore bancario. Preparazione online, esame e certificato verificabile.",
};

// Catalogo PUBBLICO (pre-login): vetrina marketing statica, SENZA prezzi né acquisto.
// Il catalogo con prezzi/dettagli/acquisto vive esclusivamente nell'area post-login.
export default function Page() {
  return <Catalogo />;
}

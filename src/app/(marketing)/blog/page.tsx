import Blog from "@/components/pages/Blog";
import { elencoBlog } from "@/features/blog/fonte";

const APP = (process.env.NEXT_PUBLIC_APP_URL ?? "https://evalisacademy.it").replace(/\/$/, "");

export const metadata = {
  title: "Blog — Evalis",
  description:
    "Approfondimenti su certificazione delle competenze, schemi CERTIS, Auditor ISO e formazione professionale.",
  alternates: { canonical: `${APP}/blog` },
};

export default async function Page() {
  // se il CMS non risponde l'errore sale: la compilazione fallisce e resta online il sito
  // precedente, che e' molto meglio di pubblicare un blog vuoto
  const articoli = await elencoBlog();
  return <Blog articoli={articoli} />;
}

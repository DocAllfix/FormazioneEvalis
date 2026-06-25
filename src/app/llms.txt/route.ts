// /llms.txt (GEO): indice in chiaro del sito + corsi reali, per gli AI-crawler.
import { listPublishedCourses } from "@/features/catalog/queries";

const APP = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export async function GET() {
  const courses = await listPublishedCourses().catch(() => []);
  const lines = [
    "# Evalis",
    "",
    "> Piattaforma italiana di certificazione delle competenze professionali: preparazione online con relatore avatar, esame con domande a estrazione casuale e certificato verificabile con QR e codice univoco. Aree: Auditor ISO, mestieri e professioni, settore bancario.",
    "",
    "## Corsi",
    ...courses
      .filter((c) => c.slug)
      .map((c) => `- [${c.title}](${APP}/catalogo/${c.slug})${c.description ? `: ${c.description}` : ""}`),
    "",
    "## Pagine",
    `- [Catalogo](${APP}/catalogo)`,
    `- [Per le aziende](${APP}/aziende)`,
    `- [Blog](${APP}/blog)`,
    "",
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

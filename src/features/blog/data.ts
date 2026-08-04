// Formattazione delle date del blog. File a se' stante, SENZA dipendenze: lo importano anche i
// componenti client, e mappa.ts trascina con se' `sanitize-html`, che nel bundle del browser non
// deve finire.

const MESI = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

/** Data ISO → "12 Giu 2026", il formato che i componenti mostrano oggi. */
export function dataItaliana(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCDate()} ${MESI[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Solo la parte data di un ISO ("2026-06-12"), per `datePublished` e per `<time datetime>`. */
export function soloGiorno(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

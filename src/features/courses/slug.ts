// Slug SEO-friendly da un titolo. Logica pura, testabile.
// Lowercase, accenti rimossi, non-alfanumerici → trattino, max 80 char.

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "") // rimuove le marche diacritiche (à→a)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80)
      .replace(/-+$/g, "") || "corso"
  );
}

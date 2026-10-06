// Un corso è IN VENDITA se è pubblicato e appartiene al catalogo pubblico (non a un'azienda).
// Ritirare un corso lo riporta in bozza: da quel momento non si compra più, né da solo né
// dentro un pacchetto. Il checkout usa questa regola: la vetrina la applica già in SQL.

export function inVendita(c: { status: string; organizationId: string | null }): boolean {
  return c.status === "published" && c.organizationId === null;
}

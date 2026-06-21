// Funzioni PURE (nessun import, Edge-safe) condivise tra middleware (Edge) e codice Node.
// Sottodomini riservati, validazione slug, estrazione sottodominio dall'Host.

export const RESERVED_SUBDOMAINS = new Set([
  "www", "app", "api", "admin", "auth", "dashboard", "account", "static",
  "assets", "cdn", "mail", "smtp", "root", "support", "help", "blog",
  "status", "verify", "billing", "stripe", "public",
]);

export function isReservedSubdomain(sub: string): boolean {
  return RESERVED_SUBDOMAINS.has(sub);
}

/** Slug valido per sottodominio: lowercase, 2–63 char [a-z0-9-], non riservato, no trattini ai bordi. */
export function isValidSlug(slug: string): boolean {
  if (!/^[a-z0-9-]{2,63}$/.test(slug)) return false;
  if (slug.startsWith("-") || slug.endsWith("-")) return false;
  return !RESERVED_SUBDOMAINS.has(slug);
}

/** Estrae il sottodominio dall'Host rispetto al dominio radice. null = dominio principale (B2C/marketing). */
export function extractSubdomain(host: string | null, rootDomain: string): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0].toLowerCase();
  const root = rootDomain.split(":")[0].toLowerCase();

  if (hostname === root || hostname === `www.${root}`) return null;
  if (hostname.endsWith(`.${root}`)) {
    return hostname.slice(0, hostname.length - root.length - 1) || null;
  }
  // dev: foo.localhost
  if (hostname !== "localhost" && hostname.endsWith(".localhost")) {
    return hostname.slice(0, hostname.length - ".localhost".length) || null;
  }
  return null;
}

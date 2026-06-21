// Risoluzione tenant lato Node (Server Components / Route handlers): legge l'header
// `x-org-slug` impostato dal middleware e risolve l'organizzazione con cache TTL
// per evitare un colpo DB ad ogni richiesta. Chi consuma decide il 404 su slug ignoto.

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organization } from "@/lib/db/schema";

export type TenantOrg = { id: string; name: string; slug: string };

const TTL_MS = 60_000;
const cache = new Map<string, { value: TenantOrg | null; exp: number }>();

export async function getTenantSlug(): Promise<string | null> {
  const h = await headers();
  return h.get("x-org-slug");
}

export async function resolveOrgBySlug(slug: string): Promise<TenantOrg | null> {
  const now = Date.now();
  const hit = cache.get(slug);
  if (hit && hit.exp > now) return hit.value;

  const [org] = await db
    .select({ id: organization.id, name: organization.name, slug: organization.slug })
    .from(organization)
    .where(eq(organization.slug, slug))
    .limit(1);

  const value = org ?? null;
  cache.set(slug, { value, exp: now + TTL_MS });
  return value;
}

/** Org del sottodominio corrente, o null sul dominio principale / slug inesistente. */
export async function getTenantOrg(): Promise<TenantOrg | null> {
  const slug = await getTenantSlug();
  if (!slug) return null;
  return resolveOrgBySlug(slug);
}

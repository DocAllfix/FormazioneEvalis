// Creazione organizzazioni (personale B2C + azienda B2B) via insert diretto.
// Insert diretto (non l'API del plugin) perché scriviamo sulle stesse tabelle che
// il plugin organization legge: trasparente in lettura, deterministico in scrittura.

import { db } from "@/lib/db";
import { organization, member } from "@/lib/db/schema";
import { isValidSlug } from "@/lib/reserved-subdomains";
import { serializeOrgMetadata } from "./org-metadata";

/** Org personale del B2C: 1 membro owner, seatLimit 1, slug non-sottodominio `u-<id>`. */
export async function createPersonalOrg(userId: string): Promise<string> {
  const orgId = crypto.randomUUID();
  const now = new Date();
  await db.insert(organization).values({
    id: orgId,
    name: "Spazio personale",
    slug: `u-${userId}`,
    createdAt: now,
    metadata: serializeOrgMetadata({ type: "personal", seatLimit: 1 }),
  });
  await db.insert(member).values({
    id: crypto.randomUUID(),
    organizationId: orgId,
    userId,
    role: "owner",
    createdAt: now,
  });
  return orgId;
}

/** Org azienda B2B: slug = sottodominio, owner = creatore, seatLimit impostato a mano (Stripe poi). */
export async function createCompanyOrg(params: {
  name: string;
  slug: string;
  seatLimit: number;
  ownerUserId: string;
}): Promise<string> {
  const { name, slug, seatLimit, ownerUserId } = params;
  if (!isValidSlug(slug)) {
    throw new Error(`Slug non valido o riservato: "${slug}"`);
  }
  const orgId = crypto.randomUUID();
  const now = new Date();
  await db.insert(organization).values({
    id: orgId,
    name,
    slug,
    createdAt: now,
    metadata: serializeOrgMetadata({ type: "company", seatLimit }),
  });
  await db.insert(member).values({
    id: crypto.randomUUID(),
    organizationId: orgId,
    userId: ownerUserId,
    role: "owner",
    createdAt: now,
  });
  return orgId;
}

// Vincolo posti (seat) = membri ≤ seatLimit dell'organizzazione.
// Billing differito: `seatLimit` vive in organization.metadata (impostato a mano ora,
// collegato a Stripe.quantity nello slice billing).

import { count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { member, organization } from "@/lib/db/schema";
import { parseOrgMetadata } from "@/features/auth/org-metadata";

export async function countMembers(orgId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(member)
    .where(eq(member.organizationId, orgId));
  return row?.value ?? 0;
}

export async function getSeatLimit(orgId: string): Promise<number> {
  const [org] = await db
    .select({ seats: organization.seats, metadata: organization.metadata })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);
  // Org azienda: posti dall'abbonamento (colonna `seats`, popolata dal webhook).
  // Org personale B2C: nessun abbonamento → fallback su metadata.seatLimit (= 1).
  return org?.seats ?? parseOrgMetadata(org?.metadata)?.seatLimit ?? 0;
}

/** Lancia se non ci sono posti liberi (membri attuali ≥ seatLimit). */
export async function assertSeatAvailable(orgId: string): Promise<void> {
  const [used, limit] = await Promise.all([countMembers(orgId), getSeatLimit(orgId)]);
  if (used >= limit) {
    throw new Error(`Posti esauriti (${used}/${limit}) per l'organizzazione ${orgId}.`);
  }
}

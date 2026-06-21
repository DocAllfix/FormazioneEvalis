// Forma tipizzata di `organization.metadata` (colonna text JSON di better-auth).
// Scelta di fase: i campi Stripe restano qui (billing differito) invece di colonne
// dedicate — niente migrazioni premature. Si promuovono a colonne solo se servirà.

import { z } from "zod";

export const orgMetadataSchema = z.object({
  type: z.enum(["personal", "company"]),
  seatLimit: z.number().int().positive(),
  // placeholder billing (cablati nello slice Stripe)
  stripeCustomerId: z.string().optional(),
  stripeSubscriptionId: z.string().optional(),
  plan: z.string().optional(),
  status: z.string().optional(),
});

export type OrgMetadata = z.infer<typeof orgMetadataSchema>;

export function serializeOrgMetadata(m: OrgMetadata): string {
  return JSON.stringify(orgMetadataSchema.parse(m));
}

export function parseOrgMetadata(raw: string | null | undefined): OrgMetadata | null {
  if (!raw) return null;
  try {
    return orgMetadataSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

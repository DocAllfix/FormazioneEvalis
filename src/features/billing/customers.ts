// Customer Stripe per organizzazione (B2C personale o B2B azienda). Idempotente:
// se l'org ha già `stripe_customer_id` lo riusa.

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organization, member, user } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe/client";

export async function ensureStripeCustomer(orgId: string): Promise<string> {
  const [org] = await db
    .select({ name: organization.name, customerId: organization.stripeCustomerId })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);
  if (!org) throw new Error("Organizzazione inesistente.");
  if (org.customerId) return org.customerId;

  const [owner] = await db
    .select({ email: user.email, name: user.name })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(and(eq(member.organizationId, orgId), eq(member.role, "owner")))
    .limit(1);

  const customer = await getStripe().customers.create({
    name: org.name,
    email: owner?.email,
    metadata: { orgId },
  });
  await db.update(organization).set({ stripeCustomerId: customer.id }).where(eq(organization.id, orgId));
  return customer.id;
}

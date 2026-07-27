"use server";

// Prezzo corso (admin piattaforma). Imposta il prezzo = crea uno Stripe Price (immutabile)
// e denormalizza priceCents/currency per la vetrina; il checkout usa stripePriceId.
// Cambiare prezzo crea un nuovo Price (il vecchio resta archiviato in Stripe).

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { course } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe/client";
import { requirePlatformAdmin } from "@/features/auth/guards";

export async function setCoursePrice(
  courseId: string,
  priceCents: number,
  currency = "eur",
  opts?: { listPriceCents?: number | null },
): Promise<void> {
  await requirePlatformAdmin();
  if (!Number.isInteger(priceCents) || priceCents < 50) throw new Error("Prezzo minimo 0,50 €.");
  const [c] = await db
    .select({ title: course.title, stripeProductId: course.stripeProductId, stripePriceId: course.stripePriceId })
    .from(course)
    .where(eq(course.id, courseId))
    .limit(1);
  if (!c) throw new Error("Corso inesistente.");

  const stripe = getStripe();
  // Product persistito: un cambio prezzo crea un nuovo Price sullo STESSO Product
  // (prima nasceva un Product a ogni modifica). tax_behavior exclusive = prezzi "+ IVA"
  // (richiesto da Stripe Tax; il valore non è modificabile su un Price già usato).
  const productId = c.stripeProductId ?? (await stripe.products.create({ name: c.title })).id;
  const price = await stripe.prices.create({
    product: productId,
    currency,
    unit_amount: priceCents,
    tax_behavior: "exclusive",
  });
  if (c.stripePriceId) {
    await stripe.prices.update(c.stripePriceId, { active: false }).catch(() => {}); // best-effort
  }

  await db
    .update(course)
    .set({
      stripePriceId: price.id,
      stripeProductId: productId,
      priceCents,
      currency,
      ...(opts && "listPriceCents" in opts ? { listPriceCents: opts.listPriceCents } : {}),
    })
    .where(eq(course.id, courseId));
}

export async function removeCoursePrice(courseId: string): Promise<void> {
  await requirePlatformAdmin();
  await db
    .update(course)
    .set({ stripePriceId: null, priceCents: null, listPriceCents: null, currency: null })
    .where(eq(course.id, courseId));
}

export async function setCourseCategory(courseId: string, category: string | null): Promise<void> {
  await requirePlatformAdmin();
  await db.update(course).set({ category: category?.trim() || null }).where(eq(course.id, courseId));
}

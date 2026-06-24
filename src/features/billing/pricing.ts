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
): Promise<void> {
  await requirePlatformAdmin();
  if (!Number.isInteger(priceCents) || priceCents < 50) throw new Error("Prezzo minimo 0,50 €.");
  const [c] = await db.select({ title: course.title }).from(course).where(eq(course.id, courseId)).limit(1);
  if (!c) throw new Error("Corso inesistente.");

  const price = await getStripe().prices.create({
    currency,
    unit_amount: priceCents,
    product_data: { name: c.title },
  });

  await db.update(course).set({ stripePriceId: price.id, priceCents, currency }).where(eq(course.id, courseId));
}

export async function removeCoursePrice(courseId: string): Promise<void> {
  await requirePlatformAdmin();
  await db
    .update(course)
    .set({ stripePriceId: null, priceCents: null, currency: null })
    .where(eq(course.id, courseId));
}

export async function setCourseCategory(courseId: string, category: string | null): Promise<void> {
  await requirePlatformAdmin();
  await db.update(course).set({ category: category?.trim() || null }).where(eq(course.id, courseId));
}

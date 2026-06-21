// Istanza Stripe lazy (secret key, server-only). Chiamata diretta all'SDK: un solo
// provider, niente adapter (CLAUDE.md §2). Non tocchiamo mai dati carta (PCI resta in Stripe).

import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY non impostata.");
  if (!stripe) stripe = new Stripe(key);
  return stripe;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

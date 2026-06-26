// Stato onboarding per-utente. Tutte le letture/scritture passano per withTenant({userId})
// → RLS reale (user_id = app.user_id). Logica pura testabile; i guard sono nei server-actions.

import { eq } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { userOnboarding } from "@/lib/db/schema";
import type { OnboardingPersona } from "@/lib/db/schema/onboarding";
import { resolveOnboardingPersona } from "./persona";

export type OnboardingRow = typeof userOnboarding.$inferSelect;

/** Stato corrente (o null se l'utente non ha ancora un record). */
export async function getOnboardingState(userId: string): Promise<OnboardingRow | null> {
  const rows = await withTenant({ userId }, async (tx) =>
    tx.select().from(userOnboarding).where(eq(userOnboarding.userId, userId)).limit(1),
  );
  return rows[0] ?? null;
}

/** Crea il record (persona risolta dal dato reale) se manca; idempotente. */
export async function ensureOnboarding(userId: string): Promise<OnboardingRow> {
  const existing = await getOnboardingState(userId);
  if (existing) return existing;

  const { persona, orgId } = await resolveOnboardingPersona(userId);
  await withTenant({ userId }, async (tx) =>
    tx
      .insert(userOnboarding)
      .values({ userId, organizationId: orgId, persona })
      .onConflictDoNothing({ target: userOnboarding.userId }),
  );
  // Re-read: gestisce sia l'insert sia la corsa (conflict).
  const row = await getOnboardingState(userId);
  if (!row) throw new Error("Impossibile inizializzare l'onboarding.");
  return row;
}

type Patch = {
  currentStep?: number;
  completedSteps?: string[];
  goal?: string | null;
};

/** Aggiorna step/goal (avanzamento wizard). */
export async function patchOnboarding(userId: string, patch: Patch): Promise<void> {
  await ensureOnboarding(userId);
  await withTenant({ userId }, async (tx) =>
    tx
      .update(userOnboarding)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(userOnboarding.userId, userId)),
  );
}

/** Segna l'onboarding come concluso. */
export async function completeOnboarding(userId: string): Promise<void> {
  await ensureOnboarding(userId);
  await withTenant({ userId }, async (tx) =>
    tx
      .update(userOnboarding)
      .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(userOnboarding.userId, userId)),
  );
}

/** Segna l'onboarding come saltato (non verrà più riproposto). */
export async function skipOnboarding(userId: string): Promise<void> {
  await ensureOnboarding(userId);
  await withTenant({ userId }, async (tx) =>
    tx
      .update(userOnboarding)
      .set({ status: "skipped", updatedAt: new Date() })
      .where(eq(userOnboarding.userId, userId)),
  );
}

/** True se l'utente deve ancora fare l'onboarding (gate del layout). */
export async function needsOnboarding(userId: string): Promise<boolean> {
  const row = await getOnboardingState(userId);
  return !row || row.status === "pending";
}

export type { OnboardingPersona };

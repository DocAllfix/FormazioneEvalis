"use server";

// Wrapper Server Action gated: l'utente loggato agisce solo sul PROPRIO onboarding
// (requireSession → userId; RLS lato DB come seconda barriera).

import { requireSession } from "@/features/auth/guards";
import {
  patchOnboarding,
  completeOnboarding,
  skipOnboarding,
} from "./state";

export async function saveOnboardingGoalAction(goal: string): Promise<void> {
  const { user } = await requireSession();
  await patchOnboarding(user.id, { goal });
}

/** Autodichiarazione ISO 19011 (advisory). Settabile in onboarding e al momento dell'avviso. */
export async function setIso19011DeclarationAction(iso19011Certified: boolean): Promise<void> {
  const { user } = await requireSession();
  await patchOnboarding(user.id, { iso19011Certified });
}

export async function advanceOnboardingStepAction(
  currentStep: number,
  completedSteps: string[],
): Promise<void> {
  const { user } = await requireSession();
  await patchOnboarding(user.id, { currentStep, completedSteps });
}

export async function completeOnboardingAction(): Promise<void> {
  const { user } = await requireSession();
  await completeOnboarding(user.id);
}

export async function skipOnboardingAction(): Promise<void> {
  const { user } = await requireSession();
  await skipOnboarding(user.id);
}

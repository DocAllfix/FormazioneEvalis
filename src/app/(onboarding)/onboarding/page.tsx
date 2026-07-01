import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/server";
import { ensureOnboarding } from "@/features/onboarding/state";
import { resolveOnboardingPersona } from "@/features/onboarding/persona";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const metadata = { title: "Benvenuto — Evalis Academy" };

export default async function OnboardingPage() {
  const ctx = await getCurrentSession();
  if (!ctx) redirect("/login");

  // Crea il record (persona risolta dal dato reale) se manca; se già concluso/saltato esci.
  const ob = await ensureOnboarding(ctx.user.id);
  if (ob.status !== "pending") redirect("/dashboard");

  // Nome azienda solo per i flussi B2B (copy di benvenuto).
  let companyName: string | undefined;
  if (ob.persona !== "b2c") {
    companyName = (await resolveOnboardingPersona(ctx.user.id)).companyName;
  }

  return (
    <OnboardingWizard
      persona={ob.persona}
      companyName={companyName}
      initialGoal={ob.goal}
      initialStep={ob.currentStep}
      initialIso19011={ob.iso19011Certified}
    />
  );
}

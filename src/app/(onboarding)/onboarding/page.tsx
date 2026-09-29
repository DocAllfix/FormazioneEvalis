import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/server";
import { ensureOnboarding } from "@/features/onboarding/state";
import { resolveOnboardingPersona } from "@/features/onboarding/persona";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { pathInterno } from "@/lib/next-sicuro";

export const metadata = { title: "Benvenuto — Evalis Academy" };

// `next`: dove andare a onboarding concluso. Arriva dal link di conferma email di chi si è
// registrato cliccando un prezzo in landing (vedi Register.jsx): è la scheda del corso o il
// pacchetto scelto. Senza, vale la destinazione predefinita della persona.
export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const destinazione = next ? pathInterno(next, "") : "";

  const ctx = await getCurrentSession();
  if (!ctx) {
    redirect(destinazione
      ? `/login?next=${encodeURIComponent(`/onboarding?next=${encodeURIComponent(destinazione)}`)}`
      : "/login");
  }

  // Crea il record (persona risolta dal dato reale) se manca; se già concluso/saltato esci.
  const ob = await ensureOnboarding(ctx.user.id);
  if (ob.status !== "pending") redirect(destinazione || "/dashboard");

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
      destinazione={destinazione || undefined}
    />
  );
}

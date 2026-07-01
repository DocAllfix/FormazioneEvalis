"use client";

// Wizard onboarding first-run, ramificato per PERSONA (B2C / admin azienda / dipendente invitato).
// Saltabile, stato persistito via server actions. Stile Ambra (DESIGN.md). Rispetta
// prefers-reduced-motion (nessuna animazione bloccante).

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Building2,
  Users,
  BookOpen,
  ShieldCheck,
  Briefcase,
  Landmark,
  ArrowRight,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  saveOnboardingGoalAction,
  setIso19011DeclarationAction,
  advanceOnboardingStepAction,
  completeOnboardingAction,
  skipOnboardingAction,
} from "@/features/onboarding/server-actions";
import type { OnboardingPersona } from "@/lib/db/schema/onboarding";

const GOALS = [
  { id: "auditor_iso", label: "Auditor ISO", desc: "Schemi 9001, 14001, 45001…", icon: ShieldCheck },
  { id: "mestieri", label: "Mestieri e professioni", desc: "Qualifiche professionali", icon: Briefcase },
  { id: "bancario", label: "Settore bancario", desc: "Ruoli e compliance bancaria", icon: Landmark },
] as const;

type StepDef = { key: string; title: string; body: string; icon: typeof BookOpen };

// Step informativo ISO 19011 (advisory): comunica che senza la 19011 le altre certificazioni ISO non
// sono applicabili in ambito lavorativo. Mostrato ai b2b_member e ai b2c che scelgono l'area Auditor ISO.
const ISO19011_STEP: StepDef = {
  key: "iso19011",
  title: "Sei già certificato ISO 19011?",
  body: "La ISO 19011 è la norma sull’auditing: senza questa certificazione, le altre certificazioni ISO non sono applicabili in ambito lavorativo.",
  icon: ShieldCheck,
};

function stepsFor(persona: OnboardingPersona, companyName?: string, goal?: string | null): StepDef[] {
  if (persona === "b2b_admin") {
    return [
      { key: "welcome", title: "Benvenuto in Evalis Academy", body: "Gestisci la formazione della tua azienda: crea lo spazio, invita le persone e assegna le certificazioni.", icon: Building2 },
      { key: "company", title: "Crea lo spazio azienda", body: "Dalla console azienda configuri nome e sottodominio, poi gestisci posti e fatturazione.", icon: Building2 },
      { key: "people", title: "Invita e assegna", body: "Invita i dipendenti via email (nel limite dei posti) e assegna a ciascuno le certificazioni da seguire.", icon: Users },
    ];
  }
  if (persona === "b2b_member") {
    return [
      { key: "welcome", title: companyName ? `Benvenuto, ti ha invitato ${companyName}` : "Benvenuto in Evalis Academy", body: "La tua azienda ti ha iscritto alla piattaforma. Le certificazioni assegnate ti aspettano nella dashboard.", icon: Building2 },
      ISO19011_STEP,
      { key: "start", title: "Inizia il tuo percorso", body: "Apri “I miei percorsi” e riprendi da dove serve: preparazione online, esame e certificato verificabile.", icon: BookOpen },
    ];
  }
  // b2c — lo step 19011 compare solo se l'area scelta è Auditor ISO.
  return [
    { key: "welcome", title: "Benvenuto in Evalis Academy", body: "Preparati online, supera l’esame e ottieni un certificato verificabile con QR. Iniziamo in un minuto.", icon: GraduationCap },
    { key: "goal", title: "Cosa vuoi certificare?", body: "Scegli l’area che ti interessa: personalizziamo il catalogo per te.", icon: BookOpen },
    ...(goal === "auditor_iso" ? [ISO19011_STEP] : []),
    { key: "start", title: "Tutto pronto", body: "Scegli una certificazione dal catalogo e inizia la tua preparazione quando vuoi.", icon: Check },
  ];
}

function destinationFor(persona: OnboardingPersona): string {
  if (persona === "b2b_admin") return "/admin";
  if (persona === "b2b_member") return "/dashboard";
  return "/corsi"; // B2C → catalogo per scegliere/acquistare
}

export function OnboardingWizard({
  persona,
  companyName,
  initialGoal,
  initialStep,
  initialIso19011,
}: {
  persona: OnboardingPersona;
  companyName?: string;
  initialGoal: string | null;
  initialStep: number;
  initialIso19011: boolean | null;
}) {
  const router = useRouter();
  const [goal, setGoal] = useState<string | null>(initialGoal);
  const [iso19011, setIso19011] = useState<boolean | null>(initialIso19011);
  const [pending, startTransition] = useTransition();

  // Gli step dipendono dall'area scelta (b2c + auditor_iso → compare lo step 19011).
  const steps = useMemo(() => stepsFor(persona, companyName, goal), [persona, companyName, goal]);
  const [step, setStep] = useState(Math.min(initialStep, steps.length - 1));

  const safeStep = Math.min(step, steps.length - 1);
  const current = steps[safeStep];
  const isLast = safeStep === steps.length - 1;
  const isGoalStep = current.key === "goal";
  const isIsoStep = current.key === "iso19011";
  const canAdvance = (!isGoalStep || !!goal) && (!isIsoStep || iso19011 !== null);

  function go(to: string) {
    router.push(to);
    router.refresh();
  }

  function finish() {
    startTransition(async () => {
      await completeOnboardingAction();
      go(destinationFor(persona));
    });
  }

  function skip() {
    startTransition(async () => {
      await skipOnboardingAction();
      go("/dashboard");
    });
  }

  function next() {
    if (isLast) return finish();
    const target = safeStep + 1;
    setStep(target);
    const completed = steps.slice(0, target).map((s) => s.key);
    startTransition(async () => {
      await advanceOnboardingStepAction(target, completed);
    });
  }

  function chooseGoal(id: string) {
    setGoal(id);
    startTransition(async () => {
      await saveOnboardingGoalAction(id);
    });
  }

  function chooseIso19011(v: boolean) {
    setIso19011(v);
    startTransition(async () => {
      await setIso19011DeclarationAction(v);
    });
  }

  const Icon = current.icon;

  return (
    <div className="w-full max-w-lg">
      {/* progress dots */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {steps.map((s, i) => (
          <span
            key={s.key}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === safeStep ? "w-8 bg-primary" : i < safeStep ? "w-4 bg-primary/40" : "w-4 bg-border"
            }`}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-7 w-7" />
          </span>
          <h1 className="mt-5 font-heading text-2xl text-near-black">{current.title}</h1>
          <p className="mt-2 max-w-sm text-muted-foreground">{current.body}</p>
        </div>

        {isGoalStep && (
          <div className="mt-6 grid gap-3">
            {GOALS.map((g) => {
              const GIcon = g.icon;
              const active = goal === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => chooseGoal(g.id)}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-secondary"
                  }`}
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${active ? "bg-primary text-white" : "bg-secondary text-near-black"}`}>
                    <GIcon className="h-5 w-5" />
                  </span>
                  <span className="flex-1">
                    <span className="block font-medium text-near-black">{g.label}</span>
                    <span className="block text-sm text-muted-foreground">{g.desc}</span>
                  </span>
                  {active && <Check className="h-5 w-5 text-primary" />}
                </button>
              );
            })}
          </div>
        )}

        {isIsoStep && (
          <div className="mt-6 grid gap-3">
            {([
              { id: true, label: "Sì, sono già certificato ISO 19011" },
              { id: false, label: "No, non ancora" },
            ] as const).map((opt) => {
              const active = iso19011 === opt.id;
              return (
                <button
                  key={String(opt.id)}
                  type="button"
                  onClick={() => chooseIso19011(opt.id)}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                    active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-secondary"
                  }`}
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${active ? "bg-primary text-white" : "bg-secondary text-near-black"}`}>
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <span className="flex-1 font-medium text-near-black">{opt.label}</span>
                  {active && <Check className="h-5 w-5 text-primary" />}
                </button>
              );
            })}
            {iso19011 === false && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Nessun problema: potrai seguire comunque i corsi ISO. Ricorda però che, senza la ISO 19011,
                le relative certificazioni non sono applicabili in ambito lavorativo. Potrai aggiungere la
                19011 in qualsiasi momento.
              </p>
            )}
          </div>
        )}

        {persona === "b2b_admin" && current.key === "company" && (
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={() => go("/admin")} disabled={pending}>
              <Building2 className="mr-2 h-4 w-4" /> Vai alla console azienda
            </Button>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={skip}
            disabled={pending}
            className="text-sm text-muted-foreground hover:text-near-black"
          >
            Salta
          </button>
          <div className="flex items-center gap-2">
            {safeStep > 0 && (
              <Button variant="ghost" onClick={() => setStep(safeStep - 1)} disabled={pending}>
                Indietro
              </Button>
            )}
            <Button onClick={next} disabled={pending || !canAdvance}>
              {isLast ? "Inizia" : "Avanti"}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

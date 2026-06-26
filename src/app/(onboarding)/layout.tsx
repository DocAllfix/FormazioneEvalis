// Layout onboarding: schermata dedicata e focalizzata (niente sidebar). Centra il wizard
// con il marchio in alto. Il gate sessione è nella pagina.

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/monogram.png" alt="Evalis Academy" className="mb-8 h-12 w-12 object-contain" />
      {children}
    </div>
  );
}

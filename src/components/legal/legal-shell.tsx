// Guscio condiviso delle pagine legali (privacy/cookie/termini): header+footer del sito,
// contenitore leggibile, primitive tipografiche coerenti con la palette Ambra.
import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";

export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="w-full pt-28 md:pt-32 pb-16 md:pb-24">
          <div className="mx-auto max-w-3xl px-6 md:px-10">
            <h1 className="font-heading text-4xl md:text-5xl text-near-black leading-[1.1]">{title}</h1>
            <p className="mt-3 text-sm text-[#766E66]">Ultimo aggiornamento: {updated}</p>
            <div className="mt-10 space-y-6">{children}</div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="font-heading text-xl md:text-2xl text-near-black mt-10 mb-1">{children}</h2>;
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] leading-relaxed text-[#5C5347]">{children}</p>;
}

export function UL({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc pl-5 space-y-1.5 text-[15px] leading-relaxed text-[#5C5347]">{children}</ul>;
}

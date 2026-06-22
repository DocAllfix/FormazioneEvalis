import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ScrollReveal from "@/components/landing/ScrollReveal";
import { ProgressBar, StatusPill } from "./ConsoleBits";

const heroRows = [
  { name: "Marco Rossi", cert: "ISO 9001", progress: 85, status: "Pronto per l'esame" },
  { name: "Laura Bianchi", cert: "ISO 14001", progress: 100, status: "Certificato" },
  { name: "Giovanni Mele", cert: "ISO 45001", progress: 42, status: "In corso" },
  { name: "Sara Conti", cert: "ISO 9001", progress: 0, status: "Non iniziato" },
];

export default function AziendeHero() {
  return (
    <section className="relative min-h-[88vh] flex items-center dot-grid bg-background pt-28 pb-16">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 w-full">
        <div className="grid lg:grid-cols-[55%_45%] gap-12 lg:gap-10 items-center">
          <ScrollReveal>
            <span className="text-[11px] uppercase tracking-[0.16em] text-primary font-medium">Per le aziende</span>
            <h1 className="mt-4 font-heading text-[52px] md:text-[68px] lg:text-[80px] leading-[1.05] text-near-black">
              Certifica le competenze del tuo team, in modo verificabile.
            </h1>
            <p className="mt-6 text-[18px] text-[#7A7068] leading-relaxed max-w-[480px]">
              Assegni i percorsi, monitori la preparazione e ottieni certificati verificabili, tutto da un'unica console aziendale.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#contatti" className="inline-flex items-center gap-2 text-sm font-medium text-white bg-primary rounded-lg px-5 py-3 hover:brightness-110 hover:scale-[1.02] transition-all duration-200">
                Richiedi una demo <ArrowRight className="h-4 w-4" />
              </a>
              <Link href="/registrati" className="inline-flex items-center text-sm font-medium text-near-black border border-near-black/20 rounded-lg px-5 py-3 hover:bg-cream-dark transition-all duration-200">
                Crea un account azienda
              </Link>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <div className="bg-white rounded-xl border border-[#EAE4DB] overflow-hidden" style={{ transform: "perspective(1200px) rotateX(2deg) rotateY(-4deg)", boxShadow: "0 24px 64px rgba(26,18,9,0.12)" }}>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#EAE4DB] bg-[#FAFAF7]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E84C0A]"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#E8E0D5]"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#E8E0D5]"></span>
                <span className="ml-3 text-xs text-[#766E66] bg-white border border-[#EAE4DB] rounded-md px-3 py-1">app.evalis.it/azienda</span>
              </div>
              <div className="p-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-[#766E66] border-b border-[#EAE4DB]">
                      <th className="pb-2 pr-3 font-medium">Nome</th>
                      <th className="pb-2 pr-3 font-medium">Cert.</th>
                      <th className="pb-2 pr-3 font-medium">% Prep.</th>
                      <th className="pb-2 pr-3 font-medium">Stato</th>
                      <th className="pb-2 font-medium text-right">Report</th>
                    </tr>
                  </thead>
                  <tbody>
                    {heroRows.map((row) => (
                      <tr key={row.name} className="border-b border-[#F5EFE6] last:border-0">
                        <td className="py-3 pr-3 text-near-black font-medium whitespace-nowrap">{row.name}</td>
                        <td className="py-3 pr-3 text-[#5C5347] whitespace-nowrap">{row.cert}</td>
                        <td className="py-3 pr-3"><div className="w-16"><ProgressBar value={row.progress} showLabel={false} /></div></td>
                        <td className="py-3 pr-3"><StatusPill status={row.status} /></td>
                        <td className="py-3 text-right"><span className="text-primary text-xs hover:underline cursor-pointer whitespace-nowrap">Scarica</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
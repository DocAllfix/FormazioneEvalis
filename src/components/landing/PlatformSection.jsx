import React from "react";
import ScrollReveal from "./ScrollReveal";
import DashboardMockup from "./DashboardMockup";

export default function PlatformSection() {
  return (
    <section className="w-full py-20 md:py-24 bg-background">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <ScrollReveal>
          <div className="max-w-2xl text-left mb-12">
            <span className="text-[11px] uppercase tracking-[0.16em] text-primary font-medium">
              La piattaforma
            </span>
            <h2 className="mt-3.5 font-heading text-4xl md:text-5xl lg:text-[56px] text-near-black leading-[1.1]">
              Una piattaforma che traccia ogni passo, fino al certificato
            </h2>
            <p className="mt-5 text-base text-[#5C5347] leading-relaxed">
              Percorsi strutturati, progressione monitorata, esame integrato.
              Tutto in un'unica interfaccia.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="rounded-2xl border border-[#EAE4DB] bg-white shadow-[0_12px_32px_rgba(26,18,9,0.08)] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-[#EAE4DB]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#EAE4DB]" />
                <div className="w-3 h-3 rounded-full bg-[#EAE4DB]" />
                <div className="w-3 h-3 rounded-full bg-[#EAE4DB]" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 rounded-md bg-[#FAFAF7] text-xs text-[#766E66] font-mono">
                  evalisacademy.it/dashboard
                </div>
              </div>
            </div>
            <DashboardMockup />
          </div>
        </ScrollReveal>

        <p className="mt-4 text-center text-sm text-[#766E66]">
          Usa il menu a sinistra per esplorare l'interfaccia
        </p>
      </div>
    </section>
  );
}
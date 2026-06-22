import React from "react";
import { Globe, Lock } from "lucide-react";
import ScrollReveal from "@/components/landing/ScrollReveal";

export default function DedicatedSpaceSection() {
  return (
    <section className="w-full py-20 md:py-24 bg-near-black">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <ScrollReveal>
            <span className="text-[11px] uppercase tracking-[0.16em] text-primary font-medium">Spazio dedicato</span>
            <h2 className="mt-3.5 font-heading text-4xl md:text-5xl text-white leading-[1.1]">Il tuo spazio. Il tuo brand.</h2>
            <p className="mt-5 text-base text-[#766E66] leading-relaxed max-w-md">
              I tuoi professionisti accedono da un ambiente riservato all'azienda, su sottodominio personalizzato. Nessuna confusione con altri utenti, tutto brandizzato con il nome della tua organizzazione.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/5 border border-white/10">
              <Globe className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-white">tuaazienda.evalis.it</span>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <div className="bg-[#2A1D10] rounded-xl border border-[#3D2E1E] overflow-hidden" style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#3D2E1E]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E84C0A]"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#5C5347]"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#5C5347]"></span>
                <span className="ml-3 text-xs text-[#766E66] bg-[#1A1209] border border-[#3D2E1E] rounded-md px-3 py-1">tuaazienda.evalis.it</span>
              </div>
              <div className="p-8 flex flex-col items-center">
                <span className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary text-white text-xl font-heading">AC</span>
                <p className="mt-4 text-sm text-[#766E66]">Accedi allo spazio Acme S.r.l.</p>
                <div className="mt-5 w-full max-w-xs space-y-3">
                  <div>
                    <label className="text-[11px] text-[#766E66]">Email</label>
                    <div className="mt-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white/40">mario@acme.it</div>
                  </div>
                  <div>
                    <label className="text-[11px] text-[#766E66]">Password</label>
                    <div className="mt-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white/40 flex items-center justify-between">
                      <span>••••••••</span>
                      <Lock className="h-3.5 w-3.5 text-[#766E66]" />
                    </div>
                  </div>
                  <button className="w-full text-sm font-medium text-white bg-primary rounded-lg py-2.5 hover:brightness-110 transition-all">Accedi</button>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
import React from "react";
import { Plus, Check, Download, ChevronDown } from "lucide-react";
import ScrollReveal from "@/components/landing/ScrollReveal";
import { ProgressBar } from "./ConsoleBits";

const steps = [
  {
    num: "01",
    title: "Crei l'account azienda",
    desc: "Registri l'organizzazione e ottieni subito accesso alla console.",
    card: (
      <div className="space-y-2.5">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[#766E66]">Nome azienda</label>
          <div className="mt-1 px-3 py-2 bg-white border border-[#E8E0D5] rounded-lg text-sm text-[#5C5347]">Acme S.r.l.</div>
        </div>
        <button className="w-full text-xs font-medium text-white bg-primary rounded-lg py-2">Crea account</button>
      </div>
    ),
  },
  {
    num: "02",
    title: "Aggiungi le persone",
    desc: "Inviti i professionisti via email o importi una lista.",
    card: (
      <div className="space-y-2">
        {[{ i: "MR", n: "Marco Rossi" }, { i: "LB", n: "Laura Bianchi" }].map((p) => (
          <div key={p.n} className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white text-[#5C5347] text-[10px] font-medium">{p.i}</span>
            <span className="text-sm text-near-black flex-1">{p.n}</span>
          </div>
        ))}
        <button className="w-full flex items-center justify-center gap-1 text-xs font-medium text-primary border border-dashed border-[#D4C9B8] rounded-lg py-2 hover:bg-white transition-colors">
          <Plus className="h-3.5 w-3.5" /> Aggiungi
        </button>
      </div>
    ),
  },
  {
    num: "03",
    title: "Assegni le certificazioni",
    desc: "Scegli il corso e lo assegni alla persona giusta.",
    card: (
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-3 py-2 bg-white border border-[#E8E0D5] rounded-lg">
          <span className="text-sm text-near-black">ISO 9001</span>
          <ChevronDown className="h-3.5 w-3.5 text-[#766E66]" />
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E8E0D5] rounded-lg">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#F5EFE6] text-[#5C5347] text-[10px] font-medium">MR</span>
          <span className="text-sm text-near-black flex-1">M. Rossi</span>
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white"><Check className="h-3 w-3" /></span>
        </div>
      </div>
    ),
  },
  {
    num: "04",
    title: "Monitori e scarichi i report",
    desc: "Controlli lo stato di preparazione ed esporti i report.",
    card: (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-near-black">M. Rossi</span>
          <span className="text-xs font-medium text-near-black">85%</span>
        </div>
        <ProgressBar value={85} showLabel={false} />
        <button className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-primary border border-[#E8E0D5] rounded-lg py-2 hover:bg-white transition-colors">
          <Download className="h-3.5 w-3.5" /> Scarica report
        </button>
      </div>
    ),
  },
];

export default function HowItWorksSection() {
  return (
    <section className="w-full py-20 md:py-24 bg-background">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <ScrollReveal>
          <span className="text-[11px] uppercase tracking-[0.16em] text-primary font-medium">Come funziona</span>
          <h2 className="mt-3.5 font-heading text-4xl md:text-5xl text-near-black leading-[1.1]">4 passi per certificare il tuo team.</h2>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div key={step.num} className="relative flex flex-col h-full">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-6 -right-3 w-6 border-t-2 border-dashed border-primary/30 z-0" />
                )}
                <div className="relative z-10 flex flex-col h-full">
                  <span className="font-heading text-[56px] leading-none text-primary opacity-20">{step.num}</span>
                  <h3 className="mt-2 font-body font-semibold text-base text-near-black min-h-[24px]">{step.title}</h3>
                  <p className="mt-1.5 text-[13px] text-[#7A7068] leading-relaxed min-h-[40px]">{step.desc}</p>
                  <div className="mt-4 bg-[#F5EFE6] border border-[#E8E0D5] rounded-lg p-4 flex-1 flex flex-col justify-center">{step.card}</div>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
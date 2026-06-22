import React from "react";
import { ArrowRight } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const steps = [
  {
    num: "01",
    title: "Preparati online",
    description:
      "Percorso di preparazione con contenuti strutturati e fruizione tracciata secondo lo schema.",
    mockup: <PrepMockup />,
  },
  {
    num: "02",
    title: "Sostieni l'esame",
    description:
      "Verifica finale con domande a estrazione casuale e soglia di superamento definita dallo schema.",
    mockup: <ExamMockup />,
  },
  {
    num: "03",
    title: "Ottieni il certificato",
    description:
      "Certificato con QR e codice univoco, verificabile da chiunque sulla pagina pubblica.",
    mockup: <CertMockup />,
  },
];

const qrPattern = [
  [1,1,1,0,1,1,1],
  [1,0,1,0,1,0,1],
  [1,1,1,0,1,1,1],
  [0,0,0,0,0,0,0],
  [1,0,1,1,0,1,0],
  [1,1,0,0,1,0,1],
  [1,0,1,1,1,1,1],
];

function PrepMockup() {
  return (
    <div className="bg-[#2A1D12] border border-[#3D2E1E] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[#766E66]">Modulo 3</span>
        <span className="text-xs text-primary font-mono">85%</span>
      </div>
      <div className="w-full h-1.5 bg-[#3D2E1E] rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full" style={{ width: "85%" }} />
      </div>
      <p className="mt-3 text-xs text-white font-medium">Principi della qualità</p>
      <p className="text-xs text-[#766E66] mt-0.5">4 di 5 lezioni completate</p>
    </div>
  );
}

function ExamMockup() {
  return (
    <div className="bg-[#2A1D12] border border-[#3D2E1E] rounded-lg p-4">
      <p className="text-xs text-white font-medium mb-2">Domanda 3 di 20</p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 p-2 rounded-md bg-[#3D2E1E]">
          <span className="w-4 h-4 rounded-full border border-[#766E66]/40" />
          <span className="text-xs text-[#766E66]">Approccio per processi</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-md bg-primary/15 border border-primary/30">
          <span className="w-4 h-4 rounded-full bg-primary" />
          <span className="text-xs text-white">Miglioramento continuo</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-md bg-[#3D2E1E]">
          <span className="w-4 h-4 rounded-full border border-[#766E66]/40" />
          <span className="text-xs text-[#766E66]">Orientamento al cliente</span>
        </div>
      </div>
    </div>
  );
}

function CertMockup() {
  return (
    <div className="bg-[#2A1D12] border border-[#3D2E1E] rounded-lg p-4 flex items-center gap-3">
      <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0 p-1.5">
        <div className="grid grid-cols-7 gap-px w-full h-full">
          {qrPattern.flat().map((cell, i) => (
            <div key={i} className={cell ? "bg-near-black" : "bg-transparent"} />
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs text-white font-medium">Certificato valido</p>
        <p className="text-xs text-[#766E66]">ISO 9001 · 15/03/2026</p>
      </div>
    </div>
  );
}

function StepCard({ step }) {
  return (
    <div
      className="rounded-lg p-5 h-full"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "0.5px solid rgba(255,255,255,0.1)",
      }}
    >
      <span
        className="font-heading text-6xl text-primary leading-none select-none block"
        style={{ opacity: 0.25 }}
      >
        {step.num}
      </span>
      <h3 className="mt-3 font-heading text-xl text-white">{step.title}</h3>
      <p className="mt-2 text-sm text-[#766E66] leading-relaxed">
        {step.description}
      </p>
      <div className="mt-5">{step.mockup}</div>
    </div>
  );
}

export default function HowItWorksSection() {
  return (
    <section className="w-full py-20 md:py-24 bg-near-black relative overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 relative">
        <ScrollReveal>
          <div className="max-w-2xl text-left mb-14">
            <span className="text-[11px] uppercase tracking-[0.16em] text-primary font-medium">
              Come funziona
            </span>
            <h2 className="mt-3.5 font-heading text-4xl md:text-5xl lg:text-[56px] text-white leading-[1.1]">
              Dalla preparazione al corso
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <ScrollReveal key={step.num} delay={i * 0.1}>
              <div className="relative h-full">
                {i < steps.length - 1 && (
                  <div className="hidden md:flex absolute top-1/2 -right-5 -translate-y-1/2 items-center z-10">
                    <div className="w-4 border-t border-dashed border-[#3D2E1E]" />
                    <ArrowRight className="h-3 w-3 text-[#3D2E1E]" />
                  </div>
                )}
                <StepCard step={step} />
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
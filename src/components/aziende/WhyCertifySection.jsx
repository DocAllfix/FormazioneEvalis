import React from "react";
import { Trophy, Eye, Scale } from "lucide-react";
import ScrollReveal from "@/components/landing/ScrollReveal";

const reasons = [
  { icon: Trophy, title: "Gare d'appalto", text: "Attestazione verificabile per requisiti contrattuali e bandi." },
  { icon: Eye, title: "Audit e committenti", text: "Chiunque può verificare il certificato, senza account e in qualsiasi momento." },
  { icon: Scale, title: "Requisiti normativi", text: "Preparazione tracciata e certificazione conforme per audit interni ed esterni." },
];

export default function WhyCertifySection() {
  return (
    <section className="w-full py-20 md:py-24 bg-near-black">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <ScrollReveal>
          <span className="text-[11px] uppercase tracking-[0.16em] text-primary font-medium">Perché</span>
          <h2 className="mt-3.5 font-heading text-4xl md:text-5xl text-white leading-[1.1]">Dimostra le competenze. In modo oggettivo.</h2>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-0">
            {reasons.map((r, i) => (
              <div key={r.title} className={`flex flex-col ${i > 0 ? "md:border-l border-[#3D2E1E] md:pl-10" : ""} ${i < reasons.length - 1 ? "md:pr-10 pb-10 md:pb-0" : ""}`}>
                <r.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-4 font-body font-semibold text-lg text-white">{r.title}</h3>
                <p className="mt-2 text-sm text-[#766E66] leading-relaxed">{r.text}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
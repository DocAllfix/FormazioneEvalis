import React from "react";
import { Flag, Database, UserCheck, ShieldCheck } from "lucide-react";
import ScrollReveal from "@/components/landing/ScrollReveal";

const badges = [
  { icon: Flag, title: "Data residency UE", text: "I dati sono ospitati in infrastrutture europee." },
  { icon: Database, title: "Tracciamento append-only", text: "Le attività di preparazione vengono registrate in modo immutabile." },
  { icon: UserCheck, title: "Sessione singola per utente", text: "Impossibile condividere le credenziali: ogni accesso è univoco e tracciato." },
  { icon: ShieldCheck, title: "Emissione certificati con revisione", text: "I certificati sono emessi solo dopo verifica del completamento dei requisiti." },
];

export default function SecuritySection() {
  return (
    <section className="w-full py-20 md:py-24 bg-cream-dark">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <ScrollReveal>
          <span className="text-[11px] uppercase tracking-[0.16em] text-primary font-medium">Sicurezza & conformità</span>
          <h2 className="mt-3.5 font-heading text-4xl md:text-5xl text-near-black leading-[1.1]">Costruito per contesti regolamentati.</h2>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {badges.map((b) => (
              <div key={b.title} className="bg-white border border-[#E8E0D5] rounded-xl p-5 hover:border-primary hover:-translate-y-[3px] transition-all duration-200">
                <b.icon className="h-[22px] w-[22px] text-primary" />
                <h3 className="mt-4 font-body font-semibold text-sm text-near-black">{b.title}</h3>
                <p className="mt-1.5 text-[13px] text-[#7A7068] leading-relaxed">{b.text}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
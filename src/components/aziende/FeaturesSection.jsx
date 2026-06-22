import React from "react";
import { Users, BarChart3, Award, Check } from "lucide-react";
import ScrollReveal from "@/components/landing/ScrollReveal";

const cards = [
  {
    icon: Users,
    title: "Gestione persone",
    features: ["Gestione centralizzata di persone e posti (seats)", "Aggiunta rapida via email o importazione", "Spazio aziendale su sottodominio personalizzato"],
  },
  {
    icon: BarChart3,
    title: "Monitoraggio in tempo reale",
    features: ["Stato preparazione per ogni persona, aggiornato in tempo reale", "Tracciamento conforme del tempo di fruizione", "Esiti esame e certificazioni ottenute a colpo d'occhio"],
  },
  {
    icon: Award,
    title: "Certificazione & reporting",
    features: ["Reportistica scaricabile per audit e committenti", "Certificati con QR + codice univoco per ogni persona", "Certificati emessi dopo revisione e verifica"],
  },
];

export default function FeaturesSection() {
  return (
    <section className="w-full py-20 md:py-24 bg-white">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <ScrollReveal>
          <span className="text-[11px] uppercase tracking-[0.16em] text-primary font-medium">Funzionalità</span>
          <h2 className="mt-3.5 font-heading text-4xl md:text-5xl text-near-black leading-[1.1]">Una console per gestire, non solo monitorare.</h2>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {cards.map((card) => (
              <div key={card.title} className="bg-white border border-[#E8E0D5] rounded-2xl p-7 hover:border-primary hover:-translate-y-[3px] transition-all duration-200" style={{ boxShadow: "0 1px 3px rgba(26,18,9,0.04)" }}>
                <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-near-black">
                  <card.icon className="h-6 w-6 text-primary" />
                </span>
                <h3 className="mt-5 font-heading text-xl text-near-black">{card.title}</h3>
                <ul className="mt-4 space-y-3">
                  {card.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-[#5C5347] leading-relaxed">
                      <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#FEF0EB] text-primary flex-shrink-0 mt-0.5">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
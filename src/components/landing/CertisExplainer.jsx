import React from "react";
import { FileCheck, Shuffle, BarChart3, QrCode } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const points = [
  {
    icon: FileCheck,
    title: "Schemi con requisiti definiti",
    description:
      "Ogni corso segue uno schema CERTIS che definisce prerequisiti, contenuti e durata della preparazione, struttura e soglia dell'esame.",
  },
  {
    icon: Shuffle,
    title: "Esame a estrazione casuale",
    description:
      "Le domande sono estratte dal pool dello schema. La soglia di superamento è fissata dallo schema, non dall'esaminatore.",
  },
  {
    icon: BarChart3,
    title: "Preparazione tracciata",
    description:
      "Tempo di fruizione, progressione e completamento dei contenuti sono registrati dalla piattaforma secondo i requisiti dello schema.",
  },
  {
    icon: QrCode,
    title: "Certificato verificabile",
    description:
      "Ogni certificato riporta un QR e un codice univoco. Chiunque può verificare autenticità e dati sulla pagina pubblica.",
  },
];

export default function CertisExplainer() {
  return (
    <section className="w-full py-20 md:py-24 bg-cream-dark">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <ScrollReveal>
          <div className="max-w-2xl text-left mb-12">
            <span className="text-[11px] uppercase tracking-[0.16em] text-primary font-medium">
              Schema CERTIS
            </span>
            <h2 className="mt-3.5 font-heading text-4xl md:text-5xl lg:text-[56px] text-near-black leading-[1.1]">
              Cosa rende rigoroso il corso
            </h2>
            <p className="mt-5 text-base text-[#5C5347] leading-relaxed">
              Ogni corso Formazione Evalis segue uno schema CERTIS: un
              insieme di regole che definiscono preparazione, esame e
              certificato.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {points.map((p, i) => (
            <ScrollReveal key={p.title} delay={i * 0.06}>
              <div className="flex gap-4 bg-white border border-[#EAE4DB] rounded-2xl p-6 text-left hover:border-primary transition-all duration-200 h-full">
                <p.icon className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-heading text-lg text-near-black">
                    {p.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-[#5C5347] leading-relaxed">
                    {p.description}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
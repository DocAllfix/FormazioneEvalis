import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { QrCode, Search, ShieldCheck, ClipboardCheck, BarChart3 } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

export default function WhyEvalisSection() {
  return (
    <section className="w-full py-20 md:py-24 bg-white">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <ScrollReveal>
          <div className="max-w-2xl text-left mb-12">
            <span className="text-[11px] uppercase tracking-[0.16em] text-primary font-medium">
              Perché Formazione Evalis
            </span>
            <h2 className="mt-3.5 font-heading text-4xl md:text-5xl lg:text-[56px] text-near-black leading-[1.1]">
              Un certificato che vale perché si può verificare
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          <ScrollReveal delay={0.1}>
            <div className="space-y-8">
              <FeaturePoint
                icon={QrCode}
                title="Certificato verificabile da chiunque"
                description="Ogni certificato ha un QR e un codice univoco. Datori di lavoro, committenti e enti possono verificarne autenticità e dati sulla pagina pubblica, senza account e in qualsiasi momento."
              />
              <FeaturePoint
                icon={ClipboardCheck}
                title="Esame di verifica delle competenze"
                description="Esame con domande a estrazione casuale e soglia di superamento definita dallo schema. Non un quiz: una verifica strutturata."
              />
              <FeaturePoint
                icon={BarChart3}
                title="Preparazione tracciata"
                description="Il percorso di preparazione registra tempo di fruizione e progressione, secondo i requisiti dello schema CERTIS."
              />
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <VerificationFlow />
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

function FeaturePoint({ icon: Icon, title, description }) {
  return (
    <div className="flex gap-4">
      <Icon className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
      <div>
        <h3 className="font-heading text-lg text-near-black">{title}</h3>
        <p className="mt-1.5 text-sm md:text-base text-[#5C5347] leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

function VerificationFlow() {
  const reduced = useReducedMotion();

  const flowSteps = [
    {
      icon: QrCode,
      title: "Scansiona il QR",
      subtitle: "O inserisci il codice univoco",
    },
    {
      icon: Search,
      title: "Verifica automatica",
      subtitle: "Controllo autenticità e validità",
    },
    {
      icon: ShieldCheck,
      title: "Certificato valido",
      subtitle: "Marco Rossi · ISO 9001 · 15/03/2026",
      highlight: true,
    },
  ];

  return (
    <div className="bg-cream-dark rounded-2xl border border-[#EAE4DB] p-6 md:p-8">
      <p className="text-[11px] uppercase tracking-[0.16em] text-primary font-medium mb-6">
        Flusso di verifica
      </p>
      <div className="flex flex-col">
        {flowSteps.map((step, i) => (
          <React.Fragment key={i}>
            <motion.div
              initial={reduced ? false : { opacity: 0, y: -12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: i * 0.2,
                ease: "easeOut",
              }}
              className={
                step.highlight
                  ? "flex items-center gap-4 bg-primary/5 rounded-xl p-4 border border-primary/20"
                  : "flex items-center gap-4 py-2"
              }
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  step.highlight
                    ? "bg-primary"
                    : "bg-white border border-[#EAE4DB]"
                }`}
              >
                <step.icon
                  className={`h-6 w-6 ${
                    step.highlight ? "text-white" : "text-primary"
                  }`}
                />
              </div>
              <div>
                <p className="font-heading text-near-black">{step.title}</p>
                <p className="text-sm text-[#766E66]">{step.subtitle}</p>
              </div>
            </motion.div>
            {i < flowSteps.length - 1 && (
              <div className="ml-6 w-px h-5 bg-[#EAE4DB]" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
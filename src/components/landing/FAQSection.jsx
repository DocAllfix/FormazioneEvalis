import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import ScrollReveal from "./ScrollReveal";

const faqs = [
  {
    q: "Come funziona: preparazione ed esame?",
    a: "Scegli il corso, segui il percorso di preparazione online con contenuti tracciati (tempo di fruizione e progressione registrati), poi sostieni l'esame con domande a estrazione casuale e soglia di superamento. Al superamento ottieni il certificato.",
  },
  {
    q: "Come si verifica il certificato?",
    a: "Ogni certificato ha un QR e un codice univoco. Chiunque (datori di lavoro, committenti, enti) può verificarne autenticità e dati sulla pagina pubblica di verifica, accessibile dalla home page, senza account.",
  },
  {
    q: "Per le aziende",
    a: "L'azienda acquista i posti per i corsi necessari, assegna i percorsi ai propri professionisti o tecnici e monitora stato di preparazione e corso da un pannello dedicato. La reportistica è scaricabile per le verifiche di committenti e enti.",
  },
  {
    q: "Quali professioni sono certificabili?",
    a: "Auditor e Lead Auditor per i sistemi di gestione ISO (9001, 14001, 45001, 27001, 22000, 50001), professioni e mestieri specialistici (elettricista, idraulico, muratore, lavoratore in altezza, pittore, addetto pulizie, operatore turistico, amministratore di condominio) e profili del settore bancario.",
  },
];

export default function FAQSection() {
  return (
    <section className="w-full py-20 md:py-24 bg-white">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <ScrollReveal className="lg:col-span-4">
            <span className="text-[11px] uppercase tracking-[0.16em] text-primary font-medium">
              Domande frequenti
            </span>
            <h2 className="mt-3.5 font-heading text-4xl md:text-5xl text-near-black leading-[1.1]">
              Le risposte alle obiezioni più comuni
            </h2>
            <p className="mt-5 text-base text-[#5C5347] leading-relaxed">
              Preparazione, esame, verifica del certificato, gestione aziendale:
              tutto quello che serve sapere prima di scegliere.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.1} className="lg:col-span-8">
            <Accordion type="single" collapsible>
              {faqs.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="border-b border-[#EAE4DB]"
                >
                  <AccordionTrigger className="text-left font-body font-medium text-base md:text-lg text-near-black hover:no-underline py-6">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm md:text-base text-[#5C5347] leading-relaxed pb-6">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
import React from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ScrollReveal from "@/components/landing/ScrollReveal";

const faqs = [
  { q: "Come si aggiungono le persone da certificare?", a: "Dalla console puoi aggiungere ogni persona tramite email o importazione. Ogni persona riceve le credenziali di accesso e può iniziare il percorso assegnato." },
  { q: "Posso scaricare i report per gli audit?", a: "Sì. Dalla console puoi scaricare in qualsiasi momento il report di preparazione e certificazione per ogni persona o per l'intero team, in formato PDF." },
  { q: "Come funziona lo spazio dedicato?", a: "Al momento dell'attivazione dell'account azienda viene creato un sottodominio personalizzato (tuaazienda.evalis.it). I tuoi professionisti accedono solo da quel dominio, in un ambiente brandizzato con il nome della tua organizzazione." },
  { q: "I certificati come si verificano?", a: "Ogni certificato riporta un QR e un codice univoco. Chiunque (datori di lavoro, committenti, enti) può verificarne autenticità e dati sulla pagina pubblica evalis.it/verifica, senza account e in qualsiasi momento." },
];

export default function AziendeFAQ() {
  return (
    <section className="w-full py-20 md:py-24 bg-white">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <ScrollReveal className="lg:col-span-4">
            <span className="text-[11px] uppercase tracking-[0.16em] text-primary font-medium">Domande frequenti</span>
            <h2 className="mt-3.5 font-heading text-4xl md:text-5xl text-near-black leading-[1.1]">Le risposte alle domande più comuni</h2>
            <p className="mt-5 text-base text-[#5C5347] leading-relaxed">Persone, report, spazio dedicato e verifica del certificato.</p>
          </ScrollReveal>
          <ScrollReveal delay={0.1} className="lg:col-span-8">
            <Accordion type="single" defaultValue="faq-0" collapsible>
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border-b border-[#E8E0D5]">
                  <AccordionTrigger className="text-left font-body font-medium text-base md:text-lg text-near-black hover:no-underline py-6 [&[data-state=open]>svg]:text-primary">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-sm md:text-base text-[#5C5347] leading-relaxed pb-6">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import ScrollReveal from "@/components/landing/ScrollReveal";

const bullets = ["Nessun impegno, solo una conversazione", "Setup in meno di 48 ore", "Supporto dedicato durante l'onboarding"];

const inputClass = "w-full px-3.5 py-2.5 bg-white/[0.06] border border-white/[0.12] rounded-lg text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-primary transition-colors";

export default function ContactFormSection() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section id="contatti" className="w-full py-20 md:py-24 bg-background scroll-mt-20">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <ScrollReveal>
            <span className="text-[11px] uppercase tracking-[0.16em] text-primary font-medium">Inizia ora</span>
            <h2 className="mt-3.5 font-heading text-4xl md:text-5xl text-near-black leading-[1.1]">Parliamo del tuo team.</h2>
            <p className="mt-5 text-base text-[#5C5347] leading-relaxed max-w-md">
              Raccontaci quante persone vuoi certificare e in quale area. Ti risponderemo entro 24 ore con una proposta su misura.
            </p>
            <ul className="mt-6 space-y-3">
              {bullets.map((b) => (
                <li key={b} className="flex items-center gap-2.5 text-sm text-near-black">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#FEF0EB] text-primary flex-shrink-0">
                    <Check className="h-3 w-3" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="bg-near-black rounded-2xl p-8" style={{ boxShadow: "0 16px 48px rgba(26,18,9,0.15)" }}>
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <span className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-white">
                    <Check className="h-7 w-7" />
                  </span>
                  <h3 className="mt-5 font-heading text-2xl text-white">Richiesta inviata</h3>
                  <p className="mt-2 text-sm text-[#9C9388]">Ti risponderemo entro 24 ore con una proposta su misura.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="cf-azienda" className="block text-[13px] text-white mb-1.5">Nome azienda</label>
                    <input id="cf-azienda" name="azienda" className={inputClass} placeholder="Es. Acme S.r.l." required />
                  </div>
                  <div>
                    <label htmlFor="cf-referente" className="block text-[13px] text-white mb-1.5">Nome referente</label>
                    <input id="cf-referente" name="referente" className={inputClass} placeholder="Es. Mario Rossi" required />
                  </div>
                  <div>
                    <label htmlFor="cf-email" className="block text-[13px] text-white mb-1.5">Email aziendale</label>
                    <input id="cf-email" name="email" type="email" className={inputClass} placeholder="mario@acme.it" required />
                  </div>
                  <div>
                    <label htmlFor="cf-persone" className="block text-[13px] text-white mb-1.5">Numero persone</label>
                    <input id="cf-persone" name="persone" type="number" min="1" inputMode="numeric" className={inputClass} placeholder="Es. 20" required />
                  </div>
                  <div>
                    <label htmlFor="cf-area" className="block text-[13px] text-white mb-1.5">Area di interesse</label>
                    <select id="cf-area" name="area" className={inputClass} required defaultValue="">
                      <option value="" disabled className="bg-near-black">Seleziona…</option>
                      <option className="bg-near-black">Auditor ISO</option>
                      <option className="bg-near-black">Mestieri e professioni</option>
                      <option className="bg-near-black">Settore bancario</option>
                      <option className="bg-near-black">Più aree</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="cf-messaggio" className="block text-[13px] text-white mb-1.5">Messaggio <span className="text-white/40">(opzionale)</span></label>
                    <textarea id="cf-messaggio" name="messaggio" rows={3} className={inputClass + " resize-none"} placeholder="Descrivici il contesto…" />
                  </div>
                  <button type="submit" className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-primary rounded-lg py-3 hover:brightness-110 transition-all">
                    Richiedi informazioni <ArrowRight className="h-4 w-4" />
                  </button>
                  <Link href="/registrati" className="block text-center text-[13px] text-white/60 hover:text-white transition-colors">
                    Oppure crea subito un account azienda →
                  </Link>
                </form>
              )}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
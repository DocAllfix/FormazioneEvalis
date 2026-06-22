import React, { useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

export default function VerifySection() {
  const [code, setCode] = useState("");

  function handleVerify(e) {
    e.preventDefault();
    if (code.trim()) {
      window.location.href = `/verify/${encodeURIComponent(code.trim())}`;
    }
  }

  return (
    <section
      id="verifica"
      className="w-full py-20 md:py-24 bg-cream-dark scroll-mt-16"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <ScrollReveal>
            <span className="text-[11px] uppercase tracking-[0.16em] text-primary font-medium">
              Verifica certificato
            </span>
            <h2 className="mt-3.5 font-heading text-4xl md:text-5xl lg:text-[56px] text-near-black leading-[1.1]">
              Verifica l'autenticità di un certificato
            </h2>
            <p className="mt-5 text-base text-[#5C5347] leading-relaxed max-w-lg">
              Inserisci il codice univoco o scansiona il QR stampato sul
              certificato. La verifica è pubblica e non richiede account.
            </p>
            <form
              onSubmit={handleVerify}
              className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md"
            >
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                aria-label="Codice del certificato"
                placeholder="Es. EV-2026-9001-0142"
                className="flex-1 h-12 bg-white border border-[#EAE4DB] rounded-lg px-4 text-base text-near-black placeholder:text-[#766E66] focus:border-primary focus:outline-none transition-colors"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 bg-primary text-white font-medium rounded-lg px-6 h-12 hover:brightness-110 hover:scale-[1.02] transition-all duration-200"
              >
                <Search className="h-4 w-4" />
                Verifica
              </button>
            </form>
          </ScrollReveal>

          <ScrollReveal delay={0.15} className="flex justify-center lg:justify-end">
            <VerifyResultPreview />
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

function VerifyResultPreview() {
  return (
    <div className="w-full max-w-sm bg-white rounded-2xl border border-[#EAE4DB] p-6 shadow-[0_12px_32px_rgba(26,18,9,0.08)]">
      <div className="flex items-center gap-3 mb-5 pb-5 border-b border-[#EAE4DB]">
        <div className="w-10 h-10 rounded-full bg-[#15803D]/10 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-[#15803D]" />
        </div>
        <div>
          <p className="font-heading text-near-black">Certificato valido</p>
          <p className="text-xs text-[#766E66]">Verificato il 22/06/2026</p>
        </div>
      </div>
      <div className="space-y-3 text-sm">
        <ResultRow label="Titolare" value="Marco Rossi" />
        <ResultRow label="Certificazione" value="ISO 9001 Qualità" />
        <ResultRow label="Emesso il" value="15/03/2026" />
        <ResultRow label="Scadenza" value="15/03/2029" />
        <ResultRow label="Codice" value="EV-2026-9001-0142" mono />
      </div>
    </div>
  );
}

function ResultRow({ label, value, mono }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[#766E66]">{label}</span>
      <span className={`text-near-black ${mono ? "font-mono text-primary" : ""}`}>
        {value}
      </span>
    </div>
  );
}
import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

export default function FinalCTA() {
  return (
    <section
      className="w-full py-20 md:py-24 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #1A1209 0%, #2D1A0A 100%)" }}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 relative text-center">
        <ScrollReveal>
          <h2 className="font-heading text-4xl md:text-5xl lg:text-[64px] text-white leading-[1.1]">
            Certifica le tue competenze
          </h2>
          <p className="mt-5 text-lg text-[#9C9388] max-w-xl mx-auto leading-relaxed">
            Scegli il corso, preparati online e ottieni il certificato
            verificabile.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/catalogo"
              className="inline-flex items-center gap-2 bg-primary text-white font-medium rounded-lg px-7 py-3.5 text-base hover:brightness-110 hover:scale-[1.02] transition-all duration-200"
            >
              Esplora i corsi
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/aziende"
              className="inline-flex items-center gap-2 text-white font-medium rounded-lg px-7 py-3.5 text-base border border-white/20 hover:bg-white/10 transition-all duration-200"
            >
              Soluzioni per aziende
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
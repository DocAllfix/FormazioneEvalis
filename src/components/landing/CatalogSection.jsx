import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, ClipboardCheck, QrCode } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const areas = [
  {
    id: "auditor",
    label: "Auditor ISO",
    cards: [
      { name: "ISO 9001", badge: "ISO 9001", line: "Auditor per i Sistemi di Gestione della Qualità" },
      { name: "ISO 14001", badge: "ISO 14001", line: "Auditor per i Sistemi di Gestione dell'Ambiente" },
      { name: "ISO 45001", badge: "ISO 45001", line: "Auditor per i Sistemi di Gestione della Sicurezza e Salute sul lavoro" },
      { name: "ISO 27001", badge: "ISO 27001", line: "Auditor per i Sistemi di Gestione della Sicurezza delle Informazioni" },
      { name: "ISO 22000", badge: "ISO 22000", line: "Auditor per i Sistemi di Gestione della Sicurezza Alimentare" },
      { name: "ISO 50001", badge: "ISO 50001", line: "Auditor per i Sistemi di Gestione dell'Energia" },
    ],
  },
  {
    id: "mestieri",
    label: "Mestieri e professioni",
    cards: [
      { name: "Elettricista specializzato", badge: "Professionale", line: "Competenze per interventi elettrici specialistici" },
      { name: "Idraulico", badge: "Professionale", line: "Competenze per impianti idraulici e sanitari" },
      { name: "Muratore", badge: "Professionale", line: "Competenze per lavori murari e costruzioni" },
      { name: "Lavoratore in altezza", badge: "Professionale", line: "Competenze per lavori in quota e su ponteggi" },
      { name: "Pittore e Imbianchino", badge: "Professionale", line: "Competenze per trattamenti e finiture superficiali" },
      { name: "Addetto alle pulizie", badge: "Professionale", line: "Competenze per pulizia professionale e sanificazione" },
      { name: "Operatore turistico", badge: "Professionale", line: "Competenze per accoglienza e servizi turistici" },
      { name: "Amministratore di condominio", badge: "Professionale", line: "Competenze per la gestione di condomini" },
    ],
  },
  {
    id: "bancario",
    label: "Settore bancario",
    cards: [
      { name: "Impiegato bancario", badge: "Specialista", line: "Crediti, Operativo, Sicurezza ed Amministrazione" },
    ],
  },
];

function CertCard({ card, large = false }) {
  return (
    <Link
      href="/catalogo"
      className={`group flex flex-col bg-white border border-[#EAE4DB] rounded-2xl p-6 text-left hover:-translate-y-[3px] hover:border-primary transition-all duration-200 hover:shadow-[0_12px_32px_rgba(26,18,9,0.12)] h-full ${
        large ? "lg:col-span-2" : ""
      }`}
      style={!large ? { minHeight: "140px" } : undefined}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="inline-block text-[11px] font-medium px-3 py-1 rounded-full bg-[#FEF0EB] text-[#C03E08]">
          {card.badge}
        </span>
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#F5EFE6] text-[#766E66] group-hover:bg-primary group-hover:text-white transition-all duration-200 flex-shrink-0">
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
      <h3
        className={`font-heading text-near-black group-hover:text-primary transition-colors duration-200 ${
          large ? "text-2xl" : "text-lg"
        }`}
      >
        {card.name}
      </h3>
      {large ? (
        <>
          <p className="mt-2 text-sm text-[#5C5347] leading-relaxed flex-1">
            {card.line}
          </p>
          <div className="mt-5 pt-4 border-t border-[#EAE4DB] flex items-center gap-4 text-xs text-[#766E66]">
            <span className="inline-flex items-center gap-1.5">
              <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
              Esame online
            </span>
            <span className="inline-flex items-center gap-1.5">
              <QrCode className="h-3.5 w-3.5 text-primary" />
              Certificato QR
            </span>
          </div>
        </>
      ) : (
        <p className="mt-2 text-sm text-[#5C5347] leading-relaxed flex-1 line-clamp-2">
          {card.line}
        </p>
      )}
    </Link>
  );
}

export default function CatalogSection() {
  const [activeArea, setActiveArea] = useState("auditor");
  const current = areas.find((a) => a.id === activeArea);
  const cards = current.cards;

  return (
    <section
      id="catalogo"
      className="w-full py-20 md:py-24 bg-background scroll-mt-16"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <ScrollReveal>
          <div className="max-w-2xl text-left mb-10">
            <span className="text-[11px] uppercase tracking-[0.16em] text-primary font-medium">
              I corsi
            </span>
            <h2 className="mt-3.5 font-heading text-4xl md:text-5xl lg:text-[56px] text-near-black leading-[1.1]">
              Cosa puoi certificare
            </h2>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="flex flex-wrap gap-2 mb-8">
            {areas.map((area) => (
              <button
                key={area.id}
                onClick={() => setActiveArea(area.id)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeArea === area.id
                    ? "bg-primary text-white"
                    : "bg-white border border-[#EAE4DB] text-[#5C5347] hover:border-near-black/20"
                }`}
              >
                {area.label}
              </button>
            ))}
          </div>

          {cards.length === 1 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <CertCard card={cards[0]} large />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <CertCard card={cards[0]} large />
              {cards.slice(1).map((card) => (
                <CertCard key={card.name} card={card} />
              ))}
            </div>
          )}
        </ScrollReveal>

        <div className="mt-10">
          <Button
            variant="outline"
            asChild
            className="h-11 px-6 font-medium border-[#EAE4DB] text-near-black hover:bg-cream-dark hover:border-near-black/20 transition-all duration-200"
          >
            <Link href="/catalogo">
              Vedi tutti i corsi
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
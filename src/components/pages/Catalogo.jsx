"use client";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Search,
  ChevronRight,
  ClipboardCheck,
  QrCode,
  BookOpen,
} from "lucide-react";
import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import ScrollReveal from "@/components/landing/ScrollReveal";

const areas = [
  { id: "all", label: "Tutte" },
  { id: "auditor", label: "Auditor ISO" },
  { id: "mestieri", label: "Mestieri e professioni" },
  { id: "bancario", label: "Settore bancario" },
];

const allCerts = [
  { area: "auditor", areaLabel: "Auditor ISO", name: "ISO 19011", badge: "Propedeutico", line: "Corso propedeutico sull'auditing dei Sistemi di Gestione, richiesto per le altre certificazioni ISO" },
  { area: "auditor", areaLabel: "Auditor ISO", name: "ISO 9001", badge: "ISO 9001", line: "Auditor per i Sistemi di Gestione della Qualità" },
  { area: "auditor", areaLabel: "Auditor ISO", name: "ISO 14001", badge: "ISO 14001", line: "Auditor per i Sistemi di Gestione dell'Ambiente" },
  { area: "auditor", areaLabel: "Auditor ISO", name: "ISO 45001", badge: "ISO 45001", line: "Auditor per i Sistemi di Gestione della Sicurezza e Salute sul lavoro" },
  { area: "auditor", areaLabel: "Auditor ISO", name: "ISO 27001", badge: "ISO 27001", line: "Auditor per i Sistemi di Gestione della Sicurezza delle Informazioni" },
  { area: "auditor", areaLabel: "Auditor ISO", name: "ISO 22000", badge: "ISO 22000", line: "Auditor per i Sistemi di Gestione della Sicurezza Alimentare" },
  { area: "auditor", areaLabel: "Auditor ISO", name: "ISO 50001", badge: "ISO 50001", line: "Auditor per i Sistemi di Gestione dell'Energia" },
  { area: "auditor", areaLabel: "Auditor ISO", name: "ISO 37001", badge: "ISO 37001", line: "Auditor per i Sistemi di Gestione Anti-Corruzione" },
  { area: "auditor", areaLabel: "Auditor ISO", name: "ISO 39001", badge: "ISO 39001", line: "Auditor per i Sistemi di Gestione della Sicurezza Stradale" },
  { area: "auditor", areaLabel: "Auditor ISO", name: "ISO 42001", badge: "ISO 42001", line: "Auditor per i Sistemi di Gestione dell'Intelligenza Artificiale" },
  { area: "mestieri", areaLabel: "Mestieri e professioni", name: "Elettricista specializzato", badge: "Professionale", line: "Competenze per interventi elettrici specialistici" },
  { area: "mestieri", areaLabel: "Mestieri e professioni", name: "Idraulico", badge: "Professionale", line: "Competenze per impianti idraulici e sanitari" },
  { area: "mestieri", areaLabel: "Mestieri e professioni", name: "Muratore", badge: "Professionale", line: "Competenze per lavori murari e costruzioni" },
  { area: "mestieri", areaLabel: "Mestieri e professioni", name: "Lavoratore in altezza", badge: "Professionale", line: "Competenze per lavori in quota e su ponteggi" },
  { area: "mestieri", areaLabel: "Mestieri e professioni", name: "Pittore e Imbianchino", badge: "Professionale", line: "Competenze per trattamenti e finiture superficiali" },
  { area: "mestieri", areaLabel: "Mestieri e professioni", name: "Addetto alle pulizie", badge: "Professionale", line: "Competenze per pulizia professionale e sanificazione" },
  { area: "mestieri", areaLabel: "Mestieri e professioni", name: "Operatore turistico", badge: "Professionale", line: "Competenze per accoglienza e servizi turistici" },
  { area: "mestieri", areaLabel: "Mestieri e professioni", name: "Amministratore di condominio", badge: "Professionale", line: "Competenze per la gestione di condomini" },
  { area: "bancario", areaLabel: "Settore bancario", name: "Impiegato bancario", badge: "Specialista", line: "Crediti, Operativo, Sicurezza ed Amministrazione" },
];

function CertCard({ card, index }) {
  return (
    <ScrollReveal delay={Math.min(index * 0.04, 0.24)}>
      <div
        className="group flex flex-col bg-white border border-[#EAE4DB] rounded-2xl p-6 text-left hover:-translate-y-[3px] hover:border-primary transition-all duration-200 hover:shadow-[0_12px_32px_rgba(26,18,9,0.12)] h-full"
        style={{ minHeight: "180px" }}
      >
        <div className="flex items-start justify-between mb-4">
          <span className="inline-block text-[11px] font-medium px-3 py-1 rounded-full bg-[#FEF0EB] text-[#C03E08]">
            {card.badge}
          </span>
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#F5EFE6] text-[#766E66] group-hover:bg-primary group-hover:text-white transition-all duration-200 flex-shrink-0">
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
        <p className="text-xs text-[#766E66] mb-1">{card.areaLabel}</p>
        <h3 className="font-heading text-lg text-near-black group-hover:text-primary transition-colors duration-200">
          {card.name}
        </h3>
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
      </div>
    </ScrollReveal>
  );
}

export default function Catalogo() {
  const [activeArea, setActiveArea] = useState("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return allCerts.filter((cert) => {
      const areaMatch = activeArea === "all" || cert.area === activeArea;
      const q = query.toLowerCase();
      const queryMatch =
        !q ||
        cert.name.toLowerCase().includes(q) ||
        cert.line.toLowerCase().includes(q);
      return areaMatch && queryMatch;
    });
  }, [activeArea, query]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="w-full pt-28 md:pt-32 pb-12 md:pb-16 bg-background relative overflow-hidden">
          <div
            className="absolute inset-0 dot-grid pointer-events-none"
            aria-hidden="true"
          />
          <div className="max-w-[1400px] mx-auto px-6 md:px-10 relative">
            <ScrollReveal>
              <nav className="flex items-center gap-1.5 text-xs text-[#766E66] mb-6">
                <Link
                  href="/"
                  className="hover:text-near-black transition-colors duration-150"
                >
                  Home
                </Link>
                <ChevronRight className="h-3 w-3" />
                <span className="text-near-black">Catalogo</span>
              </nav>
              <span className="text-[11px] uppercase tracking-[0.16em] text-primary font-medium">
                I corsi
              </span>
              <h1 className="mt-3.5 font-heading text-4xl md:text-5xl lg:text-[56px] text-near-black leading-[1.1]">
                Catalogo corsi
              </h1>
              <p className="mt-5 text-base text-[#5C5347] leading-relaxed max-w-xl">
                Esplora tutti i corsi professionali disponibili.
                Preparazione online, esame e certificato verificabile con QR e
                codice univoco.
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* Filter bar */}
        <section className="w-full py-4 bg-white/90 backdrop-blur-[12px] border-y border-[#EAE4DB] sticky top-16 z-40">
          <div className="max-w-[1400px] mx-auto px-6 md:px-10">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex flex-wrap gap-2">
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
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#766E66]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Cerca un corso"
                  placeholder="Cerca corso..."
                  className="w-full h-11 bg-background border border-[#EAE4DB] rounded-lg pl-10 pr-4 text-sm text-near-black placeholder:text-[#766E66] focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Results */}
        <section className="w-full py-12 md:py-16 bg-background">
          <div className="max-w-[1400px] mx-auto px-6 md:px-10">
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-[#766E66]">
                {filtered.length}{" "}
                {filtered.length === 1
                  ? "corso"
                  : "corsi"}
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs text-[#766E66]">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                Preparazione + esame online
              </span>
            </div>

            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((cert, i) => (
                  <CertCard key={cert.name} card={cert} index={i} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-[#766E66]">
                  Nessun corso trovato per la tua ricerca.
                </p>
                <button
                  onClick={() => {
                    setQuery("");
                    setActiveArea("all");
                  }}
                  className="mt-4 text-sm font-medium text-primary hover:underline"
                >
                  Resetta filtri
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
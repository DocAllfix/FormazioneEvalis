"use client";

// Vetrina catalogo DB-backed: filtro categoria + ricerca + card reali (ore + prezzo),
// cliccabili verso la scheda /catalogo/[id]. Preserva il design approvato del catalogo.

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardCheck, QrCode, Search } from "lucide-react";
import type { CatalogCourse } from "@/features/catalog/queries";

const CATEGORY_LABEL: Record<string, string> = {
  auditor: "Auditor ISO",
  mestieri: "Mestieri e professioni",
  bancario: "Settore bancario",
  sicurezza: "Sicurezza",
};

const AREAS = [
  { id: "all", label: "Tutte" },
  { id: "auditor", label: "Auditor ISO" },
  { id: "mestieri", label: "Mestieri e professioni" },
  { id: "bancario", label: "Settore bancario" },
  { id: "sicurezza", label: "Sicurezza" },
];

function hoursLabel(c: CatalogCourse): string {
  if (c.durationHours && c.durationHours > 0) return `${c.durationHours} ore`;
  return c.requiredMinutes >= 60 ? `~${Math.round(c.requiredMinutes / 60)} ore` : `~${c.requiredMinutes} min`;
}

function priceLabel(c: CatalogCourse): string {
  if (c.priceCents == null) return "Su richiesta";
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: (c.currency ?? "eur").toUpperCase(),
  }).format(c.priceCents / 100);
}

function Card({ c }: { c: CatalogCourse }) {
  const area = c.category ? CATEGORY_LABEL[c.category] ?? "Corso" : "Corso";
  return (
    <Link
      href={`/catalogo/${c.id}`}
      className="group flex h-full flex-col rounded-2xl border border-[#EAE4DB] bg-white p-6 text-left transition-all duration-200 hover:-translate-y-[3px] hover:border-primary hover:shadow-[0_12px_32px_rgba(26,18,9,0.12)]"
    >
      <div className="mb-4 flex items-start justify-between">
        <span className="inline-block rounded-full bg-[#FEF0EB] px-3 py-1 text-[11px] font-medium text-[#C03E08]">
          {area}
        </span>
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#F5EFE6] text-[#766E66] transition-all duration-200 group-hover:bg-primary group-hover:text-white">
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
      <h3 className="font-heading text-lg text-near-black transition-colors duration-200 group-hover:text-primary">
        {c.title}
      </h3>
      {c.description ? (
        <p className="mt-2 flex-1 text-sm leading-relaxed text-[#5C5347] line-clamp-3">{c.description}</p>
      ) : (
        <p className="mt-2 flex-1" />
      )}
      <div className="mt-5 flex items-center justify-between border-t border-[#EAE4DB] pt-4">
        <span className="inline-flex items-center gap-1.5 text-xs text-[#766E66]">
          <ClipboardCheck className="h-3.5 w-3.5 text-primary" /> {hoursLabel(c)}
          <span className="text-[#D9D2C7]">·</span>
          <QrCode className="h-3.5 w-3.5 text-primary" /> QR
        </span>
        <span className="text-sm font-medium text-near-black">{priceLabel(c)}</span>
      </div>
    </Link>
  );
}

export function CatalogBrowser({ courses }: { courses: CatalogCourse[] }) {
  const [activeArea, setActiveArea] = useState("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return courses.filter((c) => {
      const areaMatch = activeArea === "all" || c.category === activeArea;
      const queryMatch =
        !q || c.title.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q);
      return areaMatch && queryMatch;
    });
  }, [courses, activeArea, query]);

  return (
    <>
      {/* Filter bar */}
      <section className="sticky top-16 z-40 w-full border-y border-[#EAE4DB] bg-white/90 py-4 backdrop-blur-[12px]">
        <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-4 px-6 md:flex-row md:items-center md:px-10">
          <div className="flex flex-wrap gap-2">
            {AREAS.map((area) => (
              <button
                key={area.id}
                onClick={() => setActiveArea(area.id)}
                className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
                  activeArea === area.id
                    ? "bg-primary text-white"
                    : "border border-[#EAE4DB] bg-white text-[#5C5347] hover:border-near-black/20"
                }`}
              >
                {area.label}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#766E66]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Cerca un corso"
              placeholder="Cerca corso..."
              className="h-11 w-full rounded-lg border border-[#EAE4DB] bg-background pl-10 pr-4 text-sm text-near-black placeholder:text-[#766E66] transition-colors focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="w-full bg-background py-12 md:py-16">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-[#766E66]">
              {filtered.length} {filtered.length === 1 ? "corso" : "corsi"}
            </p>
            <span className="inline-flex items-center gap-1.5 text-xs text-[#766E66]">
              <BookOpen className="h-3.5 w-3.5 text-primary" /> Preparazione + esame online
            </span>
          </div>

          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c) => (
                <Card key={c.id} c={c} />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-[#766E66]">Il catalogo si sta popolando. Nuovi corsi in arrivo a breve.</p>
            </div>
          ) : (
            <div className="py-20 text-center">
              <p className="text-[#766E66]">Nessun corso trovato per la tua ricerca.</p>
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
    </>
  );
}

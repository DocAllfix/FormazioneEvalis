"use client";

// Vetrina catalogo POST-LOGIN: filtro categoria + ricerca + card accattivanti (immagine
// di copertina o grafica per categoria) con ore e prezzo, cliccabili → scheda /corsi/[id].

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Clock, Search } from "lucide-react";
import type { CatalogCourse } from "@/features/catalog/queries";
import { categoryVisual } from "./category-visual";

const AREAS = [
  { id: "all", label: "Tutti" },
  { id: "auditor", label: "Auditor ISO" },
  { id: "ai", label: "Intelligenza Artificiale" },
  { id: "mestieri", label: "Mestieri e professioni" },
  { id: "bancario", label: "Settore bancario" },
  { id: "sicurezza", label: "Sicurezza" },
];

function hoursLabel(c: CatalogCourse): string {
  if (c.durationHours && c.durationHours > 0) return `${c.durationHours} ore`;
  return c.requiredMinutes >= 60 ? `~${Math.round(c.requiredMinutes / 60)} ore` : `~${c.requiredMinutes} min`;
}

export function euro(cents: number, currency = "eur"): string {
  // useGrouping esplicito: il default italiano ("min2") NON separa le migliaia sotto le
  // cinque cifre, quindi un pacchetto da 3990 € uscirebbe "3990,00 €" invece di "3.990,00 €".
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: currency.toUpperCase(),
    useGrouping: true,
  }).format(cents / 100);
}

/** Doppio listino attivo? (prezzo lancio con listino barrato) */
function hasLaunchPrice(c: Pick<CatalogCourse, "priceCents" | "listPriceCents">): boolean {
  return c.priceCents != null && c.listPriceCents != null && c.listPriceCents > c.priceCents;
}

function Card({ c, enrolled }: { c: CatalogCourse; enrolled: boolean }) {
  const v = categoryVisual(c.category);
  const launch = hasLaunchPrice(c);
  return (
    <Link
      href={`/corsi/${c.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_16px_40px_rgba(26,18,9,0.12)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        {c.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.imageUrl} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
        ) : (
          <div className={`flex h-full w-full items-center justify-center bg-linear-to-br ${v.gradient}`}>
            <v.Icon className="h-14 w-14 text-white/25" strokeWidth={1.5} />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-near-black shadow-sm backdrop-blur">
          {v.label}
        </span>
        {launch && !enrolled ? (
          <span className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
            Prezzo lancio
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-heading text-lg leading-snug text-near-black transition-colors group-hover:text-primary">
          {c.title}
        </h3>
        {c.description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{c.description}</p>
        ) : null}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-primary" /> {hoursLabel(c)}
          </span>
          {enrolled ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
              <Check className="h-3.5 w-3.5" /> Già tuo
            </span>
          ) : c.priceCents == null ? (
            <span className="font-heading text-lg text-near-black">Su richiesta</span>
          ) : (
            <span className="text-right">
              {launch ? (
                <span className="mr-2 text-sm text-muted-foreground line-through">{euro(c.listPriceCents!, c.currency ?? "eur")}</span>
              ) : null}
              <span className="font-heading text-lg text-near-black">{euro(c.priceCents, c.currency ?? "eur")}</span>
              <span className="ml-1 text-[11px] text-muted-foreground">+ IVA</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function CatalogBrowser({
  courses,
  enrolledIds,
}: {
  courses: CatalogCourse[];
  /** Id corsi già dell'utente (chip "Già tuo"). Server-computed nella page, MAI in cache globale. */
  enrolledIds?: string[];
}) {
  const [activeArea, setActiveArea] = useState("all");
  const [query, setQuery] = useState("");
  const enrolled = useMemo(() => new Set(enrolledIds ?? []), [enrolledIds]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return courses.filter((c) => {
      const areaMatch = activeArea === "all" || c.category === activeArea;
      const queryMatch = !q || c.title.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q);
      return areaMatch && queryMatch;
    });
  }, [courses, activeArea, query]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {AREAS.map((area) => (
            <button
              key={area.id}
              onClick={() => setActiveArea(area.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeArea === area.id
                  ? "bg-primary text-white"
                  : "border border-border bg-card text-foreground/80 hover:border-primary/40"
              }`}
            >
              {area.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Cerca un corso"
            placeholder="Cerca corso..."
            className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none ring-primary/30 focus:ring-2"
          />
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Card key={c.id} c={c} enrolled={enrolled.has(c.id)} />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card py-20 text-center">
          <p className="text-muted-foreground">Il catalogo si sta popolando. Nuovi corsi in arrivo a breve.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card py-20 text-center">
          <p className="text-muted-foreground">Nessun corso trovato.</p>
          <button onClick={() => { setQuery(""); setActiveArea("all"); }} className="mt-3 text-sm font-medium text-primary hover:underline">
            Resetta filtri
          </button>
        </div>
      )}
    </div>
  );
}

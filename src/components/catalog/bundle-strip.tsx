"use client";

// Vetrina pacchetti del catalogo post-login. Composizione: il pacchetto di valore più alto
// occupa una fascia larga (contenuto a sinistra, prezzo e azione a destra), gli altri
// stanno in una riga di card compatte ad altezza uniforme. Il "valore separato" barrato è
// la SOMMA DEI PREZZI CORRENTI dei corsi inclusi, quindi resta veritiero sia in periodo di
// lancio sia a listino pieno.

import { useMemo, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import type { CatalogBundle } from "@/features/catalog/queries";
import { buyBundleAction } from "@/features/billing/server-actions";
import { euro } from "./catalog-browser";
import { BundlePickDialog } from "./bundle-pick-dialog";

/** Titolo corso in forma breve per gli elenchi dei pacchetti: cade la coda descrittiva
 * dopo il trattino lungo e cadono i prefissi di ruolo ("Auditor", "Auditor/Lead Auditor",
 * "Corso"), che qui sono impliciti e farebbero troncare le voci nelle card strette.
 * "Auditor/Lead Auditor ISO 9001 — Sistemi di gestione…" → "ISO 9001". */
function titoloBreve(titolo: string): string {
  return titolo
    .split("—")[0]
    .replace(/^Corso\s+/i, "")
    .replace(/^Auditor\/Lead Auditor\s+/i, "")
    .replace(/^(Lead\s+)?Auditor\s+(?=ISO)/i, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();
}

/** Quanti corsi compongono il pacchetto (per i "a scelta" conta anche quello scelto). */
function conteggioTotale(b: CatalogBundle): number {
  const inclusi = b.courses.filter((c) => c.role === "included").length;
  return b.kind === "pick_one" ? inclusi + 1 : inclusi;
}

/** Somma dei prezzi correnti dei corsi (per i "a scelta": inclusi + il più economico). */
export function bundleCompareCents(b: CatalogBundle): { cents: number; isFrom: boolean } | null {
  const included = b.courses.filter((c) => c.role === "included");
  if (included.length === 0 || included.some((c) => c.priceCents == null)) return null;
  const base = included.reduce((a, c) => a + (c.priceCents ?? 0), 0);
  if (b.kind === "fixed") return { cents: base, isFrom: false };
  const eligible = b.courses.filter((c) => c.role === "eligible" && c.priceCents != null);
  if (eligible.length === 0) return null;
  return { cents: base + Math.min(...eligible.map((c) => c.priceCents ?? 0)), isFrom: true };
}

type Stato = {
  compare: ReturnType<typeof bundleCompareCents>;
  risparmio: number;
  posseduti: number;
  totale: number;
  completo: boolean;
};

function statoDi(b: CatalogBundle, enrolled: Set<string>): Stato {
  const compare = bundleCompareCents(b);
  const risparmio = compare && b.priceCents != null ? compare.cents - b.priceCents : 0;
  const posseduti = b.courses.filter((c) => c.role === "included" && enrolled.has(c.id)).length;
  const totale = conteggioTotale(b);
  return { compare, risparmio, posseduti, totale, completo: b.kind === "fixed" && posseduti === totale };
}

/** Prezzo del pacchetto: valore attuale dominante, confronto e risparmio in appoggio.
 * Nella fascia il confronto è esteso; nelle card resta su una riga sola. */
function Prezzo({ b, stato, grande }: { b: CatalogBundle; stato: Stato; grande?: boolean }) {
  const valuta = b.currency ?? "eur";
  const mostraConfronto = stato.compare && stato.risparmio > 0;
  return (
    <div>
      <p className={`font-heading tabular-nums text-near-black ${grande ? "text-4xl" : "text-2xl"}`}>
        {b.priceCents != null ? euro(b.priceCents, valuta) : "Su richiesta"}
        <span className="ml-1.5 text-xs font-normal text-muted-foreground">+ IVA</span>
      </p>
      {mostraConfronto && stato.compare ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {stato.compare.isFrom ? "da " : ""}
          <span className="line-through">{euro(stato.compare.cents, valuta)}</span>
          {grande ? " se acquistati separatamente" : ""}
          <span className="ml-1.5 font-medium text-success">
            {grande ? "risparmi " : "−"}
            {stato.compare.isFrom && grande ? "almeno " : ""}
            {euro(stato.risparmio, valuta)}
          </span>
        </p>
      ) : null}
    </div>
  );
}

function Possesso({ stato }: { stato: Stato }) {
  if (stato.posseduti === 0) return null;
  return (
    <p className="text-xs font-medium text-amber-700">
      {stato.completo ? "Hai già tutti questi corsi" : `Ne hai già ${stato.posseduti} di ${stato.totale}`}
    </p>
  );
}

function useAcquisto(b: CatalogBundle) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pickOpen, setPickOpen] = useState(false);

  async function acquista() {
    if (b.kind === "pick_one") {
      setPickOpen(true);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const url = await buyBundleAction(b.id);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossibile avviare l'acquisto.");
      setLoading(false);
    }
  }
  return { loading, error, pickOpen, setPickOpen, acquista };
}

function Azione({
  b,
  stato,
  loading,
  onClick,
  className = "",
}: {
  b: CatalogBundle;
  stato: Stato;
  loading: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || b.priceCents == null || stato.completo}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-[filter,opacity] duration-200 ease-out hover:brightness-110 disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground ${className}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {stato.completo ? "Già tuo" : b.kind === "pick_one" ? "Scegli e acquista" : "Acquista"}
      {!stato.completo && !loading ? <ArrowRight className="h-4 w-4" /> : null}
    </button>
  );
}

/** Pacchetto in evidenza: fascia larga, elenco corsi in linea, prezzo e azione a destra. */
function Fascia({ b, enrolled }: { b: CatalogBundle; enrolled: Set<string> }) {
  const stato = statoDi(b, enrolled);
  const { loading, error, pickOpen, setPickOpen, acquista } = useAcquisto(b);
  const inclusi = b.courses.filter((c) => c.role === "included");

  return (
    <div className="rounded-2xl border border-border bg-[#FAF8F5] p-6 md:p-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 lg:max-w-[62ch]">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Il percorso completo</p>
          <h3 className="mt-1.5 font-heading text-2xl leading-tight text-near-black">{b.title}</h3>
          {b.description ? (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.description}</p>
          ) : null}
          <p className="mt-3 text-sm leading-relaxed text-foreground/75">
            {inclusi.map((c) => titoloBreve(c.title)).join(" · ")}
          </p>
          <div className="mt-2">
            <Possesso stato={stato} />
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-3 border-t border-border pt-5 lg:items-end lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <Prezzo b={b} stato={stato} grande />
          <Azione b={b} stato={stato} loading={loading} onClick={acquista} />
        </div>
      </div>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      {b.kind === "pick_one" ? (
        <BundlePickDialog bundle={b} open={pickOpen} onOpenChange={setPickOpen} enrolled={enrolled} />
      ) : null}
    </div>
  );
}

/** Pacchetto in griglia: compatto, footer allineato in fondo (altezze uniformi per riga). */
function Card({ b, enrolled }: { b: CatalogBundle; enrolled: Set<string> }) {
  const stato = statoDi(b, enrolled);
  const { loading, error, pickOpen, setPickOpen, acquista } = useAcquisto(b);
  const inclusi = b.courses.filter((c) => c.role === "included");
  const mostrati = inclusi.slice(0, 3);
  const resto = inclusi.length - mostrati.length;

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5 transition-shadow duration-200 ease-out hover:shadow-[0_12px_32px_rgba(26,18,9,0.08)]">
      <h3 className="font-heading text-lg leading-snug text-near-black">{b.title}</h3>
      <ul className="mt-3 flex flex-col gap-1 text-sm text-foreground/75">
        {mostrati.map((c) => (
          <li key={c.id} className="truncate">
            {titoloBreve(c.title)}
          </li>
        ))}
        {resto > 0 ? <li className="text-muted-foreground">e altri {resto}</li> : null}
        {b.kind === "pick_one" ? (
          <li className="font-medium text-primary">+ un Lead Auditor a tua scelta</li>
        ) : null}
      </ul>
      <div className="mt-2">
        <Possesso stato={stato} />
      </div>
      <div className="mt-auto flex flex-col gap-3 pt-5">
        <Prezzo b={b} stato={stato} />
        <Azione b={b} stato={stato} loading={loading} onClick={acquista} className="w-full" />
      </div>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      {b.kind === "pick_one" ? (
        <BundlePickDialog bundle={b} open={pickOpen} onOpenChange={setPickOpen} enrolled={enrolled} />
      ) : null}
    </div>
  );
}

export function BundleStrip({ bundles, enrolledIds }: { bundles: CatalogBundle[]; enrolledIds?: string[] }) {
  const enrolled = useMemo(() => new Set(enrolledIds ?? []), [enrolledIds]);
  // in evidenza il pacchetto di valore più alto; gli altri conservano l'ordine di catalogo
  const { evidenza, altri } = useMemo(() => {
    if (bundles.length === 0) return { evidenza: null, altri: [] as CatalogBundle[] };
    const top = bundles.reduce((a, b) => ((b.priceCents ?? 0) > (a.priceCents ?? 0) ? b : a));
    return { evidenza: top, altri: bundles.filter((b) => b.id !== top.id) };
  }, [bundles]);

  if (!evidenza) return null;

  return (
    <section aria-labelledby="pacchetti" className="flex flex-col gap-4">
      <div>
        <h2 id="pacchetti" className="font-heading text-xl text-near-black">
          Pacchetti
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Combina più percorsi in un unico acquisto e paghi meno.
        </p>
      </div>
      <Fascia b={evidenza} enrolled={enrolled} />
      {altri.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {altri.map((b) => (
            <Card key={b.id} b={b} enrolled={enrolled} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

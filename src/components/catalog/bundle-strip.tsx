"use client";

// Strip "Pacchetti" del catalogo post-login: card per ogni bundle attivo con corsi inclusi,
// prezzo del pacchetto e "valore separato" barrato = SOMMA DEI PREZZI CORRENTI dei corsi
// (sempre vero, in lancio come a listino). Per i pick_one apre il dialog di scelta del
// corso; per i fixed acquisto diretto. Avviso non bloccante se l'utente possiede già
// alcuni corsi (il prezzo del pacchetto non cambia).

import { useMemo, useState } from "react";
import { Layers, Loader2, ShoppingCart } from "lucide-react";
import type { CatalogBundle } from "@/features/catalog/queries";
import { buyBundleAction } from "@/features/billing/server-actions";
import { euro } from "./catalog-browser";
import { BundlePickDialog } from "./bundle-pick-dialog";

/** Somma dei prezzi correnti dei corsi del bundle (per i pick_one: base + il PIÙ ECONOMICO
 * degli eligible → "anziché da X"; il valore esatto compare nel dialog alla scelta). */
export function bundleCompareCents(b: CatalogBundle): { cents: number; isFrom: boolean } | null {
  const included = b.courses.filter((c) => c.role === "included");
  if (included.some((c) => c.priceCents == null)) return null;
  const base = included.reduce((a, c) => a + (c.priceCents ?? 0), 0);
  if (b.kind === "fixed") return { cents: base, isFrom: false };
  const eligible = b.courses.filter((c) => c.role === "eligible" && c.priceCents != null);
  if (eligible.length === 0) return null;
  const cheapest = Math.min(...eligible.map((c) => c.priceCents ?? 0));
  return { cents: base + cheapest, isFrom: true };
}

function BundleCard({ b, enrolled }: { b: CatalogBundle; enrolled: Set<string> }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pickOpen, setPickOpen] = useState(false);

  const included = b.courses.filter((c) => c.role === "included");
  const owned = included.filter((c) => enrolled.has(c.id));
  const compare = bundleCompareCents(b);
  const saving = compare && b.priceCents != null ? compare.cents - b.priceCents : 0;

  async function buyFixed() {
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

  return (
    <div className="flex flex-col rounded-2xl border border-primary/25 bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-heading text-lg leading-snug text-near-black">{b.title}</h3>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
          <Layers className="h-3.5 w-3.5" /> Pacchetto
        </span>
      </div>
      {b.description ? <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{b.description}</p> : null}
      <ul className="mt-3 space-y-1 text-sm text-foreground/80">
        {included.map((c) => (
          <li key={c.id} className="flex items-center gap-1.5">
            <span className="h-1 w-1 shrink-0 rounded-full bg-primary" /> {c.title}
          </li>
        ))}
        {b.kind === "pick_one" ? (
          <li className="flex items-center gap-1.5 font-medium text-primary">
            <span className="h-1 w-1 shrink-0 rounded-full bg-primary" /> + un Lead Auditor a tua scelta
          </li>
        ) : null}
      </ul>
      {owned.length > 0 ? (
        <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
          Possiedi già: {owned.map((c) => c.title).join(", ")}. Il prezzo del pacchetto non cambia.
        </p>
      ) : null}
      <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-4">
        <div>
          {compare && saving > 0 ? (
            <p className="text-xs text-muted-foreground">
              {compare.isFrom ? "anziché da " : "anziché "}
              <span className="line-through">{euro(compare.cents, b.currency ?? "eur")}</span>
            </p>
          ) : null}
          <p className="font-heading text-2xl text-near-black">
            {b.priceCents != null ? euro(b.priceCents, b.currency ?? "eur") : "—"}
            <span className="ml-1 text-xs font-normal text-muted-foreground">+ IVA</span>
          </p>
          {compare && saving > 0 ? (
            <p className="text-xs font-medium text-success">risparmi {compare.isFrom ? "almeno " : ""}{euro(saving, b.currency ?? "eur")}</p>
          ) : null}
        </div>
        <button
          onClick={() => (b.kind === "pick_one" ? setPickOpen(true) : buyFixed())}
          disabled={loading || b.priceCents == null}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
          {b.kind === "pick_one" ? "Scegli e acquista" : "Acquista"}
        </button>
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
  if (bundles.length === 0) return null;
  return (
    <section aria-label="Pacchetti" className="flex flex-col gap-3">
      <h2 className="font-heading text-xl text-near-black">Pacchetti — risparmia combinando i percorsi</h2>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {bundles.map((b) => (
          <BundleCard key={b.id} b={b} enrolled={enrolled} />
        ))}
      </div>
    </section>
  );
}

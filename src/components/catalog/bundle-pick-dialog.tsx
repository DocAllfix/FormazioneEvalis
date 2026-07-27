"use client";

// Dialog di scelta per i bundle "pick_one" (Pacchetto Ingresso): l'utente sceglie il
// Lead Auditor tra gli eligible; il barrato mostrato è la somma dei prezzi CORRENTI dei
// due corsi (19011 + scelto) — il claim "anziché" è sempre esatto per la combinazione.

import { useState } from "react";
import { Check, Loader2, ShoppingCart } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { CatalogBundle } from "@/features/catalog/queries";
import { buyBundleAction } from "@/features/billing/server-actions";
import { euro } from "./catalog-browser";

export function BundlePickDialog({
  bundle,
  open,
  onOpenChange,
  enrolled,
}: {
  bundle: CatalogBundle;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  enrolled: Set<string>;
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const included = bundle.courses.filter((c) => c.role === "included");
  const eligible = bundle.courses.filter((c) => c.role === "eligible");
  const baseCents = included.reduce((a, c) => a + (c.priceCents ?? 0), 0);
  const chosenCourse = eligible.find((c) => c.id === chosen) ?? null;
  const compareCents = chosenCourse?.priceCents != null ? baseCents + chosenCourse.priceCents : null;
  const saving = compareCents != null && bundle.priceCents != null ? compareCents - bundle.priceCents : null;

  async function buy() {
    if (!chosen) return;
    setLoading(true);
    setError("");
    try {
      const url = await buyBundleAction(bundle.id, chosen);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossibile avviare l'acquisto.");
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{bundle.title}: scegli il tuo Lead Auditor</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <p className="text-sm text-muted-foreground">
            Il pacchetto include {included.map((c) => c.title).join(" + ")} e UN percorso a tua scelta:
          </p>
          <div className="mt-1 max-h-72 overflow-y-auto rounded-lg border border-border">
            {eligible.map((c) => {
              const owned = enrolled.has(c.id);
              const active = chosen === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setChosen(c.id)}
                  className={`flex w-full items-center justify-between gap-2 border-b border-border px-3 py-2.5 text-left text-sm transition last:border-b-0 ${
                    active ? "bg-primary/10" : "hover:bg-secondary/40"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        active ? "border-primary bg-primary text-white" : "border-border"
                      }`}
                    >
                      {active ? <Check className="h-3 w-3" /> : null}
                    </span>
                    <span className={active ? "font-medium text-near-black" : "text-foreground/80"}>
                      {c.title}
                      {owned ? <span className="ml-1.5 text-xs text-amber-700">(già tuo)</span> : null}
                    </span>
                  </span>
                  {c.priceCents != null ? (
                    <span className="shrink-0 text-xs text-muted-foreground">{euro(c.priceCents, bundle.currency ?? "eur")}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {compareCents != null && bundle.priceCents != null ? (
            <p className="mt-1 text-sm">
              <span className="text-muted-foreground">
                Separati: <span className="line-through">{euro(compareCents, bundle.currency ?? "eur")}</span> · Pacchetto:{" "}
              </span>
              <span className="font-heading text-lg text-near-black">{euro(bundle.priceCents, bundle.currency ?? "eur")}</span>
              <span className="ml-1 text-xs text-muted-foreground">+ IVA</span>
              {saving != null && saving > 0 ? (
                <span className="ml-2 text-xs font-medium text-success">risparmi {euro(saving, bundle.currency ?? "eur")}</span>
              ) : null}
            </p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-near-black transition hover:bg-secondary/40"
          >
            Annulla
          </button>
          <button
            onClick={buy}
            disabled={!chosen || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
            Acquista il pacchetto
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

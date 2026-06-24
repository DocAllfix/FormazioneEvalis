"use client";

// Abbonamento a posti (B2B): acquista posti (Stripe Checkout) e gestisci l'abbonamento
// (Customer Portal). Nessun importo/logica di pagamento qui: tutto su Stripe.

import { useState } from "react";
import { CreditCard, Loader2, Plus } from "lucide-react";
import { buySeatsAction, openBillingPortalAction } from "@/features/billing/server-actions";

export function BillingPanel({
  seatsUsed,
  seatLimit,
  subscriptionStatus,
}: {
  seatsUsed: number;
  seatLimit: number;
  subscriptionStatus: string | null;
}) {
  const [seats, setSeats] = useState(5);
  const [loading, setLoading] = useState<"" | "buy" | "portal">("");
  const [error, setError] = useState("");
  const hasSubscription = seatLimit > 1;

  async function buy() {
    setLoading("buy");
    setError("");
    try {
      const url = await buySeatsAction(seats);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore nell'avvio dell'acquisto.");
      setLoading("");
    }
  }

  async function portal() {
    setLoading("portal");
    setError("");
    try {
      const url = await openBillingPortalAction();
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore nell'apertura del portale.");
      setLoading("");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      ) : null}

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium text-near-black">Posti</p>
          <p className="tabular-nums text-sm text-muted-foreground">
            <span className="text-2xl font-semibold text-near-black">{seatsUsed}</span> / {seatLimit}
          </p>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${seatLimit > 0 ? Math.min(100, (seatsUsed / seatLimit) * 100) : 0}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {hasSubscription
            ? subscriptionStatus
              ? `Abbonamento: ${subscriptionStatus}.`
              : "Abbonamento attivo."
            : "Nessun abbonamento attivo: acquista i posti per invitare i dipendenti."}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm font-medium text-near-black">Acquista posti</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Ogni posto consente di assegnare i corsi a un dipendente. Potrai modificare la quantità in
          ogni momento dal portale.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="number"
            min={1}
            value={seats}
            onChange={(e) => setSeats(Math.max(1, Number(e.target.value) || 1))}
            className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm tabular-nums outline-none ring-primary/30 focus:ring-2"
            aria-label="Numero posti"
          />
          <button
            onClick={buy}
            disabled={loading === "buy"}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {loading === "buy" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Acquista posti
          </button>
        </div>
      </div>

      {hasSubscription ? (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-6">
          <div>
            <p className="text-sm font-medium text-near-black">Gestisci abbonamento</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Cambia il numero di posti, aggiorna il metodo di pagamento o disdici dal portale Stripe.
            </p>
          </div>
          <button
            onClick={portal}
            disabled={loading === "portal"}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-near-black transition hover:bg-secondary disabled:opacity-60"
          >
            {loading === "portal" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            Apri portale
          </button>
        </div>
      ) : null}
    </div>
  );
}

"use client";

// Fatturazione (B2B). Modello: i POSTI NON si vendono — l'azienda invita liberamente i
// propri dipendenti e paga i CORSI che acquista per loro (con sconto automatico dal 2°
// iscritto allo stesso corso). Qui: stato dipendenti, come funziona la spesa, ricevute
// e metodo di pagamento tramite il portale Stripe.

import { useState } from "react";
import { ArrowRight, BadgePercent, CreditCard, Loader2, Users } from "lucide-react";
import Link from "next/link";
import { openBillingPortalAction } from "@/features/billing/server-actions";

export function BillingPanel({
  seatsUsed,
  seatLimit,
  subscriptionStatus,
}: {
  seatsUsed: number;
  seatLimit: number;
  subscriptionStatus: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function portal() {
    setLoading(true);
    setError("");
    try {
      const url = await openBillingPortalAction();
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore nell'apertura del portale.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      ) : null}

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-baseline justify-between">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-near-black">
            <Users className="h-4 w-4 text-primary" /> Dipendenti nel tuo spazio
          </p>
          <p className="text-2xl font-semibold tabular-nums text-near-black">{seatsUsed}</p>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Puoi invitare i tuoi dipendenti liberamente: l&apos;accesso alla piattaforma non si paga
          {seatLimit > 0 ? ` (limite tecnico attuale: ${seatLimit} persone, ampliabile su richiesta)` : ""}.
          {subscriptionStatus ? ` Abbonamento storico: ${subscriptionStatus}.` : ""}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm font-medium text-near-black">Come funziona la spesa</p>
        <ul className="mt-3 flex flex-col gap-2.5 text-sm text-foreground/80">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            Paghi solo i <strong>corsi</strong> che acquisti per i tuoi dipendenti: nessun canone,
            nessun costo per l&apos;accesso.
          </li>
          <li className="flex items-start gap-2">
            <BadgePercent className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <span>
              <strong>Sconto automatico</strong>: −20% dal secondo iscritto allo stesso corso, −30% dal
              quinto. Applicato da solo al pagamento, senza codici.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            Acquisti dalla pagina <strong>Persone</strong>, scegliendo il corso accanto al dipendente.
          </li>
        </ul>
        <Link
          href="/admin/persone"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
        >
          Vai a Persone <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-6">
        <div>
          <p className="text-sm font-medium text-near-black">Ricevute e metodo di pagamento</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Scarica le ricevute degli acquisti e aggiorna i dati di fatturazione dal portale sicuro Stripe.
          </p>
        </div>
        <button
          onClick={portal}
          disabled={loading}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-near-black transition hover:bg-secondary disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          Apri portale
        </button>
      </div>
    </div>
  );
}

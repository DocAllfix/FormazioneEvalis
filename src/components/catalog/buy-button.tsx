"use client";

// Bottone acquisto B2C: avvia il checkout Stripe e reindirizza. Nessuna logica di pagamento qui
// (la verità di stato arriva dal webhook, l'enrollment compare dopo).
// Se il corso è ISO e l'utente non è idoneo 19011, mostra PRIMA un avviso informativo (non blocca):
// promemoria + rimando alla 19011; se procede comunque, registra la presa d'atto (audit).

import { useState } from "react";
import Link from "next/link";
import { Loader2, ShoppingCart, ShieldAlert, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { buyCourseAction } from "@/features/billing/server-actions";
import { acknowledgeIso19011AdvisoryAction } from "@/features/prerequisites/server-actions";

type Advisory = { shouldAdvise: boolean; prerequisiteCourseId?: string; prerequisiteTitle?: string };

export function BuyButton({ courseId, advisory }: { courseId: string; advisory?: Advisory | null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  async function checkout() {
    setLoading(true);
    setError("");
    try {
      const url = await buyCourseAction(courseId);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossibile avviare l'acquisto.");
      setLoading(false);
      setOpen(false);
    }
  }

  function onBuyClick() {
    if (advisory?.shouldAdvise) {
      setOpen(true);
      return;
    }
    checkout();
  }

  async function proceedAnyway() {
    // Registra la presa d'atto (non deve bloccare l'acquisto se fallisce l'audit).
    try {
      await acknowledgeIso19011AdvisoryAction(courseId);
    } catch {
      /* best-effort: l'acquisto prosegue comunque */
    }
    await checkout();
  }

  return (
    <div>
      <button
        onClick={onBuyClick}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
        Acquista il corso
      </button>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" /> Prima di procedere
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 text-sm text-foreground/80">
            <p>
              Questa è una certificazione ISO. <strong>Senza la certificazione ISO 19011</strong> (la norma
              sull&apos;auditing) questa certificazione <strong>non è applicabile in ambito lavorativo</strong>.
            </p>
            <p>
              Puoi comunque acquistare e completare il corso: la certificazione diventerà spendibile una volta
              ottenuta anche la ISO 19011.
            </p>
            {advisory?.prerequisiteCourseId ? (
              <Link
                href={`/corsi/${advisory.prerequisiteCourseId}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 font-medium text-primary transition hover:bg-primary/10"
              >
                Vedi prima la {advisory.prerequisiteTitle ?? "ISO 19011"} <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
          <DialogFooter>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-near-black transition hover:bg-secondary/40"
            >
              Annulla
            </button>
            <button
              onClick={proceedAnyway}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Acquista comunque
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

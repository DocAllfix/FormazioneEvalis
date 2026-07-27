"use client";

// Banner post-checkout (?purchase=success|cancel in dashboard). L'enrollment arriva dal
// webhook Stripe (asincrono): al redirect può non esserci ANCORA — il copy lo dice e invita
// a ricaricare, senza polling. Dismissibile; ripulisce l'URL alla chiusura.

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Info, X } from "lucide-react";

export function PurchaseBanner() {
  const params = useSearchParams();
  const router = useRouter();
  const purchase = params.get("purchase");
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || (purchase !== "success" && purchase !== "cancel")) return null;

  const close = () => {
    setDismissed(true);
    router.replace("/dashboard", { scroll: false });
  };

  if (purchase === "success") {
    return (
      <div className="flex items-start justify-between gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3">
        <p className="flex items-start gap-2 text-sm text-foreground/90">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <span>
            <strong>Acquisto completato!</strong>{" "}Stiamo attivando il tuo percorso: comparirà qui tra i tuoi
            corsi entro pochi istanti (l&apos;attivazione arriva dalla conferma del pagamento — se non lo vedi,
            ricarica la pagina).
          </span>
        </p>
        <button onClick={close} aria-label="Chiudi" className="shrink-0 text-muted-foreground transition hover:text-near-black">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3">
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        Pagamento annullato: nessun addebito. Puoi riprovare quando vuoi dal catalogo.
      </p>
      <button onClick={close} aria-label="Chiudi" className="shrink-0 text-muted-foreground transition hover:text-near-black">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

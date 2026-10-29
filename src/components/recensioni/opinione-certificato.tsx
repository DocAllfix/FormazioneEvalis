"use client";

// Pagina Certificati: sotto ogni certificato, l'opinione sul corso. Senza opinione → invito a
// lasciarla (anche per chi ha finito il corso prima che esistesse questa funzione); con
// opinione → stelle, stato sul sito e «Modifica» (da qui si ritira anche il consenso).

import { useState } from "react";
import { MessageSquareHeart, Star } from "lucide-react";
import { FormRecensione } from "./form-recensione";
import type { MiaRecensione } from "@/features/recensioni/recensioni";

function statoSulSito(r: MiaRecensione): string {
  if (r.pubblicazione === "no" || !r.testo) return "Solo per lo staff Evalis";
  if (r.stato === "approvata") return `Pubblicata sul sito come «${r.nomePubblico}»`;
  if (r.stato === "nascosta") return "Non pubblicata";
  return "In attesa di verifica dello staff";
}

export function OpinioneCertificato({
  enrollmentId,
  nomeUtente,
  recensione,
}: {
  enrollmentId: string;
  nomeUtente: string;
  recensione: MiaRecensione | null;
}) {
  const [aperto, setAperto] = useState(false);
  const [attuale, setAttuale] = useState(recensione);

  if (aperto) {
    return (
      <div className="border-t border-border pt-4">
        <FormRecensione
          enrollmentId={enrollmentId}
          nomeUtente={nomeUtente}
          iniziale={attuale}
          onSalvata={(r) => setAttuale(r)}
        />
        <button type="button" onClick={() => setAperto(false)} className="mt-3 text-sm text-muted-foreground transition hover:text-near-black">
          Chiudi
        </button>
      </div>
    );
  }

  if (!attuale) {
    return (
      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2.5 text-sm text-foreground/80">
          <MessageSquareHeart className="h-4 w-4 shrink-0 text-primary" />
          Com&apos;è andato il corso? Lasciaci la tua opinione: bastano un minuto e qualche stella.
        </p>
        <button
          type="button"
          onClick={() => setAperto(true)}
          className="inline-flex shrink-0 items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 active:scale-[0.98]"
        >
          Lascia la tua opinione
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground/80">
        <span className="font-medium text-near-black">La tua opinione</span>
        <span className="inline-flex" aria-label={`${attuale.votoCorso} stelle su 5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} className={`h-4 w-4 ${n <= attuale.votoCorso ? "fill-primary text-primary" : "text-border"}`} />
          ))}
        </span>
        <span className="text-muted-foreground">{statoSulSito(attuale)}</span>
      </p>
      <button type="button" onClick={() => setAperto(true)} className="self-start text-sm font-medium text-primary transition hover:underline sm:self-auto">
        Modifica
      </button>
    </div>
  );
}

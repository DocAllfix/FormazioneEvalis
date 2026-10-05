"use client";

// Scadenza del prezzo di lancio (fineLancio in listino-dati.ts): fine del mese in corso, a
// rotazione mensile. Fino a 5 giorni prima mostra la data; negli ultimi 5 giorni un conto alla
// rovescia.
//
// Il primo render (server e client) è la riga con la data, identica dai due lati: il conto alla
// rovescia parte solo dopo il montaggio, quindi niente errori di idratazione, e senza JavaScript
// resta comunque una frase vera.

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { fineLancio } from "@/features/billing/listino-dati";

const ULTIMI_GIORNI = 5 * 24 * 60 * 60 * 1000;
// fuso esplicito: server e client scrivono la stessa data qualunque sia il loro fuso
const formatoData = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", timeZone: "Europe/Rome" });

function residuo(ms: number): string {
  const g = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return g > 0 ? `${g} g ${h} h` : h > 0 ? `${h} h ${m} min` : `${m} min`;
}

export function ScadenzaLancio({ className = "" }: { className?: string }) {
  const [ora, setOra] = useState<number | null>(null);

  useEffect(() => {
    setOra(Date.now());
    const t = setInterval(() => setOra(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const fine = fineLancio(ora ?? undefined);
  const manca = ora == null ? null : fine - ora;

  const testo =
    manca != null && manca <= ULTIMI_GIORNI
      ? `Il prezzo di lancio termina tra ${residuo(manca)}`
      : `Prezzo di lancio fino al ${formatoData.format(fine)}`;

  return (
    <p className={`inline-flex items-center gap-1.5 ${className}`}>
      <Timer className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {testo}
    </p>
  );
}

"use client";

// Scadenza del prezzo di lancio, da una data VERA (FINE_LANCIO in listino-dati.ts): a quella
// data i prezzi salgono davvero al listino. Fino a 5 giorni prima mostra la data; negli ultimi
// 5 giorni un conto alla rovescia; dopo sparisce. Non si rimette mai a zero: un timer che
// riparte senza che il prezzo cambi è una pratica sempre ingannevole (Cod. Consumo art. 23 g).
//
// Il primo render (server e client) è la riga con la data, identica dai due lati: il conto alla
// rovescia parte solo dopo il montaggio, quindi niente errori di idratazione, e senza JavaScript
// resta comunque una frase vera.

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { FINE_LANCIO } from "@/features/billing/listino-dati";

const FINE = Date.parse(FINE_LANCIO);
const ULTIMI_GIORNI = 5 * 24 * 60 * 60 * 1000;
// fuso esplicito: server e client scrivono la stessa data qualunque sia il loro fuso
const DATA = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", timeZone: "Europe/Rome" }).format(FINE);

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

  const manca = ora == null ? null : FINE - ora;
  if (manca != null && manca <= 0) return null;

  const testo =
    manca != null && manca <= ULTIMI_GIORNI
      ? `Il prezzo di lancio termina tra ${residuo(manca)}`
      : `Prezzo di lancio fino al ${DATA}`;

  return (
    <p className={`inline-flex items-center gap-1.5 ${className}`}>
      <Timer className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {testo}
    </p>
  );
}

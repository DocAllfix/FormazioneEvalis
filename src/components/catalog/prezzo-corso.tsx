// Prezzo di un corso: listino barrato + prezzo di lancio + "+ IVA". È lo STESSO markup che
// l'area riservata usava già — copiato così com'è da catalog-browser (formato card) e dalla
// scheda /corsi/[id] (formato scheda) — portato qui perché ora serve anche in landing e nel
// catalogo pubblico, e tre copie dello stesso prezzo non si tengono allineate.
//
// Niente "use client" e niente hook: lo importano sia le pagine server sia i componenti client.
// (ScadenzaLancio è un componente client: si può rendere da entrambi i lati.)

import { euro } from "@/lib/formato";
import { ScadenzaLancio } from "./scadenza-lancio";

type PrezzoDati = { priceCents: number | null; listPriceCents: number | null; currency: string | null };

/** Doppio listino attivo? (prezzo lancio con listino barrato) */
export function hasLaunchPrice(c: Pick<PrezzoDati, "priceCents" | "listPriceCents">): boolean {
  return c.priceCents != null && c.listPriceCents != null && c.listPriceCents > c.priceCents;
}

export function PrezzoCorso({ c, size }: { c: PrezzoDati; size: "sm" | "lg" }) {
  const launch = hasLaunchPrice(c);

  if (size === "lg") {
    return c.priceCents == null ? (
      <p className="font-heading text-3xl text-near-black">Su richiesta</p>
    ) : (
      <div>
        {launch ? (
          <p className="text-sm">
            <span className="text-muted-foreground line-through">{euro(c.listPriceCents!, c.currency)}</span>
            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-white">Prezzo lancio</span>
          </p>
        ) : null}
        <p className="font-heading text-3xl text-near-black">
          {euro(c.priceCents, c.currency)} <span className="text-sm font-normal text-muted-foreground">+ IVA</span>
        </p>
        {launch ? <ScadenzaLancio className="mt-1.5 text-sm font-medium text-primary" /> : null}
      </div>
    );
  }

  return c.priceCents == null ? (
    <span className="font-heading text-lg text-near-black">Su richiesta</span>
  ) : (
    <span className="text-right">
      {launch ? (
        <span className="mr-2 text-sm text-muted-foreground line-through">{euro(c.listPriceCents!, c.currency)}</span>
      ) : null}
      <span className="font-heading text-lg text-near-black">{euro(c.priceCents, c.currency)}</span>
      <span className="ml-1 text-[11px] text-muted-foreground">+ IVA</span>
    </span>
  );
}

"use client";

// Banner di CONSENSO (non piu' un semplice avviso).
//
// Tre vincoli che sembrano estetici e sono di legge, e che si vedono guardando i bottoni:
//   1. "Rifiuta" sta accanto ad "Accetta", stessa dimensione, stesso peso visivo. Un rifiuto
//      piu' faticoso dell'accettazione e' esattamente cio' che viene contestato.
//   2. Si parte da tutto negato: la casella delle statistiche e' spenta finche' non la si accende.
//   3. La scelta si cambia quando si vuole, dal link nel footer.
//
// Finche' nessuno ha scelto, GA4 non viene nemmeno scaricato.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  EVENTO_CONSENSO,
  applicaConsenso,
  leggiConsenso,
  revocaConsenso,
  salvaConsenso,
} from "@/features/consenso/stato";

export function CookieBanner() {
  const [visibile, setVisibile] = useState(false);
  const [dettaglio, setDettaglio] = useState(false);
  const [statistiche, setStatistiche] = useState(false);
  const riquadro = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const c = leggiConsenso();
    // gia' scelto: si riapplica al caricamento, perche' Consent Mode vive nella pagina
    if (c) applicaConsenso(c);
    else setVisibile(true);

    // il link "Preferenze cookie" nel footer riapre il banner passando da qui
    function riapri() {
      revocaConsenso();
      setStatistiche(false);
      setDettaglio(false);
      setVisibile(true);
    }
    window.addEventListener("evalis:riapri-consenso", riapri);
    return () => window.removeEventListener("evalis:riapri-consenso", riapri);
  }, []);

  // Il banner e' fissato in basso e coprirebbe la fine della pagina: senza questo, il footer
  // (dove sta anche il link per cambiare idea) resta irraggiungibile finche' non si sceglie.
  useEffect(() => {
    if (!visibile) {
      document.body.style.removeProperty("padding-bottom");
      return;
    }
    const altezza = riquadro.current?.offsetHeight ?? 0;
    document.body.style.paddingBottom = `${altezza + 24}px`;
    return () => {
      document.body.style.removeProperty("padding-bottom");
    };
  }, [visibile, dettaglio]);

  // Chi naviga da tastiera deve trovarlo: compare in fondo al DOM, e senza questo servirebbe
  // attraversare tutta la pagina per arrivarci.
  useEffect(() => {
    if (visibile) riquadro.current?.focus();
  }, [visibile]);

  if (!visibile) return null;

  function scegli(conStatistiche: boolean) {
    salvaConsenso(conStatistiche);
    setVisibile(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-3 sm:px-6 sm:pb-6">
      <div
        ref={riquadro}
        tabIndex={-1}
        role="dialog"
        aria-label="Preferenze sui cookie"
        // NB: niente aria-modal e niente chiusura con Esc — una chiusura senza scelta sarebbe
        // un consenso implicito, che e' proprio cio' che non deve succedere.
        className="mx-auto max-w-3xl rounded-2xl border border-[#EAE4DB] bg-white p-4 shadow-[0_12px_40px_rgba(26,18,9,0.16)] outline-none sm:p-5"
      >
        <p className="text-[13px] leading-relaxed text-[#5C5347] sm:text-sm">
          Usiamo <strong className="text-near-black">cookie tecnici</strong> e, solo con il tuo
          consenso, cookie di <strong className="text-near-black">statistica</strong> per capire
          quali contenuti sono utili. Nessuna pubblicità, nessuna profilazione.{" "}
          <Link href="/cookie" className="font-medium text-primary hover:underline">
            Cookie Policy
          </Link>
          .
        </p>

        {dettaglio ? (
          <div className="mt-3 space-y-2.5 border-t border-[#EAE4DB] pt-3">
            <label htmlFor="c-necessari" className="flex items-start gap-3 text-[13px] text-[#5C5347]">
              <input
                type="checkbox"
                checked
                disabled
                readOnly
                id="c-necessari"
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              />
              <span>
                <span className="font-medium text-near-black">Necessari</span> — accesso,
                sicurezza, preferenze. Senza questi il sito non funziona.
              </span>
            </label>
            <label htmlFor="c-statistiche" className="flex items-start gap-3 text-[13px] text-[#5C5347]">
              <input
                type="checkbox"
                checked={statistiche}
                onChange={(e) => setStatistiche(e.target.checked)}
                id="c-statistiche"
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              />
              <span>
                <span className="font-medium text-near-black">Statistiche</span> — Google
                Analytics, dati aggregati sulle pagine lette.
              </span>
            </label>
          </div>
        ) : null}

        {/* Accetta e Rifiuta hanno lo stesso peso: e' un requisito, non una scelta grafica.
            "Personalizza" e' volutamente secondario — e' un approfondimento, non una terza via. */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <button
            onClick={() => scegli(true)}
            className="min-w-[110px] flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110 sm:flex-none sm:px-6"
          >
            Accetta
          </button>
          <button
            onClick={() => scegli(false)}
            className="min-w-[110px] flex-1 rounded-lg border border-[#EAE4DB] bg-white px-4 py-2.5 text-sm font-medium text-near-black transition hover:border-primary sm:flex-none sm:px-6"
          >
            Rifiuta
          </button>
          {dettaglio ? (
            <button
              onClick={() => scegli(statistiche)}
              className="min-w-[110px] flex-1 rounded-lg border border-[#EAE4DB] bg-white px-4 py-2.5 text-sm font-medium text-near-black transition hover:border-primary sm:flex-none sm:px-6"
            >
              Salva le scelte
            </button>
          ) : (
            <button
              onClick={() => setDettaglio(true)}
              className="ml-auto rounded-lg px-2 py-2.5 text-sm text-[#766E66] underline transition hover:text-near-black"
            >
              Personalizza
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

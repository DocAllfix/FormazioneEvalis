"use client";

// Banner di CONSENSO (non piu' un semplice avviso).
//
// Tre vincoli che non sono estetici ma di legge, e che si vedono guardando i bottoni:
//   1. "Rifiuta" sta accanto ad "Accetta", stessa dimensione, stesso peso visivo. Un rifiuto
//      piu' faticoso dell'accettazione e' esattamente cio' che il Garante contesta.
//   2. Si parte da tutto negato: la casella delle statistiche e' spenta finche' non la si accende.
//   3. La scelta si cambia quando si vuole, dal link nel footer.
//
// Finche' nessuno ha scelto, GA4 non viene nemmeno scaricato.

import { useEffect, useState } from "react";
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

  if (!visibile) return null;

  function scegli(conStatistiche: boolean) {
    salvaConsenso(conStatistiche);
    setVisibile(false);
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4 sm:px-6 sm:pb-6"
      role="dialog"
      aria-modal="false"
      aria-label="Preferenze sui cookie"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-[#EAE4DB] bg-white p-4 shadow-[0_12px_40px_rgba(26,18,9,0.16)] sm:p-5">
        <p className="text-sm leading-relaxed text-[#5C5347]">
          Usiamo <strong className="text-near-black">cookie tecnici</strong>, necessari al
          funzionamento e alla sicurezza, e — solo con il tuo consenso — cookie di{" "}
          <strong className="text-near-black">statistica</strong> per capire quali contenuti sono
          utili. Nessuna pubblicità, nessuna profilazione.{" "}
          <Link href="/cookie" className="font-medium text-primary hover:underline">
            Cookie Policy
          </Link>
          .
        </p>

        {dettaglio ? (
          <div className="mt-4 space-y-3 border-t border-[#EAE4DB] pt-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked
                disabled
                readOnly
                id="c-necessari"
                className="mt-1 h-4 w-4 accent-primary"
              />
              <label htmlFor="c-necessari" className="text-sm text-[#5C5347]">
                <span className="font-medium text-near-black">Necessari</span> — accesso,
                sicurezza, preferenze. Senza questi il sito non funziona, quindi non si possono
                disattivare.
              </label>
            </div>
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={statistiche}
                onChange={(e) => setStatistiche(e.target.checked)}
                id="c-statistiche"
                className="mt-1 h-4 w-4 accent-primary"
              />
              <label htmlFor="c-statistiche" className="text-sm text-[#5C5347]">
                <span className="font-medium text-near-black">Statistiche</span> — Google
                Analytics, per sapere quali pagine vengono lette. Dati aggregati, nessuna
                pubblicità.
              </label>
            </div>
          </div>
        ) : null}

        {/* Accetta e Rifiuta hanno lo stesso peso: e' un requisito, non una scelta grafica */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            onClick={() => scegli(true)}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110 sm:flex-1"
          >
            Accetta
          </button>
          <button
            onClick={() => scegli(false)}
            className="rounded-lg border border-[#EAE4DB] bg-white px-5 py-2.5 text-sm font-medium text-near-black transition hover:border-primary sm:flex-1"
          >
            Rifiuta
          </button>
          {dettaglio ? (
            <button
              onClick={() => scegli(statistiche)}
              className="rounded-lg border border-[#EAE4DB] bg-white px-5 py-2.5 text-sm font-medium text-near-black transition hover:border-primary sm:flex-1"
            >
              Salva le scelte
            </button>
          ) : (
            <button
              onClick={() => setDettaglio(true)}
              className="rounded-lg px-5 py-2.5 text-sm font-medium text-[#766E66] underline transition hover:text-near-black sm:flex-none"
            >
              Personalizza
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

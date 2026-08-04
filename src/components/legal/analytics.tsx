"use client";

// GA4, caricato SOLO dopo un consenso esplicito.
//
// Non e' la stessa cosa che caricare gtag e poi dirgli di non tracciare: qui, senza consenso,
// dagli strumenti di rete del browser non parte NESSUNA richiesta verso Google. E' la
// condizione che rende l'impianto difendibile.
//
// Senza NEXT_PUBLIC_GA4_ID il componente non fa nulla: il sito gira identico finche' la
// proprieta' GA4 non esiste.

import Script from "next/script";
import { useEffect, useState } from "react";
import { EVENTO_CONSENSO, leggiConsenso, type Consenso } from "@/features/consenso/stato";

const ID = process.env.NEXT_PUBLIC_GA4_ID;

export function Analytics() {
  const [attivo, setAttivo] = useState(false);

  useEffect(() => {
    if (!ID) return;
    setAttivo(Boolean(leggiConsenso()?.statistiche));
    function suCambio(e: Event) {
      const c = (e as CustomEvent<Consenso | null>).detail;
      setAttivo(Boolean(c?.statistiche));
    }
    window.addEventListener(EVENTO_CONSENSO, suCambio);
    return () => window.removeEventListener(EVENTO_CONSENSO, suCambio);
  }, []);

  if (!ID || !attivo) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${ID}`} strategy="afterInteractive" />
      <Script id="ga4-avvio" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${ID}', {
            // l'indirizzo IP non serve a nessuna delle nostre domande
            anonymize_ip: true,
            // il consenso lo comanda il banner, non questa riga
            send_page_view: true
          });
        `}
      </Script>
    </>
  );
}

"use client";

// Rende una slide importata come HTML "impaginato" in un IFRAME isolato: il CSS
// inline della slide non tocca il resto della piattaforma.
//
// MODELLO (v2, deterministico): l'iframe è un CANVAS A DIMENSIONE FISSA
// (TOTAL_W × H, dove H viene dal ratio per-slide salvato nel DB in fase di build)
// e lo SCALING lo fa il GENITORE React (`scale` = larghezzaBox / TOTAL_W), non uno
// script dentro l'iframe. Così la resa non dipende da timing dei font, resize o
// script sandboxed: il canvas è sempre mostrato INTERO (zoom-out), mai tagliato.
//
// Rete di sicurezza: un mini-script nell'iframe misura l'altezza reale del
// contenuto a font caricati e la comunica via postMessage; se su una macchina il
// contenuto risultasse più alto del previsto, il genitore allarga il box (onRatio)
// → il contenuto non può restare tagliato nemmeno nei casi anomali.

import { useEffect, useMemo, useRef } from "react";

const FONTS =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap";

export const SLIDE_W = 1280;
export const BASE_H = 720;
export const GUTTER = 380;
export const TOTAL_W = SLIDE_W + GUTTER;
export const DEFAULT_RATIO = TOTAL_W / BASE_H;
// Altezza massima prudenziale di una slide (px) e ratio di sicurezza corrispondente.
// SAFE_RATIO è il ratio INIZIALE quando una slide non ha il ratio salvato nel blocco:
// box "alto" → mai un taglio, al più un margine sotto finché la misura non arriva.
// Deve restare ≥ dell'altezza reale della slide più alta prodotta (max osservato ~1059px).
export const MAX_SLIDE_H = 1200;
export const SAFE_RATIO = TOTAL_W / MAX_SLIDE_H;

// Stessa formula del populate (_populate-slide-ratio.ts): margine prudenziale sopra
// l'altezza naturale misurata, così piccole differenze di rendering non tagliano mai.
const MARGINE = 12;

export function SlideHtml({
  html,
  bg = "#F4F3EF",
  ratio,
  scale,
  onRatio,
}: {
  html: string;
  bg?: string;
  /** Proporzione della slide (TOTAL_W/H). Dal blocco salvato nel DB, o SAFE_RATIO. */
  ratio: number;
  /** Fattore di zoom applicato dal genitore: larghezzaBox / TOTAL_W. */
  scale: number;
  onRatio?: (ratio: number) => void;
}) {
  const ref = useRef<HTMLIFrameElement | null>(null);

  // Altezza del canvas derivata dal ratio (server-side per le slide popolate).
  const canvasH = Math.max(BASE_H, Math.round(TOTAL_W / (ratio > 0 ? ratio : SAFE_RATIO)));

  // srcDoc COSTANTE rispetto a ratio/scale (dipende solo da html+bg): cambiare il
  // ratio non rimonta l'iframe e non fa "lampeggiare" i font. Nessuno script di
  // scaling interno: solo la MISURA di verifica, comunicata al genitore.
  const srcDoc = useMemo(
    () => `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS}" rel="stylesheet">
<style>
  html,body{margin:0;padding:0;background:${bg};overflow:hidden;}
  #stage{width:${TOTAL_W}px;}
  /* border-box: la slide e' larga ${SLIDE_W}px TOTALI (padding incluso) e non sborda dal
     canvas. overflow-x nascosto per sicurezza; in verticale la section cresce naturale
     (min-height:720 dal build) e l'altezza visibile la governa il genitore. */
  #stage > section{margin-left:${GUTTER}px;width:${SLIDE_W}px!important;box-sizing:border-box!important;overflow:hidden;}
</style></head>
<body>
  <div id="stage">${html}</div>
  <script>
    (function(){
      var TOTAL=${TOTAL_W}, BASE=${BASE_H}, MARG=${MARGINE};
      var sec=document.querySelector('#stage > section');
      var last=0;
      function report(){
        if(!sec){ return; }
        // altezza REALE del layout così com'è renderizzato (figli intatti, font attuali)
        var nat=Math.ceil(sec.scrollHeight);
        var H=Math.max(BASE, nat+6)+MARG;
        if(Math.abs(H-last)<4){ return; }
        last=H;
        parent.postMessage({__slideRatio:true, ratio: TOTAL/H}, '*');
      }
      window.addEventListener('resize',report);
      if(document.fonts&&document.fonts.ready)document.fonts.ready.then(report);
      setTimeout(report,100); setTimeout(report,500); setTimeout(report,1500); setTimeout(report,3000);
      report();
    })();
  </script>
</body></html>`,
    [html, bg],
  );

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.source === ref.current?.contentWindow && e.data?.__slideRatio && onRatio) {
        onRatio(e.data.ratio as number);
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [onRatio]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <iframe
        ref={ref}
        title="Contenuto slide"
        sandbox="allow-scripts"
        srcDoc={srcDoc}
        style={{
          width: TOTAL_W,
          height: canvasH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          border: 0,
          background: bg,
        }}
      />
    </div>
  );
}

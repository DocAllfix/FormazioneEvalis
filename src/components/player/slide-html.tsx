"use client";

// Rende una slide importata come HTML "impaginato" (es. democorso) in un IFRAME
// isolato: il CSS inline della slide non tocca il resto della piattaforma.
// Canvas: 1280px di larghezza + GUTTER sinistro fisso per l'avatar. L'ALTEZZA è
// ADATTIVA: misura l'altezza naturale del contenuto della slide (qualunque essa
// sia) e dimensiona la canvas di conseguenza → nessun contenuto viene mai tagliato.
// Comunica al parent il rapporto (ratio) così la slide può essere scalata per
// stare intera nello schermo (fit). La slide NON viene mai compressa.

import { useEffect, useMemo, useRef } from "react";

const FONTS =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap";

export const SLIDE_W = 1280;
export const BASE_H = 720;
export const GUTTER = 380;
export const TOTAL_W = SLIDE_W + GUTTER;
export const DEFAULT_RATIO = TOTAL_W / BASE_H;
/** % della larghezza occupata dal gutter (per dimensionare l'avatar nel parent). */
export const GUTTER_PCT = (GUTTER / TOTAL_W) * 100;

export function SlideHtml({
  html,
  bg = "#F4F3EF",
  onRatio,
}: {
  html: string;
  bg?: string;
  onRatio?: (ratio: number) => void;
}) {
  const ref = useRef<HTMLIFrameElement | null>(null);

  const srcDoc = useMemo(
    () => `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS}" rel="stylesheet">
<style>
  html,body{margin:0;padding:0;background:${bg};overflow:hidden;}
  #stage{width:${TOTAL_W}px;transform-origin:top left;}
  /* border-box: la slide e' larga ${SLIDE_W}px TOTALI (padding incluso) e non sborda dal
     canvas. Senza, width+padding la porterebbe a ~1440px e il bordo destro verrebbe tagliato. */
  #stage > section{margin-left:${GUTTER}px;width:${SLIDE_W}px!important;box-sizing:border-box!important;overflow:hidden;}
  /* durante la misura: tutto ad altezza naturale per leggere l'altezza reale */
  #stage.measuring > section, #stage.measuring > section *{height:auto!important;min-height:0!important;}
</style></head>
<body>
  <div id="stage">${html}</div>
  <script>
    (function(){
      var TOTAL=${TOTAL_W}, BASE=${BASE_H};
      var st=document.getElementById('stage');
      var sec=st.querySelector('section');
      function recompute(){
        if(!sec){ return; }
        // 1) misura altezza naturale del contenuto della slide
        sec.style.height='';
        st.classList.add('measuring');
        var nat=sec.scrollHeight;
        st.classList.remove('measuring');
        // 2) canvas = max(BASE, naturale): le slide "leggere" mantengono il layout
        //    originale (flex distribuito su 720); quelle dense crescono e mostrano tutto.
        var H=Math.max(BASE, Math.ceil(nat)+6);
        sec.style.height=H+'px';
        st.style.height=H+'px';
        // 3) scala l'intero stage alla larghezza disponibile
        var scale=document.documentElement.clientWidth/TOTAL;
        st.style.transform='scale('+scale+')';
        parent.postMessage({__slideRatio:true, ratio: TOTAL/H}, '*');
      }
      window.addEventListener('resize',recompute);
      if(document.fonts&&document.fonts.ready)document.fonts.ready.then(recompute);
      setTimeout(recompute,50); setTimeout(recompute,350); setTimeout(recompute,900); recompute();
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
    <iframe
      ref={ref}
      title="Contenuto slide"
      sandbox="allow-scripts"
      srcDoc={srcDoc}
      style={{ background: bg }}
      className="absolute inset-0 h-full w-full border-0"
    />
  );
}

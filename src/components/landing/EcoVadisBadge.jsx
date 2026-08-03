import React from "react";
import Image from "next/image";

// Badge EcoVadis di EVALIS SRL (la societa', non la piattaforma: il testo lo dice sempre).
// Il file in public/brand e' quello ufficiale scaricato da EcoVadis: autonomo, font incorporato,
// nessuna risorsa esterna. Non va ridisegnato ne' ricolorato.
//
// SCADENZA: la valutazione vale dal 25/06/2026 al 25/06/2027. Passata quella data il badge va
// sostituito con quello nuovo (o rimosso): un riconoscimento scaduto esposto sul sito e' peggio
// che non averlo. La costante qui sotto e' l'unico punto da aggiornare.
export const ECOVADIS = {
  medaglia: "Platinum",
  punteggio: "89/100",
  percentile: "top 1%",
  intestatario: "Evalis SRL",
  validoFino: "giugno 2027",
  file: "/brand/ecovadis-platinum-2026.svg",
};

const TAGLIE = { sm: 56, md: 88, lg: 96 };

/**
 * @param {{ size?: "sm"|"md"|"lg", variant?: "chiaro"|"scuro", className?: string }} props
 * variant "scuro" = il badge sta su fondo scuro (footer): il testo accanto schiarisce.
 */
export default function EcoVadisBadge({ size = "md", variant = "chiaro", className = "" }) {
  const px = TAGLIE[size] ?? TAGLIE.md;
  const scuro = variant === "scuro";
  const titolo = scuro ? "text-[#F5F0E8]" : "text-near-black";
  const testo = scuro ? "text-[#A79684]" : "text-[#5C5347]";

  return (
    <div className={`flex items-center gap-3.5 ${className}`}>
      <Image
        src={ECOVADIS.file}
        alt={`EcoVadis ${ECOVADIS.medaglia} 2026 — ${ECOVADIS.intestatario}, ${ECOVADIS.punteggio}`}
        width={px}
        height={px}
        className="flex-shrink-0"
        style={{ width: px, height: px }}
      />
      <div className="leading-tight">
        <p className={`font-heading text-sm ${titolo}`}>
          EcoVadis {ECOVADIS.medaglia}
        </p>
        <p className={`text-[13px] ${testo}`}>
          {size === "sm" ? (
            <>{ECOVADIS.intestatario} nel {ECOVADIS.percentile}</>
          ) : (
            <>
              {ECOVADIS.intestatario} nel {ECOVADIS.percentile} delle aziende valutate,
              con {ECOVADIS.punteggio}
              {size === "lg" ? ` · valido fino a ${ECOVADIS.validoFino}` : ""}
            </>
          )}
        </p>
      </div>
    </div>
  );
}

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

// La medaglia si RIMPICCIOLISCE sul telefono: a 96px fissi su uno schermo da 360px
// mangerebbe mezza larghezza e spingerebbe il testo a capo su ogni parola.
// `sorgente` e' la dimensione passata a next/image (la piu' grande della scala), le classi
// decidono quella reale a ogni breakpoint.
const TAGLIE = {
  sm: { classi: "w-11 h-11", sorgente: 44 },
  md: { classi: "w-14 h-14 sm:w-[72px] sm:h-[72px]", sorgente: 72 },
  lg: { classi: "w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24", sorgente: 96 },
};

/**
 * @param {{ size?: "sm"|"md"|"lg", variant?: "chiaro"|"scuro", className?: string }} props
 * variant "scuro" = il badge sta su fondo scuro (footer): il testo accanto schiarisce.
 */
export default function EcoVadisBadge({ size = "md", variant = "chiaro", className = "" }) {
  const t = TAGLIE[size] ?? TAGLIE.md;
  const scuro = variant === "scuro";
  const titolo = scuro ? "text-[#F5F0E8]" : "text-near-black";
  const testo = scuro ? "text-[#A79684]" : "text-[#5C5347]";

  return (
    <div className={`flex items-center gap-3 sm:gap-3.5 min-w-0 ${className}`}>
      <Image
        src={ECOVADIS.file}
        alt={`EcoVadis ${ECOVADIS.medaglia} 2026 — ${ECOVADIS.intestatario}, ${ECOVADIS.punteggio}`}
        width={t.sorgente}
        height={t.sorgente}
        className={`${t.classi} flex-shrink-0`}
      />
      <div className="min-w-0 leading-tight">
        <p className={`font-heading text-[13px] sm:text-sm ${titolo}`}>
          EcoVadis {ECOVADIS.medaglia}
        </p>
        {size === "sm" ? (
          <p className={`text-[12px] sm:text-[13px] ${testo}`}>
            {ECOVADIS.intestatario} nel {ECOVADIS.percentile}
          </p>
        ) : (
          <p className={`text-[12px] sm:text-[13px] ${testo}`}>
            {/* sul telefono la riga si accorcia: il senso resta, l'ingombro no */}
            <span className="sm:hidden">
              {ECOVADIS.intestatario} · {ECOVADIS.percentile} · {ECOVADIS.punteggio}
            </span>
            <span className="hidden sm:inline">
              {ECOVADIS.intestatario} nel {ECOVADIS.percentile} delle aziende valutate,
              con {ECOVADIS.punteggio}
              {size === "lg" ? (
                <span className="hidden lg:inline"> · valido fino a {ECOVADIS.validoFino}</span>
              ) : null}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

import React from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

// «Dicono di noi»: le opinioni che lo staff ha messo in landing, di persone che hanno completato
// un corso e acconsentito alla pubblicazione. Scorrono in orizzontale (si fermano al passaggio
// del mouse); con «riduci movimento» restano ferme e si scorrono a mano. Compare solo con
// abbastanza opinioni (la soglia la decide la pagina).

function Stelle({ n, size = "h-4 w-4" }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${n} stelle su 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${size} ${i <= n ? "fill-primary text-primary" : "text-border"}`} />
      ))}
    </span>
  );
}

const virgola = (x) => x.toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function Opinione({ o }) {
  return (
    <figure className="flex w-[300px] shrink-0 flex-col gap-4 rounded-2xl border border-border bg-card p-6 sm:w-[360px]">
      <Stelle n={o.votoCorso} />
      <blockquote className="line-clamp-6 text-[15px] leading-relaxed text-foreground/90">«{o.testo}»</blockquote>
      <figcaption className="mt-auto border-t border-border pt-4 text-sm">
        <div className="font-medium text-near-black">{o.nome}</div>
        {o.corsoSlug ? (
          <Link href={`/catalogo/${o.corsoSlug}`} className="text-muted-foreground transition hover:text-primary">
            {o.corso}
          </Link>
        ) : (
          <div className="text-muted-foreground">{o.corso}</div>
        )}
      </figcaption>
    </figure>
  );
}

/** @param {{ opinioni: import("@/features/recensioni/pubbliche").OpinionePubblica[], mediaPiattaforma: import("@/features/recensioni/pubbliche").Media }} props */
export default function DiconoDiNoiSection({ opinioni, mediaPiattaforma }) {
  // velocità costante qualunque sia il numero di opinioni: circa 7 secondi ciascuna
  const durata = `${Math.max(30, opinioni.length * 7)}s`;
  return (
    <section className="w-full overflow-hidden bg-background py-20 md:py-24" aria-labelledby="dicono-di-noi">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <ScrollReveal>
          <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-primary">Dicono di noi</span>
              <h2 id="dicono-di-noi" className="mt-3.5 text-balance font-heading text-4xl leading-[1.1] text-near-black md:text-5xl">
                Le parole di chi ha completato il percorso
              </h2>
            </div>
            {mediaPiattaforma ? (
              <div className="flex items-center gap-3 lg:pb-2">
                <span className="font-heading text-4xl tabular-nums text-near-black">{virgola(mediaPiattaforma.media)}</span>
                <div className="flex flex-col gap-1">
                  <Stelle n={Math.round(mediaPiattaforma.media)} />
                  <span className="text-xs text-muted-foreground">
                    su 5 · {mediaPiattaforma.numero} valutazioni della piattaforma
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </ScrollReveal>
      </div>

      <div className="group relative motion-reduce:overflow-x-auto [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] motion-reduce:[mask-image:none]">
        {/* due copie identiche (con lo stesso spazio in coda): a metà corsa il giro riparte senza scatti */}
        <div
          className="flex w-max animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none motion-reduce:px-6"
          style={{ animationDuration: durata }}
        >
          <div className="flex gap-5 pr-5">
            {opinioni.map((o) => (
              <Opinione key={o.id} o={o} />
            ))}
          </div>
          {/* seconda copia per lo scorrimento continuo: invisibile ai lettori di schermo */}
          <div className="flex gap-5 pr-5 motion-reduce:hidden" aria-hidden="true" inert>
            {opinioni.map((o) => (
              <Opinione key={`b-${o.id}`} o={o} />
            ))}
          </div>
        </div>
      </div>

      <p className="mx-auto mt-8 max-w-[1400px] px-6 text-xs text-muted-foreground md:px-10">
        Opinioni di partecipanti che hanno completato il corso e superato l&apos;esame finale, pubblicate con il loro consenso.
        Lascia un&apos;opinione solo chi ha completato un corso.
      </p>
    </section>
  );
}

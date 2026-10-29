// Scheda pubblica del corso: media delle stelle (solo da MIN_VOTI_MEDIA voti in su, su tutti i
// voti non nascosti) e le opinioni approvate con consenso. Senza né media né opinioni non
// mostra nulla.

import { Star } from "lucide-react";
import type { Media, OpinionePubblica } from "@/features/recensioni/pubbliche";

const Stelle = ({ n, cls = "h-4 w-4" }: { n: number; cls?: string }) => (
  <span className="inline-flex gap-0.5" aria-label={`${n} stelle su 5`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} className={`${cls} ${i <= n ? "fill-primary text-primary" : "text-border"}`} />
    ))}
  </span>
);

export function OpinioniCorso({ media, opinioni }: { media: Media; opinioni: OpinionePubblica[] }) {
  if (!media && opinioni.length === 0) return null;
  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6" aria-labelledby="opinioni-corso">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="opinioni-corso" className="font-heading text-2xl text-near-black">Cosa dice chi l&apos;ha completato</h2>
        {media ? (
          <div className="flex items-center gap-2.5">
            <span className="font-heading text-2xl tabular-nums text-near-black">
              {media.media.toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <Stelle n={Math.round(media.media)} />
            <span className="text-sm text-muted-foreground">{media.numero} valutazioni</span>
          </div>
        ) : null}
      </div>
      {opinioni.length > 0 ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {opinioni.map((o) => (
            <li key={o.id} className="flex flex-col gap-3 rounded-xl bg-secondary/50 p-5">
              <Stelle n={o.votoCorso} cls="h-3.5 w-3.5" />
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">«{o.testo}»</p>
              <span className="mt-auto text-sm font-medium text-near-black">{o.nome}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Valutazioni di partecipanti che hanno completato il corso. Le opinioni sono pubblicate con il consenso di chi le ha scritte.
      </p>
    </section>
  );
}

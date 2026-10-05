"use client";

// Modulo dei dati per il certificato accreditato: codice fiscale, data e luogo di nascita.
// Usato prima dell'esame finale (obbligatorio per iniziarlo) e nel Profilo. I controlli veri
// sono lato server (salvaMiaAnagraficaAction); qui solo l'esperienza di compilazione.

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { salvaMiaAnagraficaAction } from "@/features/learner/server-actions";

export type DatiCertificato = { codiceFiscale: string; dataNascita: string; luogoNascita: string };

export function DatiCertificatoForm({
  iniziali,
  bloccata,
  pulsante = "Salva",
  onSalvato,
}: {
  iniziali: DatiCertificato | null;
  bloccata: boolean;
  pulsante?: string;
  onSalvato?: (d: DatiCertificato) => void;
}) {
  const [d, setD] = useState<DatiCertificato>(iniziali ?? { codiceFiscale: "", dataNascita: "", luogoNascita: "" });
  const [errore, setErrore] = useState("");
  const [salvato, setSalvato] = useState(false);
  const [loading, setLoading] = useState(false);

  async function salva(e: React.FormEvent) {
    e.preventDefault();
    setErrore("");
    setSalvato(false);
    setLoading(true);
    try {
      const r = await salvaMiaAnagraficaAction(d);
      if (!r.ok) return setErrore(r.errore);
      setSalvato(true);
      onSalvato?.({ ...d, codiceFiscale: d.codiceFiscale.replace(/\s+/g, "").toUpperCase() });
    } catch {
      setErrore("Salvataggio non riuscito: riprova.");
    } finally {
      setLoading(false);
    }
  }

  const campo = "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-near-black outline-none focus:border-primary disabled:bg-secondary/50 disabled:text-muted-foreground";
  return (
    <form onSubmit={salva} className="grid gap-4 text-left sm:grid-cols-2">
      <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
        <span className="font-medium text-near-black">Codice fiscale</span>
        <input
          className={`${campo} uppercase tracking-wide`}
          value={d.codiceFiscale}
          onChange={(e) => setD({ ...d, codiceFiscale: e.target.value })}
          maxLength={16}
          autoComplete="off"
          required
          disabled={bloccata}
          placeholder="RSSMRA80A01H501U"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-near-black">Data di nascita</span>
        <input
          type="date"
          className={campo}
          value={d.dataNascita}
          onChange={(e) => setD({ ...d, dataNascita: e.target.value })}
          required
          disabled={bloccata}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-near-black">Luogo di nascita</span>
        <input
          className={campo}
          value={d.luogoNascita}
          onChange={(e) => setD({ ...d, luogoNascita: e.target.value })}
          maxLength={80}
          required
          disabled={bloccata}
          placeholder="Comune (e Stato, se all'estero)"
        />
      </label>

      {bloccata ? (
        <p className="flex items-start gap-2 text-sm text-muted-foreground sm:col-span-2">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          Questi dati sono già stati usati per il tuo certificato. Per correggerli scrivi all&apos;assistenza.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {pulsante}
          </button>
          {salvato ? <span className="text-sm text-success">Dati salvati.</span> : null}
        </div>
      )}
      {errore ? <p className="text-sm text-destructive sm:col-span-2">{errore}</p> : null}
    </form>
  );
}

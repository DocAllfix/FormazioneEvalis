"use client";

// Modulo «La tua opinione»: stelle sul corso (obbligatorie), stelle sulla piattaforma
// (facoltative), testo libero e, a parte, il consenso alla pubblicazione sul sito: casella NON
// spuntata; solo se la spunti scegli la forma del nome (proposta: nome e iniziale). Non blocca
// nulla: il certificato c'è già. Usato a fine corso (player) e nella pagina Certificati.

import { useId, useState } from "react";
import { Loader2, Star } from "lucide-react";
import { esegui } from "@/lib/esito";
import { salvaMiaRecensioneAction } from "@/features/recensioni/server-actions";
import { MAX_TESTO, TESTO_CONSENSO, nomePubblico, type FormaPubblicazione } from "@/features/recensioni/regole";
import type { MiaRecensione } from "@/features/recensioni/recensioni";

function Stelle({ valore, onChange, etichetta, facoltativo }: { valore: number | null; onChange: (v: number | null) => void; etichetta: string; facoltativo?: boolean }) {
  const [sopra, setSopra] = useState<number | null>(null);
  const mostrato = sopra ?? valore ?? 0;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-near-black">
        {etichetta}
        {facoltativo ? <span className="font-normal text-muted-foreground"> · facoltativo</span> : null}
      </span>
      <div className="flex items-center gap-1" role="radiogroup" aria-label={etichetta} onMouseLeave={() => setSopra(null)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={valore === n}
            aria-label={`${n} ${n === 1 ? "stella" : "stelle"}`}
            onMouseEnter={() => setSopra(n)}
            onClick={() => onChange(facoltativo && valore === n ? null : n)}
            className="rounded-md p-0.5 transition active:scale-95 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Star className={`h-7 w-7 transition-colors ${n <= mostrato ? "fill-primary text-primary" : "text-border"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function FormRecensione({
  enrollmentId,
  nomeUtente,
  iniziale,
  onSalvata,
}: {
  enrollmentId: string;
  nomeUtente: string;
  iniziale?: MiaRecensione | null;
  onSalvata?: (r: MiaRecensione) => void;
}) {
  const id = useId();
  const [votoCorso, setVotoCorso] = useState<number | null>(iniziale?.votoCorso ?? null);
  const [votoPiattaforma, setVotoPiattaforma] = useState<number | null>(iniziale?.votoPiattaforma ?? null);
  const [testo, setTesto] = useState(iniziale?.testo ?? "");
  const [consenso, setConsenso] = useState((iniziale?.pubblicazione ?? "no") !== "no");
  const [forma, setForma] = useState<Exclude<FormaPubblicazione, "no">>(
    iniziale?.pubblicazione === "nome_cognome" ? "nome_cognome" : "nome_iniziale",
  );
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [fatto, setFatto] = useState<MiaRecensione | null>(null);

  if (fatto) {
    return (
      <div className="rounded-xl border border-border bg-card px-5 py-4 text-left">
        <p className="font-heading text-near-black">Grazie per la tua opinione.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {fatto.pubblicazione === "no"
            ? "La leggerà solo lo staff Evalis: non comparirà sul sito."
            : `Dopo una verifica dello staff comparirà sul sito come «${fatto.nomePubblico}». Puoi ritirare il consenso quando vuoi dalla pagina Certificati.`}
        </p>
      </div>
    );
  }

  const invia = async () => {
    if (!votoCorso) {
      setErrore("Scegli da 1 a 5 stelle per il corso.");
      return;
    }
    setInvio(true);
    setErrore(null);
    try {
      const r = await esegui(
        salvaMiaRecensioneAction(enrollmentId, { votoCorso, votoPiattaforma, testo, pubblicazione: consenso ? forma : "no" }),
      );
      setFatto(r);
      onSalvata?.(r);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Salvataggio non riuscito, riprova.");
    } finally {
      setInvio(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 text-left"
      onSubmit={(e) => {
        e.preventDefault();
        void invia();
      }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-10">
        <Stelle etichetta="Il corso" valore={votoCorso} onChange={setVotoCorso} />
        <Stelle etichetta="La piattaforma" valore={votoPiattaforma} onChange={setVotoPiattaforma} facoltativo />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-testo`} className="text-sm font-medium text-near-black">
          La tua opinione <span className="font-normal text-muted-foreground">· cosa ti è stato utile, cosa miglioreresti</span>
        </label>
        <textarea
          id={`${id}-testo`}
          value={testo}
          maxLength={MAX_TESTO}
          rows={4}
          onChange={(e) => setTesto(e.target.value)}
          className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <span className="self-end text-xs tabular-nums text-muted-foreground">
          {testo.length}/{MAX_TESTO}
        </span>
      </div>

      <div className="flex flex-col gap-3 rounded-lg bg-secondary/60 p-4">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground/90">
          <input
            type="checkbox"
            checked={consenso}
            onChange={(e) => setConsenso(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          />
          <span>{TESTO_CONSENSO}</span>
        </label>
        {consenso ? (
          <fieldset className="ml-7 flex flex-col gap-2 text-sm">
            <legend className="mb-1 text-muted-foreground">Con quale nome?</legend>
            {(["nome_iniziale", "nome_cognome"] as const).map((f) => (
              <label key={f} className="flex cursor-pointer items-center gap-2.5">
                <input type="radio" name={`${id}-forma`} checked={forma === f} onChange={() => setForma(f)} className="h-4 w-4 accent-primary" />
                <span className="text-near-black">{nomePubblico(nomeUtente, f) ?? "—"}</span>
                <span className="text-muted-foreground">{f === "nome_iniziale" ? "nome e iniziale" : "nome e cognome"}</span>
              </label>
            ))}
          </fieldset>
        ) : (
          <p className="ml-7 text-xs text-muted-foreground">Senza consenso la tua opinione la legge solo lo staff Evalis.</p>
        )}
      </div>

      {errore ? <p className="text-sm text-danger" role="alert">{errore}</p> : null}

      <button
        type="submit"
        disabled={invio}
        className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
      >
        {invio ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {iniziale ? "Salva le modifiche" : "Invia la tua opinione"}
      </button>
    </form>
  );
}

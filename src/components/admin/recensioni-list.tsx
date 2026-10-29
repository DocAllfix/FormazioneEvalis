"use client";

// Console recensioni (staff): filtro per stato, ricerca per nome, email o corso; per ogni
// opinione approva, approva e mette in landing, toglie dalla landing, nasconde. «Nascondi» è per
// insulti, dati personali o prove: le opinioni negative si approvano come le altre (la media sul
// sito si calcola su tutti i voti). Consuma moderaRecensioneAction.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Loader2, Search, Sparkles, Star, Check } from "lucide-react";
import { esegui } from "@/lib/esito";
import { moderaRecensioneAction } from "@/features/recensioni/server-actions";
import type { AzioneModerazione, FiltroRecensioni } from "@/features/recensioni/recensioni";

export type StaffRecensione = {
  id: string;
  votoCorso: number;
  votoPiattaforma: number | null;
  testo: string;
  pubblicazione: string;
  nomePubblico: string | null;
  consensoLabel: string;
  stato: string;
  inEvidenza: boolean;
  dataLabel: string;
  autore: string;
  email: string;
  corso: string;
};

const FILTRI: [FiltroRecensioni, string][] = [
  ["da_approvare", "Da approvare"],
  ["approvate", "Approvate"],
  ["in_evidenza", "In landing"],
  ["nascoste", "Nascoste"],
  ["private", "Senza consenso (solo Evalis)"],
  ["tutte", "Tutte"],
];

function stato(r: StaffRecensione): { text: string; cls: string } {
  if (r.pubblicazione === "no") return { text: "Solo per Evalis", cls: "bg-secondary text-muted-foreground" };
  if (r.stato === "nascosta") return { text: "Nascosta", cls: "bg-danger/10 text-danger" };
  if (r.stato === "approvata") return r.inEvidenza ? { text: "In landing", cls: "bg-primary/10 text-primary" } : { text: "Approvata", cls: "bg-success/10 text-success" };
  return { text: "Da approvare", cls: "bg-warning/10 text-warning" };
}

const Stelle = ({ n }: { n: number }) => (
  <span className="inline-flex" aria-label={`${n} stelle su 5`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} className={`h-3.5 w-3.5 ${i <= n ? "fill-primary text-primary" : "text-border"}`} />
    ))}
  </span>
);

export function RecensioniList({ items, q, filtro }: { items: StaffRecensione[]; q: string; filtro: FiltroRecensioni }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function modera(r: StaffRecensione, azione: AzioneModerazione) {
    setBusy(`${r.id}:${azione}`);
    setError("");
    try {
      await esegui(moderaRecensioneAction(r.id, azione));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operazione non riuscita.");
    } finally {
      setBusy(null);
    }
  }

  const bottone = (r: StaffRecensione, azione: AzioneModerazione, testo: string, Icona: typeof Check, primario = false) => (
    <button
      onClick={() => modera(r, azione)}
      disabled={busy !== null}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition disabled:opacity-50 ${
        primario ? "bg-primary text-white hover:brightness-110" : "border border-border text-near-black hover:bg-secondary"
      }`}
    >
      {busy === `${r.id}:${azione}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icona className="h-3.5 w-3.5" />}
      {testo}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <form className="flex flex-col gap-3 sm:flex-row sm:items-center" action="/staff/recensioni">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Cerca per nome, email o corso"
            aria-label="Cerca recensione"
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <select name="stato" defaultValue={filtro} aria-label="Stato" className="h-10 rounded-lg border border-border bg-card px-3 text-sm">
          {FILTRI.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <button className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white transition hover:brightness-110">Cerca</button>
      </form>

      {error ? <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <h2 className="font-heading text-xl text-near-black">Nessuna recensione</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {q || filtro !== "da_approvare" ? "Nessun risultato per questa ricerca." : "Niente da approvare: quando qualcuno lascia un'opinione pubblicabile, compare qui e ricevi una mail."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((r) => {
            const s = stato(r);
            const pubblicabile = r.pubblicazione !== "no" && r.testo !== "";
            return (
              <li key={r.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-near-black">{r.autore} <span className="text-xs font-normal text-muted-foreground">· {r.email}</span></div>
                    <div className="text-sm text-foreground/80">{r.corso}</div>
                  </div>
                  <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${s.cls}`}>{s.text}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">Corso <Stelle n={r.votoCorso} /></span>
                  {r.votoPiattaforma ? <span className="inline-flex items-center gap-1.5">Piattaforma <Stelle n={r.votoPiattaforma} /></span> : null}
                  <span>{r.dataLabel}</span>
                </div>
                {r.testo ? <p className="whitespace-pre-wrap text-sm text-foreground/90">{r.testo}</p> : <p className="text-sm italic text-muted-foreground">Solo stelle, nessun testo.</p>}
                <p className="text-xs text-muted-foreground">
                  {r.pubblicazione === "no" ? "Nessun consenso alla pubblicazione: non può andare sul sito." : `Sul sito come «${r.nomePubblico}» · ${r.consensoLabel}`}
                </p>
                {pubblicabile || r.stato !== "nascosta" ? (
                  <div className="flex flex-wrap gap-2">
                    {pubblicabile && r.stato !== "approvata" ? bottone(r, "approva_evidenza", "Approva e metti in landing", Sparkles, true) : null}
                    {pubblicabile && r.stato !== "approvata" ? bottone(r, "approva", "Approva", Check) : null}
                    {pubblicabile && r.stato === "approvata" && !r.inEvidenza ? bottone(r, "evidenza_si", "Metti in landing", Sparkles) : null}
                    {r.stato === "approvata" && r.inEvidenza ? bottone(r, "evidenza_no", "Togli dalla landing", Sparkles) : null}
                    {r.stato !== "nascosta" ? bottone(r, "nascondi", "Nascondi", EyeOff) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

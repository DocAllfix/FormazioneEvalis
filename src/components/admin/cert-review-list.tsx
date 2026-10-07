"use client";

// Console certificati (staff): ricerca per nome, email o numero; per ogni certificato scarica il
// provvisorio, CARICA IL CERTIFICATO ACCREDITATO (PDF, caricato direttamente su Storage con un
// link firmato dal server) e revoca. Consuma preparaCaricamentoAction / confermaCaricamentoAction /
// revokeCertificateAction.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { esegui } from "@/lib/esito";
import { FileDown, Loader2, Search, ShieldX, Upload } from "lucide-react";
import {
  preparaCaricamentoAction,
  confermaCaricamentoAction,
  revokeCertificateAction,
} from "@/features/certificates/server-actions";

export type StaffCert = {
  id: string;
  status: string;
  number: string | null;
  accreditatoNumero: string | null;
  learnerName: string;
  learnerEmail: string;
  courseTitle: string;
  completatoLabel: string;
  accreditatoLabel: string;
  anagrafica: string;
};

const MAX_MB = 20;
const STATO: Record<string, { text: string; cls: string }> = {
  ready_for_review: { text: "Provvisorio · da caricare", cls: "bg-warning/10 text-warning" },
  issued: { text: "Accreditato", cls: "bg-success/10 text-success" },
  revoked: { text: "Revocato", cls: "bg-danger/10 text-danger" },
};
const FILTRI = [
  ["tutti", "Tutti"],
  ["attesa", "Da caricare"],
  ["accreditati", "Accreditati"],
  ["revocati", "Revocati"],
] as const;

export function CertReviewList({ items, q, stato }: { items: StaffCert[]; q: string; stato: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const target = useRef<StaffCert | null>(null);
  const numeroAttestato = useRef<string>("");

  function scegliFile(c: StaffCert) {
    if (c.status === "issued" && !window.confirm(`Il certificato ${c.number} è già accreditato. Vuoi sostituire il file? L'utente riceverà la nuova versione via email.`)) return;
    // il numero stampato sull'attestato dell'ente: è quello che chi riceve l'attestato cercherà
    // sulla pagina di verifica
    const n = window.prompt(
      "Numero dell'attestato accreditato, come compare sul PDF (es. C013562026).\nChi verifica il certificato sul sito cercherà questo numero.",
      c.accreditatoNumero ?? "",
    );
    if (n === null) return;
    if (!n.trim() && !c.accreditatoNumero) return setError("Serve il numero dell'attestato accreditato.");
    numeroAttestato.current = n.trim();
    target.current = c;
    fileRef.current?.click();
  }

  async function carica(file: File) {
    const c = target.current;
    if (!c) return;
    setError("");
    setOk("");
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return setError("Serve un file PDF.");
    if (file.size > MAX_MB * 1024 * 1024) return setError(`Il file supera ${MAX_MB} MB.`);
    setBusy(c.id);
    try {
      const { url, path } = await preparaCaricamentoAction(c.id);
      const form = new FormData();
      form.append("cacheControl", "3600");
      form.append("", file);
      const put = await fetch(url, { method: "PUT", body: form, headers: { "x-upsert": "false" } });
      if (!put.ok) throw new Error("Caricamento del file non riuscito: riprova.");
      const emesso = await esegui(confermaCaricamentoAction(c.id, path, c.status === "issued", numeroAttestato.current));
      setOk(`Certificato ${emesso.number} caricato: l'utente lo trova nella sua area privata e lo riceve via email.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore nel caricamento.");
    } finally {
      setBusy(null);
      target.current = null;
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function revoke(id: string) {
    const reason = window.prompt("Motivo della revoca?")?.trim();
    if (!reason) return;
    setBusy(id);
    setError("");
    setOk("");
    try {
      await revokeCertificateAction(id, reason);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore nella revoca.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form className="flex flex-col gap-3 sm:flex-row sm:items-center" action="/staff/certificati">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Cerca per nome, email o numero (EVALIS-…)"
            aria-label="Cerca certificato"
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <select name="stato" defaultValue={stato} aria-label="Stato" className="h-10 rounded-lg border border-border bg-card px-3 text-sm">
          {FILTRI.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <button className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white transition hover:brightness-110">Cerca</button>
      </form>

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void carica(f);
        }}
      />

      {error ? <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
      {ok ? <div className="rounded-lg bg-success/10 px-4 py-3 text-sm text-success">{ok}</div> : null}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <h2 className="font-heading text-xl text-near-black">Nessun certificato</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {q || stato !== "tutti" ? "Nessun risultato per questa ricerca." : "Quando qualcuno completa un corso, il suo certificato compare qui."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Utente</th>
                <th className="px-4 py-3 font-medium">Corso</th>
                <th className="px-4 py-3 font-medium">Numero</th>
                <th className="px-4 py-3 font-medium">Stato</th>
                <th className="px-4 py-3 text-right font-medium">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => {
                const s = STATO[c.status] ?? { text: c.status, cls: "bg-secondary text-muted-foreground" };
                return (
                  <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-near-black">{c.learnerName}</div>
                      <div className="text-xs text-muted-foreground">{c.learnerEmail}</div>
                      <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{c.anagrafica}</div>
                    </td>
                    <td className="px-4 py-3 text-foreground/80">
                      {c.courseTitle}
                      <div className="text-xs text-muted-foreground">Completato il {c.completatoLabel}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-primary">
                      {c.accreditatoNumero ?? c.number ?? "—"}
                      {c.accreditatoNumero ? <div className="text-[11px] text-muted-foreground">{c.number}</div> : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${s.cls}`}>{s.text}</span>
                      {c.accreditatoLabel ? <div className="mt-1 text-xs text-muted-foreground">dal {c.accreditatoLabel}</div> : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {c.status !== "revoked" ? (
                          <a
                            href={`/api/certificato/${c.id}`}
                            target="_blank"
                            rel="noopener"
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-near-black transition hover:bg-secondary"
                          >
                            <FileDown className="h-3.5 w-3.5" />
                            {c.status === "issued" ? "Scarica" : "Provvisorio"}
                          </a>
                        ) : null}
                        {c.status !== "revoked" ? (
                          <button
                            onClick={() => scegliFile(c)}
                            disabled={busy !== null}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white transition hover:brightness-110 disabled:opacity-50"
                          >
                            {busy === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                            {c.status === "issued" ? "Sostituisci file" : "Carica accreditato"}
                          </button>
                        ) : null}
                        {c.status !== "revoked" ? (
                          <button
                            onClick={() => revoke(c.id)}
                            disabled={busy !== null}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-destructive transition hover:bg-destructive/5 disabled:opacity-50"
                          >
                            <ShieldX className="h-3.5 w-3.5" />
                            Revoca
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

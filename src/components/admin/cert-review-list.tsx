"use client";

// Coda revisione certificati (staff): tabella densa con Approva (emette) / Revoca.
// Consuma approveCertificateAction / revokeCertificateAction.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, ShieldX } from "lucide-react";
import {
  approveCertificateAction,
  revokeCertificateAction,
} from "@/features/certificates/server-actions";

export type PendingCert = {
  id: string;
  learnerName: string;
  learnerEmail: string;
  courseTitle: string;
  createdLabel: string;
};

export function CertReviewList({ items }: { items: PendingCert[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function approve(id: string) {
    setBusy(id);
    setError("");
    try {
      await approveCertificateAction(id);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore nell'emissione.");
    } finally {
      setBusy(null);
    }
  }

  async function revoke(id: string) {
    const reason = window.prompt("Motivo della revoca?")?.trim();
    if (!reason) return;
    setBusy(id);
    setError("");
    try {
      await revokeCertificateAction(id, reason);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore nella revoca.");
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
          <Check className="h-6 w-6" />
        </span>
        <h2 className="mt-4 font-heading text-xl text-near-black">Nessun certificato in attesa</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          La coda di revisione è vuota: tutti i certificati idonei sono stati gestiti.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Discente</th>
              <th className="px-4 py-3 font-medium">Corso</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Richiesto</th>
              <th className="px-4 py-3 text-right font-medium">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-secondary/30">
                <td className="px-4 py-3">
                  <div className="font-medium text-near-black">{c.learnerName}</div>
                  <div className="text-xs text-muted-foreground">{c.learnerEmail}</div>
                </td>
                <td className="px-4 py-3 text-foreground/80">{c.courseTitle}</td>
                <td className="hidden px-4 py-3 tabular-nums text-muted-foreground md:table-cell">
                  {c.createdLabel}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => approve(c.id)}
                      disabled={busy === c.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary min-h-9 px-3 py-2 text-xs font-medium text-white transition hover:brightness-110 disabled:opacity-50"
                    >
                      {busy === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Approva ed emetti
                    </button>
                    <button
                      onClick={() => revoke(c.id)}
                      disabled={busy === c.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border min-h-9 px-3 py-2 text-xs font-medium text-destructive transition hover:bg-destructive/5 disabled:opacity-50"
                    >
                      <ShieldX className="h-3.5 w-3.5" />
                      Revoca
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
